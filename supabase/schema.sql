-- JIXGO Magical 24 — initial realtime quiz data model
create extension if not exists "pgcrypto";

create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  default_question_seconds integer not null default 15 check (default_question_seconds between 5 and 120),
  created_at timestamptz not null default now()
);

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  position integer not null check (position > 0),
  prompt text not null,
  image_url text,
  options jsonb not null,
  correct_option text not null,
  time_limit_seconds integer check (time_limit_seconds between 5 and 120),
  explanation text,
  unique (quiz_id, position)
);

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id),
  code text not null unique,
  status text not null default 'lobby' check (status in ('lobby', 'question', 'reveal', 'finished', 'paused')),
  mode text not null default 'solo' check (mode in ('solo', 'team')),
  question_index integer not null default 0,
  question_started_at timestamptz,
  question_deadline_at timestamptz,
  max_players integer not null default 100 check (max_players between 1 and 100),
  created_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  nickname text not null,
  session_token_hash text not null,
  team_id text,
  total_score integer not null default 0,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (room_id, nickname)
);

create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  selected_option text not null,
  is_correct boolean not null default false,
  answered_at timestamptz not null default now(),
  score_awarded integer not null default 0,
  unique (room_id, question_id, player_id)
);

create index if not exists players_room_score_idx on players(room_id, total_score desc);
create index if not exists answers_room_question_idx on answers(room_id, question_id);

-- Production note:
-- Keep correct_option and score_awarded out of public client payloads.
-- Validate deadline and calculate score in a trusted server function/API.
-- Add RLS policies before connecting a public Supabase client.
-- Team mode is represented in the model but intentionally hidden from MVP UI.
