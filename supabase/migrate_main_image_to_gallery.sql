-- Migration Script: Remove main_image_url, use only gallery_images
-- Run this in Supabase SQL Editor

-- Step 1: Add gallery_images column if not exists (text array)
ALTER TABLE products ADD COLUMN IF NOT EXISTS gallery_images text[];

-- Step 2: Migrate data from main_image_url to gallery_images
-- For products that have main_image_url but empty gallery_images
UPDATE products 
SET gallery_images = ARRAY[main_image_url]
WHERE main_image_url IS NOT NULL 
  AND (gallery_images IS NULL OR array_length(gallery_images, 1) = 0);

-- Step 3: Verify the migration
SELECT 
  id, 
  name, 
  main_image_url, 
  gallery_images 
FROM products 
WHERE main_image_url IS NOT NULL 
LIMIT 10;

-- Step 4: After verifying, DROP the main_image_url column
-- Uncomment the line below after verifying the data is correct
ALTER TABLE products DROP COLUMN IF EXISTS main_image_url;

-- Step 5: Verify gallery_images column works correctly
SELECT name, gallery_images, array_length(gallery_images, 1) as image_count 
FROM products 
WHERE gallery_images IS NOT NULL 
LIMIT 10;
