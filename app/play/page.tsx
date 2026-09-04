"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const choices = [
  ["A", "ฮีลใจ"],
  ["B", "โต๊ะริม"],
  ["C", "เธอช่วยทิ้งเราได้ไหม"],
  ["D", "เธอจะถูกรักอยู่เสมอ"]
] as const;

export default function PlayPage() {
  const [seconds, setSeconds] = useState(15);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  return (
    <main className="page-shell">
      <section className="shell-content">
        <div className="topbar"><span className="question-number">QUESTION 01 / 18</span><span className={`timer ${seconds < 10 ? "danger" : ""}`}>{seconds}</span></div>
        <div className="panel question-card">
          <div className="clue">PHOTO CLUE<br /><small>ใส่ภาพคำถามจาก Event Asset ได้ภายหลัง</small></div>
          <h1 className="question-text">ภาพนี้ คือเพลงอะไร?</h1>
          <div className="choices">
            {choices.map(([key, label]) => <button className={`choice ${selected === key ? "selected" : ""}`} key={key} onClick={() => setSelected(key)} disabled={seconds === 0}><span className="choice-key">{key}</span><span>{label}</span></button>)}
          </div>
          <p className="result-note">{selected ? `เลือก ${selected} แล้ว รอ Host เฉลยได้เลย ✦` : "เลือกคำตอบที่คิดว่าใช่ที่สุด"}</p>
          <Link className="back-link" href="/">ออกจากตัวอย่าง</Link>
        </div>
      </section>
    </main>
  );
}