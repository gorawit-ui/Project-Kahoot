"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { guestTitle } from "@/lib/guest-title";
import { MagicalLogo } from "@/components/magical-world";
import { LeaveRoomButton } from "@/components/leave-room-button";

export default function LobbyPage() {
  const [room, setRoom] = useState("142426");
  const [nickname, setNickname] = useState("Guest");
  const [entering, setEntering] = useState(false);
  const [live, setLive] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState("กำลังเชื่อมต่อกับห้อง…");
  const [readyCount, setReadyCount] = useState<number | null>(null);
  const [readying, setReadying] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [canLeave, setCanLeave] = useState(false);
  const [readyMessage, setReadyMessage] = useState("");
  const [needsSessionRecovery, setNeedsSessionRecovery] = useState(false);
  const navigating = useRef(false);

  useEffect(() => {
    const queryRoom = new URLSearchParams(window.location.search).get("room");
    setRoom(queryRoom || "142426");
    try { setNickname(localStorage.getItem("jixgo-nickname") || "Guest"); } catch { /* Storage is optional. */ }
    const shouldAnimate = new URLSearchParams(window.location.search).get("enter") === "1";
    setEntering(shouldAnimate);
    const activeRoom = queryRoom || "142426";
    let stopped = false;
    let poll: number | undefined;
    let controller: AbortController | undefined;
    const pollRoom = async () => {
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 7000);
      try {
        const response = await fetch(`/api/game/state?room=${encodeURIComponent(activeRoom)}&t=${Date.now()}`, { cache: "no-store", signal: controller.signal });
        if (stopped) return;
        if (!response.ok) {
          setLive(false);
          setReadyCount(null);
          setConnectionMessage(response.status === 404 ? "ไม่พบห้องนี้ · ตรวจรหัสห้องแล้วเข้าร่วมใหม่" : response.status === 503 ? "ระบบห้องกำลังตั้งค่าอยู่ · กรุณารอทีมงาน" : "ติดต่อห้องไม่ได้ · กำลังลองเชื่อมต่อใหม่");
          return;
        }
        const game = await response.json();
        if (stopped) return;
        if (game.summaryError === "PLAYER_SESSION_REQUIRED" || game.summaryError?.includes("PLAYER_NOT_FOUND")) {
          setLive(false);
          setNeedsSessionRecovery(true);
          setConnectionMessage("เซสชันผู้เล่นไม่พร้อม · กรุณากลับไปเข้าร่วมห้องใหม่");
          return;
        }
        setLive(true);
        setCanLeave(game.room.status === "lobby");
        setNeedsSessionRecovery(false);
        setConnectionMessage("● เชื่อมต่อกับห้องจริงแล้ว");
        setReadyCount(typeof game.room.readyCount === "number" ? game.room.readyCount : null);
        if (game.room.status === "question" && !navigating.current) { navigating.current = true; window.location.href = `/play?room=${encodeURIComponent(activeRoom)}`; }
      } catch {
        if (!stopped) {
          setLive(false);
          setReadyCount(null);
          setConnectionMessage("การเชื่อมต่อสะดุด · กำลังลองเชื่อมต่อใหม่");
        }
      } finally {
        window.clearTimeout(timeout);
        if (!stopped) poll = window.setTimeout(() => void pollRoom(), 1000);
      }
    };
    void pollRoom();
    const timer = shouldAnimate ? window.setTimeout(() => setEntering(false), 1400) : undefined;
    return () => { stopped = true; controller?.abort(); window.clearTimeout(timer); window.clearTimeout(poll); };
  }, []);

  async function markReady() {
    if (readying || leaving) return;
    setReadying(true);
    setReadyMessage("กำลังยืนยันความพร้อม…");
    try {
      const response = await fetch("/api/game/ready", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ room }), signal: AbortSignal.timeout(10000) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const missingSession = payload.error === "PLAYER_SESSION_REQUIRED" || (typeof payload.error === "string" && payload.error.includes("PLAYER_NOT_FOUND"));
        if (missingSession) { setNeedsSessionRecovery(true); setLive(false); }
        setReadyMessage(missingSession ? "เซสชันหมดอายุหรือไม่พบข้อมูลผู้เล่น · กลับไปเข้าร่วมห้องใหม่" : "ยังยืนยันความพร้อมไม่ได้ · ลองอีกครั้ง");
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
    <main className="page-shell lobby-world-shell">
      <section className="shell-content">
        <div className="topbar"><span className="pill">MAGICAL GUEST PASS</span><Link className="back-link" href={/^\d{6}$/.test(room) ? `/join?room=${encodeURIComponent(room)}` : "/join"}>เปลี่ยนชื่อ</Link></div>
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
          <div className="live-status" role="status">{connectionMessage}</div>
          {readyMessage ? <p className="ready-message" role="status">{readyMessage}</p> : null}
          {needsSessionRecovery ? <Link className="back-link" href={/^\d{6}$/.test(room) ? `/join?room=${encodeURIComponent(room)}` : "/join"}>กลับไปเข้าร่วมห้อง</Link> : null}
          <button className="button primary lobby-start" type="button" disabled={readying || leaving || !live} onClick={() => void markReady()}>{readying ? "กำลังยืนยัน…" : "ฉันพร้อมแล้ว ✦"}</button>
          <LeaveRoomButton room={room} disabled={!live || !canLeave || readying} onBusyChange={value => { setLeaving(value); navigating.current = value; }} />
        </div>
      </section>
    </main>
  );
}
