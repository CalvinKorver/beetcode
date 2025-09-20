-- Beetcode Supabase Schema Setup
-- Run this in your Supabase SQL Editor

-- Create profiles table to extend auth.users
create table if not exists public.profiles (
  id uuid not null references auth.users on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  provider text, -- 'google', 'github', etc.
  provider_id text, -- ID from the OAuth provider
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (id)
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Create RLS policies
-- Users can view their own profile
create policy "Users can view own profile" on public.profiles
  for select using ( (select auth.uid()) = id );

-- Users can insert their own profile
create policy "Users can insert own profile" on public.profiles
  for insert with check ( (select auth.uid()) = id );

-- Users can update their own profile
create policy "Users can update own profile" on public.profiles
  for update using ( (select auth.uid()) = id );

-- Create function to handle new user registration
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, provider, provider_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_app_meta_data ->> 'provider',
    new.raw_user_meta_data ->> 'provider_id'
  );
  return new;
end;
$$;

-- Create trigger to automatically create profile on user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create function to handle profile updates
create or replace function public.handle_user_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set
    email = new.email,
    full_name = coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    avatar_url = new.raw_user_meta_data ->> 'avatar_url',
    updated_at = timezone('utc'::text, now())
  where id = new.id;
  return new;
end;
$$;

-- Create trigger to update profile when auth.users is updated
drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_user_update();

-- Add index for better performance
create index if not exists profiles_id_idx on public.profiles (id);
create index if not exists profiles_email_idx on public.profiles (email);

-- Grant permissions (these should already be set by default in Supabase)
grant usage on schema public to anon, authenticated;
grant all on public.profiles to anon, authenticated;