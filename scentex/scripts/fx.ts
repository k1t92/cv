/** `npm run engine:fx` — fetch EUR/PLN reference rates from the NBP API and store them. */
import { prisma } from "../src/lib/db";
import { refreshNbpRates } from "../src/engine/fx";

refreshNbpRates(prisma)
  .then((result) => console.log(JSON.stringify(result)))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
