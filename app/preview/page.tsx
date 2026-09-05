"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { bonusPoints, sampleQuestions } from "@/data/questions";

export default function PreviewPage() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const activeIndexRef = useRef<HTMLButtonElement>(null);
  const question = sampleQuestions[questionIndex];

  useEffect(() => activeIndexRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }), [questionIndex]);
  function chooseQuestion(index: number) { setQuestionIndex(index); setShowAnswer(false); }

  return <main className="page-shell"><section className="shell-content preview-shell">
    <div className="topbar"><div><div className="eyebrow-small">CONTENT PREVIEW · TEAM ONLY</div><h1 className="title">Question journey</h1></div><Link className="back-link" href="/host">กลับ Host</Link></div>
    <div className="preview-index" aria-label="เลือกคำถาม">{sampleQuestions.map((item, index) => <button ref={index === questionIndex ? activeIndexRef : undefined} className={`preview-index-item ${index === questionIndex ? "active" : ""}`} key={item.id} onClick={() => chooseQuestion(index)}>{String(item.id).padStart(2, "0")}</button>)}</div>
    <div className={`panel question-card ${question.kind === "bonus" ? "bonus-card" : ""}`}>
      <div className="preview-meta"><span>QUESTION {String(question.id).padStart(2, "0")} / {sampleQuestions.length}</span><span>{question.timeSeconds} SEC {question.kind === "bonus" ? "BONUS" : "DEFAULT"}</span></div>
      {question.kind === "choice" ? <>
        {question.media.type === "emoji" ? <div className="emoji-question-frame" role="img" aria-label={`โจทย์อิโมจิ: ${question.media.clues}`}><div className="emoji-question-line">{question.media.displayClues ?? question.media.clues}</div></div> : <div className="question-image-frame"><img className="question-image" src={question.media.src} alt={`ภาพประกอบคำถามที่ ${question.id}`} /></div>}
        <h2 className="question-text question-prompt-banner">{question.prompt}</h2>
        <div className="choices preview-choices">{question.choices.map((choice, index) => <div className={`choice preview-choice ${index === question.correctIndex && showAnswer ? "correct" : ""}`} key={choice}><span className="choice-key">{String.fromCharCode(65 + index)}</span><span>{choice}</span>{index === question.correctIndex && showAnswer ? <strong className="answer-badge">คำตอบ</strong> : null}</div>)}</div>
        <button className={`button ${showAnswer ? "ghost" : "primary"}`} onClick={() => setShowAnswer((value) => !value)}>{showAnswer ? "ซ่อนเฉลย" : "เปิดเฉลย"}</button>
        {showAnswer ? <p className="answer-note">เฉลย: <strong>{question.answer}</strong></p> : <p className="result-note">โหมดนี้ใช้ตรวจคำถามและภาพก่อนสร้างห้องจริง ไม่ต้องมี Host</p>}
      </> : <>
        <div className="bonus-heading"><span className="bonus-kicker">✦ FINAL SPELL · 60 SEC ✦</span><h2>{question.prompt}</h2><p>{question.intro}</p></div>
        <div className="bonus-grid preview-bonus-grid">{question.bonusEntries.map((entry) => <div className="bonus-entry" key={entry.id}><span className="bonus-id">{entry.id}</span><span className="bonus-clue">{entry.prompt}</span>{showAnswer ? <strong className="bonus-answer-key">{entry.answer}</strong> : <span className="bonus-input-preview">พิมพ์ชื่อเพลง</span>}</div>)}</div>
        <button className={`button ${showAnswer ? "ghost" : "primary"}`} onClick={() => setShowAnswer((value) => !value)}>{showAnswer ? "ซ่อนเฉลย" : "เปิดเฉลยทั้ง 10 เพลง"}</button>
        <p className="answer-note">คะแนนโบนัส: 10 = {bonusPoints(10)}, 8–9 = {bonusPoints(8)}, 5–7 = {bonusPoints(5)}, 2–4 = {bonusPoints(2)}, 1 = {bonusPoints(1)}</p>
      </>}
      <div className="preview-nav"><button className="button ghost" onClick={() => chooseQuestion(Math.max(0, questionIndex - 1))} disabled={questionIndex === 0}>← ข้อก่อนหน้า</button><button className="button primary" onClick={() => chooseQuestion(Math.min(sampleQuestions.length - 1, questionIndex + 1))} disabled={questionIndex === sampleQuestions.length - 1}>ข้อถัดไป →</button></div>
    </div>
  </section></main>;
}
