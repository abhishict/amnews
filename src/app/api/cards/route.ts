import { NextRequest, NextResponse } from "next/server";
import { getLatestCards } from "@/lib/store";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(1, Number(searchParams.get("limit")) || 30), 50);
  const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

  try {
    const cards = await getLatestCards(limit, offset);
    return NextResponse.json({ cards, total: cards.length });
  } catch (error) {
    console.error("[api/cards]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
