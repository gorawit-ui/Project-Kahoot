-- Content-only release. Run after the matching versioned images are deployed.
-- Keep old question IDs/keys and every room that has started or recorded play.
begin;
do $release$
declare
  v_source uuid := '01023be1-b252-47d2-96cb-384ca3ce0919';
  v_target uuid;
  v_created boolean := false;
  v_moved integer;
  v_before text;
  v_after text;
  v_updates jsonb := $content$[{"position": 3, "kind": "choice", "prompt": "บ้านเกิดจิ๊กโก๋อยู่จังหวัดไหน", "media": {"type": "image", "src": "/assets/questions/question-03.jpg"}, "options": ["พิษณุโลก", "พิดโลก", "เชียงใหม่", "กรุงเทพ"], "time_limit_seconds": 15, "correct_answer": {"option": "พิษณุโลก"}}, {"position": 9, "kind": "choice", "prompt": "จิ๊กโก๋มีหมา-แมว ชื่ออะไร", "media": {"type": "image", "src": "/assets/questions/question-09-20261028.jpg", "fit": "contain"}, "options": ["บับเบิ้ล/ชับปุย", "บับว่า/แฮรรี่", "บับเบิ้ล/เท้าปุย", "ชัพปุย/เบิ้ล"], "time_limit_seconds": 15, "correct_answer": {"option": "บับเบิ้ล/เท้าปุย"}}, {"position": 12, "kind": "choice", "prompt": "จากภาพนี้คือเพลงอะไร?", "media": {"type": "image", "src": "/assets/questions/question-12-20261028.jpg", "fit": "contain"}, "options": ["กลับไปหาคนในใจเลยไป", "ไม่รักกันแล้ว", "กลับไปหาคนในใจของเธอเลยไป", "เธอช่วยทิ้งเราได้ไหม"], "time_limit_seconds": 15, "correct_answer": {"option": "เธอช่วยทิ้งเราได้ไหม"}}]$content$::jsonb;
begin
  perform pg_advisory_xact_lock(hashtext('jixgo-content-20261028'));
  if (select count(*) from public.questions where quiz_id=v_source) <> 20 then
    raise exception 'SOURCE_QUIZ_INCOMPLETE';
  end if;
  -- Serialize against submissions and Host phase changes while assigning rooms.
  perform id from public.rooms where quiz_id=v_source order by id for update;
  select md5(jsonb_build_object(
    'questions',(select jsonb_agg(to_jsonb(q) order by q.id) from public.questions q where q.quiz_id=v_source),
    'answers',(select jsonb_agg(to_jsonb(a) order by a.id) from public.answers a join public.rooms r on r.id=a.room_id where r.quiz_id=v_source),
    'players',(select jsonb_agg(to_jsonb(p) order by p.id) from public.players p join public.rooms r on r.id=p.room_id where r.quiz_id=v_source)
  )::text) into v_before;
  select id into v_target from public.quizzes where title='JIXGO Magical 24 · 2026-10-28';
  if v_target is null then
    insert into public.quizzes(title) values ('JIXGO Magical 24 · 2026-10-28') returning id into v_target;
    v_created := true;
    insert into public.questions(quiz_id,position,kind,prompt,media,options,time_limit_seconds,correct_answer)
      select v_target,position,kind,prompt,media,options,time_limit_seconds,correct_answer
      from public.questions where quiz_id=v_source;
    update public.questions q set prompt=p.prompt,media=p.media,options=p.options,correct_answer=p.correct_answer
      from jsonb_to_recordset(v_updates) as p(position integer,prompt text,media jsonb,options jsonb,correct_answer jsonb)
      where q.quiz_id=v_target and q.position=p.position;
  end if;
  if (select count(*) from public.questions where quiz_id=v_target) <> 20
    or exists(select 1 from jsonb_to_recordset(v_updates) as p(position integer,prompt text,media jsonb,options jsonb,correct_answer jsonb)
      left join public.questions q on q.quiz_id=v_target and q.position=p.position
      where q.id is null or q.prompt is distinct from p.prompt or q.media is distinct from p.media
        or q.options is distinct from p.options or q.correct_answer is distinct from p.correct_answer)
    or exists(select 1 from public.questions old join public.questions new using(position)
      where old.quiz_id=v_source and new.quiz_id=v_target and old.position not in (3,9,12)
      and (old.kind,old.prompt,old.media,old.options,old.time_limit_seconds,old.correct_answer)
        is distinct from (new.kind,new.prompt,new.media,new.options,new.time_limit_seconds,new.correct_answer)) then
    raise exception 'CONTENT_VERSION_MISMATCH';
  end if;
  -- Verify history before moving untouched lobby memberships to the new quiz.
  select md5(jsonb_build_object(
    'questions',(select jsonb_agg(to_jsonb(q) order by q.id) from public.questions q where q.quiz_id=v_source),
    'answers',(select jsonb_agg(to_jsonb(a) order by a.id) from public.answers a join public.rooms r on r.id=a.room_id where r.quiz_id=v_source),
    'players',(select jsonb_agg(to_jsonb(p) order by p.id) from public.players p join public.rooms r on r.id=p.room_id where r.quiz_id=v_source)
  )::text) into v_after;
  if v_before is distinct from v_after then raise exception 'HISTORY_CHANGED'; end if;
  update public.rooms r set quiz_id=v_target
    where quiz_id=v_source and status='lobby' and question_started_at is null
      and not exists(select 1 from public.answers a where a.room_id=r.id)
      and not exists(select 1 from public.players p where p.room_id=r.id and p.total_score<>0);
  get diagnostics v_moved=row_count;
  perform set_config('jixgo.content_release_result',jsonb_build_object('quizId',v_target,'created',v_created,
    'questions',20,'changedQuestions',jsonb_build_array(3,9,12),'movedUnstartedRooms',v_moved,'historyPreserved',true)::text,true);
end $release$;
select current_setting('jixgo.content_release_result')::jsonb as release_result;
commit;
