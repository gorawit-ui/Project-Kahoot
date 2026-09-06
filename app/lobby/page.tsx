"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { guestTitle } from "@/lib/guest-title";
import { LobbyMascot } from "@/components/jixgo-3d/lobby-mascot";

export default function LobbyPage() {
  const [room, setRoom] = useState("142426");
  const [nickname, setNickname] = useState("Guest");
  const [entering, setEntering] = useState(false);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const queryRoom = new URLSearchParams(window.location.search).get("room");
    setRoom(queryRoom || "142426");
    const savedNickname = localStorage.getItem("jixgo-nickname") || "Guest";
    setNickname(savedNickname);
    const shouldAnimate = new URLSearchParams(window.location.search).get("enter") === "1";
    setEntering(shouldAnimate);
    const activeRoom = queryRoom || "142426";
    const pollRoom = async () => {
      const response = await fetch(`/api/game/state?room=${activeRoom}`, { cache: "no-store" });
      if (!response.ok) return;
      const game = await response.json();
      setLive(true);
      if (game.room.status === "question") window.location.href = `/play?room=${activeRoom}`;
    };
    void pollRoom();
    const poll = window.setInterval(() => void pollRoom(), 1000);
    if (shouldAnimate) {
      const timer = window.setTimeout(() => setEntering(false), 1400);
      return () => { window.clearTimeout(timer); window.clearInterval(poll); };
    }
    return () => window.clearInterval(poll);
  }, []);

  return (
    <main className="page-shell">
      <section className="shell-content">
        <div className="topbar"><span className="pill">ROOM {room}</span><Link className="back-link" href="/join">เปลี่ยนชื่อ</Link></div>
        {entering ? <div className="portal-transition" role="status" aria-live="polite"><div className="portal-transition-ring">✦</div><span>กำลังเปิดประตูสู่โลกของ Jixgo…</span></div> : null}
        <div className={`panel lobby-center guest-pass ${entering ? "guest-pass-arrive" : ""}`}>
          <div className="eyebrow-small">WELCOME, {nickname.toUpperCase()}</div>
          <LobbyMascot />
          <div className="guest-pass-label">MAGICAL GUEST PASS</div>
          <div className="guest-pass-name">{nickname}</div>
          <div className="guest-pass-title">{guestTitle(nickname)} ✦</div>
          <div className="room-code">{room}</div>
          <div className="ornament" />
          <h1 className="title">พร้อมหรือยัง?</h1>
          <p className="waiting">คุณพร้อมแล้ว — ประตูเวทมนตร์กำลังจะเปิด</p>
          <p className="player-count">ผู้เล่นในห้องนี้ <strong>กำลังอัปเดต</strong></p>
          <span className="pill">LIVE MODE · 20 QUESTIONS</span>
          <div className="lobby-waiting-note">นี่คือบัตรเข้างานดิจิทัลของคุณ เก็บไว้เป็นความทรงจำได้เลย</div>
          <div className="live-status">{live ? "● เชื่อมต่อกับห้องจริงแล้ว" : "โหมดตัวอย่าง · ยังไม่ได้เชื่อม Supabase"}</div>
          <Link className="button primary lobby-start" href={`/play?room=${room}`}>ฉันพร้อมแล้ว ✦</Link>
        </div>
      </section>
    </main>
  );
}
