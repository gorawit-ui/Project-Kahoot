"use client";

import Link from "next/link";
import { useState } from "react";
import { MagicBackdrop } from "@/components/magic-backdrop";

export default function HomePage() {
  const [room, setRoom] = useState("");

  return (
    <main className="page-shell home-shell">
      <div className="hero-art" aria-hidden="true" />
      <MagicBackdrop />
      <div className="portal portal-one" />
      <div className="portal portal-two" />

      <section className="hero-card">
        <div className="presented-mark" aria-label="Jixgo Presents">
          <span>✦</span><i /> <strong>Jixgo Presents</strong> <i /><span>✦</span>
        </div>

        <div className="brand-lockup" aria-label="Jixgo Magical 24">
          <div className="brand-name">Jixgo</div>
          <div className="brand-ribbon"><span>MAGICAL</span><strong>24</strong></div>
        </div>

        <div className="hero-invitation">
          <p className="hero-kicker"><span>✦</span> Join us for a magical celebration! <span>✦</span></p>
          <p className="hero-copy">มาร่วมเปิดประตูสู่โลกเวทมนตร์ของ Jixgo</p>
        </div>

        <div className="event-ticket">
          <div className="event-ticket-heading">THE MAGICAL FAN MEET</div>
          <div className="event-details">
            <div className="event-detail">
              <span className="event-detail-label">DATE</span>
              <strong>14 NOVEMBER 2026</strong>
              <small>วันเสาร์ที่ 14 พฤศจิกายน 2026</small>
            </div>
            <div className="event-detail">
              <span className="event-detail-label">VENUE</span>
              <strong>Thee &amp; Thou</strong>
              <small>สถานที่จัดงาน</small>
            </div>
          </div>
        </div>

        <div className="join-panel">
          <div className="join-panel-heading">พร้อมเข้าสู่เกมหรือยัง?</div>
          <p className="join-panel-note">ใส่รหัสห้องจาก Host เพื่อเริ่มต้นการผจญภัย</p>
          <div className="join-row">
            <input
              id="room"
              value={room}
              onChange={(event) => setRoom(event.target.value.toUpperCase())}
              placeholder="รหัสห้อง"
              maxLength={6}
              inputMode="numeric"
              aria-label="รหัสห้อง"
            />
            <Link className="button primary" href={room ? `/join?room=${room}` : "/join"}>เข้าสู่เกม</Link>
          </div>
          <div className="join-secondary">ยังไม่มีรหัสห้อง? <Link href="/join">เข้าร่วมเกมที่นี่</Link></div>
        </div>

        <Link className="host-link" href="/host">สำหรับ Host / ทีมงาน <span>→</span></Link>
      </section>
    </main>
  );
}