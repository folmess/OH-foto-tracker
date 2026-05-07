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

create index if not exists geocoding_cache_query_idx on public.geocoding_cache(query);
create index if not exists places_place_number_idx on public.places(place_number);
create index if not exists place_opening_slots_place_id_idx on public.place_opening_slots(place_id);
create unique index if not exists place_opening_slots_unique_slot_idx on public.place_opening_slots(place_id, day_of_week, period, open_time, close_time);

drop trigger if exists geocoding_cache_set_updated_at on public.geocoding_cache;
create trigger geocoding_cache_set_updated_at
before update on public.geocoding_cache
for each row execute function public.set_updated_at();

drop trigger if exists place_opening_slots_set_updated_at on public.place_opening_slots;
create trigger place_opening_slots_set_updated_at
before update on public.place_opening_slots
for each row execute function public.set_updated_at();

alter table public.geocoding_cache enable row level security;
alter table public.place_opening_slots enable row level security;

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
  alter publication supabase_realtime add table public.place_opening_slots;
exception
  when duplicate_object then null;
end;
$$;
