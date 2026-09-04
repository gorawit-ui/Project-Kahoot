"use client";

import { useState } from "react";
import Link from "next/link";

const sampleRanks = ["Minnie", "JixgoFan", "Magic24", "BlueStar", "TheeThou"];

export default function HostPage() {
  const [running, setRunning] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [question, setQuestion] = useState(1);

  return (
    <main className="page-shell">
      <section className="shell-content">
        <div className="topbar"><div><div className="eyebrow-small">HOST CONTROL</div><h1 className="title">JIXGO Magical 24</h1></div><Link className="back-link" href="/">หน้าแรก</Link></div>
        <div className="host-grid">
          <div className="panel">
            <div className="host-stat"><span>Room code</span><strong>142426</strong></div>
            <div className="host-stat"><span>สถานะ</span><strong>{running ? "กำลังเล่น" : "พักอยู่"}</strong></div>
            <div className="host-stat"><span>คำถาม</span><strong>{question} / 18</strong></div>
            <div className="host-stat"><span>ผู้เล่น</span><strong>24 / 100</strong></div>
            <div className="control-grid">
              <button className="button primary" onClick={() => setRunning(!running)}>{running ? "พักเกม" : "เริ่มเกม"}</button>
              <button className="button ghost" onClick={() => setQuestion((value) => Math.min(value + 1, 18))}>ข้อต่อไป</button>
              <button className="button ghost" onClick={() => alert("เพิ่มเวลา 10 วินาทีใน Demo")}>+10 วินาที</button>
              <button className="button ghost" onClick={() => alert("ข้ามข้อใน Demo")}>ข้ามข้อนี้</button>
              <button className="button ghost" onClick={() => alert("ยกเลิกผลข้อนี้ใน Demo")}>Void ข้อนี้</button>
              <button className="button ghost" onClick={() => setShowAll(!showAll)}>{showAll ? "แสดง Top 5" : "แสดงทุกคน"}</button>
            </div>
          </div>
          <div className="panel">
            <div className="eyebrow-small">LIVE LEADERBOARD</div>
            <h2 style={{ fontFamily: "Cormorant Garamond", fontSize: "2rem", margin: "8px 0 14px" }}>{showAll ? "All players" : "Top 5"}</h2>
            <ol className="rank-list">{(showAll ? [...sampleRanks, "Starlight", "CastleClub", "FanForever"] : sampleRanks).map((name, index) => <li key={name}><span>#{index + 1} {name}</span><strong>{5000 - index * 180}</strong></li>)}</ol>
          </div>
        </div>
      </section>
    </main>
  );
}