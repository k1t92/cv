/**
 * `npm run sources:sync` — register the audited public sources (src/engine/crawl/stores.ts).
 * Sources are created DISABLED. Only PUBLIC_ACCESS_SUPPORTED ones carry a crawl configuration;
 * the rest are recorded with their audit finding so the admin panel shows why they are off.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/db";
import { STORE_PROFILES } from "../src/engine/crawl/stores";

async function main() {
  for (const profile of STORE_PROFILES) {
    const shared = {
      name: profile.name, country: profile.country, currency: profile.currency, websiteUrl: profile.websiteUrl,
      sourceKind: "STRUCTURED_DATA" as const, adapterKey: "public", intervalMinutes: 60,
      crawlConfig: (profile.crawl ?? null) as unknown as Prisma.InputJsonValue,
    };
    const existing = await prisma.retailer.findUnique({ where: { slug: profile.slug } });
    if (existing) {
      // Never silently lift a block or re-enable: keep operational state, refresh configuration only.
      await prisma.retailer.update({ where: { id: existing.id }, data: { ...shared, ...(existing.blockedAt ? {} : { accessStatus: profile.accessStatus }) } });
    } else {
      await prisma.retailer.create({
        data: { ...shared, slug: profile.slug, enabled: false, accessStatus: profile.accessStatus, blockedReason: profile.crawl ? null : profile.finding },
      });
    }
    console.log(`${profile.accessStatus.padEnd(24)} ${profile.slug}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
