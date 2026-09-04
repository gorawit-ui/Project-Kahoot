"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage() {
  const router = useRouter();
  const [room, setRoom] = useState("");
  const [nickname, setNickname] = useState("");

  useEffect(() => {
    const queryRoom = new URLSearchParams(window.location.search).get("room");
    setRoom(queryRoom?.toUpperCase() ?? "");
    setNickname(localStorage.getItem("jixgo-nickname") ?? "");
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedRoom = room.trim().toUpperCase();
    const normalizedNickname = nickname.trim();
    if (!normalizedRoom || !normalizedNickname) return;
    localStorage.setItem("jixgo-nickname", normalizedNickname);
    router.push(`/lobby?room=${normalizedRoom}&enter=1`);
  }

  return (
    <main className="page-shell">
      <section className="shell-content">
        <Link className="back-link" href="/">← กลับหน้าแรก</Link>
        <div className="panel" style={{ marginTop: 24 }}>
          <div className="eyebrow-small">JIXGO MAGICAL 24</div>
          <h1 className="title">Join the magic</h1>
          <p className="subtitle">ตั้งชื่อของคุณ แล้วก้าวเข้าสู่โลกเวทมนตร์</p>
          <form className="form-stack" onSubmit={submit} style={{ marginTop: 24 }}>
            <label>รหัสห้อง<input className="code-input" value={room} onChange={(e) => setRoom(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="เช่น 142426" maxLength={6} inputMode="numeric" required /></label>
            <label>ชื่อที่ใช้เล่น<input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="ชื่อเล่น / นามแฝง" maxLength={24} required /></label>
            {nickname.trim() ? <div className="guest-title-preview">ฉายาของคุณ · <strong>{nickname.trim()}</strong> จะเป็น <em>ผู้ตามหาแสงดาว</em> ✦</div> : null}
            <button className="button primary" type="submit">เข้าร่วมเกม ✦</button>
          </form>
        </div>
      </section>
    </main>
  );
}
