import { NextResponse } from "next/server";
import { parseMode } from "@/lib/mode";
import { getHistory, getSourceCounts } from "@/lib/queries";
import { isRange } from "@/lib/ranges";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(request.url);
  const range = url.searchParams.get("range") ?? "1M";
  const currency = url.searchParams.get("currency") ?? "PLN";
  if (!isRange(range)) return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  if (currency !== "PLN" && currency !== "EUR") return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
  const requested = url.searchParams.get("mode");
  if (requested && !parseMode(requested)) return NextResponse.json({ error: "Invalid mode (use live or demo)" }, { status: 400 });
  try {
    // Demo prices are only ever returned when asked for explicitly, or when no live source exists at all.
    const counts = requested ? null : await getSourceCounts();
    const mode = parseMode(requested) ?? (counts!.live > 0 || counts!.demo === 0 ? "LIVE" : "DEMO");
    const history = await getHistory(slug, range, currency, mode);
    if (!history) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json(history, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (error) {
    console.error("[api/history]", error);
    return NextResponse.json({ error: "Price history is temporarily unavailable" }, { status: 500 });
  }
}
