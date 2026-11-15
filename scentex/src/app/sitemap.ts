import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.SITE_URL ?? "http://localhost:3000";
  const products = await prisma.product.findMany({ select: { slug: true, stats: { select: { updatedAt: true } } } });
  return [
    { url: `${site}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${site}/perfumes`, changeFrequency: "daily", priority: 0.8 },
    ...products.map((p) => ({ url: `${site}/perfumes/${p.slug}`, lastModified: p.stats?.updatedAt, changeFrequency: "daily" as const, priority: 0.7 })),
  ];
}
