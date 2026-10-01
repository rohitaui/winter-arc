-- Winter Arc — Supabase schema
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  gender text,
  date_of_birth date,
  height_feet smallint check (height_feet is null or height_feet between 1 and 8),
  height_inches smallint check (height_inches is null or height_inches between 0 and 11),
  weight_kg numeric(5,2) check (weight_kg is null or weight_kg between 1 and 500),
  created_at timestamptz not null default now()
);

-- Safe migration for existing Winter Arc projects
alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles add column if not exists height_feet smallint;
alter table public.profiles add column if not exists height_inches smallint;
alter table public.profiles add column if not exists weight_kg numeric(5,2);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_height_feet_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_height_feet_check CHECK (height_feet IS NULL OR height_feet BETWEEN 1 AND 8);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_height_inches_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_height_inches_check CHECK (height_inches IS NULL OR height_inches BETWEEN 0 AND 11);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_weight_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_weight_check CHECK (weight_kg IS NULL OR weight_kg BETWEEN 1 AND 500);
  END IF;
END $$;

create table if not exists public.arc_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  day_number int not null check (day_number between 1 and 92),
  date date not null,
  completed boolean not null default false,
  workout_completed boolean not null default false,
  habits jsonb not null default '{}'::jsonb,
  journal text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, day_number)
);

alter table public.profiles enable row level security;
alter table public.arc_days enable row level security;

drop policy if exists "profiles own row" on public.profiles;
create policy "profiles own row" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "arc days own rows" on public.arc_days;
create policy "arc days own rows" on public.arc_days
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
