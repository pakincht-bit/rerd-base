-- Radia: Bookmarks Table
-- Run this in your Supabase Dashboard → SQL Editor
-- This creates the bookmarks table so users can save/star projects

-- 1. Create the bookmarks table
create table if not exists public.bookmarks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  project_id text not null,
  created_at timestamptz default now()
);

-- 2. Unique constraint — one bookmark per user per project
create unique index if not exists bookmarks_user_project_unique
  on public.bookmarks (user_id, project_id);

-- 3. Index for fast lookups by user
create index if not exists bookmarks_user_id_idx
  on public.bookmarks (user_id);

-- 4. Enable Row Level Security
alter table public.bookmarks enable row level security;

-- 5. RLS Policies — users can only access their own bookmarks
create policy "Users can view own bookmarks"
  on public.bookmarks for select
  using (auth.uid() = user_id);

create policy "Users can insert own bookmarks"
  on public.bookmarks for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own bookmarks"
  on public.bookmarks for delete
  using (auth.uid() = user_id);
