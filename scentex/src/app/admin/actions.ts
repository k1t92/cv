"use server";

import type { DataMode } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { slugify } from "@/engine/demo/catalog";
import { getPreset } from "@/engine/feeds/presets";
import { refreshNbpRates } from "@/engine/fx";
import { parseTitle, normalizeBrand } from "@/engine/matching";
import { runSource } from "@/engine/scheduler";
import { recomputeProductStats } from "@/engine/stats";
import { ADMIN_COOKIE, requireAdmin, sessionValue, tokenMatches } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { modeOf } from "@/lib/mode";

const back = (path: string, message: string, kind: "ok" | "error" = "ok"): never =>
  redirect(`${path}?${kind}=${encodeURIComponent(message.slice(0, 300))}`);

export async function login(form: FormData) {
  const token = String(form.get("token") ?? "");
  if (!tokenMatches(token)) back("/admin/login", "Wrong token", "error");
  (await cookies()).set(ADMIN_COOKIE, sessionValue(), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

async function recomputeRetailerProducts(retailerId: string, mode: DataMode) {
  const rows = await prisma.retailerProduct.findMany({ where: { retailerId, productId: { not: null } }, select: { productId: true }, distinct: ["productId"] });
  const now = new Date();
  for (const row of rows) await recomputeProductStats(prisma, row.productId!, mode, now);
}

const sourceSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(60),
  country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Country must be a 2-letter code"),
  currency: z.enum(["PLN", "EUR"]),
  websiteUrl: z.string().trim().url(),
  sourceKind: z.enum(["API", "AFFILIATE_FEED", "XML_CSV_FEED", "STRUCTURED_DATA"]),
  feedUrl: z.string().trim().url().refine((u) => /^https?:\/\//.test(u), "Feed URL must be http(s)"),
  feedPreset: z.string().refine((key) => Boolean(getPreset(key)), "Unknown feed layout"),
  intervalMinutes: z.coerce.number().int().min(60, "Minimum interval is 60 minutes").max(10080),
  authHeaderEnv: z.string().trim().regex(/^[A-Z][A-Z0-9_]*$/, "Use an ENV_VAR_NAME").optional().or(z.literal("")),
  includePattern: z.string().trim().max(300).optional(),
  excludePattern: z.string().trim().max(300).optional(),
});

export async function saveSource(form: FormData) {
  await requireAdmin();
  const raw = Object.fromEntries(form.entries());
  const path = `/admin/sources/${raw.id ? String(raw.id) : "new"}`;
  const parsed = sourceSchema.safeParse(raw);
  if (!parsed.success) back(path, parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), "error");
  const input = parsed.data!;
  for (const pattern of [input.includePattern, input.excludePattern]) {
    try {
      if (pattern) new RegExp(pattern);
    } catch {
      back(path, `Invalid regular expression: ${pattern}`, "error");
    }
  }
  const preset = getPreset(input.feedPreset)!;
  const data = {
    name: input.name, country: input.country, currency: input.currency, websiteUrl: input.websiteUrl, sourceKind: input.sourceKind,
    adapterKey: "feed", feedUrl: input.feedUrl, feedPreset: input.feedPreset, feedFormat: preset.format,
    intervalMinutes: input.intervalMinutes, authHeaderEnv: input.authHeaderEnv || null,
    feedOptions: { ...(input.includePattern ? { includePattern: input.includePattern } : {}), ...(input.excludePattern ? { excludePattern: input.excludePattern } : {}) },
  };
  if (input.id) {
    const existing = await prisma.retailer.findUnique({ where: { id: input.id } });
    if (!existing || existing.sourceKind === "DEMO") back("/admin", "Demo sources cannot be edited", "error");
    // The currency of stored history cannot change under it.
    if (existing!.currency !== input.currency && (await prisma.retailerProduct.count({ where: { retailerId: input.id } })) > 0) {
      back(path, "Currency cannot be changed once offers are stored", "error");
    }
    await prisma.retailer.update({ where: { id: input.id }, data });
  } else {
    const slug = slugify(`${input.name} ${input.country}`);
    if (await prisma.retailer.findUnique({ where: { slug } })) back(path, `A source "${slug}" already exists`, "error");
    // New sources start disabled: run once manually and inspect the result before scheduling.
    await prisma.retailer.create({ data: { ...data, slug, enabled: false } });
  }
  revalidatePath("/", "layout");
  back("/admin", `Saved ${input.name}`);
}

export async function toggleSource(form: FormData) {
  await requireAdmin();
  const source = await prisma.retailer.findUnique({ where: { id: String(form.get("id")) } });
  if (!source) back("/admin", "Source not found", "error");
  await prisma.retailer.update({ where: { id: source!.id }, data: { enabled: !source!.enabled, consecutiveFailures: 0 } });
  await recomputeRetailerProducts(source!.id, modeOf(source!.sourceKind));
  revalidatePath("/", "layout");
  back("/admin", `${source!.name} ${source!.enabled ? "disabled" : "enabled"}`);
}

export async function runNow(form: FormData) {
  await requireAdmin();
  const source = await prisma.retailer.findUnique({ where: { id: String(form.get("id")) } });
  if (!source) back("/admin", "Source not found", "error");
  let message: string;
  let kind: "ok" | "error" = "ok";
  try {
    const result = await runSource(prisma, source!);
    kind = result.status === "FAILED" ? "error" : "ok";
    message = result.status === "FAILED"
      ? `${source!.name}: ${result.error}`
      : `${source!.name}: ${result.offersSeen} offers, ${result.offersChanged} changed, ${result.offersRejected} rejected, ${result.unmatched} new unmatched, ${result.offersMissing} missing`;
  } catch (error) {
    kind = "error";
    message = error instanceof Error ? error.message : "Run failed";
  }
  revalidatePath("/", "layout");
  back("/admin", message, kind);
}

export async function refreshFx() {
  await requireAdmin();
  let message: string;
  let kind: "ok" | "error" = "ok";
  try {
    const fx = await refreshNbpRates(prisma);
    message = `NBP EUR/PLN ${fx.latest.rate} (${fx.latest.date})`;
  } catch (error) {
    kind = "error";
    message = `FX refresh failed: ${error instanceof Error ? error.message : error}`;
  }
  revalidatePath("/", "layout");
  back("/admin", message, kind);
}

export async function deleteSource(form: FormData) {
  await requireAdmin();
  const source = await prisma.retailer.findUnique({ where: { id: String(form.get("id")) } });
  if (!source) back("/admin", "Source not found", "error");
  if (String(form.get("confirm") ?? "") !== source!.slug) back(`/admin/sources/${source!.id}`, `Type "${source!.slug}" to confirm deletion`, "error");
  const products = await prisma.retailerProduct.findMany({ where: { retailerId: source!.id, productId: { not: null } }, select: { productId: true }, distinct: ["productId"] });
  await prisma.$transaction([
    prisma.productStats.updateMany({ where: { cheapestRetailerId: source!.id }, data: { cheapestRetailerId: null } }),
    prisma.retailerProduct.deleteMany({ where: { retailerId: source!.id } }), // cascades snapshots, changes, deals
    prisma.scraperJob.deleteMany({ where: { retailerId: source!.id } }),
    prisma.retailer.delete({ where: { id: source!.id } }),
  ]);
  const now = new Date();
  for (const row of products) await recomputeProductStats(prisma, row.productId!, modeOf(source!.sourceKind), now);
  revalidatePath("/", "layout");
  back("/admin", `Deleted ${source!.name} and its price history`);
}

// ---- match review ----

async function attach(listingId: string, productId: string) {
  const listing = await prisma.retailerProduct.update({
    where: { id: listingId },
    data: { productId, matchStatus: "MANUAL", matchConfidence: 1 },
    include: { retailer: true },
  });
  await prisma.priceChange.updateMany({ where: { retailerProductId: listingId }, data: { productId } });
  await recomputeProductStats(prisma, productId, modeOf(listing.retailer.sourceKind), new Date());
}

export async function linkListing(form: FormData) {
  await requireAdmin();
  const listingId = String(form.get("listingId"));
  const slug = String(form.get("productSlug") ?? "").trim();
  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product) back("/admin/matches", `No product with slug "${slug}"`, "error");
  await attach(listingId, product!.id);
  revalidatePath("/", "layout");
  back("/admin/matches", `Linked to ${slug}`);
}

export async function rejectListing(form: FormData) {
  await requireAdmin();
  await prisma.retailerProduct.update({ where: { id: String(form.get("listingId")) }, data: { matchStatus: "REJECTED", productId: null } });
  back("/admin/matches", "Listing rejected");
}

/** Create a catalogue product from a listing whose title states brand, concentration and volume. */
export async function createProductFromListing(form: FormData) {
  await requireAdmin();
  const listing = await prisma.retailerProduct.findUnique({ where: { id: String(form.get("listingId")) } });
  if (!listing) back("/admin/matches", "Listing not found", "error");
  const brandName = String(form.get("brand") ?? listing!.rawBrand ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  const parsed = parseTitle(listing!.rawTitle, brandName || undefined);
  if (!brandName || !name || !parsed.concentration || !parsed.volumeMl) {
    back("/admin/matches", "Need brand, name, and a title that states concentration and volume", "error");
  }
  const brands = await prisma.brand.findMany();
  const brand = brands.find((b) => normalizeBrand(b.name) === normalizeBrand(brandName))
    ?? (await prisma.brand.create({ data: { name: brandName, slug: slugify(brandName) } }));
  const slug = slugify(`${brand.name} ${name} ${parsed.concentration} ${parsed.volumeMl}ml`);
  const product = await prisma.product.upsert({
    where: { slug },
    update: {},
    create: { slug, brandId: brand.id, name, concentration: parsed.concentration!, volumeMl: parsed.volumeMl!, ean: listing!.ean && !(await prisma.product.findUnique({ where: { ean: listing!.ean } })) ? listing!.ean : null },
  });
  await attach(listing!.id, product.id);
  revalidatePath("/", "layout");
  back("/admin/matches", `Created ${slug}`);
}
