-- JIXGO Magical 24 — authoritative multiplayer game backend
-- Run this in a new Supabase project before enabling the live UI.
create extension if not exists pgcrypto;

create type public.room_status as enum ('lobby', 'question', 'reveal', 'paused', 'finished');
create type public.question_kind as enum ('choice', 'bonus');

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  position integer not null check (position > 0),
  kind public.question_kind not null default 'choice',
  prompt text not null,
  media jsonb not null default '{}'::jsonb,
  options jsonb not null default '[]'::jsonb,
  time_limit_seconds integer not null check (time_limit_seconds between 5 and 120),
  -- Private columns: never grant direct SELECT to anon/authenticated.
  correct_answer jsonb not null,
  unique (quiz_id, position)
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id),
  code text not null unique check (code ~ '^[0-9]{6}$'),
  status public.room_status not null default 'lobby',
  current_position integer not null default 1,
  question_started_at timestamptz,
  question_deadline_at timestamptz,
  host_token_hash text not null,
  created_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 24),
  session_token_hash text not null,
  total_score integer not null default 0,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (room_id, nickname),
  unique (room_id, session_token_hash)
);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  response jsonb not null,
  is_correct boolean not null,
  score_awarded integer not null default 0,
  answered_at timestamptz not null default now(),
  unique (room_id, question_id, player_id)
);

create index players_leaderboard_idx on public.players(room_id, total_score desc, joined_at asc);
create index answers_room_question_idx on public.answers(room_id, question_id);

alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.answers enable row level security;

-- Public state contains no answer key. Answers are written only through RPC.
create policy "public read rooms" on public.rooms for select using (true);
create policy "public read leaderboard" on public.players for select using (true);
create policy "public read quiz title" on public.quizzes for select using (true);
-- Intentionally no direct policy for questions or answers.

create or replace function public.public_room_state(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_room public.rooms; v_question public.questions;
begin
  select * into v_room from rooms where code = upper(trim(p_code));
  if v_room.id is null then raise exception 'ROOM_NOT_FOUND'; end if;
  select * into v_question from questions where quiz_id = v_room.quiz_id and position = v_room.current_position;
  return jsonb_build_object(
    'room', jsonb_build_object('code', v_room.code, 'status', v_room.status, 'currentPosition', v_room.current_position, 'deadlineAt', v_room.question_deadline_at),
    'question', case when v_question.id is null then null else jsonb_build_object('id', v_question.id, 'position', v_question.position, 'kind', v_question.kind, 'prompt', v_question.prompt, 'media', v_question.media, 'options', v_question.options, 'timeLimitSeconds', v_question.time_limit_seconds) end
  );
end $$;

create or replace function public.join_room(p_code text, p_nickname text, p_session_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_room public.rooms; v_player public.players;
begin
  select * into v_room from rooms where code = upper(trim(p_code));
  if v_room.id is null or v_room.status = 'finished' then raise exception 'ROOM_UNAVAILABLE'; end if;
  insert into players(room_id, nickname, session_token_hash)
  values (v_room.id, trim(p_nickname), crypt(p_session_token, gen_salt('bf')))
  returning * into v_player;
  return jsonb_build_object('playerId', v_player.id, 'roomCode', v_room.code, 'status', v_room.status);
exception when unique_violation then raise exception 'NICKNAME_TAKEN';
end $$;

create or replace function public.submit_answer(p_code text, p_session_token text, p_response jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_room public.rooms; v_question public.questions; v_player public.players;
declare v_correct boolean := false; v_points integer := 0; v_count integer := 0;
begin
  select * into v_room from rooms where code = upper(trim(p_code));
  if v_room.status <> 'question' or v_room.question_deadline_at is null or now() > v_room.question_deadline_at then raise exception 'ANSWER_LOCKED'; end if;
  select * into v_player from players where room_id = v_room.id and session_token_hash = crypt(p_session_token, session_token_hash);
  if v_player.id is null then raise exception 'PLAYER_NOT_FOUND'; end if;
  select * into v_question from questions where quiz_id = v_room.quiz_id and position = v_room.current_position;
  if v_question.kind = 'choice' then
    v_correct := (p_response->>'option') = (v_question.correct_answer->>'option');
    if v_correct then v_points := 100 + floor(50 * extract(epoch from (v_room.question_deadline_at - now())) / v_question.time_limit_seconds); end if;
  else
    select count(*) into v_count from jsonb_array_elements(v_question.correct_answer->'answers') with ordinality expected(value, n)
      join jsonb_array_elements(coalesce(p_response->'answers', '[]'::jsonb)) with ordinality received(value, n) using (n)
      where expected.value #>> '{}' = received.value #>> '{}';
    v_points := case when v_count = 10 then 500 when v_count >= 8 then 450 when v_count >= 5 then 300 when v_count >= 2 then 200 when v_count = 1 then 100 else 0 end;
    v_correct := v_count > 0;
  end if;
  insert into answers(room_id, question_id, player_id, response, is_correct, score_awarded)
  values (v_room.id, v_question.id, v_player.id, p_response, v_correct, v_points);
  update players set total_score = total_score + v_points, last_seen_at = now() where id = v_player.id;
  return jsonb_build_object('accepted', true, 'scoreAwarded', v_points, 'correctCount', case when v_question.kind = 'bonus' then v_count else null end);
exception when unique_violation then raise exception 'ALREADY_ANSWERED';
end $$;

create or replace function public.host_set_question(p_code text, p_host_token text, p_position integer, p_status public.room_status)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_room public.rooms; v_question public.questions; v_deadline timestamptz;
begin
  select * into v_room from rooms where code = upper(trim(p_code)) and host_token_hash = crypt(p_host_token, host_token_hash);
  if v_room.id is null then raise exception 'HOST_UNAUTHORIZED'; end if;
  select * into v_question from questions where quiz_id = v_room.quiz_id and position = p_position;
  if v_question.id is null then raise exception 'QUESTION_NOT_FOUND'; end if;
  v_deadline := case when p_status = 'question' then now() + make_interval(secs => v_question.time_limit_seconds) else null end;
  update rooms set current_position = p_position, status = p_status, question_started_at = case when p_status = 'question' then now() else question_started_at end, question_deadline_at = v_deadline where id = v_room.id;
  return public.public_room_state(v_room.code);
end $$;

-- This is deliberately Host-only: it returns participant names and scores, but never correct answers.
create or replace function public.host_room_state(p_code text, p_host_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_room public.rooms;
begin
  select * into v_room from rooms where code = upper(trim(p_code)) and host_token_hash = crypt(p_host_token, host_token_hash);
  if v_room.id is null then raise exception 'HOST_UNAUTHORIZED'; end if;
  return jsonb_build_object(
    'state', public.public_room_state(v_room.code),
    'playerCount', (select count(*) from players where room_id = v_room.id),
    'leaderboard', coalesce((select jsonb_agg(jsonb_build_object('nickname', nickname, 'score', total_score) order by total_score desc, joined_at asc)
      from players where room_id = v_room.id), '[]'::jsonb)
  );
end $$;

-- Seeding uses the service_role only. It hashes the Host secret inside Postgres, so no hash or
-- answer key ever needs to be generated in the browser.
create or replace function public.initialize_game_room(p_quiz_id uuid, p_code text, p_host_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_room public.rooms;
begin
  select * into v_room from rooms where code = upper(trim(p_code));
  if v_room.id is null then
    insert into rooms(quiz_id, code, host_token_hash)
    values (p_quiz_id, upper(trim(p_code)), crypt(p_host_token, gen_salt('bf')))
    returning * into v_room;
  elsif v_room.quiz_id <> p_quiz_id then
    raise exception 'ROOM_CODE_IN_USE';
  else
    update rooms set host_token_hash = crypt(p_host_token, gen_salt('bf')) where id = v_room.id returning * into v_room;
  end if;
  return jsonb_build_object('code', v_room.code, 'status', v_room.status);
end $$;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.rooms, public.players, public.quizzes to anon, authenticated;
grant execute on function public.public_room_state(text), public.join_room(text, text, text), public.submit_answer(text, text, jsonb), public.host_set_question(text, text, integer, public.room_status), public.host_room_state(text, text) to anon, authenticated;
revoke execute on function public.initialize_game_room(uuid, text, text) from public, anon, authenticated;
grant execute on function public.initialize_game_room(uuid, text, text) to service_role;

alter publication supabase_realtime add table public.rooms, public.players;
