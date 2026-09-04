"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function LobbyPage() {
  const [room, setRoom] = useState("142426");
  const [nickname, setNickname] = useState("Guest");

  useEffect(() => {
    const queryRoom = new URLSearchParams(window.location.search).get("room");
    setRoom(queryRoom || "142426");
    setNickname(localStorage.getItem("jixgo-nickname") || "Guest");
  }, []);

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