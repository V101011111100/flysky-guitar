-- Migration: Thêm đầy đủ danh mục nhạc cụ
-- Dùng ON CONFLICT để an toàn khi chạy lại (idempotent)

INSERT INTO public.categories (name, slug) VALUES
  ('Guitar Điện',      'electric'),
  ('Guitar Acoustic',  'acoustic'),
  ('Guitar Classic',   'classic'),
  ('Guitar Bass',      'bass'),
  ('Piano & Keyboard', 'piano'),
  ('Ukulele',          'ukulele')
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name;
