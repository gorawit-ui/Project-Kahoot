-- Q20 scoring: accuracy first, then a proportional speed bonus.
-- Exact-match validation remains server-side. Safe to run on an existing project.
create or replace function public.submit_answer(p_code text, p_session_token text, p_response jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_room public.rooms;
  v_question public.questions;
  v_player public.players;
  v_correct boolean := false;
  v_points integer := 0;
  v_count integer := 0;
  v_speed_bonus integer := 0;
  v_remaining_seconds numeric := 0;
begin
  select * into v_room from rooms where code = upper(trim(p_code));
  if v_room.status <> 'question' or v_room.question_deadline_at is null or now() > v_room.question_deadline_at then
    raise exception 'ANSWER_LOCKED';
  end if;

  select * into v_player from players
    where room_id = v_room.id
      and session_token_hash = extensions.crypt(p_session_token, session_token_hash);
  if v_player.id is null then raise exception 'PLAYER_NOT_FOUND'; end if;

  select * into v_question from questions
    where quiz_id = v_room.quiz_id and position = v_room.current_position;

  if v_question.kind = 'choice' then
    v_correct := (p_response->>'option') = (v_question.correct_answer->>'option');
    if v_correct then
      v_points := 100 + floor(
        50 * extract(epoch from (v_room.question_deadline_at - now()))
        / v_question.time_limit_seconds
      );
    end if;
  else
    select count(*) into v_count
    from jsonb_array_elements(v_question.correct_answer->'answers') with ordinality expected(value, n)
    join jsonb_array_elements(coalesce(p_response->'answers', '[]'::jsonb)) with ordinality received(value, n) using (n)
    where expected.value #>> '{}' = received.value #>> '{}';

    -- Preserve the existing accuracy tiers.
    v_points := case
      when v_count = 10 then 500
      when v_count >= 8 then 450
      when v_count >= 5 then 300
      when v_count >= 2 then 200
      when v_count = 1 then 100
      else 0
    end;

    -- Up to 250 extra points. The bonus scales by both accuracy and remaining time,
    -- so a very fast low-accuracy answer cannot beat a slower high-accuracy answer.
    v_remaining_seconds := greatest(
      0,
      extract(epoch from (v_room.question_deadline_at - now()))
    );
    v_speed_bonus := floor(
      250.0
      * (v_count / 10.0)
      * (v_remaining_seconds / v_question.time_limit_seconds)
    );
    v_points := v_points + v_speed_bonus;
    v_correct := v_count > 0;
  end if;

  insert into answers(room_id, question_id, player_id, response, is_correct, score_awarded)
  values (v_room.id, v_question.id, v_player.id, p_response, v_correct, v_points);

  update players
  set total_score = total_score + v_points, last_seen_at = now()
  where id = v_player.id;

  return jsonb_build_object(
    'accepted', true,
    'scoreAwarded', v_points,
    'correctCount', case when v_question.kind = 'bonus' then v_count else null end,
    'speedBonus', case when v_question.kind = 'bonus' then v_speed_bonus else 0 end
  );
exception
  when unique_violation then raise exception 'ALREADY_ANSWERED';
end $$;

grant execute on function public.submit_answer(text, text, jsonb) to anon, authenticated;
