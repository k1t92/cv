/**
 * `npm run engine:replay -- <source-slug>` — re-ingest the offers already extracted from a
 * public source's pages, WITHOUT making any request. Use after matching rules change.
 * Offers keep the time they were actually observed (the page's last fetch), not "now".
 */
import { prisma } from "../src/lib/db";
import { runAdapter } from "../src/engine/ingest";
import type { RawOffer, RetailerAdapter } from "../src/engine/types";

async function main() {
  const slug = process.argv[2];
  const retailer = slug ? await prisma.retailer.findUnique({ where: { slug } }) : null;
  if (!retailer) throw new Error("Usage: npm run engine:replay -- <source-slug>");
  const pages = await prisma.crawlPage.findMany({ where: { retailerId: retailer.id, isSitemap: false, status: "OK", lastFetchedAt: { not: null } } });
  if (!pages.length) throw new Error("No extracted pages to replay");
  // Each page's offers are replayed at the moment that page was actually fetched, oldest first.
  const byTime = new Map<number, typeof pages>();
  for (const page of pages) byTime.set(page.lastFetchedAt!.getTime(), [...(byTime.get(page.lastFetchedAt!.getTime()) ?? []), page]);
  for (const time of [...byTime.keys()].sort((a, b) => a - b)) {
    const group = byTime.get(time)!;
    const cached: RetailerAdapter = {
      key: "replay", partial: true,
      fetchOffers: async () => group.flatMap((p) => (p.lastOffers as unknown as RawOffer[] | null) ?? []),
    };
    const fresh = await prisma.retailer.findUniqueOrThrow({ where: { id: retailer.id } });
    console.log(new Date(time).toISOString(), JSON.stringify(await runAdapter(prisma, fresh, cached, new Date(time))));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
