-- Live reveal, player ranking and final-result support.
-- Run after 20260906_authoritative_game.sql for an existing JIXGO project.

create or replace function public.public_room_state(p_code text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_room public.rooms; v_question public.questions;
begin
  select * into v_room from rooms where code = upper(trim(p_code));
  if v_room.id is null then raise exception 'ROOM_NOT_FOUND'; end if;
  select * into v_question from questions where quiz_id = v_room.quiz_id and position = v_room.current_position;
  return jsonb_build_object(
    'room', jsonb_build_object('code', v_room.code, 'status', v_room.status, 'currentPosition', v_room.current_position, 'deadlineAt', v_room.question_deadline_at),
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

create or replace function public.player_room_summary(p_code text, p_session_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_room public.rooms; v_player public.players;
begin
  select * into v_room from rooms where code = upper(trim(p_code));
  if v_room.id is null then raise exception 'ROOM_NOT_FOUND'; end if;
  select * into v_player from players
    where room_id = v_room.id and session_token_hash = extensions.crypt(p_session_token, session_token_hash);
  if v_player.id is null then raise exception 'PLAYER_NOT_FOUND'; end if;
  return jsonb_build_object(
    'player', (select jsonb_build_object('nickname', nickname, 'score', total_score, 'rank', rank) from (
      select id, nickname, total_score, row_number() over (order by total_score desc, joined_at asc)::integer as rank
      from players where room_id = v_room.id
    ) ranked where id = v_player.id),
    'leaderboard', coalesce((select jsonb_agg(jsonb_build_object('nickname', nickname, 'score', total_score, 'rank', rank) order by rank) from (
      select nickname, total_score, row_number() over (order by total_score desc, joined_at asc)::integer as rank
      from players where room_id = v_room.id limit 10
    ) ranked), '[]'::jsonb)
  );
end $$;

grant execute on function public.player_room_summary(text, text) to anon, authenticated;
