"use client";

import { useState } from "react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { getPlayerId, openRoomChannel, sendRoomEvent, type LiveEvent } from "@/lib/live-room";

const sampleRanks = ["Minnie", "JixgoFan", "Magic24", "BlueStar", "TheeThou"];

export default function HostPage() {
  const [running, setRunning] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [question, setQuestion] = useState(1);
  const [live, setLive] = useState(false);
  const channelRef = useRef<ReturnType<typeof openRoomChannel>>(null);

  useEffect(() => {
    const channel = openRoomChannel("142426", (event: LiveEvent) => {
      if (event.type === "player-joined") setLive(true);
    });
    channelRef.current = channel;
    setLive(Boolean(channel));
    return () => { channel?.unsubscribe(); };
  }, []);

  function toggleGame() {
    const next = !running;
    setRunning(next);
    if (next) {
      const startedAt = Date.now();
      sendRoomEvent(channelRef.current, { type: "game-started", questionIndex: question - 1, startedAt, deadlineAt: startedAt + 15000 });
    } else sendRoomEvent(channelRef.current, { type: "game-paused" });
  }

  return (
    <main className="page-shell">
      <section className="shell-content">
        <div className="topbar"><div><div className="eyebrow-small">HOST CONTROL</div><h1 className="title">JIXGO Magical 24</h1></div><div className="topbar-actions"><Link className="back-link" href="/preview">ดู Preview คำถาม</Link><Link className="back-link" href="/">หน้าแรก</Link></div></div>
        <div className="host-grid">
          <div className="panel">
            <div className="host-stat"><span>Room code</span><strong>142426</strong></div>
            <div className="host-stat"><span>สถานะ</span><strong>{running ? "กำลังเล่น" : "พักอยู่"} {live ? "· LIVE" : "· DEMO"}</strong></div>
            <div className="host-stat"><span>คำถาม</span><strong>{question} / 18</strong></div>
            <div className="host-stat"><span>ผู้เล่น</span><strong>24 / 100</strong></div>
            <div className="control-grid">
              <button className="button primary" onClick={toggleGame}>{running ? "พักเกม" : "เริ่มเกม"}</button>
              <button className="button ghost" onClick={() => { const next = Math.min(question + 1, 18); setQuestion(next); const startedAt = Date.now(); sendRoomEvent(channelRef.current, { type: "question-changed", questionIndex: next - 1, startedAt, deadlineAt: startedAt + 15000 }); }}>ข้อต่อไป</button>
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
