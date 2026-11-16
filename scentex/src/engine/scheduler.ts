import type { PrismaClient, Retailer } from "@prisma/client";
import { getAdapter } from "./adapters";
import { runAdapter, type RunSummary } from "./ingest";

/** Back off a failing source: 1x, 2x, 4x … up to 8x its normal interval. */
export function nextRunAt(source: Pick<Retailer, "lastRunAt" | "intervalMinutes" | "consecutiveFailures">): Date {
  if (!source.lastRunAt) return new Date(0);
  const backoff = 2 ** Math.min(source.consecutiveFailures, 3);
  return new Date(source.lastRunAt.getTime() + source.intervalMinutes * 60_000 * backoff);
}

export function isDue(source: Pick<Retailer, "enabled" | "lastRunAt" | "intervalMinutes" | "consecutiveFailures">, now: Date): boolean {
  return source.enabled && nextRunAt(source) <= now;
}

export async function runSource(prisma: PrismaClient, retailer: Retailer, now = new Date(), options: { allowNoContact?: boolean } = {}): Promise<RunSummary> {
  const adapter = getAdapter(retailer.adapterKey);
  if (!adapter) throw new Error(`No adapter registered for "${retailer.adapterKey}"`);
  // One run per source at a time, across every process (web "run now" + worker).
  const [lock] = await prisma.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_lock(hashtext(${"scentex:" + retailer.id})) AS locked`;
  if (!lock?.locked) throw new Error("This source is already being imported");
  try {
    return await runAdapter(prisma, retailer, adapter, now, options);
  } finally {
    await prisma.$queryRaw`SELECT pg_advisory_unlock(hashtext(${"scentex:" + retailer.id}))`;
  }
}

/** Run every enabled source whose interval has elapsed. Sources run sequentially to stay gentle. */
export async function runDueSources(prisma: PrismaClient, now = new Date()): Promise<RunSummary[]> {
  const sources = await prisma.retailer.findMany({ where: { enabled: true }, orderBy: { lastRunAt: { sort: "asc", nulls: "first" } } });
  const results: RunSummary[] = [];
  for (const source of sources) {
    if (!isDue(source, now)) continue;
    try {
      results.push(await runSource(prisma, source, now));
    } catch (error) {
      console.error(`[scheduler] ${source.slug}:`, error instanceof Error ? error.message : error);
    }
  }
  return results;
}
