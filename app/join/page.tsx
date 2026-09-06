"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { guestTitle } from "@/lib/guest-title";

export default function JoinPage() {
  const router = useRouter();
  const [room, setRoom] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const queryRoom = new URLSearchParams(window.location.search).get("room");
    setRoom(queryRoom?.toUpperCase() ?? "");
    setNickname(localStorage.getItem("jixgo-nickname") ?? "");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedRoom = room.trim().toUpperCase();
    const normalizedNickname = nickname.trim();
    if (!normalizedRoom || !normalizedNickname) return;
    setError(""); setJoining(true);
    const response = await fetch("/api/game/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ room: normalizedRoom, nickname: normalizedNickname }) });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setJoining(false);
      setError(payload.error === "GAME_NOT_CONFIGURED" ? "ระบบห้องจริงกำลังตั้งค่าอยู่ กรุณารอทีมงาน" : payload.error === "SESSION_NAME_MISMATCH" ? "หน้านี้เป็น session เดิมของคุณ กรุณาใช้ชื่อเดิม หรือเปิดหน้าต่างไม่ระบุตัวตนเพื่อเล่นคนใหม่" : payload.error === "NICKNAME_TAKEN" ? "ชื่อนี้มีผู้ใช้อยู่แล้ว · ลองเพิ่มชื่อเล่นอีกนิด" : "เข้าห้องไม่สำเร็จ: ตรวจรหัสห้องแล้วลองอีกครั้ง");
      return;
    }
    localStorage.setItem("jixgo-nickname", normalizedNickname);
    router.push(`/lobby?room=${normalizedRoom}&enter=1`);
  }

  return (
    <main className="page-shell join-world-shell">
      <section className="shell-content">
        <Link className="back-link" href="/">← กลับหน้าแรก</Link>
        <div className="panel join-card" style={{ marginTop: 24 }}>
          <div className="eyebrow-small">JIXGO MAGICAL 24</div>
          <h1 className="title">Join the magic</h1>
          <p className="subtitle">ตั้งชื่อของคุณ แล้วก้าวเข้าสู่โลกเวทมนตร์</p>
          <form className="form-stack" onSubmit={submit} style={{ marginTop: 24 }}>
            <label>รหัสห้อง<input className="code-input" value={room} onChange={(e) => setRoom(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="เช่น 142426" maxLength={6} inputMode="numeric" required /></label>
            <label>ชื่อที่ใช้เล่น<input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="ชื่อเล่น / นามแฝง" maxLength={24} required /></label>
            {nickname.trim() ? <div className="guest-title-preview">ฉายาของคุณ · <strong>{nickname.trim()}</strong> จะเป็น <em>{guestTitle(nickname.trim())}</em> ✦</div> : null}
            {error ? <p className="answer-status expired" role="alert">{error}</p> : null}
            <button className="button primary" type="submit" disabled={joining}>{joining ? "กำลังพากลับเข้าห้อง…" : "เข้าร่วมเกม ✦"}</button>
          </form>
        </div>
      </section>
    </main>
  );
}
