import assert from "node:assert/strict";

const baseUrl = process.env.JIXGO_QA_BASE_URL?.replace(/\/$/, "");
const hostKey = process.env.JIXGO_QA_HOST_CONTROL_KEY;

if (!baseUrl || !hostKey) {
  throw new Error(
    "Set JIXGO_QA_BASE_URL and JIXGO_QA_HOST_CONTROL_KEY before running the live room smoke test.",
  );
}

function cookieFrom(response, name) {
  const values = response.headers.getSetCookie?.() ?? [response.headers.get("set-cookie") ?? ""];
  const cookie = values.find((value) => value.startsWith(`${name}=`));
  assert.ok(cookie, `Expected ${name} cookie from ${response.url}`);
  return cookie.split(";", 1)[0];
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
  });
  return response;
}

async function expectJson(response, expectedStatus, label) {
  const body = await response.json().catch(() => null);
  assert.equal(response.status, expectedStatus, `${label}: ${JSON.stringify(body)}`);
  return body;
}

const room = String(Math.floor(100000 + Math.random() * 900000));
const nickname = `QA-${room.slice(-4)}`;

const homepage = await request("/", { headers: {} });
assert.equal(homepage.status, 200, "Homepage must render");
const html = await homepage.text();
assert.match(html, /JIXGO Magical 24/i, "Homepage must contain the event title");

const unauthenticatedHost = await request("/host", { headers: {} });
assert.equal(unauthenticatedHost.status, 200, "Host route must render its login page");
assert.match(await unauthenticatedHost.text(), /Host Login/i, "Host dashboard must remain private");

const login = await request("/api/game/host/login", {
  method: "POST",
  body: JSON.stringify({ hostKey }),
});
await expectJson(login, 200, "Host login");
const hostCookie = cookieFrom(login, "jixgo_host_session");

const setup = await request("/api/game/setup", {
  method: "POST",
  headers: { Cookie: hostCookie },
  body: JSON.stringify({ room }),
});
const setupBody = await expectJson(setup, 200, "Room setup");
assert.equal(setupBody.room, room, "Setup must return the generated room");
assert.equal(setupBody.questionCount, 20, "Setup must seed all 20 questions");

const hostState = await request(`/api/game/host/state?room=${room}`, {
  headers: { Cookie: hostCookie },
});
const hostStateBody = await expectJson(hostState, 200, "Host room state");
assert.equal(hostStateBody.state.room.code, room, "Host must see the created room");
assert.equal(hostStateBody.state.room.status, "lobby", "New room must start in the lobby");

const join = await request("/api/game/join", {
  method: "POST",
  body: JSON.stringify({ room, nickname }),
});
await expectJson(join, 200, "Player join");
const playerCookie = cookieFrom(join, "jixgo_player_token");

const playerState = await request(`/api/game/state?room=${room}`, {
  headers: { Cookie: playerCookie },
});
const playerStateBody = await expectJson(playerState, 200, "Player room state");
assert.equal(playerStateBody.room.code, room, "Player must see the created room");
assert.equal(playerStateBody.summary.player.nickname, nickname, "Player session must be attached to the joined room");

console.log(`PASS live-room smoke · room ${room} · ${baseUrl}`);
