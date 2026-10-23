"use client";

import { useRef, useState } from "react";

export type LobbyPlayer = { id: string; nickname: string; ready: boolean };

export function HostPlayerList({ room, players, enabled, busy, onBusyChange, onChanged }: {
  room: string; players: LobbyPlayer[]; enabled: boolean; busy: boolean;
  onBusyChange: (busy: boolean) => void; onChanged: () => Promise<unknown>;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const inFlight = useRef(false);
  const target = players.find(player => player.id === selected);

  async function remove() {
    if (!enabled || busy || !target || inFlight.current) return;
    inFlight.current = true; onBusyChange(true); setMessage("");
    try {
      const response = await fetch("/api/game/host/remove-player", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, playerId: target.id }), signal: AbortSignal.timeout(10000),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload.error === "LOBBY_CLOSED" ? "เกมเริ่มแล้ว · นำชื่อออกไม่ได้" : "นำชื่อออกไม่สำเร็จ · ตรวจสถานะห้องแล้วลองอีกครั้ง");
        await onChanged();
        return;
      }
      setSelected(null);
      setMessage(payload.removed ? `นำ ${target.nickname} ออกจากห้องแล้ว` : "ชื่อนี้ออกจากห้องไปแล้ว");
      await onChanged();
    } catch {
      setMessage("การเชื่อมต่อสะดุด · ตรวจรายชื่อก่อนลองอีกครั้ง");
      await onChanged();
    } finally { inFlight.current = false; onBusyChange(false); }
  }

  return <section className="panel host-player-management" aria-label="จัดการผู้เล่น">
    <h2>ผู้เล่นในห้อง ({players.length} คน)</h2>
    <p>นำชื่อออกได้เฉพาะก่อนเริ่มเกม ผู้ที่ถูกนำออกสามารถเข้าร่วมใหม่ได้</p>
    {!enabled ? <p role="status">นำชื่อออกไม่ได้ · ห้องไม่ได้อยู่ในช่วงก่อนเริ่มเกม</p> : null}
    <ul className="rank-list">{players.map(player => <li key={player.id}>
      <span>{player.nickname} · {player.ready ? "พร้อมแล้ว" : "ยังไม่กดพร้อม"}</span>
      {enabled ? <button className="button ghost" type="button" disabled={busy} aria-label={`นำ ${player.nickname} ออกจากห้อง`} onClick={() => { setSelected(player.id); setMessage(""); }}>นำออก</button> : null}
    </li>)}</ul>
    {enabled && target ? <div role="group" aria-label="ยืนยันนำผู้เล่นออก">
      <p>นำ {target.nickname} ออกจากห้อง {room} หรือไม่?</p>
      <button className="button ghost" type="button" disabled={busy} onClick={() => void remove()}>ยืนยันนำออก</button>
      <button className="button ghost" type="button" disabled={busy} onClick={() => setSelected(null)}>ยกเลิก</button>
    </div> : null}
    {message ? <p role="status">{message}</p> : null}
  </section>;
}
