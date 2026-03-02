create table if not exists public.user_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  receive_push boolean not null default true,
  notify_purchase boolean not null default true,
  notify_registration boolean not null default true,
  notify_health_alert boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  app_version text,
  device_model text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists idx_user_push_tokens_user_id on public.user_push_tokens(user_id);
create index if not exists idx_user_push_tokens_enabled on public.user_push_tokens(enabled);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_notification_preferences_updated_at on public.user_notification_preferences;
create trigger trg_user_notification_preferences_updated_at
before update on public.user_notification_preferences
for each row execute function public.set_updated_at();

drop trigger if exists trg_user_push_tokens_updated_at on public.user_push_tokens;
create trigger trg_user_push_tokens_updated_at
before update on public.user_push_tokens
for each row execute function public.set_updated_at();

alter table public.user_notification_preferences enable row level security;
alter table public.user_push_tokens enable row level security;

drop policy if exists "prefs_select_own" on public.user_notification_preferences;
create policy "prefs_select_own" on public.user_notification_preferences
for select
using (auth.uid() = user_id);

drop policy if exists "prefs_upsert_own" on public.user_notification_preferences;
create policy "prefs_upsert_own" on public.user_notification_preferences
for insert
with check (auth.uid() = user_id);

drop policy if exists "prefs_update_own" on public.user_notification_preferences;
create policy "prefs_update_own" on public.user_notification_preferences
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "token_select_own" on public.user_push_tokens;
create policy "token_select_own" on public.user_push_tokens
for select
using (auth.uid() = user_id);

drop policy if exists "token_insert_own" on public.user_push_tokens;
create policy "token_insert_own" on public.user_push_tokens
for insert
with check (auth.uid() = user_id);

drop policy if exists "token_update_own" on public.user_push_tokens;
create policy "token_update_own" on public.user_push_tokens
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
