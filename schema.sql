-- ═══════════════════════════════════════════════════════════════
-- DRAFT BOARD BUILDER - DATABASE SCHEMA
-- Run this in Supabase SQL Editor (Settings → SQL Editor → New Query)
-- ═══════════════════════════════════════════════════════════════

-- Boards table: stores each user's big board as JSON
create table public.boards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null unique,
  board_data jsonb not null default '{}',
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Index for fast lookups by user
create index idx_boards_user_id on public.boards(user_id);

-- Enable Row Level Security
alter table public.boards enable row level security;

-- Users can only read their own board
create policy "Users can read own board"
  on public.boards for select
  using (auth.uid() = user_id);

-- Users can insert their own board
create policy "Users can insert own board"
  on public.boards for insert
  with check (auth.uid() = user_id);

-- Users can update their own board
create policy "Users can update own board"
  on public.boards for update
  using (auth.uid() = user_id);

-- Auto-update the updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_board_updated
  before update on public.boards
  for each row execute function public.handle_updated_at();
