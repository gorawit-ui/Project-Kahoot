"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { guestTitle } from "@/lib/guest-title";
import { LeaveRoomButton } from "@/components/leave-room-button";
import { QuestionProgress } from "@/components/question-progress";
import { BonusDistributionGrid, ChoiceDistributionBoard, type BonusSummary, type ChoiceDistribution } from "@/components/reveal-distribution";

type BonusPrompt = { id: string; prompt: string };
type Question = { id: string; position: number; kind: "choice" | "bonus"; prompt: string; media: { type?: "image" | "emoji"; src?: string; clues?: string; displayClues?: string }; options: Array<string | BonusPrompt>; timeLimitSeconds: number; reveal?: { correctOption?: string; correctAnswers?: string[] } | null };
type ScoreRow = { nickname: string; score: number; rank: number };
type PlayerSummary = { player: ScoreRow; leaderboard: ScoreRow[]; currentResponse?: { option?: string; answers?: string[] } | null };
type State = { serverNow?: string; room: { code: string; status: "lobby" | "question" | "reveal" | "paused" | "q20_summary" | "finished"; currentPosition: number; deadlineAt: string | null }; question: Question | null; distribution?: ChoiceDistribution | null; bonusSummary?: BonusSummary | null; summary?: PlayerSummary | null; summaryError?: string | null };

function readBonusDraft(key: string): string[] | null {
  try {
    const value: unknown = JSON.parse(window.sessionStorage.getItem(key) ?? "null");
    return Array.isArray(value) && value.length === 10 && value.every(answer => typeof answer === "string") ? value : null;
  } catch { return null; }
}

function removeBonusDraft(key: string | null) {
  if (!key) return;
  try { window.sessionStorage.removeItem(key); } catch { /* Storage is optional. */ }
}

export default function PlayPage() {
  const [room, setRoom] = useState(""); const [state, setState] = useState<State | null>(null); const [selected, setSelected] = useState<number | null>(null); const [answers, setAnswers] = useState<string[]>(Array(10).fill("")); const [submitted, setSubmitted] = useState(false); const [sending, setSending] = useState(false); const [message, setMessage] = useState("กำลังเชื่อมต่อกับห้อง…"); const [now, setNow] = useState(Date.now()); const ranks = useRef<Record<string, number>>({}); const answerLock = useRef(false); const questionId = useRef<string | null>(null); const refreshInFlight = useRef(false); const refreshVersion = useRef(0);
  const [nickname, setNickname] = useState("Guest");
  const [connected, setConnected] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState("");
  const serverOffset = useRef(0);
  const refreshController = useRef<AbortController | null>(null);
  const bonusDraftKey = useRef<string | null>(null);
  useEffect(() => {
    try { setNickname(localStorage.getItem("jixgo-nickname") || "Guest"); } catch { /* Storage is optional. */ }
  }, []);
  const refresh = useCallback(async (code: string) => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    const version = ++refreshVersion.current;
    const controller = new AbortController();
    refreshController.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 7000);
    try {
      const response = await fetch(`/api/game/state?room=${encodeURIComponent(code)}&t=${Date.now()}`, { cache: "no-store", signal: controller.signal });
      if (version !== refreshVersion.current) return;
      if (!response.ok) {
        setConnected(false);
        setMessage(response.status === 503 ? "ระบบเกมจริงยังไม่ได้เชื่อม Supabase" : "เชื่อมต่อห้องไม่สำเร็จ · กำลังลองใหม่");
        return;
      }
      const next = await response.json() as State;
      if (version !== refreshVersion.current || !next.room) return;
      if (questionId.current !== (next.question?.id ?? null)) {
        removeBonusDraft(bonusDraftKey.current);
        bonusDraftKey.current = null;
        questionId.current = next.question?.id ?? null;
        answerLock.current = false;
        setSelected(null);
        setAnswers(Array(10).fill(""));
        setSubmitted(false);
        setSending(false);
        setSubmissionMessage("");
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      }
      const savedResponse = next.summary?.currentResponse;
      if (next.question?.kind === "bonus" && next.summary?.player) {
        const key = `jixgo-bonus-draft:${code}:${next.question.id}:${encodeURIComponent(next.summary.player.nickname)}`;
        const questionEnded = next.room.status === "reveal" || next.room.status === "q20_summary" || next.room.status === "finished";
        if (savedResponse || questionEnded) {
          removeBonusDraft(key);
          bonusDraftKey.current = null;
        } else if (bonusDraftKey.current !== key) {
          bonusDraftKey.current = key;
          setAnswers(readBonusDraft(key) ?? Array(10).fill(""));
        }
      }
      if (savedResponse) {
        answerLock.current = true;
        setSubmitted(true);
        setSending(false);
        setSelected(next.question?.kind === "choice" ? (next.question.options as string[]).indexOf(savedResponse.option ?? "") : null);
        if (savedResponse.answers) setAnswers(savedResponse.answers);
        setSubmissionMessage("ส่งคำตอบแล้ว · รอเฉลยอัตโนมัติ");
      }
      const serverTime = Date.parse(next.serverNow ?? "");
      if (Number.isFinite(serverTime)) { serverOffset.current = serverTime - Date.now(); setNow(serverTime); }
      setState(next);
      setConnected(true);
      setMessage(next.summary ? "" : "เซสชันผู้เล่นไม่พร้อม · กลับไปเข้าร่วมห้องใหม่");
    } catch {
      if (version === refreshVersion.current) { setConnected(false); setMessage("การเชื่อมต่อสะดุด · กำลังลองใหม่"); }
    } finally {
      window.clearTimeout(timeout);
      if (version === refreshVersion.current) refreshInFlight.current = false;
    }
  }, []);
  useEffect(() => {
    refreshInFlight.current = false;
    const code = new URLSearchParams(window.location.search).get("room")?.trim() || "";
    setRoom(code);
    if (!/^\d{6}$/.test(code)) { setMessage("ต้องเข้าร่วมห้องก่อนเริ่มเล่น"); return; }
    void refresh(code);
    const poll = window.setInterval(() => void refresh(code), 1000);
    const clock = window.setInterval(() => setNow(Date.now() + serverOffset.current), 250);
    return () => {
      window.clearInterval(poll); window.clearInterval(clock);
      refreshVersion.current++; refreshController.current?.abort();
    };
  }, [refresh]);
  const question = state?.question;
  const summary = state?.summary ?? null;
  const seconds = useMemo(() => state?.room.deadlineAt ? Math.max(0, Math.ceil((new Date(state.room.deadlineAt).getTime() - now) / 1000)) : 0, [state?.room.deadlineAt, now]);
  const canAnswer = connected && !!summary && state?.room.status === "question" && seconds > 0 && !submitted && !sending;
  async function submit(response: { option?: string; answers?: string[] }) {
    if (!room || !canAnswer || answerLock.current || !question) return;
    const submittedQuestion = question.id;
    answerLock.current = true;
    setSending(true); setSubmissionMessage("กำลังล็อกคำตอบ…");
    try {
      const result = await fetch("/api/game/answer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, questionId: submittedQuestion, response }),
        signal: AbortSignal.timeout(10000),
      });
      const payload = await result.json().catch(() => ({}));
      if (questionId.current !== submittedQuestion) return;
      if (!result.ok && payload.error !== "ALREADY_ANSWERED") {
        answerLock.current = false;
        setSubmissionMessage(payload.error === "QUESTION_CHANGED" ? "คำถามเปลี่ยนแล้ว · กำลังโหลดข้อปัจจุบัน" : "ส่งคำตอบไม่สำเร็จหรือหมดเวลาแล้ว · ลองอีกครั้ง");
        void refresh(room);
        return;
      }
      setSubmitted(true); setSubmissionMessage("ส่งคำตอบแล้ว · รอเฉลยอัตโนมัติ");
      if (payload.accepted === true || payload.error === "ALREADY_ANSWERED") {
        removeBonusDraft(bonusDraftKey.current);
        // Keep the hydrated key until polling confirms the accepted response, so
        // a state read started before submission cannot restore an empty draft.
      }
    } catch {
      if (questionId.current !== submittedQuestion) return;
      // A response can be lost after the server accepted it. The next poll restores
      // the authoritative response; a retry cannot create duplicate points.
      answerLock.current = false;
      setSubmissionMessage("การเชื่อมต่อสะดุด · กำลังตรวจคำตอบ ลองส่งอีกครั้งได้");
      void refresh(room);
    } finally {
      if (questionId.current === submittedQuestion) setSending(false);
    }
  }
  function changeBonusAnswer(index: number, value: string) {
    const next = answers.map((answer, answerIndex) => answerIndex === index ? value : answer);
    setAnswers(next);
    if (bonusDraftKey.current) {
      try { window.sessionStorage.setItem(bonusDraftKey.current, JSON.stringify(next)); } catch { /* Storage is optional. */ }
    }
  }
  if (connected && !summary && (state?.summaryError === "PLAYER_SESSION_REQUIRED" || state?.summaryError?.includes("PLAYER_NOT_FOUND"))) return <Waiting room={room} message="เซสชันเดิมหมดอายุหรือไม่พบข้อมูลผู้เล่น · กรุณาเข้าร่วมห้องอีกครั้ง" recovery />;
  if (state?.room.status === "finished") return <Finish nickname={nickname} summary={summary} summaryError={state?.summaryError} ranks={ranks.current} />;
  if (!question || (state?.room.status !== "question" && state?.room.status !== "reveal" && state?.room.status !== "q20_summary")) return <Waiting room={room} message={message} allowLeave={connected && !!summary && state?.room.status === "lobby"} />;
  if (state.room.status === "q20_summary") return <RoomQ20Summary summary={state.bonusSummary} />;
  if (state.room.status === "reveal") return <RevealWithDistribution question={question} selected={selected} submitted={submitted} summary={summary} summaryError={state.summaryError} ranks={ranks.current} distribution={state.distribution} />;
  return <main className="page-shell question-screen"><section className="shell-content player-shell"><QuestionProgress current={question.position} /><div className="topbar player-topbar"><span className="question-number">QUESTION {String(question.position).padStart(2, "0")} / 20 · LIVE</span><span className={`timer ${seconds < 10 ? "danger" : ""}`}><small>TIME</small><strong>{seconds}</strong><em>SEC</em></span></div><div className={`panel question-card player-question-card ${question.kind === "bonus" ? "bonus-card" : ""}`}>{question.kind === "choice" ? <Choice key={question.id} question={question} selected={selected} disabled={!canAnswer} choose={(index) => { if (answerLock.current) return; setSelected(index); void submit({ option: String(question.options[index]) }); }} /> : <Bonus question={question} answers={answers} disabled={!canAnswer} change={changeBonusAnswer} submit={() => void submit({ answers })} />}<div className={`answer-status ${submitted ? "submitted" : seconds === 0 ? "expired" : ""}`}>{sending ? "กำลังล็อกคำตอบ…" : message || submissionMessage || (seconds === 0 ? "หมดเวลาแล้ว · เฉลยจะแสดงใน 3 วินาที" : "คำตอบจะถูกล็อกเมื่อส่งหรือหมดเวลา")}</div><Link className="back-link player-exit" href="/">ออกจากเกม</Link></div></section></main>;
}

function Choice({ question, selected, disabled, choose }: { question: Question; selected: number | null; disabled: boolean; choose: (index: number) => void }) { const choices = question.options as string[]; const media = question.media; return <>{media.type === "emoji" ? <div className="emoji-question-frame"><div className="emoji-question-line">{media.displayClues ?? media.clues}</div></div> : <div className="question-image-frame"><img className="question-image" src={media.src} alt="ภาพประกอบคำถาม" /></div>}<h1 className="question-text question-prompt-banner">{question.prompt}</h1><div className="choices">{choices.map((choice, index) => <button className={`choice ${selected === index ? "selected" : ""}`} key={choice} disabled={disabled} onClick={() => choose(index)}><span className="choice-key">{String.fromCharCode(65 + index)}</span><span>{choice}</span></button>)}</div></>; }
function RevealWithDistribution(props: { question: Question; selected: number | null; submitted: boolean; summary: PlayerSummary | null; summaryError?: string | null; ranks: Record<string, number>; distribution?: ChoiceDistribution | null }) { return <Reveal {...props} distribution={props.distribution} />; }
function RoomQ20Summary({ summary }: { summary?: BonusSummary | null }) { return <main className="page-shell lobby-world-shell"><section className="shell-content player-shell"><div className="panel reveal-card room-summary-card"><BonusDistributionGrid summary={summary} /></div></section></main>; }
function Bonus({ question, answers, disabled, change, submit }: { question: Question; answers: string[]; disabled: boolean; change: (index: number, value: string) => void; submit: () => void }) { const clues = question.options as BonusPrompt[]; return <><div className="bonus-heading"><span className="bonus-kicker">✦ FINAL SPELL · 120 SEC ✦</span><h1>{question.prompt}</h1><p>เติมชื่อเพลงให้ครบทุกตัวอักษร แล้วส่งคำตอบทั้ง 10 เพลง</p></div><div className="bonus-rule">สะกดให้ตรงทุกตัวอักษร · ระบบไม่นับช่องว่างหัว–ท้าย</div><div className="bonus-grid">{clues.map((clue, index) => <label className="bonus-entry" key={clue.id}><span className="bonus-id">{clue.id}</span><span className="bonus-clue">{clue.prompt}</span><input value={answers[index] ?? ""} onChange={event => change(index, event.target.value)} placeholder="พิมพ์ชื่อเพลง" disabled={disabled} autoComplete="off" /></label>)}</div><button className="button primary bonus-submit" disabled={disabled} onClick={submit}>ส่งคาถาทั้ง 10 เพลง ✦</button></>; }
function Reveal({ question, selected, submitted, summary, summaryError, ranks, distribution }: { question: Question; selected: number | null; submitted: boolean; summary: PlayerSummary | null; summaryError?: string | null; ranks: Record<string, number>; distribution?: ChoiceDistribution | null }) { const correct = question.reveal?.correctOption; const bonusAnswers = question.reveal?.correctAnswers; const own = summary?.currentResponse?.option ?? (selected === null ? null : String(question.options[selected])); const isCorrect = correct !== undefined && own === correct; const bonusClues = question.options as BonusPrompt[]; const bonusResponses = summary?.currentResponse?.answers ?? []; const bonusCorrectCount = bonusAnswers?.filter((answer, index) => bonusResponses[index] === answer).length ?? 0;
  const hasPositiveResult = question.kind === "bonus" ? bonusCorrectCount > 0 : isCorrect;
  const resultClass = question.kind === "bonus" && !bonusAnswers ? "" : hasPositiveResult ? "correct" : "wrong";
  const finalRound = question.kind === "bonus" || question.position >= 20;
  const encouragement = finalRound ? "จบครบทุกข้อแล้ว ✨ ขอบคุณที่ร่วมสนุก" : hasPositiveResult ? "เก่งมากเลย ✨ ข้อต่อไปเอาอีกนะ" : "ไม่เป็นไรน้า ✨ ข้อต่อไปเอาใหม่"; return <main className="page-shell"><section className="shell-content player-shell"><div className="reveal-wrap"><div className={`reveal-card ${resultClass}`}><img className="reveal-event-logo" src="/assets/logo-jixgo-full.webp" alt="JIXGO Magical 24" /><span className="reveal-icon">{hasPositiveResult ? "✦" : "✧"}</span><div className="eyebrow-small">QUESTION {String(question.position).padStart(2, "0")} · REVEAL</div><h1>{question.kind === "bonus" ? "เฉลย Bonus Magic Time" : isCorrect ? "คำตอบถูกต้อง!" : (submitted || !!summary?.currentResponse) ? "ยังไม่ใช่คำตอบนี้" : "หมดเวลาแล้ว"}</h1><p className={`answer-encouragement ${hasPositiveResult ? "positive" : "gentle"}`}>{encouragement}</p>{correct ? <><p>คำตอบที่ถูกต้องคือ</p><strong className="reveal-answer">{correct}</strong></> : bonusAnswers ? <><p className="bonus-result-count">ตอบถูก {bonusCorrectCount} / {bonusAnswers.length} เพลง</p><ol className="bonus-reveal-list">{bonusAnswers.map((answer, index) => { const response = bonusResponses[index] ?? ""; const isRight = response === answer; return <li className={isRight ? "bonus-correct" : "bonus-wrong"} key={`${bonusClues[index]?.id ?? index}-${answer}`}><span className="bonus-result-icon">{isRight ? "✓" : "✕"}</span><span><b>{bonusClues[index]?.id ?? `20.${index + 1}`}</b> · {bonusClues[index]?.prompt}<small>{isRight ? "ตอบถูก" : `ตอบ: ${response || "ไม่ได้ตอบ"}`}</small></span><strong>{isRight ? "ถูกต้อง" : `เฉลย: ${answer}`}</strong></li>; })}</ol></> : <p>กำลังเปิดเฉลย…</p>}</div><Scoreboard summary={summary} summaryError={summaryError} ranks={ranks} waitingForResults={finalRound} />{question.kind === "choice" ? <ChoiceDistributionBoard distribution={distribution} /> : null}</div></section></main>; }
function Scoreboard({ summary, summaryError, ranks, final = false, waitingForResults = false }: { summary: PlayerSummary | null; summaryError?: string | null; ranks: Record<string, number>; final?: boolean; waitingForResults?: boolean }) { if (!summary) return <p className="waiting scoreboard-error">{summaryError?.includes("PLAYER_NOT_FOUND") ? "ข้อมูลผู้เล่นของห้องนี้ถูกรีเซ็ตแล้ว · กลับไปเข้าร่วมห้องใหม่" : "กำลังโหลดคะแนนจากห้อง…"}</p>; const medal = (rank: number) => rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null; return <section className="scoreboard panel"><div className="eyebrow-small">{final ? "FINAL LEADERBOARD" : "LIVE SCOREBOARD"}</div><div className="my-rank"><span>อันดับของคุณ</span><strong>#{summary.player.rank}</strong><em>{summary.player.score} คะแนน</em></div><ol className="rank-list score-list">{summary.leaderboard.map(row => { const before = ranks[row.nickname]; const delta = before ? before - row.rank : 0; ranks[row.nickname] = row.rank; return <li className={delta ? "rank-shift" : ""} key={row.nickname}><span>{final && medal(row.rank) ? <b className="rank-medal" aria-label={`อันดับ ${row.rank}`}>{medal(row.rank)}</b> : null}#{row.rank} {row.nickname}{delta > 0 ? <b className="rank-up"> ▲{delta}</b> : delta < 0 ? <b className="rank-down"> ▼{Math.abs(delta)}</b> : null}</span><strong>{row.score}</strong></li>; })}</ol>{!final && <p className="waiting">{waitingForResults ? "รอ Host แสดงสรุปผลและอันดับสุดท้าย ✦" : "รอ Host เริ่มข้อถัดไป ✦"}</p>}</section>; }
function Waiting({ room, message, recovery = false, allowLeave = false }: { room: string; message: string; recovery?: boolean; allowLeave?: boolean }) { return <main className="page-shell lobby-world-shell waiting-world"><section className="shell-content"><div className="panel lobby-center finish-card"><div className="eyebrow-small">LIVE ROOM {room || "—"}</div><div className="waiting-orb">✦</div><h1 className="title">{recovery ? "เซสชันผู้เล่นไม่พร้อม" : "รอประตูเวทมนตร์เปิด"}</h1><p className="waiting">{message}</p><p className="waiting-hint">{recovery ? "หากชื่อเดิมมีผู้ใช้อยู่แล้ว ให้ใช้ชื่อใหม่หรือติดต่อ Host" : "กำลังเตรียมคำถามแรกให้คุณ…"}</p><Link className="back-link" href={/^\d{6}$/.test(room) ? `/join?room=${encodeURIComponent(room)}` : "/join"}>กลับไปเข้าร่วมห้อง</Link>{allowLeave ? <LeaveRoomButton room={room} /> : null}</div></section></main>; }
function Finish({ nickname, summary, summaryError, ranks }: { nickname: string; summary: PlayerSummary | null; summaryError?: string | null; ranks: Record<string, number> }) { return <main className="page-shell"><section className="shell-content player-shell"><div className="panel lobby-center finish-card"><div className="eyebrow-small">QUEST COMPLETE · {nickname.toUpperCase()}</div><h1 className="title">จบการเดินทางแล้ว ✦</h1>{summary ? <><div className="final-score"><span>{guestTitle(nickname)}</span><strong>{summary.player.score}</strong><em>คะแนน · อันดับ #{summary.player.rank}</em></div><Scoreboard summary={summary} ranks={ranks} final /></> : <Scoreboard summary={summary} summaryError={summaryError} ranks={ranks} final />}<Link className="button primary" href="/">กลับหน้าแรก</Link></div></section></main>; }
