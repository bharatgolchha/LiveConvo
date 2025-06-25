-- Migration: create_system_settings_migration.sql
-- Purpose: Introduce a system-wide settings table to allow runtime configuration (e.g., default AI model).

-- 1. Create table
create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- 2. Enable RLS
alter table public.system_settings enable row level security;

-- 3. Read access for any authenticated user (needed by clients)
create policy "Read system settings" on public.system_settings
  for select
  using ( auth.role() = 'authenticated' );

-- 4. Upsert access for admins only
create policy "Admin upsert system settings" on public.system_settings
  for all
  using (
    exists (
      select 1 from public.users u where u.id = auth.uid() and u.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.users u where u.id = auth.uid() and u.is_admin = true
    )
  );

-- 5. Seed default model value (optional)
insert into public.system_settings (key, value)
  values ('default_ai_model', '"google/gemini-2.5-flash"')
  on conflict (key) do nothing; 