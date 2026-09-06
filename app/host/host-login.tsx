"use client";

import { FormEvent, useState } from "react";

export default function HostLogin() {
  const [hostKey, setHostKey] = useState("");
  const [message, setMessage] = useState("กรอกรหัสควบคุมเพื่อเข้าสู่พื้นที่ Host");
  const [busy, setBusy] = useState(false);
  async function login(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("กำลังตรวจสอบสิทธิ์…");
    const response = await fetch("/api/game/host/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hostKey }) });
    setBusy(false);
    if (!response.ok) { setMessage("รหัสควบคุมไม่ถูกต้อง"); return; }
    window.location.reload();
  }
  return <main className="page-shell"><section className="shell-content host-login-shell"><div className="panel host-login-card"><div className="eyebrow-small">HOST ONLY · PRIVATE SESSION</div><h1 className="title">Host Login</h1><p className="waiting">พื้นที่นี้ใช้ควบคุมเกมและดู Preview สำหรับทีมงานเท่านั้น</p><form className="form-stack" onSubmit={login}><label>Host control key<input type="password" value={hostKey} onChange={(event) => setHostKey(event.target.value)} autoComplete="current-password" placeholder="รหัสลับจาก Vercel" required autoFocus /></label><button className="button primary" type="submit" disabled={busy || !hostKey}>{busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ Host Control"}</button></form><p className="answer-status">{message}</p></div></section></main>;
}
