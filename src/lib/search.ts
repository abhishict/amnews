import { fetchByQuery } from "./feeds";
import { processBatch } from "./processor";
import { upsertBatch } from "./store";
import { NewsCard, SearchRequest, SearchResponse } from "@/types";

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function sanitize(query: string): string {
  return query.replace(/<[^>]+>/g, "").replace(/[;'"\\]/g, "").trim().slice(0, 200);
}

/**
 * Always fetches fresh from Google News RSS, processes through LLM, and returns.
 * No cache-first behavior — every search is live.
 */
export async function handleSearch(request: SearchRequest): Promise<SearchResponse> {
  const query = sanitize(request.query);
  const limit = request.limit || 10;
  if (!query) return { cards: [], cached: false, totalResults: 0 };

  // Always fetch fresh
  const articles = await fetchByQuery(query);
  if (articles.length === 0) return { cards: [], cached: false, totalResults: 0 };

  // Process top articles through LLM
  const toProcess = articles.slice(0, Math.min(limit, 8));
  const results = await processBatch(toProcess);

  // Build card objects
  const cards: Omit<NewsCard, "id">[] = [];
  for (let i = 0; i < results.length; i++) {
    if (results[i].relevant) {
      cards.push({
        sourceUrl: toProcess[i].link,
        headline: results[i].headline,
        summary: results[i].summary,
        origin: results[i].origin,
        eli5Background: results[i].eli5.background,
        eli5Explanation: results[i].eli5.explanation,
        eli5Consequences: results[i].eli5.consequences,
        pipeline: "on-demand",
        searchQuery: query,
        publishedAt: toProcess[i].pubDate,
        processedAt: new Date(),
        expiresAt: addDays(new Date(), 1),
      });
    }
  }

  // Store in DB (for future reference) and return
  let storedCards: NewsCard[] = [];
  if (cards.length > 0) {
    storedCards = await upsertBatch(cards);
  }

  // If upsert didn't return the cards (edge case), build them manually
  if (storedCards.length === 0 && cards.length > 0) {
    storedCards = cards.map((c, i) => ({ ...c, id: `temp-${i}` })) as NewsCard[];
  }

  return { cards: storedCards, cached: false, totalResults: storedCards.length };
}
