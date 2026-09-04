"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { guestTitle } from "@/lib/guest-title";
import { getPlayerId, openRoomChannel, sendRoomEvent, type LiveEvent } from "@/lib/live-room";

export default function LobbyPage() {
  const [room, setRoom] = useState("142426");
  const [nickname, setNickname] = useState("Guest");
  const [entering, setEntering] = useState(false);
  const [live, setLive] = useState(false);
  const [channel, setChannel] = useState<ReturnType<typeof openRoomChannel>>(null);

  useEffect(() => {
    const queryRoom = new URLSearchParams(window.location.search).get("room");
    setRoom(queryRoom || "142426");
    const savedNickname = localStorage.getItem("jixgo-nickname") || "Guest";
    setNickname(savedNickname);
    const shouldAnimate = new URLSearchParams(window.location.search).get("enter") === "1";
    setEntering(shouldAnimate);
    const roomChannel = openRoomChannel(queryRoom || "142426", (event: LiveEvent) => {
      if (event.type === "game-started" || event.type === "question-changed") {
        window.location.href = `/play?room=${queryRoom || "142426"}&question=${event.questionIndex}`;
      }
    });
    setChannel(roomChannel);
    setLive(Boolean(roomChannel));
    if (roomChannel) sendRoomEvent(roomChannel, { type: "player-joined", playerId: getPlayerId(), nickname: savedNickname });
    if (shouldAnimate) {
      const timer = window.setTimeout(() => setEntering(false), 1400);
      return () => { window.clearTimeout(timer); roomChannel?.unsubscribe(); };
    }
    return () => roomChannel?.unsubscribe();
  }, []);

  return (
    <main className="page-shell">
      <section className="shell-content">
        <div className="topbar"><span className="pill">ROOM {room}</span><Link className="back-link" href="/join">เปลี่ยนชื่อ</Link></div>
        {entering ? <div className="portal-transition" role="status" aria-live="polite"><div className="portal-transition-ring">✦</div><span>กำลังเปิดประตูสู่โลกของ Jixgo…</span></div> : null}
        <div className={`panel lobby-center guest-pass ${entering ? "guest-pass-arrive" : ""}`}>
          <div className="eyebrow-small">WELCOME, {nickname.toUpperCase()}</div>
          <div className="guest-pass-label">MAGICAL GUEST PASS</div>
          <div className="guest-pass-name">{nickname}</div>
          <div className="guest-pass-title">{guestTitle(nickname)} ✦</div>
          <div className="room-code">{room}</div>
          <div className="ornament" />
          <h1 className="title">พร้อมหรือยัง?</h1>
          <p className="waiting">คุณพร้อมแล้ว — ประตูเวทมนตร์กำลังจะเปิด</p>
          <p className="player-count">ผู้เล่นในห้องนี้ <strong>24</strong> / 100 คน</p>
          <span className="pill">SOLO MODE · 9 QUESTIONS · 15 SEC</span>
          <div className="lobby-waiting-note">นี่คือบัตรเข้างานดิจิทัลของคุณ เก็บไว้เป็นความทรงจำได้เลย</div>
          <div className="live-status">{live ? "● เชื่อมต่อกับห้องจริงแล้ว" : "โหมดตัวอย่าง · ยังไม่ได้เชื่อม Supabase"}</div>
          <Link className="button primary lobby-start" href={`/play?room=${room}`}>ฉันพร้อมแล้ว ✦</Link>
        </div>
      </section>
    </main>
  );
}
