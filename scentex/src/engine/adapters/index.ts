import type { RetailerAdapter } from "../types";
import { demoAdapter } from "./demo";

/**
 * Adapter registry, keyed by Retailer.adapterKey.
 * To connect a real source: implement RetailerAdapter (API / affiliate feed / XML-CSV feed /
 * permitted structured-data fetch), register it here and point the Retailer row at its key.
 */
const adapters: Record<string, RetailerAdapter> = {
  [demoAdapter.key]: demoAdapter,
};

export function getAdapter(key: string): RetailerAdapter | undefined {
  return adapters[key];
}
