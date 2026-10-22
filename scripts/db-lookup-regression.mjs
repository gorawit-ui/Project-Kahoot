import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";

// Isolated WASM PostgreSQL validation. Never connects to Supabase. This verifies
// SQL compatibility/authentication and relative lookup cost, not cloud capacity
// or multi-connection concurrency (PGlite serializes queries).
const db = new PGlite({ extensions: { pgcrypto } });
const migration = name => readFile(`supabase/migrations/${name}.sql`, "utf8");
try {
  await db.exec("create schema extensions; create extension pgcrypto with schema extensions; create role anon; create role authenticated; create role service_role bypassrls;");
  for (const name of [
    "20260906_authoritative_game", "20260906_reveal_scoreboard_results",
    "20260906_player_readiness_and_transition", "20260906_host_monitor_and_rejoin",
    "20260906_reveal_distribution_q20_summary", "20260920_fix_q20_jsonb_index",
    "20260920_q20_120_seconds", "20260920_q20_accuracy_speed_scoring",
    "20261021150659_restrict_game_table_reads", "20261021151202_bind_answers_to_question",
  ]) {
    // The local WASM database has no Supabase realtime publication. Its ALTER
    // PUBLICATION statement is unrelated to the authentication logic under test.
    await db.exec((await migration(name)).replace(/^alter publication supabase_realtime.*$/gm,""));
  }
  await db.exec("grant usage on schema public,extensions to service_role,anon,authenticated; grant all on all tables in schema public to service_role; grant execute on all functions in schema public to service_role;");
  const quiz=(await db.query("insert into public.quizzes(title) values ('Local lookup QA') returning id")).rows[0].id;
  await db.query("insert into public.questions(quiz_id,position,kind,prompt,options,time_limit_seconds,correct_answer) values ($1,1,'choice','QA','[\"A\",\"B\"]',120,'{\"option\":\"A\"}')",[quiz]);
  await db.query("select public.initialize_game_room($1,'987654','local-only-host')",[quiz]);
  const tokens=Array.from({length:45},()=>randomUUID());
  const ids=[];
  for (const [i,token] of tokens.entries()) ids.push((await db.query("select public.join_room('987654',$1,$2) as result",[`Local ${i}`,token])).rows[0].result.playerId);
  const hashesBefore=(await db.query("select id,session_token_hash from public.players order by id")).rows;
  const timings=async()=>{
    const times=[];
    for(let i=0;i<3;i++){
      const t=performance.now();
      await db.query("select public.player_room_summary('987654',$1)",[tokens[44]]);
      times.push(performance.now()-t);
    }
    return Math.round(times.reduce((a,b)=>a+b)/times.length*100)/100;
  };
  const beforeMs=await timings();
  await db.exec(await readFile("supabase/migrations/20261022174111_index_player_session_lookup.sql", "utf8"));
  // One successful legacy verification upgrades only the lookup fingerprint.
  await db.query("select public.player_room_summary('987654',$1)",[tokens[44]]);
  const afterMs=await timings();
  for(const [i,token] of tokens.entries()){
    const result=(await db.query("select public.join_room('987654',$1,$2) as result",[`Local ${i}`,token])).rows[0].result;
    assert.equal(result.rejoined,true); assert.equal(result.playerId,ids[i]);
  }
  assert.equal((await db.query("select count(*)::integer as n from public.players where session_lookup_hash is not null")).rows[0].n,45);
  assert.deepEqual((await db.query("select id,session_token_hash from public.players order by id")).rows,hashesBefore,"Existing bcrypt hashes must not change");
  // A fingerprint is only an index hint, never sufficient authentication.
  await db.query("update public.players set session_lookup_hash=encode(extensions.digest('wrong-token','sha256'),'hex') where id=$1",[ids[0]]);
  await assert.rejects(db.query("select public.player_room_summary('987654','wrong-token')"),/PLAYER_NOT_FOUND/);
  await db.query("update public.players set session_lookup_hash=null where id=$1",[ids[0]]);
  await db.query("select public.player_room_summary('987654',$1)",[tokens[0]]);
  const fresh=randomUUID();
  await db.query("select public.join_room('987654','New indexed player',$1)",[fresh]);
  assert.equal((await db.query("select count(*)::integer as n from public.players where nickname='New indexed player' and session_lookup_hash is not null")).rows[0].n,1);
  const priv=(await db.query("select has_column_privilege('anon','public.players','session_lookup_hash','SELECT') as public_read,has_function_privilege('anon','public.find_player_by_session(uuid,text)','EXECUTE') as public_execute")).rows[0];
  assert.deepEqual(priv,{public_read:false,public_execute:false});
  // Exercise the entire gameplay regression under the application database role.
  const flow=await db.exec(await readFile("qa/backend-transaction-regression.sql","utf8"));
  const gameplay=flow.find(r=>r.rows?.[0]?.regression_result)?.rows[0].regression_result;
  assert.equal(gameplay?.passed,true);
  await db.exec(await readFile("qa/index-player-session-lookup-rollback.sql","utf8"));
  assert.equal((await db.query("select exists(select 1 from information_schema.columns where table_schema='public' and table_name='players' and column_name='session_lookup_hash') as present")).rows[0].present,false);
  for(const i of [0,22,44]){
    const restored=(await db.query("select public.join_room('987654',$1,$2) as result",[`Local ${i}`,tokens[i]])).rows[0].result;
    assert.equal(restored.rejoined,true);assert.equal(restored.playerId,ids[i]);
  }
  const result={passed:true,rollbackVerified:true,environment:"isolated PGlite WASM PostgreSQL; not cloud or concurrency benchmark",legacyPlayersRecovered:45,bcryptHashesPreserved:true,fingerprintAloneRejected:true,newPlayersIndexed:true,privateAccessPreserved:true,backendFlowPassed:true,beforeLookupMeanMs:beforeMs,afterLookupMeanMs:afterMs};
  await writeFile("qa/lookup-local-validation-20261021.json",JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
} catch (error) {
  console.error(JSON.stringify({message:error.message,code:error.code,where:error.where}));
  process.exitCode=1;
} finally { await db.close(); }
