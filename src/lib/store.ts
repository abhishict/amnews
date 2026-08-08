import { getServiceClient, getPublicClient } from "./supabase";
import { NewsCard, NewsCardRow } from "@/types";

function rowToCard(row: NewsCardRow): NewsCard {
  return {
    id: row.id,
    sourceUrl: row.source_url,
    headline: row.headline,
    summary: row.summary,
    origin: row.origin,
    eli5Background: row.eli5_background,
    eli5Explanation: row.eli5_explanation,
    eli5Consequences: row.eli5_consequences,
    pipeline: row.pipeline as "daily" | "on-demand",
    searchQuery: row.search_query,
    publishedAt: new Date(row.published_at),
    processedAt: new Date(row.processed_at),
    expiresAt: new Date(row.expires_at),
  };
}

export async function upsertBatch(cards: Omit<NewsCard, "id">[]): Promise<NewsCard[]> {
  if (cards.length === 0) return [];
  const supabase = getServiceClient();

  const rows = cards.map((c) => ({
    source_url: c.sourceUrl,
    headline: c.headline,
    summary: c.summary,
    origin: c.origin,
    eli5_background: c.eli5Background,
    eli5_explanation: c.eli5Explanation,
    eli5_consequences: c.eli5Consequences,
    pipeline: c.pipeline,
    search_query: c.searchQuery || null,
    published_at: c.publishedAt.toISOString(),
    processed_at: c.processedAt.toISOString(),
    expires_at: c.expiresAt.toISOString(),
  }));

  const { data, error } = await supabase.from("news_cards").upsert(rows, { onConflict: "source_url" }).select();
  if (error) { console.error("[store] upsert error:", error.message); return []; }
  return (data as NewsCardRow[]).map(rowToCard);
}

export async function getLatestCards(limit = 20, offset = 0): Promise<NewsCard[]> {
  const supabase = getPublicClient();
  const { data, error } = await supabase
    .from("news_cards")
    .select("*")
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) { console.error("[store] getLatest error:", error); return []; }
  return (data as NewsCardRow[]).map(rowToCard);
}

export async function searchCards(query: string, limit = 20): Promise<NewsCard[]> {
  const supabase = getPublicClient();
  // Search using first keyword for better matches
  const keyword = query.split(/\s+/)[0];
  const { data, error } = await supabase
    .from("news_cards")
    .select("*")
    .or(`headline.ilike.%${keyword}%,summary.ilike.%${keyword}%`)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) { console.error("[store] search error:", error); return []; }
  return (data as NewsCardRow[]).map(rowToCard);
}

export async function deleteExpired(): Promise<number> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.from("news_cards").delete().lt("expires_at", new Date().toISOString()).select("id");
  if (error) { console.error("[store] deleteExpired error:", error); return 0; }
  return data?.length || 0;
}
