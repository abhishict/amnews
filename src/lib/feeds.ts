import Parser from "rss-parser";
import { RSSSource, RawArticle } from "@/types";

// ============================================
// RSS Feeds — Sources that reliably work from servers
// ============================================

export const RSS_SOURCES: RSSSource[] = [
  // Major reliable feeds (don't block datacenter IPs)
  { id: "bbc-top", name: "BBC News", url: "https://feeds.bbci.co.uk/news/rss.xml" },
  { id: "bbc-world", name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { id: "bbc-tech", name: "BBC Tech", url: "https://feeds.bbci.co.uk/news/technology/rss.xml" },
  { id: "nyt-home", name: "NY Times", url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml" },
  { id: "nyt-world", name: "NY Times World", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml" },
  { id: "nyt-tech", name: "NY Times Tech", url: "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml" },
  { id: "guardian", name: "The Guardian", url: "https://www.theguardian.com/world/rss" },
  { id: "ars", name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index" },
  { id: "toi", name: "Times of India", url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms" },
  { id: "hindu", name: "The Hindu", url: "https://www.thehindu.com/news/national/feeder/default.rss" },
  { id: "ndtv", name: "NDTV", url: "https://feeds.feedburner.com/ndtvnews-top-stories" },
];

const parser = new Parser({ timeout: 15000, headers: { "User-Agent": "Mozilla/5.0 (compatible; AMNews/1.0)" } });

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
    console.warn(`[feeds] Failed: ${source.name} — ${error instanceof Error ? error.message : ""}`);
    return [];
  }
}

function deduplicateByLink(articles: RawArticle[]): RawArticle[] {
  const seen = new Set<string>();
  return articles.filter((a) => {
    if (!a.link || !a.title || seen.has(a.link)) return false;
    seen.add(a.link);
    return true;
  });
}

/** Fetch today's top headlines from all reliable sources */
export async function fetchTopHeadlines(): Promise<RawArticle[]> {
  const results = await Promise.allSettled(RSS_SOURCES.map(fetchSingleFeed));
  const articles: RawArticle[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") articles.push(...r.value);
  }
  // Sort by date (newest first) and deduplicate
  const deduped = deduplicateByLink(articles);
  deduped.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
  return deduped;
}

/** Fetch articles for a search query — tries Google News first, falls back to filtering existing */
export async function fetchByQuery(query: string): Promise<RawArticle[]> {
  // Try Google News RSS (works from local/Vercel, may fail from GH Actions)
  const encoded = encodeURIComponent(query);
  const googleSource: RSSSource = {
    id: "search",
    name: "Google News",
    url: `https://news.google.com/rss/search?q=${encoded}&hl=en-US&gl=US&ceid=US:en`,
  };

  let articles = await fetchSingleFeed(googleSource);

  // Fallback: if Google News fails, fetch from all sources and filter by keyword
  if (articles.length === 0) {
    const all = await fetchTopHeadlines();
    const lower = query.toLowerCase();
    articles = all.filter(
      (a) => a.title.toLowerCase().includes(lower) || a.description.toLowerCase().includes(lower)
    );
  }

  return deduplicateByLink(articles);
}
