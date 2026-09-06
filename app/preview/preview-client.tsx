"use client";

import { useEffect, useRef, useState } from "react";
import { publicPreviewQuestions } from "@/data/public-questions";
import { QuestionAtmosphere } from "@/components/question-atmosphere";

type PreviewClientProps = { initialQuestionId?: number };

export default function PreviewClient({ initialQuestionId }: PreviewClientProps) {
  const questionIndex = Math.max(0, publicPreviewQuestions.findIndex((item) => item.id === initialQuestionId));
  const activeIndexRef = useRef<HTMLAnchorElement>(null);
  const question = publicPreviewQuestions[questionIndex];

  useEffect(() => activeIndexRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }), [questionIndex]);

  function questionHref(index: number) {
    return `/preview?question=${publicPreviewQuestions[index].id}`;
  }

  return <main className="page-shell question-screen"><QuestionAtmosphere /><section className="shell-content preview-shell">
    <div className="topbar"><div><div className="eyebrow-small">CONTENT PREVIEW · TEAM ONLY</div><h1 className="title">Question journey</h1></div><a className="back-link" href="/host">กลับ Host</a></div>
    <nav className="preview-index" aria-label="เลือกคำถาม">{publicPreviewQuestions.map((item, index) => <a ref={index === questionIndex ? activeIndexRef : undefined} className={`preview-index-item ${index === questionIndex ? "active" : ""}`} key={item.id} href={questionHref(index)} aria-current={index === questionIndex ? "page" : undefined}>{String(item.id).padStart(2, "0")}</a>)}</nav>
    <div className={`panel question-card ${question.kind === "bonus" ? "bonus-card" : ""}`}>
      <div className="preview-meta"><span>QUESTION {String(question.id).padStart(2, "0")} / {publicPreviewQuestions.length}</span><span>{question.timeSeconds} SEC {question.kind === "bonus" ? "BONUS" : "DEFAULT"}</span></div>
      {question.kind === "choice" ? <>
        {question.media?.type === "emoji" ? <div className="emoji-question-frame" role="img" aria-label={`โจทย์อิโมจิ: ${question.media.clues}`}><div className="emoji-question-line">{question.media.displayClues ?? question.media.clues}</div></div> : <div className="question-image-frame"><img className="question-image" src={question.media?.src} alt={`ภาพประกอบคำถามที่ ${question.id}`} /></div>}
        <h2 className="question-text question-prompt-banner">{question.prompt}</h2>
        <div className="choices preview-choices">{question.choices?.map((choice, index) => <div className="choice preview-choice" key={choice}><span className="choice-key">{String.fromCharCode(65 + index)}</span><span>{choice}</span></div>)}</div>
        <p className="result-note">โหมดนี้ใช้ตรวจคำถามและภาพก่อนสร้างห้องจริง โดยไม่เผยเฉลยใน browser</p>
      </> : <>
        <div className="bonus-heading"><span className="bonus-kicker">✦ FINAL SPELL · 60 SEC ✦</span><h2>{question.prompt}</h2><p>เติมชื่อเพลงให้ครบทุกตัวอักษร แล้วส่งคำตอบทั้ง 10 เพลง</p></div>
        <div className="bonus-grid preview-bonus-grid">{question.bonusPrompts?.map((prompt, index) => <div className="bonus-entry" key={prompt}><span className="bonus-id">20.{index + 1}</span><span className="bonus-clue">{prompt}</span><span className="bonus-input-preview">พิมพ์ชื่อเพลง</span></div>)}</div>
        <p className="answer-note">คะแนนโบนัส: 10 = 500, 8–9 = 450, 5–7 = 300, 2–4 = 200, 1 = 100</p>
      </>}
      <div className="preview-nav">{questionIndex === 0 ? <span className="button ghost disabled-button" aria-disabled="true">← ข้อก่อนหน้า</span> : <a className="button ghost" href={questionHref(questionIndex - 1)}>← ข้อก่อนหน้า</a>}{questionIndex === publicPreviewQuestions.length - 1 ? <span className="button primary disabled-button" aria-disabled="true">ข้อถัดไป →</span> : <a className="button primary" href={questionHref(questionIndex + 1)}>ข้อถัดไป →</a>}</div>
    </div>
  </section></main>;
}
