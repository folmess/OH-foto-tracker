create table if not exists public.place_assignments (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  photographer_id uuid not null references public.profiles(id),
  status text not null default 'assigned' check (status in ('assigned', 'in_progress', 'completed', 'cancelled')),
  note text,
  assigned_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.place_photo_sessions (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  photographer_id uuid not null references public.profiles(id),
  assignment_id uuid references public.place_assignments(id) on delete set null,
  note text,
  latitude double precision,
  longitude double precision,
  photographed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists place_assignments_place_id_idx on public.place_assignments(place_id);
create index if not exists place_assignments_photographer_id_idx on public.place_assignments(photographer_id);
create index if not exists place_assignments_status_idx on public.place_assignments(status);
create unique index if not exists place_assignments_one_active_per_photographer_idx
on public.place_assignments(place_id, photographer_id)
where status in ('assigned', 'in_progress');

create index if not exists place_photo_sessions_place_id_idx on public.place_photo_sessions(place_id);
create index if not exists place_photo_sessions_photographer_id_idx on public.place_photo_sessions(photographer_id);
create index if not exists place_photo_sessions_photographed_at_idx on public.place_photo_sessions(photographed_at desc);

drop trigger if exists place_assignments_set_updated_at on public.place_assignments;
create trigger place_assignments_set_updated_at
before update on public.place_assignments
for each row execute function public.set_updated_at();

drop trigger if exists place_photo_sessions_set_updated_at on public.place_photo_sessions;
create trigger place_photo_sessions_set_updated_at
before update on public.place_photo_sessions
for each row execute function public.set_updated_at();

insert into public.place_assignments (place_id, photographer_id, status, assigned_at)
select id, assigned_photographer_id, case when status = 'in_progress' then 'in_progress' else 'assigned' end, coalesce(updated_at, created_at, now())
from public.places
where assigned_photographer_id is not null
  and status <> 'completed'
  and not exists (
    select 1
    from public.place_assignments pa
    where pa.place_id = places.id
      and pa.photographer_id = places.assigned_photographer_id
      and pa.status in ('assigned', 'in_progress')
  );

insert into public.place_photo_sessions (place_id, photographer_id, photographed_at)
select id, completed_by, coalesce(completed_at, updated_at, now())
from public.places
where completed_by is not null
  and not exists (
    select 1
    from public.place_photo_sessions ps
    where ps.place_id = places.id
      and ps.photographer_id = places.completed_by
      and ps.photographed_at = coalesce(places.completed_at, places.updated_at, now())
  );

create or replace function public.recompute_place_rollup(target_place_id uuid)
returns public.places
language plpgsql
security definer
set search_path = public
as $$
declare
  place_row public.places;
  active_count integer;
  progress_count integer;
  session_count integer;
  first_active uuid;
  latest_photographer uuid;
  latest_photographed_at timestamptz;
  next_status text;
begin
  select count(*), count(*) filter (where status = 'in_progress'), min(photographer_id::text)::uuid
  into active_count, progress_count, first_active
  from public.place_assignments
  where place_id = target_place_id
    and status in ('assigned', 'in_progress');

  select count(*) into session_count
  from public.place_photo_sessions
  where place_id = target_place_id;

  select photographer_id, photographed_at
  into latest_photographer, latest_photographed_at
  from public.place_photo_sessions
  where place_id = target_place_id
  order by photographed_at desc, created_at desc
  limit 1;

  select * into place_row from public.places where id = target_place_id for update;
  if not found then
    raise exception 'place not found';
  end if;

  next_status := case
    when progress_count > 0 then 'in_progress'
    when active_count > 0 then 'assigned'
    when place_row.status = 'skipped' then 'skipped'
    when session_count > 0 then 'completed'
    when place_row.status = 'issue' then 'issue'
    else 'pending'
  end;

  update public.places
  set
    status = next_status,
    assigned_photographer_id = first_active,
    completed_by = latest_photographer,
    completed_at = latest_photographed_at
  where id = target_place_id
  returning * into place_row;

  return place_row;
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
  assignment_row public.place_assignments;
begin
  if not public.is_active_user() then
    raise exception 'unauthorized';
  end if;

  select * into place_row from public.places where id = target_place_id for update;
  if not found then
    raise exception 'place not found';
  end if;

  previous_status_text := place_row.status;

  select * into assignment_row
  from public.place_assignments
  where place_id = target_place_id
    and photographer_id = auth.uid()
    and status in ('assigned', 'in_progress')
  for update;

  if found then
    update public.place_assignments
    set note = coalesce(nullif(trim(note_text), ''), note),
        cancelled_at = null
    where id = assignment_row.id;
  else
    insert into public.place_assignments (place_id, photographer_id, status, note)
    values (target_place_id, auth.uid(), 'assigned', nullif(trim(note_text), ''));
  end if;

  place_row := public.recompute_place_rollup(target_place_id);
  perform public.log_place_change(target_place_id, 'assigned', note_text, previous_status_text, place_row.status);
  return place_row;
end;
$$;

create or replace function public.assign_place_to(target_place_id uuid, photographer_uuid uuid, note_text text default null)
returns public.places
language plpgsql
security definer
set search_path = public
as $$
declare
  place_row public.places;
  previous_status_text text;
  assignment_row public.place_assignments;
begin
  if not public.is_admin() then
    raise exception 'only admin can assign photographers';
  end if;
  if not exists(select 1 from public.profiles where id = photographer_uuid and active = true and role in ('photographer', 'admin')) then
    raise exception 'photographer not found';
  end if;

  select * into place_row from public.places where id = target_place_id for update;
  if not found then
    raise exception 'place not found';
  end if;

  previous_status_text := place_row.status;

  select * into assignment_row
  from public.place_assignments
  where place_id = target_place_id
    and photographer_id = photographer_uuid
    and status in ('assigned', 'in_progress')
  for update;

  if found then
    update public.place_assignments
    set note = coalesce(nullif(trim(note_text), ''), note),
        cancelled_at = null
    where id = assignment_row.id;
  else
    insert into public.place_assignments (place_id, photographer_id, status, note)
    values (target_place_id, photographer_uuid, 'assigned', nullif(trim(note_text), ''));
  end if;

  place_row := public.recompute_place_rollup(target_place_id);
  perform public.log_place_change(target_place_id, 'assigned', note_text, previous_status_text, place_row.status);
  return place_row;
end;
$$;

create or replace function public.unassign_place(target_place_id uuid, note_text text default null, photographer_uuid uuid default null)
returns public.places
language plpgsql
security definer
set search_path = public
as $$
declare
  place_row public.places;
  previous_status_text text;
  target_photographer uuid;
begin
  if not public.is_active_user() then
    raise exception 'unauthorized';
  end if;

  select * into place_row from public.places where id = target_place_id for update;
  if not found then
    raise exception 'place not found';
  end if;

  target_photographer := coalesce(photographer_uuid, auth.uid());
  if target_photographer <> auth.uid() and not public.is_admin() then
    raise exception 'only admin can unassign another photographer';
  end if;

  previous_status_text := place_row.status;

  update public.place_assignments
  set status = 'cancelled',
      cancelled_at = now(),
      note = coalesce(nullif(trim(note_text), ''), note)
  where place_id = target_place_id
    and photographer_id = target_photographer
    and status in ('assigned', 'in_progress');

  place_row := public.recompute_place_rollup(target_place_id);
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
  assignment_row public.place_assignments;
  assignment_uuid uuid;
  has_assignment boolean;
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

  if status_value = 'in_progress' then
    select * into assignment_row
    from public.place_assignments
    where place_id = target_place_id
      and photographer_id = auth.uid()
      and status in ('assigned', 'in_progress')
    for update;

    if found then
      update public.place_assignments
      set status = 'in_progress',
          started_at = coalesce(started_at, now()),
          note = coalesce(nullif(trim(note_text), ''), note)
      where id = assignment_row.id;
    else
      insert into public.place_assignments (place_id, photographer_id, status, note, started_at)
      values (target_place_id, auth.uid(), 'in_progress', nullif(trim(note_text), ''), now());
    end if;

    if nullif(trim(coalesce(note_text, '')), '') is not null then
      update public.places
      set notes = case
        when notes is null or trim(notes) = '' then trim(note_text)
        else notes || E'\n' || trim(note_text)
      end
      where id = target_place_id;
    end if;

    place_row := public.recompute_place_rollup(target_place_id);
  elsif status_value = 'completed' then
    select * into assignment_row
    from public.place_assignments
    where place_id = target_place_id
      and photographer_id = auth.uid()
      and status in ('assigned', 'in_progress')
    order by assigned_at desc
    limit 1
    for update;

    has_assignment := found;
    assignment_uuid := case when has_assignment then assignment_row.id else null end;

    insert into public.place_photo_sessions (
      place_id,
      photographer_id,
      assignment_id,
      note,
      latitude,
      longitude
    )
    values (
      target_place_id,
      auth.uid(),
      assignment_uuid,
      nullif(trim(note_text), ''),
      latitude_value,
      longitude_value
    );

    if has_assignment then
      update public.place_assignments
      set status = 'completed',
          completed_at = now(),
          note = coalesce(nullif(trim(note_text), ''), note)
      where id = assignment_row.id;
    end if;

    if nullif(trim(coalesce(note_text, '')), '') is not null then
      update public.places
      set notes = case
        when notes is null or trim(notes) = '' then trim(note_text)
        else notes || E'\n' || trim(note_text)
      end
      where id = target_place_id;
    end if;

    place_row := public.recompute_place_rollup(target_place_id);
  elsif status_value = 'pending' then
    update public.place_assignments
    set status = 'cancelled',
        cancelled_at = now()
    where place_id = target_place_id
      and status in ('assigned', 'in_progress');

    update public.places
    set status = 'pending',
        assigned_photographer_id = null,
        notes = case
          when nullif(trim(coalesce(note_text, '')), '') is null then notes
          when notes is null or trim(notes) = '' then trim(note_text)
          else notes || E'\n' || trim(note_text)
        end
    where id = target_place_id
    returning * into place_row;
  elsif status_value in ('issue', 'skipped') then
    if status_value = 'skipped' then
      update public.place_assignments
      set status = 'cancelled',
          cancelled_at = now()
      where place_id = target_place_id
        and status in ('assigned', 'in_progress');
    end if;

    update public.places
    set status = status_value,
        assigned_photographer_id = case when status_value = 'skipped' then null else assigned_photographer_id end,
        notes = case
          when nullif(trim(coalesce(note_text, '')), '') is null then notes
          when notes is null or trim(notes) = '' then trim(note_text)
          else notes || E'\n' || trim(note_text)
        end
    where id = target_place_id
    returning * into place_row;
  else
    place_row := public.recompute_place_rollup(target_place_id);
  end if;

  perform public.log_place_change(target_place_id, action_name, note_text, previous_status_text, place_row.status, latitude_value, longitude_value);
  return place_row;
end;
$$;

alter table public.place_assignments enable row level security;
alter table public.place_photo_sessions enable row level security;

drop policy if exists "active users read assignments" on public.place_assignments;
create policy "active users read assignments"
on public.place_assignments for select
to authenticated
using (public.is_active_user());

drop policy if exists "admins manage assignments" on public.place_assignments;
create policy "admins manage assignments"
on public.place_assignments for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "active users read photo sessions" on public.place_photo_sessions;
create policy "active users read photo sessions"
on public.place_photo_sessions for select
to authenticated
using (public.is_active_user());

drop policy if exists "admins manage photo sessions" on public.place_photo_sessions;
create policy "admins manage photo sessions"
on public.place_photo_sessions for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

do $$
begin
  alter publication supabase_realtime add table public.place_assignments;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.place_photo_sessions;
exception
  when duplicate_object then null;
end;
$$;
