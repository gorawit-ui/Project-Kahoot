"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type HostState = {
  state: { room: { code: string; status: "lobby" | "question" | "reveal" | "paused" | "finished"; currentPosition: number }; question: { position: number } | null };
  playerCount: number;
  leaderboard: { nickname: string; score: number }[];
};

export default function HostPage() {
  const [room, setRoom] = useState("142426");
  const [hostKey, setHostKey] = useState("");
  const [data, setData] = useState<HostState | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [message, setMessage] = useState("กรอกรหัสควบคุมเพื่อเชื่อมต่อห้องจริง");
  const [busy, setBusy] = useState(false);
  const headers = useCallback(() => ({ "Content-Type": "application/json", "x-jixgo-host-token": hostKey }), [hostKey]);
  const refresh = useCallback(async () => {
    if (!hostKey || !room) return;
    const response = await fetch(`/api/game/host/state?room=${encodeURIComponent(room)}`, { headers: { "x-jixgo-host-token": hostKey }, cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { setData(null); setMessage(payload.error === "GAME_NOT_CONFIGURED" ? "ยังไม่ได้ตั้งค่า Supabase ใน Vercel" : "ยังไม่พบห้องจริง — กด “เตรียมห้อง” หลังรัน migration"); return; }
    setData(payload as HostState); setMessage("เชื่อมต่อห้องจริงแล้ว · คะแนนอัปเดตอัตโนมัติ");
  }, [hostKey, room]);
  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 1500); return () => window.clearInterval(timer); }, [refresh]);
  async function prepare(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("กำลัง seed คำถามและเตรียมห้อง…");
    const response = await fetch("/api/game/setup", { method: "POST", headers: headers() }); const payload = await response.json().catch(() => ({})); setBusy(false);
    if (!response.ok) { setMessage(payload.error === "GAME_NOT_CONFIGURED" ? "ยังไม่ได้ตั้งค่า Supabase ใน Vercel" : `เตรียมห้องไม่สำเร็จ: ${payload.error ?? "ตรวจรหัสควบคุมและ migration"}`); return; }
    setMessage("เตรียมห้อง 142426 พร้อมคำถาม 1–20 แล้ว"); void refresh();
  }
  async function command(position: number, status: "lobby" | "question" | "reveal" | "paused" | "finished") {
    setBusy(true); const response = await fetch("/api/game/host", { method: "POST", headers: headers(), body: JSON.stringify({ room, position, status }) }); const payload = await response.json().catch(() => ({})); setBusy(false);
    if (!response.ok) { setMessage(payload.error === "GAME_NOT_CONFIGURED" ? "ยังไม่ได้ตั้งค่า Supabase ใน Vercel" : "สั่งเกมไม่สำเร็จ: ตรวจรหัสควบคุมหรือสถานะห้อง"); return; }
    setMessage(status === "question" ? `เริ่มข้อ ${position} แล้ว` : status === "finished" ? "ปิดเกมแล้ว · leaderboard พร้อมประกาศ" : "อัปเดตสถานะเกมแล้ว"); void refresh();
  }
  async function resetTestRoom() {
    if (room !== "142426" || !window.confirm("รีเซ็ตห้องทดสอบ 142426? ผู้เล่น คำตอบ และคะแนนทั้งหมดของห้องนี้จะถูกล้าง")) return;
    setBusy(true); setMessage("กำลังรีเซ็ตห้องทดสอบ…");
    const response = await fetch("/api/game/reset", { method: "POST", headers: headers(), body: JSON.stringify({ room }) }); const payload = await response.json().catch(() => ({})); setBusy(false);
    if (!response.ok) { setMessage(`รีเซ็ตห้องไม่สำเร็จ: ${payload.error ?? "ตรวจรหัสควบคุม"}`); return; }
    setMessage("รีเซ็ตห้องทดสอบแล้ว · กลับสู่ข้อ 1 และล้างคะแนนทั้งหมด"); void refresh();
  }
  const game = data?.state.room; const position = game?.currentPosition ?? 1; const leaderboard = data?.leaderboard ?? []; const displayedRanks = showAll ? leaderboard : leaderboard.slice(0, 5);
  return <main className="page-shell"><section className="shell-content">
    <div className="topbar"><div><div className="eyebrow-small">HOST CONTROL · PRIVATE</div><h1 className="title">JIXGO Magical 24</h1></div><div className="topbar-actions"><Link className="back-link" href="/preview">ดู Preview คำถาม</Link><Link className="back-link" href="/">หน้าแรก</Link></div></div>
    <div className="host-grid"><div className="panel"><form className="form-stack" onSubmit={prepare}>
      <label>รหัสห้อง<input className="code-input" value={room} onChange={(event) => setRoom(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" maxLength={6} required /></label>
      <label>Host control key<input type="password" value={hostKey} onChange={(event) => setHostKey(event.target.value)} autoComplete="current-password" placeholder="รหัสลับจาก Vercel" required /></label>
      <button className="button ghost" type="submit" disabled={busy || !hostKey}>เตรียมห้อง / seed คำถาม</button></form>
      <p className={`answer-status ${data ? "submitted" : ""}`}>{message}</p>
      <div className="host-stat"><span>Room code</span><strong>{room || "—"}</strong></div><div className="host-stat"><span>สถานะ</span><strong>{game ? game.status === "question" ? "กำลังเล่น · LIVE" : game.status === "finished" ? "จบเกม" : "รอ Host" : "ยังไม่เชื่อม"}</strong></div><div className="host-stat"><span>คำถาม</span><strong>{position} / 20</strong></div><div className="host-stat"><span>ผู้เล่น</span><strong>{data?.playerCount ?? 0} / 100</strong></div>
      <div className="control-grid"><button className="button primary" disabled={busy || !data} onClick={() => void command(position, "question")}>{game?.status === "question" ? "เริ่มเวลาใหม่" : position === 1 ? "เริ่มเกม" : "เริ่มข้อนี้"}</button><button className="button ghost" disabled={busy || !data || position >= 20} onClick={() => void command(position + 1, "question")}>ข้อต่อไป</button><button className="button ghost" disabled={busy || !data || game?.status !== "question"} onClick={() => void command(position, "paused")}>พักเกม</button><button className="button ghost" disabled={busy || !data || game?.status !== "question"} onClick={() => void command(position, "reveal")}>แสดงเฉลยข้อนี้</button><button className="button ghost" disabled={busy || !data} onClick={() => void command(position, "finished")}>จบเกม</button><button className="button ghost" disabled={!data} onClick={() => setShowAll((value) => !value)}>{showAll ? "แสดง Top 5" : "แสดงทุกคน"}</button>{room === "142426" && <button className="button danger-button" disabled={busy || !data} onClick={() => void resetTestRoom()}>รีเซ็ตห้องทดสอบ</button>}</div>
    </div><div className="panel"><div className="eyebrow-small">LIVE LEADERBOARD</div><h2 style={{ fontFamily: "Cormorant Garamond", fontSize: "2rem", margin: "8px 0 14px" }}>{showAll ? "All players" : "Top 5"}</h2>{data && displayedRanks.length === 0 ? <p className="waiting">ยังไม่มีผู้เล่นเข้าห้อง</p> : <ol className="rank-list">{displayedRanks.map((player, index) => <li key={`${player.nickname}-${index}`}><span>#{index + 1} {player.nickname}</span><strong>{player.score}</strong></li>)}</ol>}</div></div>
  </section></main>;
}
