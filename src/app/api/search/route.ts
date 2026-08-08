import { NextRequest, NextResponse } from "next/server";
import { handleSearch } from "@/lib/search";

// Rate limiter
const RATE_LIMIT = 10;
const WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; start: number }>();

function isLimited(ip: string): boolean {
  const now = Date.now();
  const r = hits.get(ip);
  if (!r || now - r.start > WINDOW_MS) { hits.set(ip, { count: 1, start: now }); return false; }
  if (r.count >= RATE_LIMIT) return true;
  r.count++;
  return false;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (isLimited(ip)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  try {
    const body = await req.json();
    if (!body.query?.trim()) return NextResponse.json({ error: "Query required" }, { status: 400 });

    const response = await handleSearch({ query: body.query, limit: Number(body.limit) || 15 });
    return NextResponse.json(response);
  } catch (error) {
    console.error("[api/search]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
