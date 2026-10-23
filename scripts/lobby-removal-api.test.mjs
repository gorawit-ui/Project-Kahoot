import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const require=createRequire(import.meta.url);
await mkdir('qa/.cache',{recursive:true});
async function route(path,name) {
  await build({entryPoints:[path],outfile:`qa/.cache/${name}.cjs`,bundle:true,platform:'node',format:'cjs',packages:'external',plugins:[{
    name:'route-test-boundaries',setup(b){
      b.onResolve({filter:/^(next\/headers|@\/lib\/supabase-server|server-only)$/},a=>({path:a.path,namespace:'qa'}));
      b.onLoad({filter:/.*/,namespace:'qa'},a=>({contents:a.path==='next/headers'
        ? 'exports.cookies=async()=>({get:name=>globalThis.removalApiCookies[name]?{value:globalThis.removalApiCookies[name]}:undefined});'
        : a.path==='server-only' ? '' : 'exports.getSupabaseAdmin=()=>globalThis.removalApiClient;',loader:'js'}));
    }
  }]});
  return require(`../qa/.cache/${name}.cjs`).POST;
}
const leave=await route('app/api/game/leave/route.ts','leave-api');
const remove=await route('app/api/game/host/remove-player/route.ts','remove-api');
const {createHmac}=await import('node:crypto');
const key='synthetic-test-host-key';
const hostCookie=createHmac('sha256',key).update('jixgo-host-session:v1').digest('base64url');
const target='00000000-0000-4000-8000-000000000001';
let calls;
beforeEach(()=>{
  process.env.JIXGO_HOST_CONTROL_KEY=key;
  calls=[];globalThis.removalApiCookies={};
  globalThis.removalApiClient={rpc:async(name,args)=>{calls.push({name,args});return {data:{removed:true},error:null};}};
});
const req=body=>new Request('http://localhost/api/game/leave',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});

test('Removal API rejects malformed and spoofed bodies before reaching the database',async()=>{
  for (const body of [null,{},[],{room:'bad'},{room:'142426',playerId:target}]) assert.equal((await leave(req(body))).status,400);
  for (const body of [null,{}, {room:'142426',playerId:'bad'}, {room:'142426',playerId:target,hostToken:key}]) assert.equal((await remove(req(body))).status,400);
  assert.deepEqual(calls,[]);
});
test('Self-leave and Host removal require their own session types',async()=>{
  assert.equal((await leave(req({room:'142426'}))).status,401);
  globalThis.removalApiCookies.jixgo_player_token='player-token';
  assert.equal((await remove(req({room:'142426',playerId:target}))).status,403);
  globalThis.removalApiCookies={jixgo_host_session:hostCookie};
  assert.equal((await leave(req({room:'142426'}))).status,401);
  assert.deepEqual(calls,[]);
});
test('Self-leave uses the HttpOnly player identity and never clears cookies for other rooms',async()=>{
  globalThis.removalApiCookies.jixgo_player_token='player-token';
  const result=await leave(req({room:'142426'}));
  assert.equal(result.status,200);assert.equal(result.headers.get('set-cookie'),null);
  assert.equal(result.headers.get('cache-control'),'no-store');
  assert.deepEqual(calls,[{name:'remove_lobby_player',args:{p_code:'142426',p_session_token:'player-token',p_player_id:null,p_host_token:null}}]);
});
test('Host removal sends exact room and UUID with the server-held room credential',async()=>{
  globalThis.removalApiCookies.jixgo_host_session=hostCookie;
  const result=await remove(req({room:'142426',playerId:target}));
  assert.equal(result.status,200);
  assert.deepEqual(calls,[{name:'remove_lobby_player',args:{p_code:'142426',p_session_token:null,p_player_id:target,p_host_token:key}}]);
});
test('Removal API preserves started-game, per-room authorization and database errors',async()=>{
  globalThis.removalApiCookies={jixgo_host_session:hostCookie,jixgo_player_token:'player-token'};
  for(const [message,status] of [['LOBBY_CLOSED',409],['HOST_UNAUTHORIZED',403],['ROOM_NOT_FOUND',404],['unexpected',500]]){
    globalThis.removalApiClient={rpc:async()=>({data:null,error:{message}})};
    assert.equal((await remove(req({room:'142426',playerId:target}))).status,status);
  }
  globalThis.removalApiClient=null;
  assert.equal((await leave(req({room:'142426'}))).status,503);
});
