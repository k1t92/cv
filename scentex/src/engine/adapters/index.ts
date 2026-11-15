import type { RetailerAdapter } from "../types";
import { demoAdapter } from "./demo";
import { feedAdapter } from "./feed";

/**
 * Adapter registry, keyed by Retailer.adapterKey.
 * Feed-based sources need no code: create a source with adapterKey "feed" in /admin.
 * A source with a bespoke API implements RetailerAdapter and is registered here.
 */
const adapters: Record<string, RetailerAdapter> = {
  [demoAdapter.key]: demoAdapter,
  [feedAdapter.key]: feedAdapter,
};

export function getAdapter(key: string): RetailerAdapter | undefined {
  return adapters[key];
}

export function adapterKeys(): string[] {
  return Object.keys(adapters);
}
