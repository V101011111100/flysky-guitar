-- Tạo bảng lưu trữ các mẫu (Templates)
create table if not exists public.print_templates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text not null, -- 'invoice_a4', 'invoice_thermal', 'email_newsletter'
  is_active boolean default false, -- Mẫu mặc định được chọn để in
  settings jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS (Row Level Security)
alter table public.print_templates enable row level security;

-- Policies
create policy "Cho phép tất cả đọc templates"
  on public.print_templates for select
  using (true);

create policy "Cho phép admin chỉnh sửa templates"
  on public.print_templates for all
  using (true)
  with check (true);

-- Đảm bảo chỉ có 1 mẫu active cho mỗi loại type
create or replace function ensure_single_active_template()
returns trigger as $$
begin
  if new.is_active = true then
    update public.print_templates
    set is_active = false
    where type = new.type and id != new.id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists single_active_template on public.print_templates;
create trigger single_active_template
  before insert or update on public.print_templates
  for each row
  execute function ensure_single_active_template();

-- Trigger cập nhật updated_at
drop trigger if exists handle_updated_at_print_templates on public.print_templates;
create trigger handle_updated_at_print_templates
  before update on public.print_templates
  for each row execute procedure public.handle_updated_at();

-- Chèn mẫu A4 Mặc Định đầu tiên để demo
insert into public.print_templates (name, type, is_active, settings)
values (
  'Mẫu Hóa Đơn Chuẩn (Mặc định)',
  'invoice_a4',
  true,
  '{
    "invoice_store_name": "FLYSKY GUITAR",
    "invoice_slogan": "Âm thanh từ tâm hồn - Chất lượng từ đam mê",
    "invoice_address": "Số 123 Đường Nhạc Cụ, Quận 1, TP. HCM",
    "invoice_phone": "Hotline: 090 123 4567",
    "invoice_website": "Website: www.flyskyguitar.vn",
    "invoice_policy": "Sản phẩm được đổi trả trong vòng 07 ngày nếu có lỗi từ nhà sản xuất.\nVui lòng giữ nguyên hóa đơn và tem bảo hành khi cần hỗ trợ.\nKhông áp dụng đổi trả với hàng đã qua sử dụng làm trầy xước.",
    "invoice_footer_msg": "Cảm ơn quý khách đã tin tưởng FlySky Guitar!"
  }'::jsonb
) on conflict do nothing;
