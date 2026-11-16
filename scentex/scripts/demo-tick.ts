/**
 * Manual run: `npm run engine:run [-- <source-slug>]`.
 * Runs every enabled source (or one) immediately through the real ingest pipeline, ignoring intervals.
 */
import { prisma } from "../src/lib/db";
import { runSource } from "../src/engine/scheduler";

async function main() {
  const slug = process.argv[2];
  const retailers = await prisma.retailer.findMany({ where: slug ? { slug } : { enabled: true }, orderBy: { slug: "asc" } });
  if (!retailers.length) throw new Error(slug ? `No source "${slug}"` : "No sources found. Run `npm run db:seed` first.");
  // SCENTEX_ALLOW_NO_CONTACT=1 permits a supervised test run of a public source before BOT_CONTACT is set.
  const allowNoContact = process.env.SCENTEX_ALLOW_NO_CONTACT === "1";
  for (const retailer of retailers) console.log(JSON.stringify(await runSource(prisma, retailer, new Date(), { allowNoContact })));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
