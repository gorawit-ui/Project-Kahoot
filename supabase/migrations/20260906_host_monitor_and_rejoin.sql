-- Host live monitor data and safe player rejoin.
-- Run after 20260906_authoritative_game.sql, 20260906_reveal_scoreboard_results.sql,
-- and 20260906_player_readiness_and_transition.sql.

create or replace function public.join_room(p_code text, p_nickname text, p_session_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_room public.rooms; v_player public.players;
begin
  select * into v_room from rooms where code = upper(trim(p_code));
  if v_room.id is null or v_room.status = 'finished' then raise exception 'ROOM_UNAVAILABLE'; end if;

  -- A returning browser has the same opaque httpOnly token, so it regains its own
  -- player row and score without letting another browser claim the nickname.
  select * into v_player from players
    where room_id = v_room.id and session_token_hash = extensions.crypt(p_session_token, session_token_hash);
  if v_player.id is not null then
    if v_player.nickname <> trim(p_nickname) then raise exception 'SESSION_NAME_MISMATCH'; end if;
    update players set last_seen_at = now() where id = v_player.id;
    return jsonb_build_object('playerId', v_player.id, 'roomCode', v_room.code, 'status', v_room.status, 'rejoined', true);
  end if;

  insert into players(room_id, nickname, session_token_hash)
  values (v_room.id, trim(p_nickname), extensions.crypt(p_session_token, extensions.gen_salt('bf')))
  returning * into v_player;
  return jsonb_build_object('playerId', v_player.id, 'roomCode', v_room.code, 'status', v_room.status, 'rejoined', false);
exception when unique_violation then raise exception 'NICKNAME_TAKEN';
end $$;

create or replace function public.host_room_state(p_code text, p_host_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_room public.rooms; v_question public.questions;
begin
  select * into v_room from rooms where code = upper(trim(p_code)) and host_token_hash = extensions.crypt(p_host_token, host_token_hash);
  if v_room.id is null then raise exception 'HOST_UNAUTHORIZED'; end if;
  select * into v_question from questions where quiz_id = v_room.quiz_id and position = v_room.current_position;

  return jsonb_build_object(
    'state', public.public_room_state(v_room.code),
    'playerCount', (select count(*)::integer from players where room_id = v_room.id),
    'readyCount', (select count(*)::integer from players where room_id = v_room.id and ready_at is not null),
    'answerCount', case when v_question.id is null then 0 else (select count(*)::integer from answers where room_id = v_room.id and question_id = v_question.id) end,
    'leaderboard', coalesce((select jsonb_agg(jsonb_build_object('nickname', nickname, 'score', total_score) order by total_score desc, joined_at asc)
      from players where room_id = v_room.id), '[]'::jsonb)
  );
end $$;
