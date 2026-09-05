"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { driveImageUrl, sampleQuestions } from "@/data/questions";
import { guestTitle } from "@/lib/guest-title";
import { getPlayerId, openRoomChannel, sendRoomEvent } from "@/lib/live-room";

const DEFAULT_SECONDS = 15;

export default function PlayPage() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [seconds, setSeconds] = useState(DEFAULT_SECONDS);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [nickname, setNickname] = useState("Guest");
  const [score, setScore] = useState(0);
  const [lastPoints, setLastPoints] = useState<number | null>(null);
  const [live, setLive] = useState(false);
  const channelRef = useRef<ReturnType<typeof openRoomChannel>>(null);
  const question = sampleQuestions[questionIndex];
  const expired = seconds === 0 && !submitted;
  const [emojiLine, ...promptLines] = question.prompt.split("\n");
  const isEmojiQuestion = question.id >= 10;

  useEffect(() => {
    setNickname(localStorage.getItem("jixgo-nickname") || "Guest");
    const room = new URLSearchParams(window.location.search).get("room");
    const initialQuestion = Number(new URLSearchParams(window.location.search).get("question"));
    if (Number.isInteger(initialQuestion) && initialQuestion >= 0) setQuestionIndex(initialQuestion);
    const channel = openRoomChannel(room || "", (event) => {
      if (event.type === "question-changed" || event.type === "game-started") {
        setQuestionIndex(event.questionIndex);
        setFinished(false);
      }
      if (event.type === "game-finished") setFinished(true);
    });
    channelRef.current = channel;
    setLive(Boolean(channel));
    return () => { channel?.unsubscribe(); };
  }, []);

  useEffect(() => {
    setSeconds(DEFAULT_SECONDS);
    setSelected(null);
    setSubmitted(false);
    setLastPoints(null);
  }, [questionIndex]);

  useEffect(() => {
    if (seconds <= 0 || submitted) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [seconds, submitted]);

  function selectAnswer(index: number) {
    if (submitted || seconds === 0) return;
    const isCorrect = index === question.correctIndex;
    const speedBonus = Math.round((seconds / DEFAULT_SECONDS) * 50);
    const points = isCorrect ? 100 + speedBonus : 0;
    setSelected(index);
    setSubmitted(true);
    setLastPoints(points);
    setScore((value) => value + points);
    sendRoomEvent(channelRef.current, { type: "player-answered", playerId: getPlayerId(), nickname, questionIndex, selectedIndex: index, answeredAt: Date.now() });
  }

  function goNext() {
    if (questionIndex === sampleQuestions.length - 1) {
      setFinished(true);
      return;
    }
    setQuestionIndex((value) => value + 1);
  }

  if (finished) {
    return (
      <main className="page-shell">
        <section className="shell-content">
          <div className="panel lobby-center finish-card">
            <div className="eyebrow-small">QUEST COMPLETE · {nickname.toUpperCase()}</div>
            <h1 className="title">จบการเดินทางแล้ว ✦</h1>
            <div className="result-card" id="result-card">
              <div className="result-card-kicker">JIXGO MAGICAL 24</div>
              <div className="result-card-name">{nickname}</div>
              <div className="result-card-title">{guestTitle(nickname)}</div>
              <div className="result-score">{score.toLocaleString()}</div>
              <div className="result-card-caption">YOU COMPLETED THE MAGICAL JOURNEY</div>
            </div>
            <div className="result-actions">
              <button className="button primary" onClick={() => shareResult(nickname, score)}>แชร์ผลลัพธ์ ✦</button>
              <button className="button ghost" onClick={() => downloadResult(nickname, score)}>บันทึกการ์ด</button>
            </div>
            <Link className="back-link" href="/">กลับหน้าแรก</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="shell-content">
        <div className="topbar">
          <span className="question-number">QUESTION {String(question.id).padStart(2, "0")} / {sampleQuestions.length} · {live ? "LIVE" : "SOLO"}</span>
          <span className={`timer ${seconds < 10 ? "danger" : ""}`}>{seconds}</span>
        </div>
        <div className="panel question-card player-question-card">
          {isEmojiQuestion ? (
            <div className="emoji-question-frame" role="img" aria-label="โจทย์ทายหนังจากอิโมจิ">
              <div className="emoji-question-line">{emojiLine}</div>
              <div className="emoji-question-caption">EMOJI MOVIE SPELL</div>
            </div>
          ) : (
            <div className={`question-image-frame ${question.imageFrame} image-shape-${question.imageShape} image-fit-${question.imageFit} ${question.id === 3 ? "map-art" : ""} ${question.id === 6 ? "song-art" : ""}`}>
              <img className="question-image" src={driveImageUrl(question.imageUrl)} alt={`ภาพประกอบคำถามที่ ${question.id}`} />
            </div>
          )}
          <h1 className="question-text">{isEmojiQuestion ? promptLines.join(" ") : question.prompt}</h1>
          <div className="choices">
            {question.choices.map((choice, index) => (
              <button className={`choice ${selected === index ? "selected" : ""}`} key={String(choice)} onClick={() => selectAnswer(index)} disabled={seconds === 0 || submitted} aria-pressed={selected === index}>
                <span className="choice-key">{String.fromCharCode(65 + index)}</span>
                <span>{choice}</span>
              </button>
            ))}
          </div>
          {submitted ? <div className={`answer-feedback ${selected === question.correctIndex ? "correct" : "wrong"}`} role="status">
            <strong>{selected === question.correctIndex ? "เวทมนตร์ทำงานแล้ว ✦" : "คาถานี้พลาดไปนิดเดียว"}</strong>
            <span>{selected === question.correctIndex ? `+${lastPoints?.toLocaleString()} คะแนน · ตอบได้ยอดเยี่ยม` : `คำตอบคือ ${question.choices[question.correctIndex]} · ไปต่อกันได้เลย`}</span>
          </div> : null}
          <div className={`answer-status ${submitted ? "submitted" : ""} ${expired ? "expired" : ""}`} role="status">
            {submitted ? "ส่งคำตอบแล้ว ✦ รอ Host เฉลยได้เลย" : expired ? "หมดเวลาแล้ว ข้อนี้ไม่ได้รับคำตอบ" : "แตะคำตอบที่คิดว่าใช่ที่สุด"}
          </div>
          <button className="button primary next-question" onClick={goNext} disabled={!submitted && !expired}>{questionIndex === sampleQuestions.length - 1 ? "จบเกม" : "ข้อต่อไป →"}</button>
          <Link className="back-link" href="/">ออกจากตัวอย่าง</Link>
        </div>
      </section>
    </main>
  );
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
