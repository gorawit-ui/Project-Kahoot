import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Isolated local PostgreSQL. No application database or credentials are used.
const db = new PGlite({extensions:{pgcrypto}});
let checks=0;
const check=(actual,expected)=>{assert.deepEqual(actual,expected);checks++;};
try {
  await db.exec('create schema extensions; create extension pgcrypto with schema extensions; create role anon; create role authenticated; create role service_role bypassrls;');
  for(const name of ['20260906_authoritative_game','20260906_reveal_scoreboard_results','20260906_player_readiness_and_transition','20260906_host_monitor_and_rejoin','20260906_reveal_distribution_q20_summary','20260920_fix_q20_jsonb_index','20260920_q20_120_seconds','20260920_q20_accuracy_speed_scoring','20261021150659_restrict_game_table_reads','20261021151202_bind_answers_to_question','20261022174111_index_player_session_lookup','20261023081147_lobby_player_removal']) {
    await db.exec((await readFile(`supabase/migrations/${name}.sql`,'utf8')).replace(/^alter publication supabase_realtime.*$/gm,''));
  }
  await db.exec('grant usage on schema public,extensions to service_role; grant all on all tables in schema public to service_role;');
  const quiz=(await db.query("insert into quizzes(title) values ('Local Bonus whitespace QA') returning id")).rows[0].id;
  const expected=Array(10).fill('Cheat');
  const bonus=(await db.query("insert into questions(quiz_id,position,kind,prompt,options,time_limit_seconds,correct_answer) values ($1,20,'bonus','QA',$2,120,$3) returning id",[quiz,expected.map((_,i)=>({id:`20.${i+1}`,prompt:'Ch__t'})),{answers:expected}])).rows[0].id;
  const choice=(await db.query("insert into questions(quiz_id,position,kind,prompt,options,time_limit_seconds,correct_answer) values ($1,1,'choice','QA','[\"A\",\"B\"]',120,'{\"option\":\"A\"}') returning id",[quiz])).rows[0].id;
  await db.query("select initialize_game_room($1,'987650','local-only-host')",[quiz]);
  const edge='\t\n\v\f\r \u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff';
  const cases=[['exact','Cheat',true],['trailing','Cheat ',true],['leading',' Cheat',true],['edges',edge+'Cheat'+edge,true],['typo','Cheta',false],['case','cheat',false],['internal','Ch eat',false],['blank',edge,false],['zero-width','Cheat\u200b',false]];
  for(const [name] of [...cases,['legacy'],['choice'],['invalid']]) await db.query("select join_room('987650',$1,$1)",[name]);
  await db.exec("begin; set local role service_role; update rooms set status='question',current_position=20,question_started_at=now(),question_deadline_at=now()+interval '60 seconds' where code='987650';");
  const submit=async(token,answers,id=bonus)=>(await db.query("select submit_answer_for_question('987650',$1,$2,$3) as result",[token,id,{answers}])).rows[0].result;
  const legacy=expected.map((s,i)=>i===6?s+' ':s);
  check((await submit('legacy',legacy)).correctCount,9);
  const historical=(await db.query("select a.response,a.score_awarded,p.total_score from answers a join players p on p.id=a.player_id where p.nickname='legacy'")).rows[0];
  const privileges=(await db.query("select proacl::text from pg_proc where oid='public.submit_answer(text,text,jsonb)'::regprocedure")).rows[0];
  await db.exec('reset role');
  await db.exec(await readFile('supabase/migrations/20261023085333_trim_bonus_answer_edges.sql','utf8'));
  await db.exec('set local role service_role');
  check((await db.query("select a.response,a.score_awarded,p.total_score from answers a join players p on p.id=a.player_id where p.nickname='legacy'")).rows[0],historical);
  check((await db.query("select proacl::text from pg_proc where oid='public.submit_answer(text,text,jsonb)'::regprocedure")).rows[0],privileges);
  for(const [name,input,correct] of cases) {
    const answers=expected.map((s,i)=>i===6?input:s);
    const result=await submit(name,answers);
    check(result.correctCount,correct?10:9);
    check(result.scoreAwarded,correct?625:562);
    const saved=(await db.query('select a.response from answers a join players p on p.id=a.player_id where p.nickname=$1',[name])).rows[0].response;
    check(saved.answers[6],input.trim());
    check(saved.answers.filter((s,i)=>s===expected[i]).length,result.correctCount);
  }
  const rejected=async(run,pattern)=>{await db.exec('savepoint expected_failure');await assert.rejects(run,pattern);await db.exec('rollback to savepoint expected_failure; release savepoint expected_failure');checks++;};
  await rejected(()=>submit('trailing',expected),/ALREADY_ANSWERED/);
  await rejected(()=>submit('invalid',expected,choice),/QUESTION_CHANGED/);
  await rejected(()=>submit('wrong-token',expected),/PLAYER_NOT_FOUND/);
  await db.exec("update rooms set current_position=1 where code='987650'");
  const choiceResult=(await db.query("select submit_answer_for_question('987650','choice',$1,'{\"option\":\"A \"}') as result",[choice])).rows[0].result;
  check(choiceResult.scoreAwarded,0);
  check((await db.query("select response from answers a join players p on p.id=a.player_id where p.nickname='choice'")).rows[0].response,{option:'A '});
  await db.exec("update rooms set current_position=20,question_deadline_at=now()-interval '1 second' where code='987650'");
  await rejected(()=>submit('invalid',expected),/ANSWER_LOCKED/);
  await db.exec("update rooms set status='q20_summary' where code='987650'");
  const summary=(await db.query("select public_room_state('987650') as result")).rows[0].result.bonusSummary;
  check(summary.perfect,4);
  check(summary.rows[6],{id:'20.7',correct:4,wrong:5,unanswered:3});
  await db.exec('rollback');
  // Reload the fix after fixture rollback, then exercise the existing game flow.
  await db.exec(await readFile('supabase/migrations/20261023085333_trim_bonus_answer_edges.sql','utf8'));
  const flow=await db.exec(await readFile('qa/backend-transaction-regression.sql','utf8'));
  check(flow.find(r=>r.rows?.[0]?.regression_result)?.rows[0].regression_result?.passed,true);
  console.log(JSON.stringify({passed:true,checks,environment:'isolated local PGlite PostgreSQL',historicalAnswersAndScoresUnchanged:true,privilegesUnchanged:true,choiceRulesUnchanged:true}));
} catch(error) { console.error(JSON.stringify({message:error.message,code:error.code,where:error.where})); process.exitCode=1; } finally { await db.close(); }
