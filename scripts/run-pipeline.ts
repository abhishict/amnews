/**
 * Entry point for the daily pipeline cron job.
 * Run with: npx tsx scripts/run-pipeline.ts
 */

import { runDailyPipeline } from "../src/lib/pipeline";

async function main() {
  console.log("=== Daily News Pipeline ===");
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log("");

  const result = await runDailyPipeline();

  console.log("");
  console.log("=== Pipeline Complete ===");
  console.log(`Total fetched: ${result.totalFetched}`);
  console.log(`Total relevant: ${result.totalRelevant}`);
  console.log(`Total stored: ${result.totalStored}`);
  console.log(`Duration: ${result.durationMs}ms`);

  // Cost estimate (Claude Haiku 4.5: ~$1/1M input, ~$5/1M output)
  // 3 batches of 10 articles = 3 LLM calls
  const llmCalls = 3;
  const inputTokens = llmCalls * 1200;
  const outputTokens = llmCalls * 3000;
  const cost = (inputTokens * 1 + outputTokens * 5) / 1_000_000;
  console.log(`\nEstimated cost: ~$${cost.toFixed(4)} (${llmCalls} LLM calls)`);

  if (result.errors.length > 0) {
    console.log(`\nWarnings (${result.errors.length}):`);
    result.errors.slice(0, 5).forEach((e) => console.log(`  - ${e}`));
  }

  // Only fail if absolutely nothing worked
  if (result.totalFetched === 0 && result.totalStored === 0) {
    console.error("\nPipeline produced no results at all.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Pipeline crashed:", error);
  process.exit(1);
});
