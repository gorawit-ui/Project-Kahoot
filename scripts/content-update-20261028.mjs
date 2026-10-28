import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
import {installSchema} from './qa-game-schema.mjs';

// Synthetic, isolated database only. This script never connects to Supabase.
const db=new PGlite({extensions:{pgcrypto}});
let checks=0;const check=(actual,expected)=>{assert.deepEqual(actual,expected);checks++;};
const manifest=JSON.parse(await readFile('qa/content-update-20261028.json','utf8'));
const compile=async path=>{const b=await build({stdin:{contents:(await readFile(path,'utf8')).replace('import "server-only";',''),loader:'ts',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'});return import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));};
const {sampleQuestions}=await compile('data/questions.ts');
const {publicPreviewQuestions}=await compile('data/public-questions.ts');
const oldQuiz='01023be1-b252-47d2-96cb-384ca3ce0919';
const asRow=q=>JSON.parse(JSON.stringify({position:q.id,kind:q.kind,prompt:q.prompt,media:q.media??{},options:q.kind==='choice'?q.choices:q.bonusEntries.map(e=>({id:e.id,prompt:e.prompt})),time_limit_seconds:q.timeSeconds,correct_answer:q.kind==='choice'?{option:q.answer}:{answers:q.bonusEntries.map(e=>e.answer)}}));
try {
 await installSchema(db);
 await db.query("insert into quizzes(id,title) values ($1,'JIXGO Magical 24')",[oldQuiz]);
 for(const q of sampleQuestions){const r=manifest.previousQuestions.find(x=>x.position===q.id)??asRow(q);await db.query('insert into questions(quiz_id,position,kind,prompt,media,options,time_limit_seconds,correct_answer) values($1,$2,$3,$4,$5,$6,$7,$8)',[oldQuiz,r.position,r.kind,r.prompt,r.media,r.options,r.time_limit_seconds,r.correct_answer]);}
 for(const code of ['987651','987652','987653','987654','987655'])await db.query("select initialize_game_room($1,$2,'fixture-host')",[oldQuiz,code]);
 for(const [code,name] of [['987651','right'],['987651','decoy'],['987652','historic'],['987653','active'],['987655','scored']])await db.query('select join_room($1,$2,$2)',[code,name]);
 await db.exec("update rooms set status='finished' where code='987652';update rooms set status='question',current_position=12,question_started_at=now(),question_deadline_at=now()+interval '15 seconds' where code='987653';update rooms set question_started_at=now() where code='987654';update players set total_score=5 where nickname='scored';");
 await db.query("insert into answers(room_id,question_id,player_id,response,is_correct,score_awarded) select r.id,q.id,p.id,$1,true,140 from rooms r join players p on p.room_id=r.id join questions q on q.quiz_id=r.quiz_id and q.position=9 where r.code='987652'",[{option:manifest.previousQuestions.find(x=>x.position===9).correct_answer.option}]);
 const history=async()=>(await db.query("select a.response,a.score_awarded,q.correct_answer,q.media from answers a join questions q on q.id=a.question_id join rooms r on r.id=a.room_id where r.code='987652'")).rows;
 const before=await history();
 const sql=await readFile('qa/content-update-20261028.sql','utf8');const result=await db.exec(sql);
 const report=result.find(x=>x.rows?.[0]?.release_result)?.rows[0].release_result;check(report.movedUnstartedRooms,1);check(report.historyPreserved,true);
 const newQuiz=report.quizId;
 check(await history(),before);
 check((await db.query("select code from rooms where quiz_id=$1 order by code",[oldQuiz])).rows.map(x=>x.code),['987652','987653','987654','987655']);
 check((await db.query("select quiz_id from rooms where code='987651'")).rows[0].quiz_id,newQuiz);
 const rows=(await db.query('select position,kind,prompt,media,options,time_limit_seconds,correct_answer from questions where quiz_id=$1 order by position',[newQuiz])).rows;
 for(const q of sampleQuestions)check(rows.find(r=>r.position===q.id),asRow(q));
 for(const expected of manifest.questions){const q=sampleQuestions.find(q=>q.id===expected.position);check(q.choices[q.correctIndex],expected.correct_answer.option);const pub=publicPreviewQuestions.find(q=>q.id===expected.position);check({prompt:pub.prompt,options:pub.choices,media:pub.media},{prompt:expected.prompt,options:expected.options,media:expected.media});check(pub.timeSeconds,15);}
 const setup=await readFile('app/api/game/setup/route.ts','utf8');check(setup.includes(`const QUIZ_TITLE = ${JSON.stringify(manifest.quizTitle)};`),true);
 await db.exec('set role service_role');
 for(const expected of manifest.questions){await db.query("select host_set_question('987651','fixture-host',$1,'question')",[expected.position]);const qid=(await db.query('select id from questions where quiz_id=$1 and position=$2',[newQuiz,expected.position])).rows[0].id;
  for(const [name,option,correct] of [['right',expected.correct_answer.option,true],['decoy',expected.options.find(x=>x!==expected.correct_answer.option),false]]){const r=(await db.query("select submit_answer_for_question('987651',$1,$2,$3) as result",[name,qid,{option}])).rows[0].result;check(r.accepted,true);check(r.scoreAwarded>0,correct);}
 }
 // An active pre-release room must still grade against its original answer key.
 await db.query("update rooms set question_deadline_at=now()+interval '15 seconds' where code='987653'");
 const old12=(await db.query('select id,correct_answer from questions where quiz_id=$1 and position=12',[oldQuiz])).rows[0];
 const legacy=(await db.query("select submit_answer_for_question('987653','active',$1,$2) as result",[old12.id,{option:old12.correct_answer.option}])).rows[0].result;check(legacy.scoreAwarded>0,true);
 await db.exec('reset role');const repeated=await db.exec(sql);check(repeated.find(x=>x.rows?.[0]?.release_result)?.rows[0].release_result.created,false);
 check(await history(),before);
 console.log(JSON.stringify({passed:true,checks,updatedQuestions:[3,9,12],historicalAndActiveRoomsPreserved:true,idempotentRelease:true}));
} catch(error){console.error(JSON.stringify({message:error.message,code:error.code,where:error.where}));process.exitCode=1;} finally{await db.close();}
