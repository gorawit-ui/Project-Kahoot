import assert from "node:assert/strict";

// Run against a local production build: node scripts/smoke-invalid-requests.mjs
// Uses invalid bodies and unauthenticated requests only; creates no game data.
const base = process.argv[2] ?? "http://127.0.0.1:3101";
const routes = ["join", "answer", "ready", "host/login", "host", "reset", "setup"];
let passed = 0;
const session = await fetch(`${base}/api/game/session`);
assert.equal(session.status, 200);
assert.equal(session.headers.get("cache-control"), "no-store");
const sessionCookie = session.headers.get("set-cookie");
assert.match(sessionCookie, /HttpOnly/i);
const cookie = sessionCookie.split(";")[0];
assert.match(cookie, /^jixgo_player_token=[0-9a-f-]{36}$/);
assert.deepEqual(await session.json(), { ok: true });
passed++;
const repeatedSession = await fetch(`${base}/api/game/session`, { headers: { Cookie: cookie } });
assert.equal(repeatedSession.status, 200);
assert.equal(repeatedSession.headers.get("set-cookie").split(";")[0], cookie, "Session bootstrap must preserve the returning player identity");
passed++;
for (const route of routes) {
  for (const body of ['{"room":', "", "null", "[]", "{}"] ) {
    const response = await fetch(`${base}/api/game/${route}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body,
      signal: AbortSignal.timeout(10000),
    });
    assert.equal(response.status, 400, `${route}: invalid body ${JSON.stringify(body)}`);
    const payload = await response.json();
    assert.equal(typeof payload.error, "string");
    assert.equal(response.headers.has("set-cookie"), false, `${route}: no session on rejection`);
    passed++;
  }
}
const unauthorized = [
  ["host/login", { hostKey: "qa-invalid-host-key" }, 403],
  ["host", { room: "142426", position: 1, status: "question" }, 403],
  ["reset", { room: "142426" }, 403],
  ["ready", { room: "142426" }, 401],
  ["answer", { room: "142426", questionId: "00000000-0000-4000-8000-000000000001", response: { option: "A" } }, 400],
];
const validQuestionId = "00000000-0000-4000-8000-000000000001";
for (const body of [
  { room: "142426", response: { option: "A" } },
  { room: "142426", questionId: "not-a-uuid", response: { option: "A" } },
  { room: "142426", questionId: validQuestionId, response: {} },
  { room: "142426", questionId: validQuestionId, response: { answers: Array(9).fill("") } },
  { room: "142426", questionId: validQuestionId, response: { option: "A", answers: Array(10).fill("") } },
]) {
  const response = await fetch(`${base}/api/game/answer`, {
    method: "POST", headers: { "Content-Type": "application/json", "Cookie": "jixgo_player_token=synthetic-test-only" },
    body: JSON.stringify(body), signal: AbortSignal.timeout(10000),
  });
  assert.equal(response.status, 400, "Answer question UUID and response shape validation");
  assert.equal(typeof (await response.json()).error, "string");
  passed++;
}
for (const [route, body, status] of unauthorized) {
  const response = await fetch(`${base}/api/game/${route}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(response.status, status, `${route}: session required`);
  assert.equal(response.headers.has("set-cookie"), false);
  passed++;
}
console.log(JSON.stringify({ passed, failed: 0, base, scope: "invalid JSON, invalid schema, authentication boundaries" }));
