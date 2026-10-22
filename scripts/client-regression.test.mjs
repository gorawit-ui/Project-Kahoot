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
for (const key of ["window", "document", "HTMLElement", "localStorage", "MutationObserver"]) globalThis[key] = dom.window[key];
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
// jsdom has no layout/scroll engine; scrolling is covered by real-browser QA.
dom.window.HTMLElement.prototype.scrollIntoView = function () {};
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.qaNavigation = [];
const { render, screen, fireEvent, waitFor, cleanup } = await import("@testing-library/react");
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
  return require(outfile).default;
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
beforeEach(() => { window.history.replaceState(null,"","/join"); localStorage.clear(); globalThis.qaNavigation = []; });
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
