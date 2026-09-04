"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { driveImageUrl, sampleQuestions } from "@/data/questions";

const DEFAULT_SECONDS = 15;

export default function PlayPage() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [seconds, setSeconds] = useState(DEFAULT_SECONDS);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [finished, setFinished] = useState(false);
  const question = sampleQuestions[questionIndex];
  const expired = seconds === 0 && !submitted;

  useEffect(() => {
    setSeconds(DEFAULT_SECONDS);
    setSelected(null);
    setSubmitted(false);
  }, [questionIndex]);

  useEffect(() => {
    if (seconds <= 0 || submitted) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [seconds, submitted]);

  function selectAnswer(index: number) {
    if (submitted || seconds === 0) return;
    setSelected(index);
    setSubmitted(true);
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
            <div className="eyebrow-small">QUEST COMPLETE</div>
            <h1 className="title">จบการเดินทางแล้ว ✦</h1>
            <p className="waiting">รอ Host แสดงผลคะแนนและผู้ชนะของห้องนี้</p>
            <Link className="button primary" href="/">กลับหน้าแรก</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="shell-content">
        <div className="topbar">
          <span className="question-number">QUESTION {String(question.id).padStart(2, "0")} / {sampleQuestions.length}</span>
          <span className={`timer ${seconds < 10 ? "danger" : ""}`}>{seconds}</span>
        </div>
        <div className="panel question-card player-question-card">
          <div className={`question-image-frame ${question.imageFrame} image-shape-${question.imageShape} image-fit-${question.imageFit} ${question.id === 3 ? "map-art" : ""} ${question.id === 6 ? "song-art" : ""}`}>
            <img className="question-image" src={driveImageUrl(question.imageUrl)} alt={`ภาพประกอบคำถามที่ ${question.id}`} />
          </div>
          <h1 className="question-text">{question.prompt}</h1>
          <div className="choices">
            {question.choices.map((choice, index) => (
              <button className={`choice ${selected === index ? "selected" : ""}`} key={String(choice)} onClick={() => selectAnswer(index)} disabled={seconds === 0 || submitted} aria-pressed={selected === index}>
                <span className="choice-key">{String.fromCharCode(65 + index)}</span>
                <span>{choice}</span>
              </button>
            ))}
          </div>
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
