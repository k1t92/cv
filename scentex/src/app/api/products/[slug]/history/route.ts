import { NextResponse } from "next/server";
import { getHistory } from "@/lib/queries";
import { isRange } from "@/lib/ranges";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(request.url);
  const range = url.searchParams.get("range") ?? "1M";
  const currency = url.searchParams.get("currency") ?? "PLN";
  if (!isRange(range)) return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  if (currency !== "PLN" && currency !== "EUR") return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
  try {
    const history = await getHistory(slug, range, currency);
    if (!history) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json(history, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (error) {
    console.error("[api/history]", error);
    return NextResponse.json({ error: "Price history is temporarily unavailable" }, { status: 500 });
  }
}
