/**
 * Runs every enabled retailer's adapter once through the real ingest pipeline.
 * With demo retailers this advances the synthetic market to "now".
 * In production the same call is what a scheduled worker executes.
 */
import { prisma } from "../src/lib/db";
import { getAdapter } from "../src/engine/adapters";
import { runAdapter } from "../src/engine/ingest";

async function main() {
  const retailers = await prisma.retailer.findMany({ where: { enabled: true }, orderBy: { slug: "asc" } });
  if (!retailers.length) throw new Error("No retailers found. Run `npm run db:seed` first.");
  const now = new Date();
  for (const retailer of retailers) {
    const adapter = getAdapter(retailer.adapterKey);
    if (!adapter) {
      console.warn(`[skip] ${retailer.slug}: no adapter registered for "${retailer.adapterKey}"`);
      continue;
    }
    console.log(JSON.stringify(await runAdapter(prisma, retailer, adapter, now)));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
