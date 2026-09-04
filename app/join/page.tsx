"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function JoinPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [room, setRoom] = useState("");
  const [nickname, setNickname] = useState("");

  useEffect(() => {
    setRoom(params.get("room")?.toUpperCase() ?? "");
    setNickname(localStorage.getItem("jixgo-nickname") ?? "");
  }, [params]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedRoom = room.trim().toUpperCase();
    const normalizedNickname = nickname.trim();
    if (!normalizedRoom || !normalizedNickname) return;
    localStorage.setItem("jixgo-nickname", normalizedNickname);
    router.push(`/lobby?room=${normalizedRoom}`);
  }

  return (
    <main className="page-shell">
      <section className="shell-content">
        <Link className="back-link" href="/">← กลับหน้าแรก</Link>
        <div className="panel" style={{ marginTop: 24 }}>
          <div className="eyebrow-small">JIXGO MAGICAL 24</div>
          <h1 className="title">Join the magic</h1>
          <p className="subtitle">ใส่รหัสห้องและชื่อที่อยากให้แสดงในเกม</p>
          <form className="form-stack" onSubmit={submit} style={{ marginTop: 24 }}>
            <label>รหัสห้อง<input className="code-input" value={room} onChange={(e) => setRoom(e.target.value.toUpperCase())} placeholder="เช่น 142426" maxLength={6} inputMode="numeric" required /></label>
            <label>ชื่อที่ใช้เล่น<input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="ชื่อเล่น / นามแฝง" maxLength={24} required /></label>
            <button className="button primary" type="submit">เข้าร่วมเกม ✦</button>
          </form>
        </div>
      </section>
    </main>
  );
}