-- Bật extension để tự động cập nhật thời gian updated_at
create extension if not exists moddatetime schema extensions;

-- 1. TẠO HÀM TỰ ĐỘNG CẬP NHẬT updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 2. TẠO BẢNG DANH MỤC (CATEGORIES)
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  is_top_wood boolean default false,
  is_body_wood boolean default false,
  is_neck_wood boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. TẠO BẢNG SẢN PHẨM (PRODUCTS)
create table public.products (
  id uuid default gen_random_uuid() primary key,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  price numeric not null default 0,
  gallery_images text[] default '{}', -- Array of image URLs, first image is main image
  is_featured boolean default false,
  status text check (status in ('active', 'draft', 'out_of_stock')) default 'active',
  stock_quantity integer not null default 0,
  spec_top text,
  spec_body text,
  spec_neck text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Gắn trigger tự động cho Products
create trigger handle_updated_at_products
  before update on public.products
  for each row execute procedure public.handle_updated_at();

-- 4. TẠO BẢNG CÀI ĐẶT HỆ THỐNG (SITE SETTINGS)
create table public.site_settings (
  key text primary key,
  value text,
  description text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Gắn trigger tự động cho Tite Settings
create trigger handle_updated_at_settings
  before update on public.site_settings
  for each row execute procedure public.handle_updated_at();

-- Thêm dữ liệu mặc định cho Settings
insert into public.site_settings (key, value, description) values
  ('flysky_storeName', 'FlySky Guitar', 'Tên cửa hàng'),
  ('flysky_storeAddress', '37 Lê Thiện Trị, Phường Ngũ Hành Sơn, Thành phố Đà Nẵng', 'Địa chỉ chân trang'),
  ('flysky_contactEmail', 'hello@flyskyguitar.com', 'Email liên hệ'),
  ('flysky_contactPhone', '0987 654 321', 'SĐT Hotline'),
  ('flysky_heroH1', 'Đánh Thức Đam Mê Âm Nhạc Của Bạn', 'Tiêu đề lớn trang chủ'),
  ('flysky_heroSub', 'Khám phá bộ sưu tập nhạc cụ cao cấp, được tinh chỉnh hoàn hảo để mang lại cảm hứng sáng tạo bất tận cho mọi nghệ sĩ.', 'Tiêu đề nhỏ trang chủ'),
  ('flysky_brandColor', '#F48C25', 'Màu chủ đạo (HEX)');

-- 5. TẠO BẢNG ĐƠN HÀNG (ORDERS)
create table public.orders (
  id uuid default gen_random_uuid() primary key,
  order_number text unique not null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  shipping_address text not null,
  note text,
  payment_method text not null,
  status text check (status in ('pending', 'processing', 'completed', 'cancelled')) default 'pending',
  total_amount numeric not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Gắn trigger tự động cho Orders
create trigger handle_updated_at_orders
  before update on public.orders
  for each row execute procedure public.handle_updated_at();

-- 6. TẠO BẢNG CHI TIẾT ĐƠN HÀNG (ORDER_ITEMS)
create table public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete set null,
  price_at_time numeric not null,
  quantity integer not null default 1
);

-- 7. TẠO BẢNG TIN NHẮN (CONTACT_MESSAGES)
create table public.contact_messages (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text not null,
  email text,
  subject text,
  message text not null,
  status text check (status in ('unread', 'read', 'resolved')) default 'unread',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- THIẾT LẬP BẢO MẬT (ROW LEVEL SECURITY - RLS)
-- Bật RLS cho tất cả các bảng
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.site_settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.contact_messages enable row level security;

-- AI CŨNG CÓ QUYỀN ĐỌC (SELECT) SẢN PHẨM / DANH MỤC / SETTINGS
create policy "Allow public read access on categories" on public.categories for select using (true);
create policy "Allow public read access on products" on public.products for select using (true);
create policy "Allow public read access on site_settings" on public.site_settings for select using (true);

-- AI CŨNG CÓ THỂ GỬI ĐƠN HÀNG & TIN NHẮN LIÊN HỆ (INSERT)
create policy "Allow public insert on orders" on public.orders for insert with check (true);
create policy "Allow public insert on order_items" on public.order_items for insert with check (true);
create policy "Allow public insert on contact_messages" on public.contact_messages for insert with check (true);

-- CHỈ ADMIN (Authentication Users) MỚI CÓ QUYỀN SỬA ĐỔI (INSERT, UPDATE, DELETE)
-- (Sử dụng auth.role() = 'authenticated')
create policy "Allow admin full access on categories" on public.categories for all using (auth.role() = 'authenticated');
create policy "Allow admin full access on products" on public.products for all using (auth.role() = 'authenticated');
create policy "Allow admin full access on site_settings" on public.site_settings for all using (auth.role() = 'authenticated');
create policy "Allow admin full access on orders" on public.orders for all using (auth.role() = 'authenticated');
create policy "Allow admin full access on order_items" on public.order_items for all using (auth.role() = 'authenticated');
create policy "Allow admin full access on contact_messages" on public.contact_messages for all using (auth.role() = 'authenticated');
