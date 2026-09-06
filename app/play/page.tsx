"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { guestTitle } from "@/lib/guest-title";

type PublicQuestion = { id: string; position: number; kind: "choice" | "bonus"; prompt: string; media: { type?: "image" | "emoji"; src?: string; clues?: string; displayClues?: string }; options: string[]; timeLimitSeconds: number };
type GameState = { room: { code: string; status: "lobby" | "question" | "reveal" | "paused" | "finished"; currentPosition: number; deadlineAt: string | null }; question: PublicQuestion | null };

export default function PlayPage() {
  const [room, setRoom] = useState("");
  const [state, setState] = useState<GameState | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<string[]>(Array(10).fill(""));
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("กำลังเชื่อมต่อกับห้อง…");
  const [lastPoints, setLastPoints] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const nickname = typeof window === "undefined" ? "Guest" : localStorage.getItem("jixgo-nickname") || "Guest";

  const refresh = useCallback(async (code: string) => {
    const response = await fetch(`/api/game/state?room=${encodeURIComponent(code)}`, { cache: "no-store" });
    if (!response.ok) { setMessage(response.status === 503 ? "ระบบเกมจริงยังไม่ได้เชื่อม Supabase" : "ไม่พบห้องนี้"); return; }
    const next = await response.json() as GameState;
    setState((current) => {
      if (current?.question?.id !== next.question?.id || current?.room.status !== next.room.status) {
        setSelected(null); setAnswers(Array(10).fill("")); setSubmitted(false); setLastPoints(null);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("room")?.trim().toUpperCase() || "";
    setRoom(code);
    if (!code) { setMessage("ต้องเข้าร่วมห้องก่อนเริ่มเล่น"); return; }
    void refresh(code);
    const poll = window.setInterval(() => void refresh(code), 1000);
    const clock = window.setInterval(() => setNow(Date.now()), 250);
    return () => { window.clearInterval(poll); window.clearInterval(clock); };
  }, [refresh]);

  const question = state?.question ?? null;
  const seconds = useMemo(() => state?.room.deadlineAt ? Math.max(0, Math.ceil((new Date(state.room.deadlineAt).getTime() - now) / 1000)) : 0, [state?.room.deadlineAt, now]);
  const canAnswer = state?.room.status === "question" && seconds > 0 && !submitted;

  async function submit(response: { option?: string; answers?: string[] }) {
    if (!room || !canAnswer) return;
    const result = await fetch("/api/game/answer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ room, response }) });
    const payload = await result.json();
    if (!result.ok) { setMessage(payload.error === "ANSWER_LOCKED" ? "หมดเวลาแล้ว ข้อนี้ล็อกคำตอบแล้ว" : "ส่งคำตอบไม่สำเร็จ ลองใหม่อีกครั้ง"); return; }
    setSubmitted(true); setLastPoints(payload.scoreAwarded ?? 0);
    setMessage(payload.scoreAwarded > 0 ? `เวทมนตร์ทำงานแล้ว ✦ +${payload.scoreAwarded} คะแนน` : "ส่งคำตอบแล้ว · รอ Host เฉลย");
  }

  if (state?.room.status === "finished") return <FinishCard nickname={nickname} />;
  if (!question || state?.room.status !== "question") return <WaitingRoom room={room} message={message} />;

  return <main className="page-shell"><section className="shell-content player-shell">
    <div className="topbar player-topbar"><span className="question-number">QUESTION {String(question.position).padStart(2, "0")} / 20 · LIVE</span><span className={`timer ${seconds < 10 ? "danger" : ""}`}>{seconds}</span></div>
    <div className={`panel question-card player-question-card ${question.kind === "bonus" ? "bonus-card" : ""}`}>
      {question.kind === "choice" ? <ChoiceRound question={question} selected={selected} disabled={!canAnswer} onChoose={(index) => { setSelected(index); void submit({ option: question.options[index] }); }} /> : <BonusRound answers={answers} disabled={!canAnswer} onChange={(index, value) => setAnswers((current) => current.map((answer, answerIndex) => answerIndex === index ? value : answer))} onSubmit={() => void submit({ answers })} />}
      <div className={`answer-status ${seconds === 0 && !submitted ? "expired" : submitted ? "submitted" : ""}`}>{submitted ? `${message}${lastPoints === 0 ? "" : " · รอข้อต่อไป"}` : seconds === 0 ? "หมดเวลาแล้ว · รอ Host เปลี่ยนข้อ" : "คำตอบจะถูกล็อกเมื่อส่งหรือหมดเวลา"}</div>
      <Link className="back-link player-exit" href="/">ออกจากเกม</Link>
    </div>
  </section></main>;
}

function ChoiceRound({ question, selected, disabled, onChoose }: { question: PublicQuestion; selected: number | null; disabled: boolean; onChoose: (index: number) => void }) {
  const media = question.media;
  return <>{media.type === "emoji" ? <div className="emoji-question-frame" role="img" aria-label="โจทย์อิโมจิ"><div className="emoji-question-line">{media.displayClues ?? media.clues}</div></div> : <div className="question-image-frame"><img className="question-image" src={media.src} alt="ภาพประกอบคำถาม" /></div>}<h1 className="question-text question-prompt-banner">{question.prompt}</h1><div className="choices">{question.options.map((choice, index) => <button className={`choice ${selected === index ? "selected" : ""}`} key={choice} onClick={() => onChoose(index)} disabled={disabled} aria-pressed={selected === index}><span className="choice-key">{String.fromCharCode(65 + index)}</span><span>{choice}</span></button>)}</div></>;
}

function BonusRound({ answers, disabled, onChange, onSubmit }: { answers: string[]; disabled: boolean; onChange: (index: number, value: string) => void; onSubmit: () => void }) {
  return <><div className="bonus-heading"><span className="bonus-kicker">✦ FINAL SPELL · 60 SEC ✦</span><h1>Bonus Magic Time</h1><p>เติมชื่อเพลงให้ครบทุกตัวอักษร แล้วส่งคำตอบทั้ง 10 เพลง</p></div><div className="bonus-rule">คำตอบต้องสะกดตรงทุกตัวอักษร · ระบบตรวจบน server</div><div className="bonus-grid">{answers.map((answer, index) => <label className="bonus-entry" key={index}><span className="bonus-id">20.{index + 1}</span><span className="bonus-clue">เติมชื่อเพลงข้อ {index + 1}</span><input value={answer} onChange={(event) => onChange(index, event.target.value)} placeholder="พิมพ์ชื่อเพลง" disabled={disabled} autoComplete="off" /></label>)}</div><button className="button primary bonus-submit" onClick={onSubmit} disabled={disabled}>ส่งคาถาทั้ง 10 เพลง ✦</button></>;
}

function WaitingRoom({ room, message }: { room: string; message: string }) { return <main className="page-shell"><section className="shell-content"><div className="panel lobby-center finish-card"><div className="eyebrow-small">LIVE ROOM {room || "—"}</div><h1 className="title">รอประตูเวทมนตร์เปิด</h1><p className="waiting">{message}</p><Link className="back-link" href="/join">กลับไปเข้าร่วมห้อง</Link></div></section></main>; }
function FinishCard({ nickname }: { nickname: string }) { return <main className="page-shell"><section className="shell-content"><div className="panel lobby-center finish-card"><div className="eyebrow-small">QUEST COMPLETE · {nickname.toUpperCase()}</div><h1 className="title">จบการเดินทางแล้ว ✦</h1><p className="waiting">{guestTitle(nickname)} · รอ Host ประกาศ leaderboard</p><Link className="button primary" href="/">กลับหน้าแรก</Link></div></section></main>; }
