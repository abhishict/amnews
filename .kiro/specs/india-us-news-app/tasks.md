# Implementation Plan: India-US News App

## Overview

Implement a Next.js 14+ web application that curates US-India relevant news via two pipelines: a daily GitHub Actions cron digest and an on-demand Vercel serverless search. Articles are processed through Claude Haiku for relevance scoring and ELI5 generation, stored in Supabase Postgres, and rendered as uniform news cards with a client-side "Dumb it down" toggle.

## Tasks

- [ ] 1. Set up project structure, dependencies, and shared types
  - [ ] 1.1 Initialize Next.js 14+ project with App Router, Tailwind CSS, and install dependencies
    - Initialize project with `create-next-app` using App Router and Tailwind CSS
    - Install dependencies: `@supabase/supabase-js`, `@anthropic-ai/sdk`, `rss-parser`, `fast-check` (dev)
    - Configure environment variables template (`.env.local.example`) for `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`
    - _Requirements: 9.2_

  - [ ] 1.2 Define shared TypeScript interfaces and types
    - Create `src/types/index.ts` with `RSSSource`, `RawArticle`, `ProcessedArticle`, `RelevanceCategory`, `NewsCard`, `NewsCardRow`, `PipelineRunRow`, `SearchRequest`, `SearchResponse`, `PipelineResult` types
    - Ensure `RelevanceCategory` is a union type of the 6 defined categories
    - _Requirements: 7.1, 7.3, 7.4_

  - [ ] 1.3 Set up Supabase database schema and migrations
    - Create SQL migration for `news_cards` table with all columns, UNIQUE constraint on `source_url`, and defined indexes (`idx_cards_category`, `idx_cards_published_at`, `idx_cards_expires_at`, `idx_cards_pipeline`, full-text search on headline + summary)
    - Create SQL migration for `pipeline_runs` table
    - Configure Row Level Security (RLS) policies: read-only access via anon key for `news_cards`, service role for writes
    - _Requirements: 3.1, 3.6, 3.7, 3.8, 7.1, 9.1_

- [ ] 2. Implement RSS Feed Fetcher
  - [ ] 2.1 Create Feed Fetcher module with feed configuration and fetch logic
    - Create `src/lib/feeds.ts` with the list of configured RSS sources (categorized as india, us, us-india, tech, finance)
    - Implement `fetchAll()` to fetch and parse all feeds using `rss-parser`, normalize into `RawArticle[]`, and deduplicate by link
    - Implement `fetchByCategory(category)` to filter feeds by category before fetching
    - Implement `fetchByQuery(query)` for constructing topic-specific feed URLs (e.g., Google News RSS with query parameter)
    - Handle feed failures gracefully — skip unavailable feeds and continue with remaining
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 2.2 Write property test for feed deduplication
    - **Property 1: Feed deduplication by URL**
    - **Validates: Requirements 1.2**

  - [ ]* 2.3 Write property test for category filtering
    - **Property 2: Category filtering correctness**
    - **Validates: Requirements 1.4**

- [ ] 3. Implement LLM Article Processor
  - [ ] 3.1 Create Article Processor module with Claude Haiku integration
    - Create `src/lib/processor.ts` implementing `processArticle()` and `processBatch()`
    - Implement `buildPrompt()` that constructs the relevance-checking prompt with article data
    - Call Claude Haiku via Anthropic SDK, parse JSON response, validate structure
    - Implement retry logic with exponential backoff (1s, 3s, max 2 retries) for rate limits and server errors
    - Handle invalid JSON responses by marking article as failed and logging raw response
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 3.2 Write property test for processed article structure
    - **Property 3: Processed article structure invariant**
    - **Validates: Requirements 2.2, 2.3**

- [ ] 4. Implement News Card Store (Supabase data layer)
  - [ ] 4.1 Create Card Store module with CRUD operations
    - Create `src/lib/store.ts` implementing `CardStore` interface
    - Implement `upsert()` and `upsertBatch()` using Supabase upsert on `source_url`
    - Implement `getLatestCards(limit, offset)` with pagination
    - Implement `getCardsByCategory(category, limit)`
    - Implement `searchCards(query, limit)` using full-text search on headline and summary
    - Implement `deleteExpired()` to remove cards where `expires_at < now()`
    - Implement `getExistingUrls(urls)` for deduplication checks
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ]* 4.2 Write property test for database deduplication
    - **Property 4: Database deduplication by source URL**
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 4.3 Write property test for expiry date correctness
    - **Property 5: Expiry date correctness by pipeline type**
    - **Validates: Requirements 3.3, 3.4**

  - [ ]* 4.4 Write property test for pagination limit
    - **Property 7: Pagination respects limit**
    - **Validates: Requirements 3.7, 5.7**

- [ ] 5. Checkpoint - Ensure core modules work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement Daily Pipeline Agent
  - [ ] 6.1 Create Daily Pipeline orchestration logic
    - Create `src/lib/pipeline.ts` implementing `runDailyPipeline()`
    - Fetch all RSS feeds, deduplicate against existing DB cards by source URL
    - Process new articles through Article Processor, store cards with confidence >= 0.7
    - Set `pipeline: "daily"` and `expiresAt: processedAt + 7 days` on all stored cards
    - Run expired card cleanup after storage
    - Record pipeline run in `pipeline_runs` table with metrics (total fetched, relevant, stored, errors, duration)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 8.1, 8.2, 10.1, 10.2, 10.3_

  - [ ]* 6.2 Write property test for pipeline deduplication
    - **Property 8: Pipeline deduplication against existing cards**
    - **Validates: Requirements 4.2**

  - [ ]* 6.3 Write property test for confidence threshold
    - **Property 9: Confidence threshold filtering (daily >= 0.7)**
    - **Validates: Requirements 4.3**

  - [ ]* 6.4 Write property test for pipeline metric invariants
    - **Property 10: Pipeline metric invariants**
    - **Validates: Requirements 4.4**

- [ ] 7. Implement On-Demand Search Agent
  - [ ] 7.1 Create On-Demand Search API route and logic
    - Create `src/app/api/search/route.ts` as a POST endpoint
    - Create `src/lib/search.ts` implementing `handleSearch()`
    - Check cache: if >= 5 matching cards processed within 1 hour, return cached results
    - On cache miss: fetch topic-specific RSS feeds, deduplicate, process at most 10 articles through LLM
    - Store relevant cards with confidence >= 0.6, `pipeline: "on-demand"`, `expiresAt: processedAt + 24h`
    - Return combined results with `cached` boolean indicator
    - Respect `limit` parameter on returned cards
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 8.3_

  - [ ] 7.2 Implement input sanitization and rate limiting
    - Sanitize search query input before use in RSS URLs and database queries (strip SQL injection patterns, script tags, special characters)
    - Implement IP-based rate limiting: 10 requests/minute per IP, return 429 when exceeded
    - _Requirements: 9.3, 9.4_

  - [ ]* 7.3 Write property test for cache hit behavior
    - **Property 11: Cache hit behavior**
    - **Validates: Requirements 5.2**

  - [ ]* 7.4 Write property test for serverless processing budget
    - **Property 12: Serverless processing budget**
    - **Validates: Requirements 5.4**

  - [ ]* 7.5 Write property test for rate limiting enforcement
    - **Property 16: Rate limiting enforcement**
    - **Validates: Requirements 9.4**

- [ ] 8. Checkpoint - Ensure backend pipelines work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement Next.js Frontend
  - [ ] 9.1 Create news card component with ELI5 toggle
    - Create `src/components/NewsCard.tsx` rendering headline, summary, origin, category badge
    - Implement "Dumb it down 🧠" button that toggles ELI5 section visibility (client-side state only, no API call)
    - ELI5 section shows background, explanation, and consequences in a styled panel
    - Make component responsive with Tailwind CSS
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ] 9.2 Create search bar component with filters
    - Create `src/components/SearchBar.tsx` with text input, region dropdown (us/india/both), and category dropdown
    - Show loading spinner during active searches
    - Submit triggers POST to `/api/search`
    - _Requirements: 6.4, 6.5_

  - [ ] 9.3 Create main feed page with server-side rendering and pagination
    - Create `src/app/page.tsx` as the main feed view
    - Server-side render initial cards from Supabase using anon key (read-only)
    - Implement infinite scroll or "Load more" pagination
    - Display cards in responsive grid layout
    - Integrate SearchBar and NewsCard components
    - _Requirements: 6.1, 6.6, 6.7, 9.1_

  - [ ]* 9.4 Write unit tests for NewsCard component
    - Test ELI5 toggle visibility
    - Test card renders all required fields
    - Test responsive layout behavior
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 10. Implement GitHub Actions Cron Workflow
  - [ ] 10.1 Create GitHub Actions workflow file for daily pipeline
    - Create `.github/workflows/daily-pipeline.yml`
    - Schedule cron for 7am EST daily (`0 12 * * *` UTC)
    - Workflow runs a Node.js script that invokes `runDailyPipeline()`
    - Configure secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`
    - Create `scripts/run-pipeline.ts` entry point for the cron job
    - _Requirements: 4.1_

- [ ] 11. Integration wiring and final validation
  - [ ] 11.1 Wire all components and verify end-to-end flow
    - Ensure frontend reads cards from Supabase correctly on page load
    - Ensure search endpoint processes and returns cards
    - Verify environment variable configuration for Vercel deployment
    - Add `vercel.json` if needed for serverless function configuration
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 11.2 Write property test for card format uniformity
    - **Property 13: Card format uniformity across pipelines**
    - **Validates: Requirements 7.1, 7.2**

  - [ ]* 11.3 Write property test for enum field validation
    - **Property 14: Enum field validation**
    - **Validates: Requirements 7.3, 7.4**

  - [ ]* 11.4 Write property test for search input sanitization
    - **Property 15: Search input sanitization**
    - **Validates: Requirements 9.3**

- [ ] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using `fast-check`
- Unit tests validate specific examples and edge cases
- The tech stack is Next.js 14+ (App Router), Tailwind CSS, Supabase Postgres, Anthropic SDK (Claude Haiku), rss-parser, GitHub Actions, and Vercel
- All API keys are stored as environment variables; never exposed to the client
- The daily pipeline processes articles sequentially to respect Claude rate limits
- On-demand search caps at 10 articles per request to stay within Vercel's 10s serverless timeout

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "3.1", "4.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "3.2", "4.2", "4.3", "4.4"] },
    { "id": 4, "tasks": ["6.1", "7.1", "7.2"] },
    { "id": 5, "tasks": ["6.2", "6.3", "6.4", "7.3", "7.4", "7.5"] },
    { "id": 6, "tasks": ["9.1", "9.2", "10.1"] },
    { "id": 7, "tasks": ["9.3", "9.4"] },
    { "id": 8, "tasks": ["11.1"] },
    { "id": 9, "tasks": ["11.2", "11.3", "11.4"] }
  ]
}
```
