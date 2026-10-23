import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { JSDOM } from "jsdom";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import React from "react";

// Component integration tests use a DOM simulation and mocked HTTP responses.
// They do not replace real-device or deployed Host/player end-to-end tests.
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/join" });
for (const key of ["window", "document", "HTMLElement", "localStorage", "sessionStorage", "MutationObserver"]) globalThis[key] = dom.window[key];
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
// jsdom has no layout/scroll engine; scrolling is covered by real-browser QA.
dom.window.HTMLElement.prototype.scrollIntoView = function () {};
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.qaNavigation = [];
const { render, screen, fireEvent, waitFor, cleanup, act } = await import("@testing-library/react");
const require = createRequire(import.meta.url);
const cache = path.resolve("qa/.cache");
await mkdir(cache, { recursive: true });
async function page(file, name) {
  const outfile = path.join(cache, `${name}.cjs`);
  await build({
    entryPoints: [file], outfile, bundle: true, platform: "node", format: "cjs", jsx: "automatic", packages: "external",
    plugins: [{ name: "next-test-boundaries", setup(builder) {
      builder.onResolve({ filter: /^next\/(link|navigation)$/ }, args => ({ path: args.path, namespace: "qa" }));
      builder.onLoad({ filter: /.*/, namespace: "qa" }, args => ({ contents: args.path === "next/link"
        ? 'import React from "react"; export default ({children,...props}) => React.createElement("a",props,children);'
        : 'exports.useRouter=()=>({push:url=>globalThis.qaNavigation.push(url)});', loader: "js", resolveDir: process.cwd() }));
    } }],
  });
  return require(outfile).default ?? require(outfile).LeaveRoomButton ?? require(outfile).HostPlayerList;
}
const Join = await page("app/join/page.tsx", "join");
const Lobby = await page("app/lobby/page.tsx", "lobby");
const Login = await page("app/host/host-login.tsx", "login");
const Host = await page("app/host/host-dashboard.tsx", "host");
const Play = await page("app/play/page.tsx", "play");
const Preview = await page("app/preview/preview-client.tsx", "preview");
const json = (payload, status=200) => new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
const activeState = (id="00000000-0000-4000-8000-000000000001") => ({
  serverNow: new Date(Date.now()-60000).toISOString(),
  room: { code: "142426", status: "question", currentPosition: 1, deadlineAt: new Date(Date.now()-30000).toISOString() },
  question: { id, position: 1, kind: "choice", prompt: id.endsWith("2") ? "Question two" : "Question one", media: { type: "emoji", clues: "QA" }, options: ["Alpha", "Beta"], timeLimitSeconds: 30 },
  summary: { player: { nickname: "QA", score: 0, rank: 1 }, leaderboard: [], currentResponse: null },
});
beforeEach(() => { window.history.replaceState(null,"","/join"); localStorage.clear(); sessionStorage.clear(); globalThis.qaNavigation = []; });
afterEach(() => { cleanup(); });

test("Join rejects a spaces-only nickname without sending a request", async () => {
  let calls=0; globalThis.fetch=async()=>{ calls++; return json({}); };
  render(React.createElement(Join));
  fireEvent.change(screen.getByLabelText("รหัสห้อง"), { target: { value: "142426" } });
  fireEvent.change(screen.getByLabelText("ชื่อที่ใช้เล่น"), { target: { value: "   " } });
  fireEvent.click(screen.getByRole("button", { name: "เข้าร่วมเกม ✦" }));
  assert.match((await screen.findByRole("alert")).textContent, /กรุณากรอกชื่อ/);
  assert.equal(calls,0);
});
test("Join restores the button and displays a network failure", async () => {
  globalThis.fetch=async()=>{throw new TypeError("offline");};
  render(React.createElement(Join));
  fireEvent.change(screen.getByLabelText("รหัสห้อง"), { target: { value: "142426" } });
  fireEvent.change(screen.getByLabelText("ชื่อที่ใช้เล่น"), { target: { value: "QA" } });
  fireEvent.click(screen.getByRole("button", { name: "เข้าร่วมเกม ✦" }));
  assert.match((await screen.findByRole("alert")).textContent, /การเชื่อมต่อสะดุด/);
  assert.equal(screen.getByRole("button", { name: "เข้าร่วมเกม ✦" }).disabled,false);
});
test("Lobby explains a missing room and disables Ready", async () => {
  window.history.replaceState(null,"","/lobby?room=999999"); globalThis.fetch=async()=>json({error:"ROOM_NOT_FOUND"},404);
  render(React.createElement(Lobby));
  await screen.findByText(/ไม่พบห้องนี้/);
  assert.equal(screen.getByRole("button",{name:"ฉันพร้อมแล้ว ✦"}).disabled,true);
  assert.equal(screen.queryByText(/โหมดตัวอย่าง/),null);
});
test("Join establishes identity before creating a player and can retry a lost response", async () => {
  const calls=[];let attempts=0;
  globalThis.fetch=async(url)=>{
    calls.push(url);
    if(url==="/api/game/session") return json({ok:true});
    if(++attempts===1) throw new TypeError("accepted response lost");
    return json({rejoined:true});
  };
  render(React.createElement(Join));
  fireEvent.change(screen.getByLabelText("รหัสห้อง"),{target:{value:"142426"}});
  fireEvent.change(screen.getByLabelText("ชื่อที่ใช้เล่น"),{target:{value:"QA"}});
  fireEvent.click(screen.getByRole("button",{name:"เข้าร่วมเกม ✦"}));
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button",{name:"เข้าร่วมเกม ✦"}));
  await waitFor(()=>assert.equal(globalThis.qaNavigation.length,1));
  assert.deepEqual(calls,["/api/game/session","/api/game/join","/api/game/session","/api/game/join"]);
});
test("Lobby retries a dropped connection and enables Ready after recovery", async () => {
  let calls=0; globalThis.fetch=async()=>{ if (++calls===1) throw new TypeError("offline"); return json({room:{status:"lobby",readyCount:0}}); };
  render(React.createElement(Lobby));
  await screen.findByText(/การเชื่อมต่อสะดุด/);
  await screen.findByText(/เชื่อมต่อกับห้องจริงแล้ว/,{}, {timeout:2500});
  assert.equal(screen.getByRole("button",{name:"ฉันพร้อมแล้ว ✦"}).disabled,false);
});
test("Host login recovers from a network failure", async () => {
  globalThis.fetch=async()=>{ throw new TypeError("offline"); };
  render(React.createElement(Login));
  fireEvent.change(screen.getByLabelText("Host control key"),{target:{value:"synthetic-test-key"}});
  fireEvent.click(screen.getByRole("button",{name:"เข้าสู่ Host Control"}));
  await screen.findByText(/การเชื่อมต่อสะดุด/);
  assert.equal(screen.getByRole("button",{name:"เข้าสู่ Host Control"}).disabled,false);
});
test("Host restores the selected room and recovers from a failed command", async () => {
  window.history.replaceState(null,"","/host?room=142426");
  let commands=0;
  globalThis.fetch=async(url)=>{
    if (url==="/api/game/host") {commands++;throw new TypeError("offline");}
    return json({state:{room:{code:"142426",status:"lobby",currentPosition:1}},playerCount:2,leaderboard:[]});
  };
  render(React.createElement(Host));
  await waitFor(()=>assert.equal(screen.getByRole("button",{name:"เริ่มเกม"}).disabled,false));
  assert.equal(localStorage.getItem("jixgo-host-room"),"142426");
  fireEvent.click(screen.getByRole("button",{name:"เริ่มเกม"}));
  await waitFor(()=>assert.equal(screen.getByRole("button",{name:"เริ่มเกม"}).disabled,false));
  assert.equal(commands,1);
});
test("Play restores an accepted answer after refresh, including StrictMode", async () => {
  window.history.replaceState(null,"","/play?room=142426");
  const state=activeState();state.summary.currentResponse={option:"Beta"};
  globalThis.fetch=async()=>json(state);
  render(React.createElement(React.StrictMode,null,React.createElement(Play)));
  await screen.findByText("ส่งคำตอบแล้ว · รอเฉลยอัตโนมัติ");
  assert.equal(screen.getByRole("button",{name:/A\s*Alpha/}).disabled,true);
  assert.match(screen.getByRole("button",{name:/B\s*Beta/}).className,/selected/);
});
test("Play uses server time when the player's clock is ahead", async () => {
  window.history.replaceState(null,"","/play?room=142426"); globalThis.fetch=async()=>json(activeState());
  render(React.createElement(Play));
  await screen.findByText("Question one");
  assert.equal(screen.getByRole("button",{name:/A\s*Alpha/}).disabled,false);
});
test("Play without a player session cannot submit", async () => {
  window.history.replaceState(null,"","/play?room=142426");const state=activeState();state.summary=null;
  globalThis.fetch=async()=>json(state);render(React.createElement(Play));
  await screen.findByText(/เซสชันผู้เล่นไม่พร้อม/);
  assert.equal(screen.getByRole("button",{name:/A\s*Alpha/}).disabled,true);
});
test("Double-click sends one answer bound to the visible question", async () => {
  window.history.replaceState(null,"","/play?room=142426");let resolveAnswer;const bodies=[];const state=activeState();
  globalThis.fetch=async(url,init)=>url==="/api/game/answer" ? (bodies.push(JSON.parse(init.body)),new Promise(resolve=>{resolveAnswer=resolve;})) : json(state);
  render(React.createElement(Play));await screen.findByText("Question one");
  fireEvent.click(screen.getByRole("button",{name:/A\s*Alpha/}));fireEvent.click(screen.getByRole("button",{name:/A\s*Alpha/}));
  assert.equal(bodies.length,1);assert.equal(bodies[0].questionId,state.question.id);
  resolveAnswer(json({accepted:true}));await screen.findByText("ส่งคำตอบแล้ว · รอเฉลยอัตโนมัติ");
});
test("An old answer response cannot lock the next question", async () => {
  window.history.replaceState(null,"","/play?room=142426");let resolveAnswer;let state=activeState();
  globalThis.fetch=async(url)=>url==="/api/game/answer" ? new Promise(resolve=>{resolveAnswer=resolve;}) : json(state);
  render(React.createElement(Play));await screen.findByText("Question one");
  fireEvent.click(screen.getByRole("button",{name:/A\s*Alpha/}));
  state=activeState("00000000-0000-4000-8000-000000000002");
  await screen.findByText("Question two",{}, {timeout:2500});
  resolveAnswer(json({accepted:true}));
  await waitFor(()=>assert.equal(screen.getByRole("button",{name:/A\s*Alpha/}).disabled,false));
  assert.equal(screen.queryByText("ส่งคำตอบแล้ว · รอเฉลยอัตโนมัติ"),null);
});
test("Play recovers when an accepted answer's HTTP response is lost", async () => {
  window.history.replaceState(null,"","/play?room=142426");const state=activeState();
  globalThis.fetch=async(url)=>{
    if(url==="/api/game/answer") {state.summary.currentResponse={option:"Alpha"};throw new TypeError("response lost");}
    return json(state);
  };
  render(React.createElement(Play));await screen.findByText("Question one");
  fireEvent.click(screen.getByRole("button",{name:/A\s*Alpha/}));
  await screen.findByText("ส่งคำตอบแล้ว · รอเฉลยอัตโนมัติ");
  assert.equal(screen.getByRole("button",{name:/A\s*Alpha/}).disabled,true);
});

// New browsers may return a scrolling Promise. React must never receive it as
// an effect destructor when QuestionProgress unmounts at the first reveal.
test("First answer reaches reveal when scrollIntoView returns a Promise", async () => {
  window.history.replaceState(null,"","/play?room=142426");
  const originalScroll = window.HTMLElement.prototype.scrollIntoView;
  window.HTMLElement.prototype.scrollIntoView = () => Promise.resolve();
  let state = activeState();
  globalThis.fetch = async (url) => {
    if (url === "/api/game/answer") {
      state = { ...state, room: { ...state.room, status: "reveal" },
        question: { ...state.question, reveal: { correctOption: "Alpha" } },
        summary: { ...state.summary, currentResponse: { option: "Alpha" } } };
      return json({ accepted: true });
    }
    return json(state);
  };
  const errors = [];
  class Boundary extends React.Component {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch(error) { errors.push(error.message); }
    render() { return this.state.failed ? React.createElement("p", null, "QA crash") : this.props.children; }
  }
  try {
    render(React.createElement(Boundary, null, React.createElement(Play)));
    await screen.findByText("Question one");
    fireEvent.click(screen.getByRole("button", { name: /A\s*Alpha/ }));
    await waitFor(() => assert.ok(screen.queryByRole("heading", { name: "คำตอบถูกต้อง!" }) || screen.queryByText("QA crash")), { timeout: 2500 });
    assert.deepEqual(errors, []);
    assert.ok(screen.getByRole("heading", { name: "คำตอบถูกต้อง!" }));
  } finally {
    cleanup();
    window.HTMLElement.prototype.scrollIntoView = originalScroll;
  }
});

test("A player completes 19 choice reveals, bonus answers, room summary and final ranking", async () => {
  window.history.replaceState(null, "", "/play?room=142426");
  const originalScroll = window.HTMLElement.prototype.scrollIntoView;
  window.HTMLElement.prototype.scrollIntoView = () => Promise.resolve();
  let state = activeState();
  const submissions = [];
  const bonusAnswers = Array.from({ length: 10 }, (_, index) => `Song ${index + 1}`);
  globalThis.fetch = async (url, init) => {
    if (url === "/api/game/answer") {
      const body = JSON.parse(init.body);
      submissions.push(body);
      assert.equal(body.questionId, state.question.id);
      state.summary.currentResponse = body.response;
      state.summary.player.score += 100;
      return json({ accepted: true });
    }
    return json(state);
  };
  const errors = [];
  class Boundary extends React.Component {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch(error) { errors.push(error.message); }
    render() { return this.state.failed ? React.createElement("p", null, "QA full-game crash") : this.props.children; }
  }
  try {
    render(React.createElement(Boundary, null, React.createElement(Play)));
    for (let position = 1; position <= 20; position++) {
      state = activeState(`00000000-0000-4000-8000-${String(position).padStart(12, "0")}`);
      state.room.currentPosition = position;
      state.question.position = position;
      state.question.prompt = `QA question ${position}`;
      state.summary.player.score = (position - 1) * 100;
      if (position === 20) {
        state.question.kind = "bonus";
        state.question.options = bonusAnswers.map((_, index) => ({ id: `20.${index + 1}`, prompt: `Clue ${index + 1}` }));
      }
      await screen.findByRole("heading", { name: state.question.prompt }, { timeout: 2500 });
      if (position < 20) {
        const answer = screen.getByRole("button", { name: /A\s*Alpha/ });
        assert.equal(answer.disabled, false, `question ${position} must unlock`);
        fireEvent.click(answer);
      } else {
        const fields = screen.getAllByPlaceholderText("พิมพ์ชื่อเพลง");
        assert.equal(fields.length, 10);
        fields.forEach((field, index) => fireEvent.change(field, { target: { value: bonusAnswers[index] } }));
        fireEvent.click(screen.getByRole("button", { name: "ส่งคาถาทั้ง 10 เพลง ✦" }));
      }
      await screen.findByText("ส่งคำตอบแล้ว · รอเฉลยอัตโนมัติ");
      state.room.status = "reveal";
      state.question.reveal = position < 20 ? { correctOption: "Alpha" } : { correctAnswers: bonusAnswers };
      if (position < 20) state.distribution = { totalPlayers: 1, answered: 1, unanswered: 0, options: [
        { option: "Alpha", count: 1, percent: 100, correct: true },
        { option: "Beta", count: 0, percent: 0, correct: false },
      ] };
      await screen.findByRole("heading", { name: position < 20 ? "คำตอบถูกต้อง!" : "เฉลย Bonus Magic Time" }, { timeout: 2500 });
      if (position === 20) assert.equal(screen.getAllByText("ตอบถูก").length, 10);
      assert.deepEqual(errors, []);
    }
    assert.equal(submissions.length, 20);
    assert.deepEqual(submissions[19].response.answers, bonusAnswers);
    state.room.status = "q20_summary";
    state.bonusSummary = { totalPlayers: 1, submitted: 1, notSubmitted: 0, perfect: 1,
      rows: bonusAnswers.map((_, index) => ({ id: `20.${index + 1}`, correct: 1, wrong: 0, unanswered: 0 })) };
    await screen.findByRole("heading", { name: "บันทึกบทสุดท้ายของทั้งห้อง" }, { timeout: 2500 });
    state.room.status = "finished";
    state.summary.leaderboard = [{ nickname: "QA", score: 2000, rank: 1 }];
    await screen.findByRole("heading", { name: "จบการเดินทางแล้ว ✦" }, { timeout: 2500 });
    assert.ok(screen.getByText("FINAL LEADERBOARD"));
    assert.ok(screen.getByText("คะแนน · อันดับ #1"));
    assert.deepEqual(errors, []);
  } finally {
    cleanup();
    window.HTMLElement.prototype.scrollIntoView = originalScroll;
  }
});

test("Host question preview can change questions and close when scrolling returns a Promise", () => {
  const originalScroll = window.HTMLElement.prototype.scrollIntoView;
  window.HTMLElement.prototype.scrollIntoView = () => Promise.resolve();
  try {
    const view = render(React.createElement(Preview, { initialQuestionId: 1 }));
    assert.doesNotThrow(() => view.rerender(React.createElement(Preview, { initialQuestionId: 2 })));
    assert.equal(screen.getByRole("link", { name: "02", exact: true }).getAttribute("aria-current"), "page");
    assert.doesNotThrow(() => view.unmount());
  } finally {
    cleanup();
    window.HTMLElement.prototype.scrollIntoView = originalScroll;
  }
});

test("Missing or reset player sessions show a room-preserving recovery link in every game phase", async () => {
  window.history.replaceState(null, "", "/play?room=142426");
  for (const status of ["question", "reveal", "q20_summary", "finished"]) {
    for (const reason of ["PLAYER_SESSION_REQUIRED", "PLAYER_NOT_FOUND"]) {
      const state = activeState();
      state.room.status = status;
      state.summary = null;
      state.summaryError = reason;
      globalThis.fetch = async () => json(state);
      const view = render(React.createElement(Play));
      await screen.findByRole("heading", { name: "เซสชันผู้เล่นไม่พร้อม" });
      assert.equal(screen.getByRole("link", { name: "กลับไปเข้าร่วมห้อง" }).getAttribute("href"), "/join?room=142426");
      assert.equal(screen.queryByText("กำลังโหลดคะแนนจากห้อง…"), null);
      view.unmount();
    }
  }
});

test("Host changing room cannot command the new room with the old room's question", async () => {
  window.history.replaceState(null, "", "/host?room=142426");
  let releaseNewRoom;
  const newRoomRead = new Promise(resolve => { releaseNewRoom = resolve; });
  const commands = [];
  let newReads = 0;
  globalThis.fetch = async (url, init) => {
    if (url === "/api/game/host") { commands.push(JSON.parse(init.body)); return json({ ok: true }); }
    if (String(url).includes("room=999999")) {
      newReads++;
      await newRoomRead;
      return json({ state: { room: { code: "999999", status: "lobby", currentPosition: 1 } }, playerCount: 0, leaderboard: [] });
    }
    return json({ state: { room: { code: "142426", status: "reveal", currentPosition: 7 } }, playerCount: 2, leaderboard: [] });
  };
  const view = render(React.createElement(Host));
  try {
    await waitFor(() => assert.equal(screen.getByRole("button", { name: "ข้อต่อไป" }).disabled, false));
    fireEvent.change(screen.getByLabelText("รหัสห้อง"), { target: { value: "999999" } });
    await waitFor(() => assert.ok(newReads > 0));
    const advance = screen.queryByRole("button", { name: "ข้อต่อไป" });
    assert.ok(!advance || advance.disabled, "old-room controls must disable while the new room is loading");
    if (advance) fireEvent.click(advance);
    assert.deepEqual(commands, []);
    releaseNewRoom();
    await waitFor(() => assert.equal(screen.getByRole("button", { name: "เริ่มเกม" }).disabled, false));
    fireEvent.click(screen.getByRole("button", { name: "เริ่มเกม" }));
    await waitFor(() => assert.equal(commands.length, 1));
    assert.deepEqual(commands[0], { room: "999999", position: 1, status: "question" });
  } finally { releaseNewRoom(); view.unmount(); }
});

const bonusState = (id = "00000000-0000-4000-8000-000000000020") => {
  const state = activeState(id);
  state.room.currentPosition = 20;
  state.question.position = 20;
  state.question.kind = "bonus";
  state.question.prompt = "QA draft bonus";
  state.question.options = Array.from({ length: 10 }, (_, index) => ({ id: `20.${index + 1}`, prompt: `Draft clue ${index + 1}` }));
  return state;
};

test("Bonus draft survives remount and StrictMode reload without submitting", async () => {
  window.history.replaceState(null, "", "/play?room=142426");
  const state = bonusState();
  let submissions = 0;
  globalThis.fetch = async (url) => { if (url === "/api/game/answer") submissions++; return json(state); };
  let view = render(React.createElement(Play));
  await screen.findByRole("heading", { name: "QA draft bonus" });
  let fields = screen.getAllByPlaceholderText("พิมพ์ชื่อเพลง");
  fireEvent.change(fields[0], { target: { value: "First unsent song" } });
  fireEvent.change(fields[9], { target: { value: "Tenth unsent song" } });
  view.unmount();
  view = render(React.createElement(React.StrictMode, null, React.createElement(Play)));
  try {
    await screen.findByRole("heading", { name: "QA draft bonus" });
    await waitFor(() => {
      fields = screen.getAllByPlaceholderText("พิมพ์ชื่อเพลง");
      assert.equal(fields[0].value, "First unsent song");
      assert.equal(fields[9].value, "Tenth unsent song");
    });
    assert.equal(submissions, 0, "restoring an unsent draft must never submit it");
  } finally { view.unmount(); }
});

test("Bonus draft is isolated by authenticated player, room and question", async () => {
  window.history.replaceState(null, "", "/play?room=142426");
  let state = bonusState();
  globalThis.fetch = async () => json(state);
  let view = render(React.createElement(Play));
  await screen.findByRole("heading", { name: "QA draft bonus" });
  fireEvent.change(screen.getAllByPlaceholderText("พิมพ์ชื่อเพลง")[0], { target: { value: "Only QA's draft" } });
  view.unmount();
  for (const identity of ["other-player", "other-room", "other-question"]) {
    state = bonusState();
    window.history.replaceState(null, "", identity === "other-room" ? "/play?room=999999" : "/play?room=142426");
    if (identity === "other-player") state.summary.player.nickname = "Other QA";
    if (identity === "other-room") state.room.code = "999999";
    if (identity === "other-question") state.question.id = "00000000-0000-4000-8000-000000000120";
    view = render(React.createElement(Play));
    await screen.findByRole("heading", { name: "QA draft bonus" });
    assert.equal(screen.getAllByPlaceholderText("พิมพ์ชื่อเพลง")[0].value, "", identity);
    view.unmount();
  }
  state = bonusState();
  window.history.replaceState(null, "", "/play?room=142426");
  view = render(React.createElement(Play));
  try {
    await screen.findByRole("heading", { name: "QA draft bonus" });
    await waitFor(() => assert.equal(screen.getAllByPlaceholderText("พิมพ์ชื่อเพลง")[0].value, "Only QA's draft"));
  } finally { view.unmount(); }
});

test("Accepted Bonus response replaces and clears an older unsent draft", async () => {
  window.history.replaceState(null, "", "/play?room=142426");
  const state = bonusState();
  globalThis.fetch = async () => json(state);
  let view = render(React.createElement(Play));
  await screen.findByRole("heading", { name: "QA draft bonus" });
  fireEvent.change(screen.getAllByPlaceholderText("พิมพ์ชื่อเพลง")[0], { target: { value: "Old draft" } });
  view.unmount();
  const accepted = Array.from({ length: 10 }, (_, index) => `Accepted song ${index + 1}`);
  state.summary.currentResponse = { answers: accepted };
  view = render(React.createElement(Play));
  await screen.findByText("ส่งคำตอบแล้ว · รอเฉลยอัตโนมัติ");
  assert.deepEqual(screen.getAllByPlaceholderText("พิมพ์ชื่อเพลง").map(field => field.value), accepted);
  view.unmount();
  state.summary.currentResponse = null;
  view = render(React.createElement(Play));
  try {
    await screen.findByRole("heading", { name: "QA draft bonus" });
    assert.equal(screen.getAllByPlaceholderText("พิมพ์ชื่อเพลง")[0].value, "");
  } finally { view.unmount(); }
});

test("Unavailable browser storage cannot block Bonus editing or submission", async () => {
  window.history.replaceState(null, "", "/play?room=142426");
  const state = bonusState();
  const storage = window.Storage.prototype;
  const originalGet = storage.getItem;
  const originalSet = storage.setItem;
  const originalRemove = storage.removeItem;
  const submissions = [];
  storage.getItem = storage.setItem = storage.removeItem = () => { throw new Error("QA storage unavailable"); };
  globalThis.fetch = async (url, init) => {
    if (url === "/api/game/answer") { submissions.push(JSON.parse(init.body)); return json({ accepted: true }); }
    return json(state);
  };
  let view;
  try {
    view = render(React.createElement(Play));
    await screen.findByRole("heading", { name: "QA draft bonus" });
    fireEvent.change(screen.getAllByPlaceholderText("พิมพ์ชื่อเพลง")[0], { target: { value: "Storage-free song" } });
    fireEvent.click(screen.getByRole("button", { name: "ส่งคาถาทั้ง 10 เพลง ✦" }));
    await screen.findByText("ส่งคำตอบแล้ว · รอเฉลยอัตโนมัติ");
    assert.equal(submissions.length, 1);
    assert.equal(submissions[0].response.answers[0], "Storage-free song");
  } finally {
    view?.unmount();
    storage.getItem = originalGet; storage.setItem = originalSet; storage.removeItem = originalRemove;
  }
});

test("Lobby missing player sessions disable Ready and preserve the recovery room", async () => {
  window.history.replaceState(null, "", "/lobby?room=999999");
  for (const summaryError of ["PLAYER_SESSION_REQUIRED", "PLAYER_NOT_FOUND"]) {
    globalThis.fetch = async () => json({ room: { code: "999999", status: "lobby", readyCount: 1 }, summary: null, summaryError });
    const view = render(React.createElement(Lobby));
    try {
      const recovery = await screen.findByRole("link", { name: "กลับไปเข้าร่วมห้อง" });
      assert.equal(recovery.getAttribute("href"), "/join?room=999999");
      assert.equal(screen.getByRole("button", { name: "ฉันพร้อมแล้ว ✦" }).disabled, true);
    } finally { view.unmount(); }
  }
});

test("Lobby Ready rejection recovers to a room-prefilled Join route", async () => {
  window.history.replaceState(null, "", "/lobby?room=999999");
  let rejected = false;
  globalThis.fetch = async (url) => {
    if (url === "/api/game/ready") { rejected = true; return json({ error: "PLAYER_NOT_FOUND" }, 409); }
    return json({ room: { code: "999999", status: "lobby", readyCount: 1 }, ...(rejected ? { summaryError: "PLAYER_NOT_FOUND" } : {}) });
  };
  render(React.createElement(Lobby));
  await screen.findByText(/เชื่อมต่อกับห้องจริงแล้ว/);
  fireEvent.click(screen.getByRole("button", { name: "ฉันพร้อมแล้ว ✦" }));
  const recovery = await screen.findByRole("link", { name: "กลับไปเข้าร่วมห้อง" });
  assert.equal(recovery.getAttribute("href"), "/join?room=999999");
  assert.equal(screen.getByRole("button", { name: "ฉันพร้อมแล้ว ✦" }).disabled, true);
});

test("A stale pre-submit Bonus poll cannot erase an accepted answer's visible inputs", async () => {
  window.history.replaceState(null, "", "/play?room=142426");
  const state = bonusState();
  const beforeSubmission = structuredClone(state);
  let releaseStaleRead;
  const staleRead = new Promise(resolve => { releaseStaleRead = resolve; });
  let reads = 0;
  let readInFlight = false;
  globalThis.fetch = async (url) => {
    if (url === "/api/game/answer") return json({ accepted: true });
    if (++reads >= 2) { readInFlight = true; return staleRead; }
    return json(state);
  };
  const view = render(React.createElement(Play));
  try {
    await screen.findByRole("heading", { name: "QA draft bonus" });
    fireEvent.change(screen.getAllByPlaceholderText("พิมพ์ชื่อเพลง")[0], { target: { value: "Visible accepted song" } });
    await waitFor(() => assert.ok(readInFlight), { timeout: 2500 });
    fireEvent.click(screen.getByRole("button", { name: "ส่งคาถาทั้ง 10 เพลง ✦" }));
    await screen.findByText("ส่งคำตอบแล้ว · รอเฉลยอัตโนมัติ");
    await act(async () => { releaseStaleRead(json(beforeSubmission)); await Promise.resolve(); });
    const fields = screen.getAllByPlaceholderText("พิมพ์ชื่อเพลง");
    assert.equal(fields[0].value, "Visible accepted song");
    assert.equal(fields[0].disabled, true);
    assert.ok(screen.getByText("ส่งคำตอบแล้ว · รอเฉลยอัตโนมัติ"));
  } finally { releaseStaleRead(json(beforeSubmission)); view.unmount(); }
});


test("Final Bonus reveal shows accurate full, partial and zero results without next-question prompts", async () => {
  window.history.replaceState(null, "", "/play?room=142426");
  const expected = Array.from({ length: 10 }, (_, i) => `Song ${i + 1}`);
  for (const count of [10, 4, 0]) {
    const state = bonusState();
    state.room.status = "reveal";
    state.question.reveal = { correctAnswers: expected };
    state.summary.currentResponse = { answers: expected.map((song, i) => i < count ? song : "Wrong") };
    globalThis.fetch = async () => json(state);
    const view = render(React.createElement(Play));
    try {
      await screen.findByText(`ตอบถูก ${count} / 10 เพลง`);
      assert.equal(document.querySelectorAll(".bonus-correct").length, count);
      assert.equal(document.querySelectorAll(".bonus-wrong").length, 10 - count);
      assert.equal(document.querySelector(".reveal-card").classList.contains("correct"), count > 0);
      assert.equal(document.querySelector(".reveal-card").classList.contains("wrong"), count === 0);
      assert.ok(screen.getByText("จบครบทุกข้อแล้ว ✨ ขอบคุณที่ร่วมสนุก"));
      assert.ok(screen.getByText("รอ Host แสดงสรุปผลและอันดับสุดท้าย ✦"));
      assert.equal(screen.queryByText(/ข้อต่อไป|ข้อถัดไป/), null);
    } finally { view.unmount(); }
  }
});

test("Earlier choice reveals still encourage and wait for the next question", async () => {
  window.history.replaceState(null, "", "/play?room=142426");
  const state = activeState();
  state.room.status = "reveal";
  state.question.reveal = { correctOption: "Alpha" };
  state.summary.currentResponse = { option: "Alpha" };
  globalThis.fetch = async () => json(state);
  const view = render(React.createElement(Play));
  try {
    await screen.findByRole("heading", { name: "คำตอบถูกต้อง!" });
    assert.ok(screen.getByText("เก่งมากเลย ✨ ข้อต่อไปเอาอีกนะ"));
    assert.ok(screen.getByText("รอ Host เริ่มข้อถัดไป ✦"));
  } finally { view.unmount(); }
});

const LeaveButton = await page('components/leave-room-button.tsx', 'leave-button');
const HostPlayers = await page('components/host-player-list.tsx', 'host-players');


test("Leave requires confirmation, allows cancel, and posts only the current room once", async () => {
  const calls = []; const busy = [];
  globalThis.fetch = async (url, init) => { calls.push({url,body:JSON.parse(init.body)}); return json({removed:true}); };
  render(React.createElement(LeaveButton,{room:"142426",onBusyChange:value=>busy.push(value)}));
  fireEvent.click(screen.getByRole("button",{name:"ออกจากห้อง",exact:true}));
  assert.equal(calls.length,0);
  fireEvent.click(screen.getByRole("button",{name:"อยู่ในห้องต่อ"}));
  assert.equal(calls.length,0);
  fireEvent.click(screen.getByRole("button",{name:"ออกจากห้อง",exact:true}));
  const confirm=screen.getByRole("button",{name:"ยืนยันออกจากห้อง"});
  fireEvent.click(confirm);fireEvent.click(confirm);
  await waitFor(()=>assert.deepEqual(globalThis.qaNavigation,["/"]));
  assert.deepEqual(calls,[{url:"/api/game/leave",body:{room:"142426"}}]);
  assert.deepEqual(busy,[true]);
});

test("Leave handles lost response and idempotent retry without losing player identity", async () => {
  let calls=0;
  globalThis.fetch=async()=>{if(++calls===1)throw Error("lost response"); return json({removed:false});};
  render(React.createElement(LeaveButton,{room:"142426"}));
  fireEvent.click(screen.getByRole("button",{name:"ออกจากห้อง",exact:true}));
  fireEvent.click(screen.getByRole("button",{name:"ยืนยันออกจากห้อง"}));
  await screen.findByRole("alert");
  assert.deepEqual(globalThis.qaNavigation,[]);
  fireEvent.click(screen.getByRole("button",{name:"ยืนยันออกจากห้อง"}));
  await waitFor(()=>assert.deepEqual(globalThis.qaNavigation,["/"]));
  assert.equal(calls,2);
});

test("Leave refused after game start keeps the user on the current page", async () => {
  globalThis.fetch=async()=>json({error:"LOBBY_CLOSED"},409);
  render(React.createElement(LeaveButton,{room:"142426"}));
  fireEvent.click(screen.getByRole("button",{name:"ออกจากห้อง",exact:true}));
  fireEvent.click(screen.getByRole("button",{name:"ยืนยันออกจากห้อง"}));
  await screen.findByText(/เกมเริ่มแล้ว/);
  assert.deepEqual(globalThis.qaNavigation,[]);
});

test("Ready players can leave from the play waiting screen, but active games cannot", async () => {
  window.history.replaceState(null,"","/play?room=142426");
  let state=activeState();state.room.status="lobby";
  globalThis.fetch=async()=>json(state);
  const view=render(React.createElement(Play));
  await screen.findByRole("button",{name:"ออกจากห้อง",exact:true});
  state=activeState();
  await screen.findByRole("heading",{name:"Question one"},{timeout:2500});
  assert.equal(screen.queryByRole("button",{name:"ออกจากห้อง",exact:true}),null);
  view.unmount();
});

const roster=Array.from({length:7},(_,i)=>({id:`00000000-0000-4000-8000-${String(i+1).padStart(12,"0")}`,nickname:`Lobby ${i+1}`,ready:i%2===0}));

test("Host lists every player and removes the confirmed UUID from the exact room", async () => {
  const calls=[];let refreshes=0;
  globalThis.fetch=async(url,init)=>{calls.push({url,body:JSON.parse(init.body)});return json({removed:true});};
  render(React.createElement(HostPlayers,{room:"142426",players:roster,enabled:true,busy:false,onBusyChange:()=>{},onChanged:async()=>refreshes++}));
  fireEvent.click(screen.getByRole("button",{name:"นำ Lobby 7 ออกจากห้อง"}));
  assert.equal(calls.length,0);
  fireEvent.click(screen.getByRole("button",{name:"ยืนยันนำออก"}));
  await screen.findByText("นำ Lobby 7 ออกจากห้องแล้ว");
  assert.deepEqual(calls,[{url:"/api/game/host/remove-player",body:{room:"142426",playerId:roster[6].id}}]);
  assert.equal(refreshes,1);
});

test("Host cannot remove during play or reuse a confirmation for a removed target", async () => {
  const props={room:"142426",players:roster,enabled:true,busy:false,onBusyChange:()=>{},onChanged:async()=>{}};
  const view=render(React.createElement(HostPlayers,props));
  fireEvent.click(screen.getByRole("button",{name:"นำ Lobby 1 ออกจากห้อง"}));
  view.rerender(React.createElement(HostPlayers,{...props,players:roster.slice(1)}));
  assert.equal(screen.queryByRole("button",{name:"ยืนยันนำออก"}),null);
  view.rerender(React.createElement(HostPlayers,{...props,enabled:false}));
  assert.equal(screen.queryByRole("button",{name:/นำ Lobby/}),null);
  assert.ok(screen.getByText(/นำชื่อออกไม่ได้/));
});

test("Host refreshes after start-race rejection instead of claiming removal", async () => {
  let refreshes=0;
  globalThis.fetch=async()=>json({error:"LOBBY_CLOSED"},409);
  render(React.createElement(HostPlayers,{room:"142426",players:roster,enabled:true,busy:false,onBusyChange:()=>{},onChanged:async()=>refreshes++}));
  fireEvent.click(screen.getByRole("button",{name:"นำ Lobby 1 ออกจากห้อง"}));
  fireEvent.click(screen.getByRole("button",{name:"ยืนยันนำออก"}));
  await screen.findByText("เกมเริ่มแล้ว · นำชื่อออกไม่ได้");
  assert.equal(refreshes,1);
});

test('Lobby disables Ready while a confirmed departure is in flight', async()=>{
  window.history.replaceState(null,'','/lobby?room=142426');
  let finish;const pending=new Promise(resolve=>finish=resolve);let readyCalls=0;
  globalThis.fetch=async(url)=>{
    if(url==='/api/game/leave')return pending;
    if(url==='/api/game/ready'){readyCalls++;return json({ready:true});}
    return json({room:{code:'142426',status:'lobby',readyCount:0},summary:{player:{nickname:'QA'}}});
  };
  render(React.createElement(Lobby));
  const leave=await screen.findByRole('button',{name:'ออกจากห้อง',exact:true});
  await waitFor(()=>assert.equal(leave.disabled,false));
  fireEvent.click(leave);
  fireEvent.click(screen.getByRole('button',{name:'ยืนยันออกจากห้อง'}));
  const ready=screen.getByRole('button',{name:'ฉันพร้อมแล้ว ✦'});
  assert.equal(ready.disabled,true);fireEvent.click(ready);assert.equal(readyCalls,0);
  finish(json({removed:true}));
  await waitFor(()=>assert.deepEqual(globalThis.qaNavigation,['/']));
});

test("Bonus reveal uses the server's persisted result and preserves historical verdicts", async () => {
  window.history.replaceState(null, "", "/play?room=142426");
  const expected = Array(10).fill("Cheat");
  for (const [stored, correct] of [["Cheat", 10], ["Cheat ", 9]]) {
    const state = bonusState();
    state.room.status = "reveal";
    state.question.reveal = { correctAnswers: expected };
    state.summary.currentResponse = { answers: expected.map((s, i) => i === 6 ? stored : s) };
    globalThis.fetch = async () => json(state);
    const view = render(React.createElement(Play));
    try {
      await screen.findByText(`ตอบถูก ${correct} / 10 เพลง`);
      const rows = document.querySelectorAll(".bonus-reveal-list li");
      assert.equal(rows[6].classList.contains("bonus-correct"), correct === 10);
      assert.equal(document.querySelectorAll(".bonus-correct").length, correct);
    } finally { view.unmount(); }
  }
});
