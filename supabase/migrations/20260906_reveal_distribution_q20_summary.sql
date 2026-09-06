-- Aggregate reveal boards, with no player names or raw responses exposed.
-- Run after the prior 20260906 JIXGO migrations.

alter type public.room_status add value if not exists 'q20_summary';

create or replace function public.public_room_state(p_code text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_room public.rooms; v_question public.questions; v_total integer; v_answered integer;
begin
  select * into v_room from rooms where code = upper(trim(p_code));
  if v_room.id is null then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_room.status = 'question' and v_room.question_deadline_at is not null and now() >= v_room.question_deadline_at + interval '3 seconds' then
    update rooms set status = 'reveal' where id = v_room.id returning * into v_room;
  end if;
  select * into v_question from questions where quiz_id = v_room.quiz_id and position = v_room.current_position;
  select count(*)::integer into v_total from players where room_id = v_room.id;
  select count(*)::integer into v_answered from answers where room_id = v_room.id and question_id = v_question.id;
  return jsonb_build_object(
    'room', jsonb_build_object('code', v_room.code, 'status', v_room.status, 'currentPosition', v_room.current_position, 'deadlineAt', v_room.question_deadline_at, 'readyCount', (select count(*)::integer from players where room_id = v_room.id and ready_at is not null)),
    'question', case when v_question.id is null then null else jsonb_build_object(
      'id', v_question.id, 'position', v_question.position, 'kind', v_question.kind, 'prompt', v_question.prompt, 'media', v_question.media, 'options', v_question.options, 'timeLimitSeconds', v_question.time_limit_seconds,
      'reveal', case when v_room.status = 'reveal' and v_question.kind = 'choice' then jsonb_build_object('correctOption', v_question.correct_answer->>'option') when v_room.status = 'reveal' and v_question.kind = 'bonus' then jsonb_build_object('correctAnswers', v_question.correct_answer->'answers') else null end
    ) end,
    'distribution', case when v_room.status = 'reveal' and v_question.kind = 'choice' then jsonb_build_object(
      'totalPlayers', v_total, 'answered', v_answered, 'unanswered', greatest(v_total - v_answered, 0),
      'options', (select coalesce(jsonb_agg(jsonb_build_object('option', option_value, 'count', option_count, 'percent', case when v_total = 0 then 0 else round(option_count * 100.0 / v_total)::integer end, 'correct', option_value = v_question.correct_answer->>'option') order by ord), '[]'::jsonb) from (select option_value, ord, (select count(*)::integer from answers a where a.room_id = v_room.id and a.question_id = v_question.id and a.response->>'option' = option_value) as option_count from jsonb_array_elements_text(v_question.options) with ordinality options(option_value, ord)) counted)
    ) else null end,
    'bonusSummary', case when v_room.status::text = 'q20_summary' and v_question.kind = 'bonus' then jsonb_build_object(
      'totalPlayers', v_total, 'submitted', v_answered, 'notSubmitted', greatest(v_total - v_answered, 0),
      'perfect', (select count(*)::integer from answers a where a.room_id = v_room.id and a.question_id = v_question.id and not exists (select 1 from jsonb_array_elements(v_question.correct_answer->'answers') with ordinality expected(value, n) where coalesce(a.response->'answers'->>(n - 1), '') <> expected.value #>> '{}')),
      'rows', (select coalesce(jsonb_agg(jsonb_build_object('id', '20.' || n, 'correct', correct_count, 'wrong', wrong_count, 'unanswered', greatest(v_total - correct_count - wrong_count, 0)) order by n), '[]'::jsonb) from (select expected.n::integer as n, (select count(*)::integer from answers a where a.room_id=v_room.id and a.question_id=v_question.id and a.response->'answers'->>(expected.n-1) = expected.value #>> '{}') as correct_count, (select count(*)::integer from answers a where a.room_id=v_room.id and a.question_id=v_question.id and btrim(coalesce(a.response->'answers'->>(expected.n-1),'')) <> '' and a.response->'answers'->>(expected.n-1) <> expected.value #>> '{}') as wrong_count from jsonb_array_elements(v_question.correct_answer->'answers') with ordinality expected(value,n)) rows)
    ) else null end
  );
end $$;

create or replace function public.host_set_question(p_code text, p_host_token text, p_position integer, p_status public.room_status)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_room public.rooms; v_question public.questions; v_deadline timestamptz;
begin
  select * into v_room from rooms where code = upper(trim(p_code)) and host_token_hash = extensions.crypt(p_host_token, host_token_hash);
  if v_room.id is null then raise exception 'HOST_UNAUTHORIZED'; end if;
  if p_status::text = 'q20_summary' and (p_position <> 20 or v_room.current_position <> 20 or v_room.status <> 'reveal') then raise exception 'Q20_SUMMARY_NOT_READY'; end if;
  if p_status = 'finished' and v_room.current_position = 20 and v_room.status::text <> 'q20_summary' then raise exception 'Q20_SUMMARY_REQUIRED'; end if;
  select * into v_question from questions where quiz_id = v_room.quiz_id and position = p_position;
  if v_question.id is null then raise exception 'QUESTION_NOT_FOUND'; end if;
  v_deadline := case when p_status = 'question' then now() + make_interval(secs => v_question.time_limit_seconds) else null end;
  update rooms set current_position=p_position, status=p_status, question_started_at=case when p_status='question' then now() else question_started_at end, question_deadline_at=v_deadline where id=v_room.id;
  return public.public_room_state(v_room.code);
end $$;
