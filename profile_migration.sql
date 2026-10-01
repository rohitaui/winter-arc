-- Winter Arc — Profile fields migration
-- Run this once in Supabase SQL Editor for an existing project.
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
