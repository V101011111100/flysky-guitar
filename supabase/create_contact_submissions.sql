-- Contact form submissions from the floating chat widget
create table if not exists contact_submissions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text not null,
  content     text not null,
  status      text not null default 'new',   -- new | read | replied
  created_at  timestamptz not null default now()
);

-- RLS: public can insert, only authenticated can read/update
alter table contact_submissions enable row level security;

create policy "allow_public_insert" on contact_submissions
  for insert to anon with check (true);

create policy "allow_authenticated_all" on contact_submissions
  for all to authenticated using (true);
