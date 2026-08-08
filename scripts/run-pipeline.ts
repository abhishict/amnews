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

  // Cost estimate (Claude Haiku 4.5 pricing: ~$1/1M input, ~$5/1M output)
  // 7 categories × 1 batch call each = 7 LLM calls total
  // ~800 input tokens per batch (5 articles), ~1000 output tokens per batch
  const llmCalls = 7;
  const estimatedInputTokens = llmCalls * 800;
  const estimatedOutputTokens = llmCalls * 1000;
  const estimatedCost = (estimatedInputTokens * 1 + estimatedOutputTokens * 5) / 1_000_000;
  console.log("");
  console.log(`=== Cost Estimate ===`);
  console.log(`LLM calls: ${llmCalls} (1 per category, 5 articles batched)`);
  console.log(`Estimated tokens: ~${estimatedInputTokens} input, ~${estimatedOutputTokens} output`);
  console.log(`Estimated cost: ~$${estimatedCost.toFixed(5)}`);

  if (result.errors.length > 0) {
    console.log(`\nErrors (${result.errors.length}):`);
    result.errors.slice(0, 10).forEach((e) => console.log(`  - ${e}`));
    if (result.errors.length > 10) {
      console.log(`  ... and ${result.errors.length - 10} more`);
    }
  }

  // Exit with error code if pipeline had critical failures
  if (result.totalFetched === 0 && result.errors.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Pipeline failed:", error);
  process.exit(1);
});
