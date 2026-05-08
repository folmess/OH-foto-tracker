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
