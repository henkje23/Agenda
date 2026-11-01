-- Run this in Supabase SQL Editor to enable private notes, links, todo tasks,
-- repeating agenda items, and the private storage used by password recovery
-- codes.
-- Password recovery also requires deploying the password-recovery Edge Function.
begin;

alter table if exists public.agenda_items
  add column if not exists week_start date,
  add column if not exists repeat_pattern text not null default 'weekly',
  add column if not exists repeat_days text[],
  add column if not exists category text;

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

create index if not exists notes_user_updated_idx
  on public.notes (user_id, updated_at desc);

create index if not exists agenda_items_user_start_idx
  on public.agenda_items (user_id, start_time);

create index if not exists user_links_user_created_idx
  on public.user_links (user_id, created_at desc);

create index if not exists todo_tasks_user_created_idx
  on public.todo_tasks (user_id, created_at);

create index if not exists password_recovery_email_idx
  on public.password_recovery_codes (lower(email));

alter table public.agenda_items enable row level security;
alter table public.notes enable row level security;
alter table public.user_links enable row level security;
alter table public.todo_tasks enable row level security;
alter table public.password_recovery_codes enable row level security;

revoke all on public.password_recovery_codes from anon, authenticated, public;
grant select, insert, update, delete
  on public.password_recovery_codes to service_role;

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
