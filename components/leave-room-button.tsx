"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function LeaveRoomButton({ room, disabled = false, onBusyChange }: {
  room: string; disabled?: boolean; onBusyChange?: (busy: boolean) => void;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const inFlight = useRef(false);

  async function leave() {
    if (disabled || inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setMessage(""); onBusyChange?.(true);
    let succeeded = false;
    try {
      const response = await fetch("/api/game/leave", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room }), signal: AbortSignal.timeout(10000),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload.error === "LOBBY_CLOSED"
          ? "เกมเริ่มแล้ว · ออกจากห้องไม่ได้ กรุณาเล่นต่อหรือปิดหน้านี้"
          : "ออกจากห้องไม่สำเร็จ · ลองอีกครั้ง");
        return;
      }
      succeeded = true;
      router.push("/");
    } catch {
      setMessage("การเชื่อมต่อสะดุด · กดยืนยันอีกครั้งได้");
    } finally {
      if (!succeeded) { inFlight.current = false; setBusy(false); onBusyChange?.(false); }
    }
  }

  return <div className="lobby-leave-control">
    {confirming ? <div role="group" aria-label="ยืนยันออกจากห้อง">
      <p>ออกจากห้อง {room} และนำชื่อของคุณออกจากรายชื่อหรือไม่?</p>
      <button className="button ghost" type="button" disabled={disabled || busy} onClick={() => void leave()}>{busy ? "กำลังออกจากห้อง…" : "ยืนยันออกจากห้อง"}</button>
      <button className="button ghost" type="button" disabled={busy} onClick={() => { setConfirming(false); setMessage(""); }}>อยู่ในห้องต่อ</button>
    </div> : <button className="button ghost" type="button" disabled={disabled} onClick={() => setConfirming(true)}>ออกจากห้อง</button>}
    {message ? <p role="alert">{message}</p> : null}
  </div>;
}
