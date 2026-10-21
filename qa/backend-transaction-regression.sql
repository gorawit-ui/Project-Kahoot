-- Run only as an administrator. All fixtures and gameplay changes roll back.
-- Uses a private synthetic quiz, not the event's questions or existing rooms.
begin;
-- Exercise the same database role used by the HTTP server, including the new
-- SECURITY INVOKER wrapper's row-lock permissions.
set local role service_role;
do $$
declare
  quiz uuid; question_id uuid; previous_question uuid; room_code text;
  host_key text := gen_random_uuid()::text;
  token_a text := gen_random_uuid()::text; token_b text := gen_random_uuid()::text;
  result jsonb; summary jsonb; question_answer jsonb;
  before_counts jsonb; i integer;
begin
  select jsonb_build_array((select count(*) from public.quizzes), (select count(*) from public.questions),
    (select count(*) from public.rooms), (select count(*) from public.players), (select count(*) from public.answers)) into before_counts;
  perform set_config('qa.before_counts', before_counts::text, true);
  insert into public.quizzes(title) values ('QA rollback ' || gen_random_uuid()) returning id into quiz;
  insert into public.questions(quiz_id,position,kind,prompt,options,time_limit_seconds,correct_answer)
    select quiz, n, 'choice', 'QA ' || n, '["correct","wrong"]'::jsonb, 30, '{"option":"correct"}'::jsonb
    from generate_series(1,19) n;
  insert into public.questions(quiz_id,position,kind,prompt,options,time_limit_seconds,correct_answer)
    values (quiz,20,'bonus','QA bonus','[]'::jsonb,120,'{"answers":["A","B","C","D","E","F","G","H","I","J"]}'::jsonb);
  loop
    room_code := (100000 + floor(random()*900000))::integer::text;
    exit when not exists(select 1 from public.rooms where code=room_code);
  end loop;
  perform set_config('qa.room_code',room_code,true);
  perform public.initialize_game_room(quiz,room_code,host_key);
  result := public.join_room(room_code,'QA Alice',token_a);
  assert (result->>'rejoined')::boolean = false, 'First join';
  result := public.join_room(room_code,'QA Alice',token_a);
  assert (result->>'rejoined')::boolean = true, 'Rejoin same player';
  begin
    perform public.join_room(room_code,'QA Renamed',token_a);
    raise exception 'FAIL: renamed session accepted';
  exception when raise_exception then
    if sqlerrm <> 'SESSION_NAME_MISMATCH' then raise; end if;
  end;
  begin
    perform public.join_room(room_code,'QA Alice',token_b);
    raise exception 'FAIL: duplicate nickname accepted';
  exception when raise_exception then
    if sqlerrm <> 'NICKNAME_TAKEN' then raise; end if;
  end;
  perform public.join_room(room_code,'QA Bob',token_b);
  perform public.mark_player_ready(room_code,token_a);
  result := public.mark_player_ready(room_code,token_b);
  assert (result->>'readyCount')::integer=2, 'Ready count';
  begin
    perform public.host_set_question(room_code,'wrong-host',1,'question');
    raise exception 'FAIL: invalid host accepted';
  exception when raise_exception then
    if sqlerrm <> 'HOST_UNAUTHORIZED' then raise; end if;
  end;
  for i in 1..20 loop
    result := public.host_set_question(room_code,host_key,i,'question');
    question_id := (result->'question'->>'id')::uuid;
    assert result->'question'->'reveal'='null'::jsonb, 'No premature answer key';
    if i=2 then
      begin
        perform public.submit_answer_for_question(room_code,token_a,previous_question,'{"option":"correct"}');
        raise exception 'FAIL: stale question accepted';
      exception when raise_exception then
        if sqlerrm <> 'QUESTION_CHANGED' then raise; end if;
      end;
    end if;
    if i=1 then
      begin
        perform public.submit_answer_for_question(room_code,'wrong-player',question_id,'{"option":"correct"}');
        raise exception 'FAIL: invalid player accepted';
      exception when raise_exception then
        if sqlerrm <> 'PLAYER_NOT_FOUND' then raise; end if;
      end;
      update public.rooms set question_deadline_at=now()-interval '4 seconds' where code=room_code;
      begin
        perform public.submit_answer_for_question(room_code,token_a,question_id,'{"option":"correct"}');
        raise exception 'FAIL: expired answer accepted';
      exception when raise_exception then
        if sqlerrm <> 'ANSWER_LOCKED' then raise; end if;
      end;
      result := public.public_room_state(room_code);
      assert result->'room'->>'status'='reveal', 'Automatic reveal after expiry';
      perform public.host_set_question(room_code,host_key,i,'question');
    end if;
    question_answer := case when i<20 then '{"option":"correct"}'::jsonb
      else '{"answers":["A","B","C","D","E","F","G","H","I","J"]}'::jsonb end;
    result := public.submit_answer_for_question(room_code,token_a,question_id,question_answer);
    assert (result->>'accepted')::boolean, 'Correct answer accepted';
    assert (result->>'scoreAwarded')::integer=case when i<20 then 150 else 750 end, 'Existing scoring preserved';
    begin
      perform public.submit_answer_for_question(room_code,token_a,question_id,question_answer);
      raise exception 'FAIL: duplicate answer accepted';
    exception when raise_exception then
      if sqlerrm <> 'ALREADY_ANSWERED' then raise; end if;
    end;
    result := public.submit_answer_for_question(room_code,token_b,question_id,
      case when i<20 then '{"option":"wrong"}'::jsonb else '{"answers":["","","","","","","","","",""]}'::jsonb end);
    assert (result->>'scoreAwarded')::integer=0, 'Wrong answer has zero score';
    summary := public.player_room_summary(room_code,token_a);
    assert summary->'currentResponse'=question_answer, 'Answer survives refresh';
    result := public.host_set_question(room_code,host_key,i,'reveal');
    assert result->'question'->'reveal'<>'null'::jsonb, 'Reveal contains answer';
    if i<20 then
      assert (result->'distribution'->>'answered')::integer=2, 'Distribution count';
    end if;
    previous_question := question_id;
  end loop;
  begin
    perform public.host_set_question(room_code,host_key,20,'finished');
    raise exception 'FAIL: Q20 summary skipped';
  exception when raise_exception then
    if sqlerrm <> 'Q20_SUMMARY_REQUIRED' then raise; end if;
  end;
  result := public.host_set_question(room_code,host_key,20,'q20_summary');
  assert (result->'bonusSummary'->>'submitted')::integer=2, 'Q20 submission count';
  assert (result->'bonusSummary'->>'perfect')::integer=1, 'Q20 perfect count';
  assert jsonb_array_length(result->'bonusSummary'->'rows')=10, 'Q20 has ten summary rows';
  result := public.host_set_question(room_code,host_key,20,'finished');
  assert result->'room'->>'status'='finished', 'Finished phase';
  summary := public.player_room_summary(room_code,token_a);
  assert (summary->'player'->>'score')::integer=3600, 'Final score';
  assert (summary->'player'->>'rank')::integer=1, 'Final rank';
  assert (select count(*) from public.answers a join public.rooms r on r.id=a.room_id where r.code=room_code)=40, 'Exactly 40 accepted answers';
  perform set_config('qa.result', jsonb_build_object('passed',true,'questions',20,'players',2,'acceptedAnswers',40,'duplicateRejections',20,
    'checks',jsonb_build_array('rejoin','nickname conflict','readiness','host auth','player auth','late answer','auto reveal',
      'stale question','score','duplicate prevention','refresh summary','distribution','Q20 summary gate','final results'),
    'originalCounts',before_counts)::text,true);
end $$;
-- Confirm the public RPC still works while direct table access is denied.
set local role anon;
do $$
begin
  assert public.public_room_state(current_setting('qa.room_code'))->'room'->>'status'='finished', 'Public RPC still works';
  begin
    perform host_token_hash from public.rooms limit 1;
    raise exception 'FAIL: public host hash access';
  exception when insufficient_privilege then null;
  end;
  begin
    perform session_token_hash from public.players limit 1;
    raise exception 'FAIL: public player hash access';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select current_setting('qa.result')::jsonb || '{"publicRpc":true,"publicHashReadsDenied":true}'::jsonb as regression_result;
rollback;
