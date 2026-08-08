// ============================================
// AMNews — Daily Headlines App
// ============================================

export interface RSSSource {
  id: string;
  name: string;
  url: string;
}

export interface RawArticle {
  sourceId: string;
  title: string;
  description: string;
  link: string;
  pubDate: Date;
  content?: string;
}

export interface ELI5 {
  background: string;
  explanation: string;
  consequences: string;
}

export interface ProcessedArticle {
  relevant: boolean;
  headline: string;
  summary: string;
  origin: string;
  eli5: ELI5;
  confidence: number;
}

export interface NewsCard {
  id: string;
  sourceUrl: string;
  headline: string;
  summary: string;
  origin: string;
  eli5Background: string;
  eli5Explanation: string;
  eli5Consequences: string;
  pipeline: "daily" | "on-demand";
  searchQuery?: string | null;
  publishedAt: Date;
  processedAt: Date;
  expiresAt: Date;
}

export interface NewsCardRow {
  id: string;
  source_url: string;
  headline: string;
  summary: string;
  origin: string;
  eli5_background: string;
  eli5_explanation: string;
  eli5_consequences: string;
  pipeline: string;
  search_query: string | null;
  published_at: string;
  processed_at: string;
  expires_at: string;
}

export interface SearchRequest {
  query: string;
  limit?: number;
}

export interface SearchResponse {
  cards: NewsCard[];
  cached: boolean;
  totalResults: number;
}

export interface PipelineResult {
  totalFetched: number;
  totalRelevant: number;
  totalStored: number;
  errors: string[];
  durationMs: number;
}
