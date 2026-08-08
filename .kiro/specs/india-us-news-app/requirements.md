# Requirements Document

## Introduction

This document defines the requirements for the India-US News App — a web application that curates and presents news relevant to Indians living in the US. The system operates two content pipelines: a daily scheduled digest (via GitHub Actions cron) and an on-demand search (via Vercel serverless). Each article is processed through a single Claude Haiku LLM call that determines relevance and generates structured card data including an ELI5 explanation. The architecture prioritizes free-tier hosting with Claude API calls as the only expected cost.

## Glossary

- **Daily_Pipeline**: The automated process triggered by GitHub Actions cron at 7am EST that fetches, processes, and stores news articles from all configured RSS feeds
- **On_Demand_Agent**: The Vercel serverless function that handles user search requests by fetching topic-specific RSS feeds, processing articles, and returning relevant results
- **News_Card**: A structured data object representing a processed article, containing headline, summary, origin, ELI5 fields, category, and metadata
- **ELI5_Section**: The "Explain Like I'm 5" portion of a news card containing background, explanation, and consequences fields, pre-generated at processing time
- **Feed_Fetcher**: The component responsible for fetching and parsing RSS/Atom feeds into normalized article objects
- **Article_Processor**: The component that sends a single raw article to Claude Haiku and returns a structured ProcessedArticle JSON response
- **Card_Store**: The Supabase Postgres database layer that persists, deduplicates, queries, and expires news cards
- **RelevanceCategory**: One of the predefined categories: h1b-immigration, us-india-trade-diplomacy, rbi-fed-remittances, tech-layoffs, indian-origin-figures, major-india-news
- **Cache_Hit**: When an on-demand search finds at least 5 matching cards processed within the last hour
- **Frontend**: The Next.js web application that renders news cards and provides search functionality

## Requirements

### Requirement 1: RSS Feed Fetching

**User Story:** As a system operator, I want the app to fetch and normalize articles from configured RSS feeds, so that there is a reliable stream of raw content to process.

#### Acceptance Criteria

1. WHEN the Feed_Fetcher is invoked, THE Feed_Fetcher SHALL parse RSS and Atom XML feeds into normalized article objects containing title, description, link, publication date, and optional content
2. WHEN multiple articles share the same URL, THE Feed_Fetcher SHALL retain only one instance of the article (deduplicate by link)
3. IF an RSS feed is unavailable or returns an error, THEN THE Feed_Fetcher SHALL skip the failed feed and continue fetching remaining feeds
4. WHEN fetching by category, THE Feed_Fetcher SHALL return only articles from feeds matching the specified category
5. THE Feed_Fetcher SHALL support feeds categorized as india, us, us-india, tech, or finance

### Requirement 2: LLM Article Processing

**User Story:** As a system operator, I want each article processed through a single Claude Haiku call, so that structured card data and ELI5 content are generated cost-efficiently.

#### Acceptance Criteria

1. WHEN a raw article is submitted for processing, THE Article_Processor SHALL make exactly one Claude Haiku API call per article (excluding retries for failures)
2. WHEN processing an article, THE Article_Processor SHALL return a structured JSON response containing relevance boolean, headline, summary, origin, ELI5 fields, category, and confidence score
3. WHEN the article is deemed relevant, THE Article_Processor SHALL populate all string fields with non-empty values and assign a confidence score between 0 and 1
4. WHEN the article is deemed not relevant, THE Article_Processor SHALL set the relevant field to false
5. IF the Claude API returns a rate limit or server error, THEN THE Article_Processor SHALL retry with exponential backoff (1s, 3s) up to a maximum of 2 retries
6. IF the Claude API returns invalid JSON or a response missing required fields, THEN THE Article_Processor SHALL mark the article as failed and log the raw response

### Requirement 3: News Card Storage

**User Story:** As a system operator, I want processed articles stored in Supabase with deduplication and expiry, so that the database remains clean and within free-tier limits.

#### Acceptance Criteria

1. THE Card_Store SHALL enforce a UNIQUE constraint on source URL so that no two cards share the same source URL
2. WHEN a card with an existing source URL is inserted, THE Card_Store SHALL perform an upsert (update the existing record)
3. WHEN a daily pipeline card is stored, THE Card_Store SHALL set the expiry to 7 days from the processed timestamp
4. WHEN an on-demand card is stored, THE Card_Store SHALL set the expiry to 24 hours from the processed timestamp
5. WHEN expired cards exist in the database, THE Card_Store SHALL delete them during cleanup operations
6. THE Card_Store SHALL support full-text search on headline and summary fields
7. THE Card_Store SHALL support pagination via limit and offset parameters when retrieving cards
8. THE Card_Store SHALL index the category, published_at, expires_at, and pipeline columns for query performance

### Requirement 4: Daily Pipeline Execution

**User Story:** As a news consumer, I want a fresh digest of US-India relevant news every morning, so that I stay informed without manual effort.

#### Acceptance Criteria

1. WHEN GitHub Actions triggers the cron job at 7am EST, THE Daily_Pipeline SHALL fetch articles from all configured RSS feeds
2. WHEN articles are fetched, THE Daily_Pipeline SHALL deduplicate them against existing cards in the database by source URL
3. WHEN processing new articles, THE Daily_Pipeline SHALL send each article through the Article_Processor and store cards with confidence score >= 0.7
4. WHEN the pipeline completes, THE Daily_Pipeline SHALL report metrics including total fetched, total relevant, total stored, errors, and duration
5. WHEN the pipeline completes, THE Daily_Pipeline SHALL trigger cleanup of expired cards
6. THE Daily_Pipeline SHALL mark all stored cards with pipeline value "daily"

### Requirement 5: On-Demand Search

**User Story:** As a news consumer, I want to search for news by region, topic, or subcategory, so that I can find specific information relevant to my interests.

#### Acceptance Criteria

1. WHEN a user submits a search request, THE On_Demand_Agent SHALL accept query text with optional region, category, and limit parameters
2. WHEN at least 5 matching cached cards exist that were processed within the last hour, THE On_Demand_Agent SHALL return the cached results without making new LLM calls
3. WHEN a cache miss occurs, THE On_Demand_Agent SHALL fetch topic-specific RSS feeds and process new articles through the Article_Processor
4. WHEN processing on-demand articles, THE On_Demand_Agent SHALL process at most 10 articles per request to stay within the serverless timeout budget
5. WHEN on-demand articles are deemed relevant with confidence >= 0.6, THE On_Demand_Agent SHALL store them with pipeline value "on-demand" and a 24-hour expiry
6. WHEN returning results, THE On_Demand_Agent SHALL indicate whether results were served from cache
7. WHEN returning results, THE On_Demand_Agent SHALL respect the limit parameter and never return more cards than specified
8. IF the serverless function approaches its timeout limit, THEN THE On_Demand_Agent SHALL return whatever results have been processed so far

### Requirement 6: Frontend Display and Interaction

**User Story:** As a news consumer, I want to browse news cards and toggle simplified explanations, so that I can quickly understand complex news without additional loading.

#### Acceptance Criteria

1. THE Frontend SHALL display news cards in a responsive grid layout showing headline, summary, and origin
2. WHEN a user clicks the "Dumb it down" toggle on a card, THE Frontend SHALL reveal the pre-generated ELI5 section without making any API call
3. WHEN a user clicks the toggle again, THE Frontend SHALL hide the ELI5 section
4. THE Frontend SHALL provide a search interface with inputs for query text, region filter, and category filter
5. WHEN a search is in progress, THE Frontend SHALL display a loading state to the user
6. THE Frontend SHALL support pagination or infinite scroll for browsing cards
7. THE Frontend SHALL server-side render news cards on initial page load

### Requirement 7: News Card Format Uniformity

**User Story:** As a developer, I want all news cards to have a consistent format regardless of origin pipeline, so that the frontend can render them uniformly.

#### Acceptance Criteria

1. THE Card_Store SHALL store every news card with identical fields: id, source URL, headline, summary, origin, ELI5 background, ELI5 explanation, ELI5 consequences, category, pipeline, search query, published at, processed at, and expires at
2. WHEN a card is created by the Daily_Pipeline, THE Card_Store SHALL populate the same fields as a card created by the On_Demand_Agent
3. THE Card_Store SHALL validate that category contains one of the defined RelevanceCategory values
4. THE Card_Store SHALL validate that pipeline contains either "daily" or "on-demand"

### Requirement 8: Error Handling and Resilience

**User Story:** As a system operator, I want the system to handle failures gracefully without losing progress, so that partial failures do not disrupt the entire pipeline.

#### Acceptance Criteria

1. IF an individual article fails processing, THEN THE Daily_Pipeline SHALL log the error and continue processing remaining articles
2. IF the Supabase connection fails, THEN THE Daily_Pipeline SHALL fail fast with a clear error message
3. IF the Supabase connection fails during an on-demand search, THEN THE On_Demand_Agent SHALL return HTTP 503 to the client
4. WHEN the database approaches the 500MB free-tier storage limit, THE Card_Store SHALL run aggressive expiry cleanup before new inserts

### Requirement 9: Security and Access Control

**User Story:** As a system operator, I want the app secured against common attacks and API key exposure, so that the system operates safely without user authentication overhead.

#### Acceptance Criteria

1. THE Frontend SHALL access the database using a read-only anon key with Row Level Security enabled
2. THE On_Demand_Agent SHALL store API keys as environment variables, never exposing them to the client
3. WHEN a search query is received, THE On_Demand_Agent SHALL sanitize the input before using it in RSS URLs or database queries
4. THE On_Demand_Agent SHALL enforce rate limiting of 10 requests per minute per IP address on the search endpoint

### Requirement 10: Pipeline Observability

**User Story:** As a system operator, I want to track pipeline execution history, so that I can monitor health and debug issues.

#### Acceptance Criteria

1. WHEN a pipeline run starts, THE Card_Store SHALL create a pipeline_runs record with status "running"
2. WHEN a pipeline run completes, THE Card_Store SHALL update the record with total fetched, total relevant, total stored, errors, and status "completed"
3. IF a pipeline run fails, THEN THE Card_Store SHALL update the record with status "failed" and captured errors
