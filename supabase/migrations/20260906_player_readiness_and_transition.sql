-- Player readiness count for the Lobby.
-- Run after 20260906_authoritative_game.sql and 20260906_reveal_scoreboard_results.sql.

alter table public.players add column if not exists ready_at timestamptz;
create index if not exists players_room_ready_idx on public.players(room_id, ready_at) where ready_at is not null;

create or replace function public.public_room_state(p_code text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_room public.rooms; v_question public.questions;
begin
  select * into v_room from rooms where code = upper(trim(p_code));
  if v_room.id is null then raise exception 'ROOM_NOT_FOUND'; end if;

  -- Keep the automatic three-second reveal. Host alone still starts the next question.
  if v_room.status = 'question' and v_room.question_deadline_at is not null and now() >= v_room.question_deadline_at + interval '3 seconds' then
    update rooms set status = 'reveal' where id = v_room.id returning * into v_room;
  end if;

  select * into v_question from questions where quiz_id = v_room.quiz_id and position = v_room.current_position;
  return jsonb_build_object(
    'room', jsonb_build_object(
      'code', v_room.code,
      'status', v_room.status,
      'currentPosition', v_room.current_position,
      'deadlineAt', v_room.question_deadline_at,
      'readyCount', (select count(*)::integer from players where room_id = v_room.id and ready_at is not null)
    ),
    'question', case when v_question.id is null then null else jsonb_build_object(
      'id', v_question.id, 'position', v_question.position, 'kind', v_question.kind,
      'prompt', v_question.prompt, 'media', v_question.media, 'options', v_question.options,
      'timeLimitSeconds', v_question.time_limit_seconds,
      'reveal', case when v_room.status = 'reveal' and v_question.kind = 'choice'
        then jsonb_build_object('correctOption', v_question.correct_answer->>'option')
        when v_room.status = 'reveal' and v_question.kind = 'bonus'
        then jsonb_build_object('correctAnswers', v_question.correct_answer->'answers')
        else null end
    ) end
  );
end $$;

create or replace function public.mark_player_ready(p_code text, p_session_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_room public.rooms; v_player public.players;
begin
  select * into v_room from rooms where code = upper(trim(p_code));
  if v_room.id is null or v_room.status = 'finished' then raise exception 'ROOM_UNAVAILABLE'; end if;

  select * into v_player from players
    where room_id = v_room.id and session_token_hash = extensions.crypt(p_session_token, session_token_hash);
  if v_player.id is null then raise exception 'PLAYER_NOT_FOUND'; end if;

  update players set ready_at = coalesce(ready_at, now()), last_seen_at = now() where id = v_player.id;
  return jsonb_build_object('ready', true, 'readyCount', (select count(*)::integer from players where room_id = v_room.id and ready_at is not null));
end $$;

grant execute on function public.mark_player_ready(text, text) to anon, authenticated;
