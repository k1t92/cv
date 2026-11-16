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
  const observedAt = new Date(Math.max(...pages.map((p) => p.lastFetchedAt!.getTime())));
  const cached: RetailerAdapter = {
    key: "replay", partial: true,
    fetchOffers: async () => pages.flatMap((p) => (p.lastOffers as unknown as RawOffer[] | null) ?? []),
  };
  console.log(JSON.stringify(await runAdapter(prisma, retailer, cached, observedAt)));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
