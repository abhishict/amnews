-- Run this in Supabase SQL Editor
-- Simplifies the schema: removes category, keeps it as a clean headlines table

-- Drop the category constraint and column
ALTER TABLE news_cards DROP CONSTRAINT IF EXISTS news_cards_category_check;
ALTER TABLE news_cards DROP COLUMN IF EXISTS category;

-- Drop category index if it exists
DROP INDEX IF EXISTS idx_cards_category;

-- Clean slate
DELETE FROM news_cards;
