"use client";

import Link from "next/link";
import { useState } from "react";
import { MagicBackdrop } from "@/components/magic-backdrop";

export default function HomePage() {
  const [room, setRoom] = useState("");
  return (
    <main className="page-shell home-shell">
      <MagicBackdrop />
      <div className="portal portal-one" />
      <div className="portal portal-two" />
      <section className="hero-card">
        <div className="eyebrow">JIXGO PRESENTS</div>
        <div className="brand-lockup" aria-label="JIXGO Magical 24">
          <div className="brand-name">JIXGO</div>
          <div className="brand-ribbon">MAGICAL <span>24</span></div>
        </div>
        <p className="hero-kicker">Join us for a magical celebration!</p>
        <p className="hero-copy">ก้าวเข้าสู่โลกเวทมนตร์ แล้วมาทดสอบความรู้จัก Jixgo ไปด้วยกัน</p>
        <div className="event-meta">
          <span>14 NOVEMBER 2026</span><span>THEE &amp; THOU</span>
        </div>
        <div className="join-panel">
          <label htmlFor="room">มีรหัสห้องแล้วใช่ไหม</label>
          <div className="join-row">
            <input id="room" value={room} onChange={(event) => setRoom(event.target.value.toUpperCase())} placeholder="ใส่รหัสห้อง" maxLength={6} />
            <Link className="button primary" href={`/join?room=${room}`}>เข้าสู่เกม</Link>
          </div>
        </div>
        <div className="home-actions">
          <Link className="button ghost" href="/join">เข้าร่วมเกม</Link>
          <Link className="button text-button" href="/host">สำหรับ Host →</Link>
        </div>
      </section>
    </main>
  );
}