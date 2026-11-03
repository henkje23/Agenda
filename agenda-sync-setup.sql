-- Run this once in the Supabase SQL Editor to enable calendar-feed updates.
begin;

alter table public.agenda_items
  add column if not exists import_source_key text,
  add column if not exists import_uid text,
  add column if not exists import_instance text not null default '';

create unique index if not exists agenda_items_import_source_uid_idx
  on public.agenda_items (
    user_id,
    import_source_key,
    import_uid,
    import_instance
  );

commit;
