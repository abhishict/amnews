import Parser from "rss-parser";
import { RSSSource, RawArticle } from "@/types";

// ============================================
// RSS Feeds — Top headlines sources
// ============================================

export const RSS_SOURCES: RSSSource[] = [
  { id: "google-top", name: "Google News", url: "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en" },
  { id: "google-world", name: "Google World", url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en" },
  { id: "google-india", name: "Google India", url: "https://news.google.com/rss/search?q=India+news+today&hl=en-US&gl=US&ceid=US:en" },
];

const parser = new Parser({ timeout: 10000, headers: { "User-Agent": "AMNews/1.0" } });

async function fetchSingleFeed(source: RSSSource): Promise<RawArticle[]> {
  try {
    const feed = await parser.parseURL(source.url);
    return (feed.items || []).map((item) => ({
      sourceId: source.id,
      title: item.title?.trim() || "",
      description: item.contentSnippet?.trim() || item.content?.trim() || "",
      link: item.link || "",
      pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
      content: item.content?.trim(),
    }));
  } catch (error) {
    console.warn(`[feeds] Failed: ${source.name}`, error instanceof Error ? error.message : "");
    return [];
  }
}

function deduplicateByLink(articles: RawArticle[]): RawArticle[] {
  const seen = new Set<string>();
  return articles.filter((a) => {
    if (!a.link || seen.has(a.link)) return false;
    seen.add(a.link);
    return true;
  });
}

/** Fetch today's top headlines from all sources */
export async function fetchTopHeadlines(): Promise<RawArticle[]> {
  const results = await Promise.allSettled(RSS_SOURCES.map(fetchSingleFeed));
  const articles: RawArticle[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") articles.push(...r.value);
  }
  return deduplicateByLink(articles);
}

/** Fetch articles for a specific search query */
export async function fetchByQuery(query: string): Promise<RawArticle[]> {
  const encoded = encodeURIComponent(query);
  const source: RSSSource = {
    id: "search",
    name: "Google News",
    url: `https://news.google.com/rss/search?q=${encoded}&hl=en-US&gl=US&ceid=US:en`,
  };
  const articles = await fetchSingleFeed(source);
  return deduplicateByLink(articles);
}
