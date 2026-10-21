-- Bind HTTP submissions to the question the player actually saw. A late request
-- must never be recorded against the Host's next question.
create or replace function public.submit_answer_for_question(
  p_code text, p_session_token text, p_question_id uuid, p_response jsonb
) returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare v_room public.rooms; v_question_id uuid;
begin
  -- Shared locks allow concurrent players, while blocking a Host transition until
  -- this answer transaction completes. Do not serialize players with FOR UPDATE.
  select * into v_room from public.rooms where code = upper(trim(p_code)) for share;
  if v_room.id is null then raise exception 'ROOM_NOT_FOUND'; end if;
  select id into v_question_id from public.questions
    where quiz_id = v_room.quiz_id and position = v_room.current_position;
  if p_question_id is null or p_question_id is distinct from v_question_id then
    raise exception 'QUESTION_CHANGED';
  end if;
  return public.submit_answer(p_code, p_session_token, p_response);
end $$;

-- This wrapper is called only by authenticated application server routes.
revoke all on function public.submit_answer_for_question(text, text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.submit_answer_for_question(text, text, uuid, jsonb) to service_role;
