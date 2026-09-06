"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { guestTitle } from "@/lib/guest-title";
import { MagicalBackground, MagicalLogo } from "@/components/magical-world";

export default function LobbyPage() {
  const [room, setRoom] = useState("142426");
  const [nickname, setNickname] = useState("Guest");
  const [entering, setEntering] = useState(false);
  const [live, setLive] = useState(false);
  const [readyCount, setReadyCount] = useState<number | null>(null);
  const [readying, setReadying] = useState(false);
  const [readyMessage, setReadyMessage] = useState("");
  const navigating = useRef(false);

  useEffect(() => {
    const queryRoom = new URLSearchParams(window.location.search).get("room");
    setRoom(queryRoom || "142426");
    const savedNickname = localStorage.getItem("jixgo-nickname") || "Guest";
    setNickname(savedNickname);
    const shouldAnimate = new URLSearchParams(window.location.search).get("enter") === "1";
    setEntering(shouldAnimate);
    const activeRoom = queryRoom || "142426";
    const pollRoom = async () => {
      const response = await fetch(`/api/game/state?room=${activeRoom}&t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) return;
      const game = await response.json();
      setLive(true);
      setReadyCount(typeof game.room.readyCount === "number" ? game.room.readyCount : null);
      if (game.room.status === "question" && !navigating.current) { navigating.current = true; window.location.href = `/play?room=${activeRoom}`; }
    };
    void pollRoom();
    const poll = window.setInterval(() => void pollRoom(), 1000);
    if (shouldAnimate) {
      const timer = window.setTimeout(() => setEntering(false), 1400);
      return () => { window.clearTimeout(timer); window.clearInterval(poll); };
    }
    return () => window.clearInterval(poll);
  }, []);

  async function markReady() {
    if (readying) return;
    setReadying(true);
    setReadyMessage("กำลังยืนยันความพร้อม…");
    try {
      const response = await fetch("/api/game/ready", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ room }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setReadyMessage(payload.error === "PLAYER_SESSION_REQUIRED" ? "เซสชันหมดอายุ · กลับไปเข้าร่วมห้องใหม่" : "ยังยืนยันความพร้อมไม่ได้ · ลองอีกครั้ง");
        return;
      }
      setReadyCount(payload.readyCount ?? null);
      navigating.current = true;
      window.location.assign(`/play?room=${room}`);
    } catch {
      setReadyMessage("การเชื่อมต่อสะดุด · ลองอีกครั้ง");
    } finally {
      setReadying(false);
    }
  }

  return (
    <main className="page-shell lobby-world-shell"><MagicalBackground />
      <section className="shell-content">
        <div className="topbar"><span className="pill">MAGICAL GUEST PASS</span><Link className="back-link" href="/join">เปลี่ยนชื่อ</Link></div>
        {entering ? <div className="portal-transition" role="status" aria-live="polite"><div className="portal-transition-ring">✦</div><span>กำลังเปิดประตูสู่โลกของ Jixgo…</span></div> : null}
        <div className={`panel lobby-center guest-pass ${entering ? "guest-pass-arrive" : ""}`}>
          <MagicalLogo />
          <div className="eyebrow-small">WELCOME, {nickname.toUpperCase()}</div>
          <div className="guest-pass-label">MAGICAL GUEST PASS</div>
          <div className="guest-pass-name">{nickname}</div>
          <div className="guest-pass-title">{guestTitle(nickname)} ✦</div>
          <h1 className="title">พร้อมหรือยัง?</h1>
          <p className="waiting">คุณพร้อมแล้ว — ประตูเวทมนตร์กำลังจะเปิด</p>
          <p className="player-count">{readyCount === null ? <>ผู้พร้อมแล้ว <strong>กำลังอัปเดต</strong></> : <>ผู้พร้อมแล้ว <strong>{readyCount} คน</strong></>}</p>
          <span className="pill">LIVE MODE · 20 QUESTIONS</span>
          <div className="lobby-waiting-note">นี่คือบัตรเข้างานดิจิทัลของคุณ เก็บไว้เป็นความทรงจำได้เลย</div>
          <div className="live-status">{live ? "● เชื่อมต่อกับห้องจริงแล้ว" : "โหมดตัวอย่าง · ยังไม่ได้เชื่อม Supabase"}</div>
          {readyMessage ? <p className="ready-message" role="status">{readyMessage}</p> : null}
          <button className="button primary lobby-start" type="button" disabled={readying || !live} onClick={() => void markReady()}>{readying ? "กำลังยืนยัน…" : "ฉันพร้อมแล้ว ✦"}</button>
        </div>
      </section>
    </main>
  );
}
