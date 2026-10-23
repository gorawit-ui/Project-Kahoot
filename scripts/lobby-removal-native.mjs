// Optional real-PostgreSQL race test. Use a disposable local server only.
// JIXGO_QA_PG_MODULE can point to an already-installed node-postgres package.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { installSchema } from './qa-game-schema.mjs';
const require=createRequire(import.meta.url);
const {Client}=require(process.env.JIXGO_QA_PG_MODULE || 'pg');
const url=process.env.JIXGO_QA_DATABASE_URL;
if(!url || !['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname)) throw Error('Disposable loopback database required');
if(new URL(url).pathname!=='/jixgo_lobby_qa') throw Error('Use the disposable jixgo_lobby_qa database');
const make=()=>new Client({connectionString:url});
const admin=make(), actor=make(), host=make(), observer=make();
const sessions=[admin,actor,host,observer];
await Promise.all(sessions.map(c=>c.connect()));
try {
  const existing=await admin.query("select count(*)::int as n from information_schema.tables where table_schema='public'");
  if(existing.rows[0].n!==0) throw Error('Test database must be empty');
  await installSchema({exec:sql=>admin.query(sql)});
  const quiz=(await admin.query("insert into quizzes(title) values ('Local race QA') returning id")).rows[0].id;
  await admin.query("insert into questions(quiz_id,position,kind,prompt,options,time_limit_seconds,correct_answer) values ($1,1,'choice','QA','[\"A\",\"B\"]',15,'{\"option\":\"A\"}')",[quiz]);
  await admin.query("select initialize_game_room($1,'987654','local-host')",[quiz]);
  await admin.query("select join_room('987654','Alice','alice-token')");
  await Promise.all([actor.query('set role service_role'),host.query('set role service_role')]);
  async function blocked(client){
    for(let i=0;i<100;i++){
      const r=await observer.query("select wait_event_type from pg_stat_activity where pid=$1",[client.processID]);
      if(r.rows[0]?.wait_event_type==='Lock')return;
      await new Promise(resolve=>setTimeout(resolve,10));
    }
    throw Error('Expected real database row-lock wait');
  }
  // The Host starts first: removal must wait, then refuse without deleting Alice.
  await host.query('begin');
  await host.query("select host_set_question('987654','local-host',1,'question')");
  const denied=actor.query("select remove_lobby_player('987654','alice-token',null,null)").then(()=>({ok:true}),e=>({error:e.message}));
  await blocked(actor);
  await host.query('commit');
  assert.match((await denied).error,/LOBBY_CLOSED/);
  assert.equal((await admin.query("select count(*)::int as n from players")).rows[0].n,1);
  await admin.query("update rooms set status='lobby',question_started_at=null,question_deadline_at=null where code='987654'");
  // Removal starts first: Host waits until removal commits, then starts normally.
  await actor.query('begin');
  assert.equal((await actor.query("select remove_lobby_player('987654','alice-token',null,null) as value")).rows[0].value.removed,true);
  const started=host.query("select host_set_question('987654','local-host',1,'question') as value");
  await blocked(host);
  await actor.query('commit');
  assert.equal((await started).rows[0].value.room.status,'question');
  assert.equal((await admin.query("select count(*)::int as n from players")).rows[0].n,0);
  console.log(JSON.stringify({passed:true,environment:'disposable native PostgreSQL 17, separate connections',raceOrdersVerified:2,blockedOnRealRowLocks:true}));
} finally {await Promise.all(sessions.map(c=>c.end()));}
