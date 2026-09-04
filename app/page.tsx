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
      <div className="magic-portal-ring ring-one" aria-hidden="true" />
      <div className="magic-portal-ring ring-two" aria-hidden="true" />
      <div className="light-sweep" aria-hidden="true" />

      <section className="hero-card">
        <div className="presented-mark" aria-label="Jixgo Presents">
          <span>✦</span><i /><strong>Jixgo Presents</strong><i /><span>✦</span>
        </div>

        <div className="logo-stage">
          <div className="logo-plate" aria-hidden="true" />
          <div className="logo-aura" aria-hidden="true" />
          <img className="event-logo" src="/assets/logo-jixgo.png" alt="JIXGO Magical 24" width={1238} height={1046} />
          <div className="logo-spark spark-one" aria-hidden="true">✦</div>
          <div className="logo-spark spark-two" aria-hidden="true">✧</div>
          <div className="logo-spark spark-three" aria-hidden="true">✦</div>
        </div>

        <div className="hero-invitation">
          <p className="hero-kicker"><span>✦</span> Join us for a magical celebration! <span>✦</span></p>
          <p className="hero-copy">ประตูสู่โลกเวทมนตร์ของ Jixgo กำลังเปิด</p>
        </div>

        <div className="event-ticket">
          <div className="event-ticket-heading">THE MAGICAL FAN MEET</div>
          <div className="event-details">
            <div className="event-detail date-detail" aria-label="วันจัดงาน 14 November 2026">
              <span className="event-detail-label">DATE</span>
              <div className="date-display compact-date"><strong>14</strong><span>Nov</span><small>2026</small></div>
            </div>
            <div className="event-detail venue-detail" aria-label="สถานที่จัดงาน Thee and Thou">
              <span className="event-detail-label">VENUE</span>
              <strong>Thee &amp; Thou</strong>
              <small>สถานที่จัดงาน</small>
            </div>
          </div>
        </div>

        <div className="join-panel">
          <div className="join-panel-heading">พร้อมเข้าสู่โลกเวทมนตร์หรือยัง?</div>
          <p className="join-panel-note">ใส่รหัสห้องจาก Host เพื่อเริ่มต้นการผจญภัย</p>
          <div className="join-row">
            <input id="room" value={room} onChange={(event) => setRoom(event.target.value.toUpperCase())} placeholder="รหัสห้อง" maxLength={6} inputMode="numeric" aria-label="รหัสห้อง" />
            <Link className="button primary" href={room ? `/join?room=${room}` : "/join"}>เข้าสู่เกม</Link>
          </div>
          <div className="join-secondary">ยังไม่มีรหัสห้อง? <Link href="/join">เข้าร่วมเกมที่นี่</Link></div>
        </div>

        <Link className="host-link" href="/host">สำหรับ Host / ทีมงาน <span>→</span></Link>
      </section>
    </main>
  );
}
