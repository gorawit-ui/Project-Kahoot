"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { driveImageUrl, sampleQuestions } from "@/data/questions";

export default function PlayPage() {
  const question = sampleQuestions[0];
  const [seconds, setSeconds] = useState(15);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  return (
    <main className="page-shell">
      <section className="shell-content">
        <div className="topbar"><span className="question-number">QUESTION 01 / {sampleQuestions.length}</span><span className={`timer ${seconds < 10 ? "danger" : ""}`}>{seconds}</span></div>
        <div className="panel question-card">
          <div className="question-image-frame">
            <img className="question-image" src={driveImageUrl(question.imageUrl)} alt="ภาพประกอบคำถาม" />
          </div>
          <h1 className="question-text">{question.prompt}</h1>
          <div className="choices">
            {question.choices.map((choice, index) => <button className={`choice ${selected === index ? "selected" : ""}`} key={String(choice)} onClick={() => setSelected(index)} disabled={seconds === 0} aria-pressed={selected === index}><span className="choice-key">{String.fromCharCode(65 + index)}</span><span>{choice}</span></button>)}
          </div>
          <p className="result-note">{selected !== null ? `เลือก ${String.fromCharCode(65 + selected)} แล้ว รอ Host เฉลยได้เลย ✦` : "เลือกคำตอบที่คิดว่าใช่ที่สุด"}</p>
          <Link className="back-link" href="/">ออกจากตัวอย่าง</Link>
        </div>
      </section>
    </main>
  );
}