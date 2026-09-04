"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { driveImageUrl, sampleQuestions } from "@/data/questions";

export default function PreviewPage() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const activeIndexRef = useRef<HTMLButtonElement>(null);
  const question = sampleQuestions[questionIndex];

  useEffect(() => {
    activeIndexRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [questionIndex]);

  function chooseQuestion(index: number) {
    setQuestionIndex(index);
    setShowAnswer(false);
  }

  return (
    <main className="page-shell">
      <section className="shell-content preview-shell">
        <div className="topbar">
          <div><div className="eyebrow-small">CONTENT PREVIEW · TEAM ONLY</div><h1 className="title">Question journey</h1></div>
          <Link className="back-link" href="/host">กลับ Host</Link>
        </div>
        <div className="preview-index" aria-label="เลือกคำถาม">
          {sampleQuestions.map((item, index) => <button ref={index === questionIndex ? activeIndexRef : undefined} className={`preview-index-item ${index === questionIndex ? "active" : ""}`} key={item.id} onClick={() => chooseQuestion(index)}>{String(index + 1).padStart(2, "0")}</button>)}
        </div>
        <div className="panel question-card">
          <div className="preview-meta"><span>QUESTION {String(question.id).padStart(2, "0")} / {sampleQuestions.length}</span><span>15 SEC DEFAULT</span></div>
          <div className={`question-image-frame ${question.imageFrame} image-shape-${question.imageShape} image-fit-${question.imageFit} ${question.id === 3 ? "map-art" : ""} ${question.id === 6 ? "song-art" : ""}`}>
            <img className="question-image" src={driveImageUrl(question.imageUrl)} alt={`ภาพประกอบคำถามที่ ${question.id}`} />
          </div>
          <h2 className="question-text">{question.prompt}</h2>
          <div className="choices preview-choices">
            {question.choices.map((choice, index) => <div className={`choice preview-choice ${index === question.correctIndex && showAnswer ? "correct" : ""}`} key={String(choice)}><span className="choice-key">{String.fromCharCode(65 + index)}</span><span>{choice}</span>{index === question.correctIndex && showAnswer ? <strong className="answer-badge">คำตอบ</strong> : null}</div>)}
          </div>
          <button className={`button ${showAnswer ? "ghost" : "primary"}`} onClick={() => setShowAnswer((value) => !value)}>{showAnswer ? "ซ่อนเฉลย" : "เปิดเฉลย"}</button>
          {showAnswer ? <p className="answer-note">เฉลย: <strong>{question.choices[question.correctIndex]}</strong></p> : <p className="result-note">โหมดนี้ใช้ตรวจคำถามและภาพก่อนสร้างห้องจริง ไม่ต้องมี Host</p>}
          <div className="preview-nav">
            <button className="button ghost" onClick={() => chooseQuestion(Math.max(0, questionIndex - 1))} disabled={questionIndex === 0}>← ข้อก่อนหน้า</button>
            <button className="button primary" onClick={() => chooseQuestion(Math.min(sampleQuestions.length - 1, questionIndex + 1))} disabled={questionIndex === sampleQuestions.length - 1}>ข้อถัดไป →</button>
          </div>
        </div>
      </section>
    </main>
  );
}
