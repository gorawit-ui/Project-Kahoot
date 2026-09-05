"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { bonusPoints, sampleQuestions, type ChoiceQuestion } from "@/data/questions";
import { guestTitle } from "@/lib/guest-title";
import { getPlayerId, openRoomChannel, sendRoomEvent } from "@/lib/live-room";

export default function PlayPage() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [seconds, setSeconds] = useState(sampleQuestions[0].timeSeconds);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [nickname, setNickname] = useState("Guest");
  const [score, setScore] = useState(0);
  const [lastPoints, setLastPoints] = useState<number | null>(null);
  const [bonusAnswers, setBonusAnswers] = useState<string[]>([]);
  const [bonusCorrect, setBonusCorrect] = useState<number | null>(null);
  const [live, setLive] = useState(false);
  const channelRef = useRef<ReturnType<typeof openRoomChannel>>(null);
  const question = sampleQuestions[questionIndex];
  const expired = seconds === 0 && !submitted;

  useEffect(() => {
    setNickname(localStorage.getItem("jixgo-nickname") || "Guest");
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    const initialQuestion = Number(params.get("question"));
    if (Number.isInteger(initialQuestion) && initialQuestion >= 0 && initialQuestion < sampleQuestions.length) setQuestionIndex(initialQuestion);
    const channel = openRoomChannel(room || "", (event) => {
      if (event.type === "question-changed" || event.type === "game-started") {
        setQuestionIndex(event.questionIndex);
        setFinished(false);
      }
      if (event.type === "game-finished") setFinished(true);
    });
    channelRef.current = channel;
    setLive(Boolean(channel));
    return () => { void channel?.unsubscribe(); };
  }, []);

  useEffect(() => {
    setSeconds(question.timeSeconds);
    setSelected(null);
    setSubmitted(false);
    setLastPoints(null);
    setBonusCorrect(null);
    setBonusAnswers(question.kind === "bonus" ? Array.from({ length: question.bonusEntries.length }, () => "") : []);
  }, [question]);

  useEffect(() => {
    if (seconds <= 0 || submitted) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [seconds, submitted]);

  function selectAnswer(index: number) {
    if (question.kind !== "choice" || submitted || seconds === 0) return;
    const points = index === question.correctIndex ? 100 + Math.round((seconds / question.timeSeconds) * 50) : 0;
    setSelected(index);
    setSubmitted(true);
    setLastPoints(points);
    setScore((value) => value + points);
    sendRoomEvent(channelRef.current, { type: "player-answered", playerId: getPlayerId(), nickname, questionIndex, selectedIndex: index, answeredAt: Date.now() });
  }

  function submitBonus() {
    if (question.kind !== "bonus" || submitted) return;
    // Strict answer policy: only leading/trailing accidental spaces are ignored.
    // Every remaining character (including Thai marks and English letter case) must match.
    const correctCount = question.bonusEntries.reduce((count, item, index) => count + Number((bonusAnswers[index] ?? "").trim() === item.answer), 0);
    const points = bonusPoints(correctCount);
    setBonusCorrect(correctCount);
    setLastPoints(points);
    setScore((value) => value + points);
    setSubmitted(true);
    sendRoomEvent(channelRef.current, { type: "player-answered", playerId: getPlayerId(), nickname, questionIndex, selectedIndex: -1, answeredAt: Date.now() });
  }

  function goNext() {
    if (questionIndex === sampleQuestions.length - 1) return setFinished(true);
    setQuestionIndex((value) => value + 1);
  }

  if (finished) return <FinishCard nickname={nickname} score={score} />;

  return (
    <main className="page-shell">
      <section className="shell-content player-shell">
        <div className="topbar player-topbar">
          <span className="question-number">QUESTION {String(question.id).padStart(2, "0")} / {sampleQuestions.length} · {live ? "LIVE" : "SOLO"}</span>
          <span className={`timer ${seconds < 10 ? "danger" : ""}`} aria-label={`เหลือ ${seconds} วินาที`}>{seconds}</span>
        </div>
        <div className={`panel question-card player-question-card ${question.kind === "bonus" ? "bonus-card" : ""}`}>
          {question.kind === "choice" ? <ChoiceRound question={question} selected={selected} submitted={submitted} expired={expired} lastPoints={lastPoints} onChoose={selectAnswer} /> : (
            <BonusRound
              answers={bonusAnswers}
              correctCount={bonusCorrect}
              disabled={submitted || seconds === 0}
              expired={expired}
              lastPoints={lastPoints}
              onChange={(index, value) => setBonusAnswers((current) => current.map((answer, answerIndex) => answerIndex === index ? value : answer))}
              onSubmit={submitBonus}
            />
          )}
          {question.kind === "choice" && !submitted ? <div className={`answer-status ${expired ? "expired" : ""}`} role="status">{expired ? "หมดเวลาแล้ว ข้อนี้ไม่ได้รับคำตอบ" : "แตะคำตอบที่คิดว่าใช่ที่สุด"}</div> : null}
          <button className="button primary next-question" onClick={goNext} disabled={!submitted && !expired}>{questionIndex === sampleQuestions.length - 1 ? "จบเกม" : "ข้อต่อไป →"}</button>
          <Link className="back-link player-exit" href="/">ออกจากตัวอย่าง</Link>
        </div>
      </section>
    </main>
  );
}

function ChoiceRound({ question, selected, submitted, expired, lastPoints, onChoose }: { question: ChoiceQuestion; selected: number | null; submitted: boolean; expired: boolean; lastPoints: number | null; onChoose: (index: number) => void }) {
  return <>
    {question.media.type === "emoji" ? <div className="emoji-question-frame" role="img" aria-label={`โจทย์อิโมจิ: ${question.media.clues}`}><div className="emoji-question-line">{question.media.displayClues ?? question.media.clues}</div></div> : <div className="question-image-frame"><img className="question-image" src={question.media.src} alt={`ภาพประกอบคำถามที่ ${question.id}`} /></div>}
    <h1 className="question-text question-prompt-banner">{question.prompt}</h1>
    <div className="choices">
      {question.choices.map((choice, index) => <button className={`choice ${selected === index ? "selected" : ""}`} key={choice} onClick={() => onChoose(index)} disabled={expired || submitted} aria-pressed={selected === index}><span className="choice-key">{String.fromCharCode(65 + index)}</span><span>{choice}</span></button>)}
    </div>
    {submitted ? <div className={`answer-feedback ${selected === question.correctIndex ? "correct" : "wrong"}`} role="status"><strong>{selected === question.correctIndex ? "เวทมนตร์ทำงานแล้ว ✦" : "คาถานี้พลาดไปนิดเดียว"}</strong><span>{selected === question.correctIndex ? `+${lastPoints?.toLocaleString()} คะแนน · ตอบได้ยอดเยี่ยม` : `คำตอบคือ ${question.answer} · ไปต่อกันได้เลย`}</span></div> : null}
  </>;
}

function BonusRound({ answers, correctCount, disabled, expired, lastPoints, onChange, onSubmit }: { answers: string[]; correctCount: number | null; disabled: boolean; expired: boolean; lastPoints: number | null; onChange: (index: number, value: string) => void; onSubmit: () => void }) {
  const question = sampleQuestions[sampleQuestions.length - 1];
  if (question.kind !== "bonus") return null;
  return <>
    <div className="bonus-heading"><span className="bonus-kicker">✦ FINAL SPELL · 60 SEC ✦</span><h1>{question.prompt}</h1><p>{question.intro}</p></div>
    <div className="bonus-rule">คำตอบต้องสะกดตรงทุกตัวอักษร · แก้ไขได้จนกว่าจะกดส่ง</div>
    <div className="bonus-grid">
      {question.bonusEntries.map((entry, index) => <label className="bonus-entry" key={entry.id}><span className="bonus-id">{entry.id}</span><span className="bonus-clue">{entry.prompt}</span><input value={answers[index] ?? ""} onChange={(event) => onChange(index, event.target.value)} placeholder="พิมพ์ชื่อเพลง" disabled={disabled} autoComplete="off" /></label>)}
    </div>
    {correctCount !== null ? <div className="answer-feedback correct" role="status"><strong>ร่ายคาถาสำเร็จ {correctCount}/10 เพลง ✦</strong><span>ได้รับ +{lastPoints?.toLocaleString()} คะแนนโบนัส</span></div> : null}
    {expired && correctCount === null ? <div className="answer-status expired" role="status">หมดเวลาแล้ว · กดส่งเพื่อดูคะแนนจากคำตอบที่พิมพ์ไว้</div> : null}
    <button className="button primary bonus-submit" onClick={onSubmit} disabled={correctCount !== null}>ส่งคาถาทั้ง 10 เพลง ✦</button>
  </>;
}

function FinishCard({ nickname, score }: { nickname: string; score: number }) {
  return <main className="page-shell"><section className="shell-content"><div className="panel lobby-center finish-card"><div className="eyebrow-small">QUEST COMPLETE · {nickname.toUpperCase()}</div><h1 className="title">จบการเดินทางแล้ว ✦</h1><div className="result-card" id="result-card"><div className="result-card-kicker">JIXGO MAGICAL 24</div><div className="result-card-name">{nickname}</div><div className="result-card-title">{guestTitle(nickname)}</div><div className="result-score">{score.toLocaleString()}</div><div className="result-card-caption">YOU COMPLETED THE MAGICAL JOURNEY</div></div><div className="result-actions"><button className="button primary" onClick={() => shareResult(nickname, score)}>แชร์ผลลัพธ์ ✦</button><button className="button ghost" onClick={() => downloadResult(nickname, score)}>บันทึกการ์ด</button></div><Link className="back-link" href="/">กลับหน้าแรก</Link></div></section></main>;
}

function shareResult(nickname: string, score: number) {
  const text = `ฉันจบ JIXGO Magical 24 ในฉายา ${guestTitle(nickname)} ได้ ${score.toLocaleString()} คะแนน ✦`;
  if (navigator.share) navigator.share({ title: "JIXGO Magical 24", text }).catch(() => undefined);
  else navigator.clipboard?.writeText(text);
}

function downloadResult(nickname: string, score: number) {
  const safeName = nickname.replace(/[^a-zA-Z0-9ก-๙_-]/g, "") || "guest";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#071f5a"/><stop offset="1" stop-color="#06143a"/></linearGradient></defs><rect width="1080" height="1350" rx="42" fill="url(#bg)"/><circle cx="540" cy="510" r="330" fill="none" stroke="#f4c96b" stroke-opacity=".45"/><text x="540" y="180" fill="#ffe9ad" font-size="34" text-anchor="middle" font-family="serif" letter-spacing="8">JIXGO MAGICAL 24</text><text x="540" y="520" fill="#fff9eb" font-size="88" text-anchor="middle" font-family="serif">${escapeXml(nickname)}</text><text x="540" y="600" fill="#f4c96b" font-size="34" text-anchor="middle" font-family="sans-serif">${escapeXml(guestTitle(nickname))} ✦</text><text x="540" y="850" fill="#ffe9ad" font-size="150" text-anchor="middle" font-family="serif">${score.toLocaleString()}</text><text x="540" y="930" fill="#b9dbff" font-size="24" text-anchor="middle" font-family="sans-serif" letter-spacing="4">YOU COMPLETED THE MAGICAL JOURNEY</text></svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const link = document.createElement("a"); link.href = url; link.download = `jixgo-magical-24-${safeName}.svg`; link.click(); URL.revokeObjectURL(url);
}

function escapeXml(value: string) { return value.replace(/[<>&'\"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;" }[character] ?? character)); }
