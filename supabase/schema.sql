create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  color text not null default '#147a73',
  role text not null default 'photographer' check (role in ('admin', 'photographer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  place_number text,
  name text not null,
  address text,
  neighborhood text,
  lat double precision not null,
  lng double precision not null,
  saturday_open time,
  saturday_close time,
  sunday_open time,
  sunday_close time,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'pending' check (status in ('pending', 'assigned', 'in_progress', 'completed', 'issue', 'skipped')),
  assigned_photographer_id uuid references public.profiles(id),
  completed_by uuid references public.profiles(id),
  completed_at timestamptz,
  notes text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.places add column if not exists street_address text;
alter table public.places add column if not exists place_number text;
alter table public.places add column if not exists city text check (city in ('Rosario', 'Funes'));
alter table public.places add column if not exists full_address text;

create table if not exists public.geocoding_cache (
  id uuid primary key default gen_random_uuid(),
  query text not null unique,
  street_address text,
  city text,
  full_address text,
  lat double precision not null,
  lng double precision not null,
  provider text,
  raw_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.place_opening_slots (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  day_of_week text not null check (day_of_week in ('saturday', 'sunday')),
  period text not null check (period in ('morning', 'afternoon', 'custom')),
  open_time time not null,
  close_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (open_time < close_time)
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  place_id uuid references public.places(id) on delete cascade,
  photographer_id uuid references public.profiles(id),
  action text not null check (action in (
    'place_created',
    'place_updated',
    'assigned',
    'unassigned',
    'started',
    'completed',
    'issue_reported',
    'skipped',
    'note_added',
    'priority_changed',
    'status_changed',
    'reopened'
  )),
  note text,
  previous_status text,
  new_status text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);

create index if not exists places_status_idx on public.places(status);
create index if not exists places_priority_idx on public.places(priority);
create index if not exists places_assigned_photographer_id_idx on public.places(assigned_photographer_id);
create index if not exists places_location_idx on public.places(lat, lng);
create index if not exists places_place_number_idx on public.places(place_number);
create index if not exists activity_log_place_id_created_at_idx on public.activity_log(place_id, created_at desc);
create index if not exists geocoding_cache_query_idx on public.geocoding_cache(query);
create index if not exists place_opening_slots_place_id_idx on public.place_opening_slots(place_id);
create unique index if not exists place_opening_slots_unique_slot_idx on public.place_opening_slots(place_id, day_of_week, period, open_time, close_time);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists places_set_updated_at on public.places;
create trigger places_set_updated_at
before update on public.places
for each row execute function public.set_updated_at();

drop trigger if exists geocoding_cache_set_updated_at on public.geocoding_cache;
create trigger geocoding_cache_set_updated_at
before update on public.geocoding_cache
for each row execute function public.set_updated_at();

drop trigger if exists place_opening_slots_set_updated_at on public.place_opening_slots;
create trigger place_opening_slots_set_updated_at
before update on public.place_opening_slots
for each row execute function public.set_updated_at();

create or replace function public.current_profile_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid() and active = true;
$$;

create or replace function public.is_active_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and active = true);
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_profile_role() = 'admin';
$$;

create or replace function public.log_place_change(
  target_place_id uuid,
  action_name text,
  note_text text default null,
  previous_status_text text default null,
  new_status_text text default null,
  latitude_value double precision default null,
  longitude_value double precision default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_log (
    place_id,
    photographer_id,
    action,
    note,
    previous_status,
    new_status,
    latitude,
    longitude
  )
  values (
    target_place_id,
    auth.uid(),
    action_name,
    nullif(trim(note_text), ''),
    previous_status_text,
    new_status_text,
    latitude_value,
    longitude_value
  );
end;
$$;

create or replace function public.assign_place(target_place_id uuid, note_text text default null)
returns public.places
language plpgsql
security definer
set search_path = public
as $$
declare
  place_row public.places;
  previous_status_text text;
begin
  if not public.is_active_user() then
    raise exception 'unauthorized';
  end if;

  select * into place_row from public.places where id = target_place_id for update;
  if not found then
    raise exception 'place not found';
  end if;

  previous_status_text := place_row.status;

  update public.places
  set
    assigned_photographer_id = auth.uid(),
    status = case when status = 'pending' then 'assigned' else status end,
    completed_by = case when status = 'completed' then completed_by else null end,
    completed_at = case when status = 'completed' then completed_at else null end
  where id = target_place_id
  returning * into place_row;

  perform public.log_place_change(target_place_id, 'assigned', note_text, previous_status_text, place_row.status);
  return place_row;
end;
$$;

create or replace function public.unassign_place(target_place_id uuid, note_text text default null)
returns public.places
language plpgsql
security definer
set search_path = public
as $$
declare
  place_row public.places;
  previous_status_text text;
begin
  if not public.is_active_user() then
    raise exception 'unauthorized';
  end if;

  select * into place_row from public.places where id = target_place_id for update;
  if not found then
    raise exception 'place not found';
  end if;
  if place_row.assigned_photographer_id <> auth.uid() and not public.is_admin() then
    raise exception 'only assignee or admin can unassign';
  end if;

  previous_status_text := place_row.status;

  update public.places
  set assigned_photographer_id = null,
      status = case when status in ('assigned', 'in_progress') then 'pending' else status end
  where id = target_place_id
  returning * into place_row;

  perform public.log_place_change(target_place_id, 'unassigned', note_text, previous_status_text, place_row.status);
  return place_row;
end;
$$;

create or replace function public.set_place_status(
  target_place_id uuid,
  status_value text,
  note_text text default null,
  latitude_value double precision default null,
  longitude_value double precision default null
)
returns public.places
language plpgsql
security definer
set search_path = public
as $$
declare
  place_row public.places;
  previous_status_text text;
  action_name text;
begin
  if not public.is_active_user() then
    raise exception 'unauthorized';
  end if;
  if status_value not in ('pending', 'assigned', 'in_progress', 'completed', 'issue', 'skipped') then
    raise exception 'invalid status';
  end if;
  if status_value = 'pending' and not public.is_admin() then
    raise exception 'only admin can reopen';
  end if;
  if status_value = 'issue' and nullif(trim(coalesce(note_text, '')), '') is null then
    raise exception 'issue note required';
  end if;

  select * into place_row from public.places where id = target_place_id for update;
  if not found then
    raise exception 'place not found';
  end if;

  previous_status_text := place_row.status;
  action_name := case status_value
    when 'in_progress' then 'started'
    when 'completed' then 'completed'
    when 'issue' then 'issue_reported'
    when 'skipped' then 'skipped'
    when 'pending' then 'reopened'
    else 'status_changed'
  end;

  update public.places
  set
    status = status_value,
    assigned_photographer_id = case
      when status_value in ('assigned', 'in_progress') and assigned_photographer_id is null then auth.uid()
      when status_value = 'pending' then null
      else assigned_photographer_id
    end,
    completed_by = case when status_value = 'completed' then auth.uid() else null end,
    completed_at = case when status_value = 'completed' then now() else null end,
    notes = case
      when nullif(trim(coalesce(note_text, '')), '') is null then notes
      when notes is null or trim(notes) = '' then trim(note_text)
      else notes || E'\n' || trim(note_text)
    end
  where id = target_place_id
  returning * into place_row;

  perform public.log_place_change(target_place_id, action_name, note_text, previous_status_text, place_row.status, latitude_value, longitude_value);
  return place_row;
end;
$$;

create or replace function public.add_place_note(target_place_id uuid, note_text text)
returns public.places
language plpgsql
security definer
set search_path = public
as $$
declare
  place_row public.places;
begin
  if not public.is_active_user() then
    raise exception 'unauthorized';
  end if;
  if nullif(trim(coalesce(note_text, '')), '') is null then
    raise exception 'note required';
  end if;

  update public.places
  set notes = case
    when notes is null or trim(notes) = '' then trim(note_text)
    else notes || E'\n' || trim(note_text)
  end
  where id = target_place_id
  returning * into place_row;

  perform public.log_place_change(target_place_id, 'note_added', note_text, place_row.status, place_row.status);
  return place_row;
end;
$$;

create or replace function public.import_places(rows jsonb)
returns table(inserted_count integer, skipped_count integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'only admin can import places';
  end if;

  with input_rows as (
    select
      nullif(trim(value->>'name'), '') as name,
      nullif(trim(value->>'address'), '') as address,
      nullif(trim(value->>'neighborhood'), '') as neighborhood,
      (value->>'lat')::double precision as lat,
      (value->>'lng')::double precision as lng,
      nullif(value->>'saturday_open', '')::time as saturday_open,
      nullif(value->>'saturday_close', '')::time as saturday_close,
      nullif(value->>'sunday_open', '')::time as sunday_open,
      nullif(value->>'sunday_close', '')::time as sunday_close,
      coalesce(nullif(value->>'priority', ''), 'medium') as priority,
      nullif(trim(value->>'notes'), '') as notes
    from jsonb_array_elements(rows)
  ),
  inserted as (
    insert into public.places (
      name, address, neighborhood, lat, lng,
      saturday_open, saturday_close, sunday_open, sunday_close,
      priority, notes, status
    )
    select
      name, address, neighborhood, lat, lng,
      saturday_open, saturday_close, sunday_open, sunday_close,
      priority, notes, 'pending'
    from input_rows i
    where not exists (
      select 1 from public.places p
      where lower(p.name) = lower(i.name)
        and coalesce(lower(p.address), '') = coalesce(lower(i.address), '')
    )
    returning id
  )
  select
    (select count(*)::integer from inserted),
    ((select count(*)::integer from input_rows) - (select count(*)::integer from inserted))
  into inserted_count, skipped_count;

  return next;
end;
$$;

alter table public.profiles enable row level security;
alter table public.places enable row level security;
alter table public.activity_log enable row level security;
alter table public.geocoding_cache enable row level security;
alter table public.place_opening_slots enable row level security;

drop policy if exists "active users read active profiles" on public.profiles;
create policy "active users read active profiles"
on public.profiles for select
to authenticated
using (public.is_active_user() and active = true);

drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles"
on public.profiles for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "active users read places" on public.places;
create policy "active users read places"
on public.places for select
to authenticated
using (public.is_active_user());

drop policy if exists "admins create places" on public.places;
create policy "admins create places"
on public.places for insert
to authenticated
with check (public.is_admin());

drop policy if exists "admins update places" on public.places;
create policy "admins update places"
on public.places for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins delete places" on public.places;
create policy "admins delete places"
on public.places for delete
to authenticated
using (public.is_admin());

drop policy if exists "active users read activity" on public.activity_log;
create policy "active users read activity"
on public.activity_log for select
to authenticated
using (public.is_active_user());

drop policy if exists "active users insert activity" on public.activity_log;
create policy "active users insert activity"
on public.activity_log for insert
to authenticated
with check (public.is_active_user() and photographer_id = auth.uid());

drop policy if exists "active users read geocoding cache" on public.geocoding_cache;
create policy "active users read geocoding cache"
on public.geocoding_cache for select
to authenticated
using (public.is_active_user());

drop policy if exists "admins manage geocoding cache" on public.geocoding_cache;
create policy "admins manage geocoding cache"
on public.geocoding_cache for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "active users read opening slots" on public.place_opening_slots;
create policy "active users read opening slots"
on public.place_opening_slots for select
to authenticated
using (public.is_active_user());

drop policy if exists "admins manage opening slots" on public.place_opening_slots;
create policy "admins manage opening slots"
on public.place_opening_slots for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

do $$
begin
  alter publication supabase_realtime add table public.places;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.activity_log;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.place_opening_slots;
exception
  when duplicate_object then null;
end;
$$;
