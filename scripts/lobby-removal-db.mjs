import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import assert from 'node:assert/strict';

import { installSchema } from './qa-game-schema.mjs';

// Entirely local: no cloud URL, keys, or production connection is used.
const db = new PGlite({ extensions: { pgcrypto } });
let checks = 0;
const check = (actual, expected) => { assert.deepEqual(actual,expected); checks++; };
try {
  await installSchema(db);
  const quiz=(await db.query("insert into quizzes(title) values ('Local departure QA') returning id")).rows[0].id;
  const qid=(await db.query("insert into questions(quiz_id,position,kind,prompt,options,time_limit_seconds,correct_answer) values ($1,1,'choice','QA','[\"A\",\"B\"]',15,'{\"option\":\"A\"}') returning id",[quiz])).rows[0].id;
  for (const code of ['987651','987652']) await db.query("select initialize_game_room($1,$2,'local-qa-host')",[quiz,code]);
  const join = async (code,name,token) => (await db.query('select join_room($1,$2,$3) as value',[code,name,token])).rows[0].value.playerId;
  await db.exec('set role service_role');
  const alice=await join('987651','Alice','alice-token');
  const bob=await join('987651','Bob','bob-token');
  const other=await join('987652','Other Alice','alice-token');
  await db.query("select mark_player_ready('987651','alice-token')");
  const remove=async(code,token,id,host)=>(await db.query('select remove_lobby_player($1,$2,$3,$4) as value',[code,token,id,host])).rows[0].value;
  check(await remove('987651','wrong-token',null,null),{removed:false});
  check(await remove('987651','alice-token',null,null),{removed:true});
  check(await remove('987651','alice-token',null,null),{removed:false});
  check((await db.query("select count(*)::int as n from players where id=$1",[bob])).rows[0].n,1);
  check((await db.query("select count(*)::int as n from players where id=$1",[other])).rows[0].n,1);
  check((await db.query("select public_room_state('987651') as value")).rows[0].value.room.readyCount,0);
  await assert.rejects(remove('987651',null,bob,'wrong-host'),/HOST_UNAUTHORIZED/);checks++;
  await assert.rejects(remove('987651','alice-token',bob,'local-qa-host'),/INVALID_REMOVAL/);checks++;
  check(await remove('987651',null,other,'local-qa-host'),{removed:false});
  check(await remove('987651',null,bob,'local-qa-host'),{removed:true});
  check(await remove('987651',null,bob,'local-qa-host'),{removed:false});
  const rejoined=await join('987651','Alice','alice-token');
  assert.notEqual(rejoined,alice);checks++;
  for(const status of ['question','reveal','paused','q20_summary','finished']) {
    await db.query('update rooms set status=$1 where code=$2',[status,'987651']);
    await assert.rejects(remove('987651','alice-token',null,null),/LOBBY_CLOSED/);checks++;
  }
  await db.query("update rooms set status='lobby',question_started_at=now() where code='987651'");
  await assert.rejects(remove('987651',null,rejoined,'local-qa-host'),/LOBBY_CLOSED/);checks++;
  await db.query("update rooms set question_started_at=null where code='987651'");
  await db.query('insert into answers(room_id,question_id,player_id,response,is_correct,score_awarded) select room_id,$1,id,$2,true,100 from players where id=$3',[qid,{option:'A'},rejoined]);
  await assert.rejects(remove('987651','alice-token',null,null),/LOBBY_CLOSED/);checks++;
  check((await db.query('select count(*)::int as n from answers where player_id=$1',[rejoined])).rows[0].n,1);
  await db.query('delete from answers where player_id=$1',[rejoined]);
  await db.query('update players set total_score=100 where id=$1',[rejoined]);
  await assert.rejects(remove('987651',null,rejoined,'local-qa-host'),/LOBBY_CLOSED/);checks++;
  for(const role of ['anon','authenticated']) {
    await db.exec(`reset role;set role ${role}`);
    await assert.rejects(remove('987651','alice-token',null,null),/permission denied/);checks++;
  }
  await db.exec('reset role');
  check((await db.query("select prosecdef from pg_proc where proname='remove_lobby_player'")).rows[0].prosecdef,false);
  console.log(JSON.stringify({passed:true,checks,environment:'isolated local PGlite; functional and authorization checks; not a concurrent locking test'}));
} finally { await db.close(); }
