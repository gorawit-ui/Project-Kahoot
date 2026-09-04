"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function LobbyPage() {
  const params = useSearchParams();
  const room = params.get("room") || "142426";
  const nickname = typeof window !== "undefined" ? localStorage.getItem("jixgo-nickname") || "Guest" : "Guest";

  return (
    <main className="page-shell">
      <section className="shell-content">
        <div className="topbar"><span className="pill">ROOM {room}</span><Link className="back-link" href="/join">เปลี่ยนชื่อ</Link></div>
        <div className="panel lobby-center">
          <div className="eyebrow-small">WELCOME, {nickname.toUpperCase()}</div>
          <div className="room-code">{room}</div>
          <div className="ornament" />
          <h1 className="title">พร้อมหรือยัง?</h1>
          <p className="waiting">Host กำลังเตรียมคำถามเวทมนตร์ให้ทุกคนอยู่</p>
          <p className="player-count">ผู้เล่นในห้องนี้ <strong>24</strong> / 100 คน</p>
          <span className="pill">SOLO MODE · 18 QUESTIONS · 15 SEC</span>
          <div style={{ marginTop: 28 }}><Link className="button primary" href="/play">ดูตัวอย่างหน้าคำถาม</Link></div>
        </div>
      </section>
    </main>
  );
}