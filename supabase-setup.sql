-- Run this in Supabase SQL Editor to enable private notes, links, todo tasks,
-- repeating agenda items, appointment descriptions, private agenda sharing,
-- and the private storage used by password recovery codes.
-- Password recovery and Smartschool URL import require deploying their Edge
-- Functions: password-recovery, smartschool-calendar, and agenda-sharing.
-- Deploy agenda-sharing with the included supabase/config.toml so its public
-- code-redemption endpoint can validate one-time codes itself.
begin;

alter table if exists public.agenda_items
  add column if not exists week_start date,
  add column if not exists repeat_pattern text not null default 'weekly',
  add column if not exists repeat_days text[],
  add column if not exists repeat_start_date date,
  add column if not exists category text,
  add column if not exists description text,
  add column if not exists icon text,
  add column if not exists import_source_key text,
  add column if not exists import_uid text,
  add column if not exists import_instance text not null default '';

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title varchar(150) not null check (length(btrim(title)) > 0),
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title varchar(150) not null check (length(btrim(title)) > 0),
  url text not null check (url ~* '^https?://'),
  created_at timestamptz not null default now()
);

create table if not exists public.todo_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task varchar(200) not null check (length(btrim(task)) > 0),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.password_recovery_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  code_hash text not null,
  created_at timestamptz not null default now(),
  claim_token uuid,
  claim_expires_at timestamptz
);

create table if not exists public.agenda_share_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  updated_at timestamptz not null default now(),
  constraint agenda_share_username_format
    check (username ~ '^[a-zA-Z0-9_]{3,24}$')
);

create unique index if not exists agenda_share_username_lower_idx
  on public.agenda_share_profiles (lower(username));

create table if not exists public.agenda_share_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.agenda_share_sessions (
  token_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists notes_user_updated_idx
  on public.notes (user_id, updated_at desc);

create index if not exists agenda_items_user_start_idx
  on public.agenda_items (user_id, start_time);

create unique index if not exists agenda_items_import_source_uid_idx
  on public.agenda_items (
    user_id,
    import_source_key,
    import_uid,
    import_instance
  );

create index if not exists user_links_user_created_idx
  on public.user_links (user_id, created_at desc);

create index if not exists todo_tasks_user_created_idx
  on public.todo_tasks (user_id, created_at);

create index if not exists password_recovery_email_idx
  on public.password_recovery_codes (lower(email));

create index if not exists agenda_share_sessions_user_idx
  on public.agenda_share_sessions (user_id, expires_at);

alter table public.agenda_items enable row level security;
alter table public.notes enable row level security;
alter table public.user_links enable row level security;
alter table public.todo_tasks enable row level security;
alter table public.password_recovery_codes enable row level security;
alter table public.agenda_share_profiles enable row level security;
alter table public.agenda_share_codes enable row level security;
alter table public.agenda_share_sessions enable row level security;

revoke all on public.password_recovery_codes from anon, authenticated, public;
grant select, insert, update, delete
  on public.password_recovery_codes to service_role;
revoke all on public.agenda_share_profiles,
  public.agenda_share_codes, public.agenda_share_sessions
  from anon, authenticated, public;
grant select, insert, update, delete
  on public.agenda_share_profiles, public.agenda_share_codes,
  public.agenda_share_sessions to service_role;

create or replace function public.set_agenda_share_username(
  p_user_id uuid,
  p_username text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.agenda_share_profiles (user_id, username, updated_at)
  values (p_user_id, p_username, now())
  on conflict (user_id) do update
    set username = excluded.username, updated_at = now();

  delete from public.agenda_share_codes where user_id = p_user_id;
  delete from public.agenda_share_sessions where user_id = p_user_id;
  return p_username;
end;
$$;

create or replace function public.create_agenda_share_code(
  p_user_id uuid,
  p_code_hash text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  code_expiry timestamptz := now() + interval '24 hours';
begin
  if not exists (
    select 1 from public.agenda_share_profiles
    where user_id = p_user_id
  ) then
    raise exception 'Stel eerst een gebruikersnaam in.';
  end if;

  insert into public.agenda_share_codes (
    user_id, code_hash, expires_at, used_at, created_at
  )
  values (p_user_id, p_code_hash, code_expiry, null, now())
  on conflict (user_id) do update
    set code_hash = excluded.code_hash,
        expires_at = excluded.expires_at,
        used_at = null,
        created_at = now();

  delete from public.agenda_share_sessions where user_id = p_user_id;
  return code_expiry;
end;
$$;

create or replace function public.redeem_agenda_share_code(
  p_username text,
  p_code_hash text,
  p_token_hash text
)
returns table (shared_user_id uuid, shared_username text, session_expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  matched_user_id uuid;
  matched_username text;
  code_expiry timestamptz;
  session_expiry timestamptz := now() + interval '24 hours';
begin
  select profile.user_id, profile.username
    into matched_user_id, matched_username
    from public.agenda_share_profiles as profile
    where lower(profile.username) = lower(p_username);

  if matched_user_id is null then
    return;
  end if;

  update public.agenda_share_codes as share_code
    set used_at = now()
    where share_code.user_id = matched_user_id
      and share_code.code_hash = p_code_hash
      and share_code.used_at is null
      and share_code.expires_at > now()
    returning share_code.expires_at into code_expiry;

  if code_expiry is null then
    return;
  end if;

  insert into public.agenda_share_sessions (token_hash, user_id, expires_at)
  values (p_token_hash, matched_user_id, session_expiry);

  return query
    select matched_user_id, matched_username, session_expiry;
end;
$$;

revoke all on function public.set_agenda_share_username(uuid, text)
  from public, anon, authenticated;
revoke all on function public.create_agenda_share_code(uuid, text)
  from public, anon, authenticated;
revoke all on function public.redeem_agenda_share_code(text, text, text)
  from public, anon, authenticated;
grant execute on function public.set_agenda_share_username(uuid, text)
  to service_role;
grant execute on function public.create_agenda_share_code(uuid, text)
  to service_role;
grant execute on function public.redeem_agenda_share_code(text, text, text)
  to service_role;

create or replace function public.claim_password_recovery(
  p_email text,
  p_code_hash text,
  p_claim_token uuid
)
returns table (recovered_user_id uuid, claim_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.password_recovery_codes as recovery
  set claim_token = p_claim_token,
      claim_expires_at = now() + interval '2 minutes'
  where lower(recovery.email) = lower(p_email)
    and recovery.code_hash = p_code_hash
    and (
      recovery.claim_expires_at is null
      or recovery.claim_expires_at < now()
    )
  returning recovery.user_id, recovery.claim_token
  into recovered_user_id, claim_id;

  if found then
    return next;
  end if;
end;
$$;

create or replace function public.finish_password_recovery(
  p_user_id uuid,
  p_claim_token uuid,
  p_success boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_success then
    delete from public.password_recovery_codes
    where user_id = p_user_id and claim_token = p_claim_token;
  else
    update public.password_recovery_codes
    set claim_token = null, claim_expires_at = null
    where user_id = p_user_id and claim_token = p_claim_token;
  end if;

  return found;
end;
$$;

revoke all on function public.claim_password_recovery(text, text, uuid)
  from public, anon, authenticated;
revoke all on function public.finish_password_recovery(uuid, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.claim_password_recovery(text, text, uuid)
  to service_role;
grant execute on function public.finish_password_recovery(uuid, uuid, boolean)
  to service_role;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('agenda_items', 'notes', 'user_links', 'todo_tasks')
  loop
    execute format(
      'drop policy %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  end loop;
end
$$;

create policy agenda_items_select_own on public.agenda_items
  for select to authenticated using (auth.uid() = user_id);
create policy agenda_items_insert_own on public.agenda_items
  for insert to authenticated with check (auth.uid() = user_id);
create policy agenda_items_update_own on public.agenda_items
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy agenda_items_delete_own on public.agenda_items
  for delete to authenticated using (auth.uid() = user_id);

create policy notes_select_own on public.notes
  for select to authenticated using (auth.uid() = user_id);
create policy notes_insert_own on public.notes
  for insert to authenticated with check (auth.uid() = user_id);
create policy notes_update_own on public.notes
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy notes_delete_own on public.notes
  for delete to authenticated using (auth.uid() = user_id);

create policy user_links_select_own on public.user_links
  for select to authenticated using (auth.uid() = user_id);
create policy user_links_insert_own on public.user_links
  for insert to authenticated with check (auth.uid() = user_id);
create policy user_links_update_own on public.user_links
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy user_links_delete_own on public.user_links
  for delete to authenticated using (auth.uid() = user_id);

create policy todo_tasks_select_own on public.todo_tasks
  for select to authenticated using (auth.uid() = user_id);
create policy todo_tasks_insert_own on public.todo_tasks
  for insert to authenticated with check (auth.uid() = user_id);
create policy todo_tasks_update_own on public.todo_tasks
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy todo_tasks_delete_own on public.todo_tasks
  for delete to authenticated using (auth.uid() = user_id);

grant select, insert, update, delete
  on public.agenda_items, public.notes, public.user_links, public.todo_tasks
  to authenticated;

notify pgrst, 'reload schema';
commit;
