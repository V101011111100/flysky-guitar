-- Migration: Add video_url column to products table
-- This allows storing YouTube or Vimeo video URLs for product demonstrations

ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url text;

-- Add comment to explain the column purpose
COMMENT ON COLUMN products.video_url IS 'URL for demonstration video (YouTube, Vimeo, etc.)';
