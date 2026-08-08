-- ============================================
-- India-US News App — Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: news_cards
-- ============================================
CREATE TABLE IF NOT EXISTS news_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_url TEXT NOT NULL UNIQUE,
  headline TEXT NOT NULL,
  summary TEXT NOT NULL,
  origin TEXT NOT NULL,
  eli5_background TEXT NOT NULL,
  eli5_explanation TEXT NOT NULL,
  eli5_consequences TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'h1b-immigration',
    'us-india-trade-diplomacy',
    'rbi-fed-remittances',
    'ai-and-tech',
    'indian-origin-figures',
    'major-india-news',
    'general-us-news'
  )),
  pipeline TEXT NOT NULL CHECK (pipeline IN ('daily', 'on-demand')),
  search_query TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Indexes for query performance
CREATE INDEX idx_cards_category ON news_cards(category);
CREATE INDEX idx_cards_published_at ON news_cards(published_at DESC);
CREATE INDEX idx_cards_expires_at ON news_cards(expires_at);
CREATE INDEX idx_cards_pipeline ON news_cards(pipeline);

-- Full-text search index on headline and summary
ALTER TABLE news_cards ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', headline || ' ' || summary)) STORED;
CREATE INDEX idx_cards_fts ON news_cards USING GIN(fts);

-- ============================================
-- Table: pipeline_runs
-- ============================================
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline TEXT NOT NULL CHECK (pipeline IN ('daily', 'on-demand')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_fetched INTEGER NOT NULL DEFAULT 0,
  total_relevant INTEGER NOT NULL DEFAULT 0,
  total_stored INTEGER NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed'))
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on news_cards
ALTER TABLE news_cards ENABLE ROW LEVEL SECURITY;

-- Allow anonymous (anon) read access to all cards
CREATE POLICY "Allow anonymous read access"
  ON news_cards
  FOR SELECT
  TO anon
  USING (true);

-- Allow service role full access for writes
CREATE POLICY "Allow service role full access"
  ON news_cards
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Enable RLS on pipeline_runs
ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access to pipeline_runs
CREATE POLICY "Allow service role full access to pipeline_runs"
  ON pipeline_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
