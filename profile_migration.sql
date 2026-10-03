-- Winter Arc — Profile fields migration
-- Run this once in Supabase SQL Editor for an existing project.
alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles add column if not exists age smallint;
alter table public.profiles add column if not exists height_feet smallint;
alter table public.profiles add column if not exists height_inches smallint;
alter table public.profiles add column if not exists weight_kg numeric(5,2);
alter table public.profiles add column if not exists arc_preferences jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists onboarding_completed boolean not null default true;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, onboarding_completed)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), false)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_age_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_age_check CHECK (age IS NULL OR age BETWEEN 13 AND 100);
  END IF;
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
