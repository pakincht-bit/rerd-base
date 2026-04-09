-- Radia Auth: Profiles Table
-- Run this in your Supabase Dashboard → SQL Editor
-- This creates the user profiles table for auth

-- 1. Create the profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  display_name text,
  avatar_url text,
  plan text default 'free' check (plan in ('free', 'pro')),
  ai_usage_count integer default 0,
  csv_upload_count integer default 0,
  created_at timestamptz default now()
);

-- 2. Enable Row Level Security
alter table public.profiles enable row level security;

-- 3. RLS Policies — users can only access their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);
