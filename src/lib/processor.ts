import Anthropic from "@anthropic-ai/sdk";
import { RawArticle, ProcessedArticle } from "@/types";

// ============================================
// LLM Processor — Summarize & explain headlines
// ============================================

function getClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

function buildBatchPrompt(articles: RawArticle[]): string {
  const list = articles
    .map((a, i) => `[${i + 1}] "${a.title}" | ${a.description?.slice(0, 200) || ""}`)
    .join("\n");

  return `You are a news editor. Summarize these headlines clearly and completely. Return a JSON array.

HEADLINES:
${list}

For each, return:
{"i":number,"r":true,"h":"clear rewritten headline under 80 chars","s":"3-4 sentence summary that gives the reader full context of what happened, who is involved, and what was announced or decided. Do NOT truncate.","o":"publication name","b":"2 sentences: when this issue first started and what led to this moment","e":"2 sentences: explain this like you're telling a friend who has zero background. Use a simple analogy if helpful.","c":"2 sentences: what happens next and why the reader should care"}

If it's clickbait/spam/ads/not real news, return: {"i":number,"r":false}
Return ONLY the JSON array. No markdown fences.`;
}

interface BatchItem {
  i: number; r: boolean;
  h?: string; s?: string; o?: string;
  b?: string; e?: string; c?: string;
}

function parseBatch(text: string, count: number): ProcessedArticle[] {
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed: BatchItem[] = JSON.parse(cleaned);
    const results: ProcessedArticle[] = [];

    for (let i = 0; i < count; i++) {
      const item = parsed.find((p) => p.i === i + 1);
      if (!item || !item.r) {
        results.push({ relevant: false, headline: "", summary: "", origin: "", eli5: { background: "", explanation: "", consequences: "" }, confidence: 0 });
        continue;
      }
      results.push({
        relevant: true,
        headline: String(item.h || "").slice(0, 100),
        summary: String(item.s || ""),
        origin: String(item.o || ""),
        eli5: { background: String(item.b || ""), explanation: String(item.e || ""), consequences: String(item.c || "") },
        confidence: 0.9,
      });
    }
    return results;
  } catch {
    return Array(count).fill({ relevant: false, headline: "", summary: "", origin: "", eli5: { background: "", explanation: "", consequences: "" }, confidence: 0 });
  }
}

/** Process up to 10 articles in one LLM call */
export async function processBatch(articles: RawArticle[]): Promise<ProcessedArticle[]> {
  if (articles.length === 0) return [];
  const client = getClient();

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{ role: "user", content: buildBatchPrompt(articles) }],
    });
    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return parseBatch(text, articles.length);
  } catch (error) {
    console.error("[processor] Failed:", error instanceof Error ? error.message : error);
    return articles.map(() => ({ relevant: false, headline: "", summary: "", origin: "", eli5: { background: "", explanation: "", consequences: "" }, confidence: 0 }));
  }
}
