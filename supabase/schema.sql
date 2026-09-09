-- Upper Crust admin: database schema, row level security and storage policies.
-- Run in the Supabase SQL editor of the client's project. Then: Authentication → Providers → enable Google
-- (OAuth client from the client's Google Cloud project), and set js/config.js mode to 'supabase'.

-- 1. Who may enter the admin ------------------------------------------------
create table if not exists public.allowed_users (
  email text primary key,
  note text,
  created_at timestamptz not null default now()
);
-- insert into public.allowed_users (email, note) values ('owner@gmail.com', 'Sahip');

create or replace function public.is_allowed()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.allowed_users a where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

-- 2. Content -----------------------------------------------------------------
create table if not exists public.draft (
  id smallint primary key default 1 check (id = 1),
  content jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

create table if not exists public.versions (
  id bigserial primary key,
  content jsonb not null,
  note text,
  published_at timestamptz not null default now(),
  published_by text
);

create table if not exists public.live (
  id smallint primary key default 1 check (id = 1),
  version_id bigint references public.versions(id),
  published_at timestamptz
);

-- 3. Row level security --------------------------------------------------------
alter table public.allowed_users enable row level security;
alter table public.draft enable row level security;
alter table public.versions enable row level security;
alter table public.live enable row level security;

drop policy if exists allowed_read_self on public.allowed_users;
create policy allowed_read_self on public.allowed_users for select using (public.is_allowed());

drop policy if exists draft_all on public.draft;
create policy draft_all on public.draft for all using (public.is_allowed()) with check (public.is_allowed());

drop policy if exists versions_all on public.versions;
create policy versions_all on public.versions for all using (public.is_allowed()) with check (public.is_allowed());

drop policy if exists live_all on public.live;
create policy live_all on public.live for all using (public.is_allowed()) with check (public.is_allowed());

-- 4. Storage ---------------------------------------------------------------------
-- Buckets: 'media' (photos, videos, posters) and 'public' (content.json only). Both publicly readable, writable by allowed users.
insert into storage.buckets (id, name, public, file_size_limit)
  values ('media', 'media', true, 31457280) on conflict (id) do update set public = true, file_size_limit = 31457280;
insert into storage.buckets (id, name, public, file_size_limit)
  values ('public', 'public', true, 5242880) on conflict (id) do update set public = true, file_size_limit = 5242880;

drop policy if exists media_read on storage.objects;
create policy media_read on storage.objects for select using (bucket_id in ('media', 'public'));
drop policy if exists media_write on storage.objects;
create policy media_write on storage.objects for insert with check (bucket_id in ('media', 'public') and public.is_allowed());
drop policy if exists media_update on storage.objects;
create policy media_update on storage.objects for update using (bucket_id in ('media', 'public') and public.is_allowed());
drop policy if exists media_delete on storage.objects;
create policy media_delete on storage.objects for delete using (bucket_id in ('media', 'public') and public.is_allowed());

-- 5. Optional: keep the free project awake (see docs/RUNBOOK.md). A daily read of one row is enough.
