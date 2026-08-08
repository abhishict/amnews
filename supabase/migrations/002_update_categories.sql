-- Run this in Supabase SQL Editor to update the category constraint
-- This replaces the old restrictive categories with general news categories

ALTER TABLE news_cards DROP CONSTRAINT IF EXISTS news_cards_category_check;
ALTER TABLE news_cards ADD CONSTRAINT news_cards_category_check CHECK (category IN (
  'world',
  'india',
  'us-politics',
  'business-finance',
  'ai-tech',
  'immigration',
  'sports',
  'science-health'
));

-- Clear old cards with outdated categories
DELETE FROM news_cards WHERE category NOT IN (
  'world', 'india', 'us-politics', 'business-finance',
  'ai-tech', 'immigration', 'sports', 'science-health'
);
