/**
 * Background worker: `npm run worker`.
 * Every minute it runs the sources that are due (Retailer.intervalMinutes, with failure back-off)
 * and refreshes NBP exchange rates every 6 hours. State lives in PostgreSQL, so the worker can be
 * restarted or moved at any time; a per-source advisory lock prevents double runs.
 */
import { prisma } from "../src/lib/db";
import { refreshNbpRates } from "../src/engine/fx";
import { runDueSources } from "../src/engine/scheduler";
import { recomputeAllStats } from "../src/engine/stats";

const TICK_MS = 60_000;
const FX_EVERY_MS = 6 * 3_600_000;
let lastFx = 0;
let stopping = false;

async function tick() {
  if (Date.now() - lastFx > FX_EVERY_MS) {
    try {
      const fx = await refreshNbpRates(prisma);
      console.log(`[fx] NBP EUR/PLN ${fx.latest.rate} (${fx.latest.date})`);
      // Same cadence: let ageing live prices fall out of "lowest price".
      await recomputeAllStats(prisma, "LIVE");
      lastFx = Date.now();
    } catch (error) {
      console.error("[fx] refresh failed:", error instanceof Error ? error.message : error);
      lastFx = Date.now() - FX_EVERY_MS + 15 * 60_000; // retry in 15 minutes
    }
  }
  for (const result of await runDueSources(prisma)) console.log("[run]", JSON.stringify(result));
}

async function main() {
  console.log("[worker] started");
  const once = process.argv.includes("--once");
  while (!stopping) {
    await tick().catch((error) => console.error("[worker] tick failed:", error));
    if (once) break;
    await new Promise((resolve) => setTimeout(resolve, TICK_MS));
  }
  await prisma.$disconnect();
}

for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => { stopping = true; setTimeout(() => process.exit(0), 500); });
main();
