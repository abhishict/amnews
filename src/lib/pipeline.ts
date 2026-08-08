import { fetchTopHeadlines } from "./feeds";
import { processBatch } from "./processor";
import { upsertBatch, deleteExpired } from "./store";
import { getServiceClient } from "./supabase";
import { NewsCard, PipelineResult } from "@/types";

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const MAX_HEADLINES = 30; // Process top 30 headlines per run

/**
 * Daily pipeline: fetch top headlines → process in batches of 10 → store
 */
export async function runDailyPipeline(): Promise<PipelineResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const supabase = getServiceClient();

  const { data: run } = await supabase
    .from("pipeline_runs")
    .insert({ pipeline: "daily", status: "running", started_at: new Date().toISOString() })
    .select("id").single();
  const runId = run?.id;

  try {
    console.log("[pipeline] Fetching top headlines...");
    const articles = await fetchTopHeadlines();
    console.log(`[pipeline] Got ${articles.length} articles, processing top ${MAX_HEADLINES}`);

    const toProcess = articles.slice(0, MAX_HEADLINES);
    const allCards: Omit<NewsCard, "id">[] = [];

    // Process in batches of 10
    for (let i = 0; i < toProcess.length; i += 10) {
      const batch = toProcess.slice(i, i + 10);
      console.log(`[pipeline] Processing batch ${Math.floor(i / 10) + 1}...`);

      try {
        const results = await processBatch(batch);
        for (let j = 0; j < results.length; j++) {
          const r = results[j];
          if (r.relevant) {
            allCards.push({
              sourceUrl: batch[j].link,
              headline: r.headline,
              summary: r.summary,
              origin: r.origin,
              eli5Background: r.eli5.background,
              eli5Explanation: r.eli5.explanation,
              eli5Consequences: r.eli5.consequences,
              pipeline: "daily",
              searchQuery: null,
              publishedAt: batch[j].pubDate,
              processedAt: new Date(),
              expiresAt: addDays(new Date(), 2), // 2 day expiry
            });
          }
        }
      } catch (err) {
        errors.push(`Batch ${i / 10 + 1} failed: ${err}`);
      }
    }

    console.log(`[pipeline] Storing ${allCards.length} headlines`);
    const stored = await upsertBatch(allCards);
    const expired = await deleteExpired();
    console.log(`[pipeline] Stored ${stored.length}, cleaned ${expired} expired`);

    const result: PipelineResult = {
      totalFetched: articles.length,
      totalRelevant: allCards.length,
      totalStored: stored.length,
      errors,
      durationMs: Date.now() - startTime,
    };

    if (runId) {
      await supabase.from("pipeline_runs").update({
        status: "completed", completed_at: new Date().toISOString(),
        total_fetched: result.totalFetched, total_relevant: result.totalRelevant,
        total_stored: result.totalStored, errors,
      }).eq("id", runId);
    }
    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    errors.push(msg);
    if (runId) await supabase.from("pipeline_runs").update({ status: "failed", completed_at: new Date().toISOString(), errors }).eq("id", runId);
    return { totalFetched: 0, totalRelevant: 0, totalStored: 0, errors, durationMs: Date.now() - startTime };
  }
}
