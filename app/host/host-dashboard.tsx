"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BonusDistributionGrid,
  ChoiceDistributionBoard,
  type BonusSummary,
  type ChoiceDistribution,
} from "@/components/reveal-distribution";

type RoomStatus = "lobby" | "question" | "reveal" | "paused" | "q20_summary" | "finished";
type HostState = {
  state: {
    room: { code: string; status: RoomStatus; currentPosition: number; deadlineAt?: string | null };
    distribution?: ChoiceDistribution | null;
    bonusSummary?: BonusSummary | null;
  };
  playerCount: number;
  readyCount?: number;
  answerCount?: number;
  leaderboard: { nickname: string; score: number }[];
};

const phase: Record<RoomStatus, string> = {
  lobby: "กำลังรอเปิดประตู",
  question: "กำลังตอบคำถาม",
  reveal: "กำลังแสดงเฉลย",
  paused: "เกมพักอยู่",
  q20_summary: "กำลังสรุป Q20",
  finished: "เกมจบแล้ว",
};

export default function HostDashboard() {
  const [room, setRoom] = useState("");
  const [data, setData] = useState<HostState | null>(null);
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [message, setMessage] = useState("กำลังเชื่อมต่อห้องจริง…");
  const [now, setNow] = useState(Date.now());
  const preparingRoom = useRef<string | null>(null);
  const refreshVersion = useRef(0);
  useEffect(() => {
    try {
      const saved = new URLSearchParams(window.location.search).get("room") || localStorage.getItem("jixgo-host-room") || "";
      if (/^\d{6}$/.test(saved)) setRoom(saved);
    } catch { /* Storage is optional. */ }
  }, []);
  useEffect(() => {
    if (!/^\d{6}$/.test(room)) return;
    try { localStorage.setItem("jixgo-host-room", room); } catch { /* Storage is optional. */ }
    const url = new URL(window.location.href);
    url.searchParams.set("room", room);
    window.history.replaceState(null, "", url);
  }, [room]);
  const isRoomCode = /^\d{6}$/.test(room);

  const refresh = useCallback(
    async (code = room) => {
      const version = ++refreshVersion.current;
      if (!/^\d{6}$/.test(code)) {
        setData(null);
        setMessage("ยังไม่มีห้อง · กด “สร้างห้องใหม่” เพื่อเริ่มเกม");
        return false;
      }

      try {
        const response = await fetch(`/api/game/host/state?room=${code}&t=${Date.now()}`, {
          cache: "no-store", signal: AbortSignal.timeout(7000),
        });
        const payload = await response.json().catch(() => ({}));
        if (version !== refreshVersion.current) return false;

        if (!response.ok) {
          const error = typeof payload.error === "string" ? payload.error : null;
          if (preparingRoom.current === code) return error ?? false;
          setData(null);
          setMessage(
            error
              ? `อ่านสถานะห้อง ${code} ไม่สำเร็จ: ${error}`
              : `ยังไม่พบห้อง ${code} · กด “สร้างห้องใหม่” หรือ “เตรียมห้อง / seed คำถาม”`,
          );
          return error ?? false;
        }

        if (payload?.state?.room?.code !== code) {
          setData(null);
          setMessage(`ข้อมูลห้อง ${code} ยังไม่พร้อม · กำลังลองใหม่`);
          return false;
        }
        setData(payload);
        setMessage("เชื่อมต่อห้องจริงแล้ว · อัปเดตอัตโนมัติ");
        return true;
      } catch (error) {
        if (version !== refreshVersion.current) return false;
        setData(null);
        const detail = error instanceof Error ? error.message : "NETWORK_ERROR";
        if (preparingRoom.current !== code) {
          setMessage(`อ่านสถานะห้อง ${code} ไม่สำเร็จ: ${detail}`);
        }
        return detail;
      }
    },
    [room],
  );

  useEffect(() => {
    let active = true;
    let poll: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      await refresh();
      if (active) poll = setTimeout(() => void tick(), 1500);
    };
    void tick();
    const clock = setInterval(() => setNow(Date.now()), 250);
    return () => {
      active = false; refreshVersion.current++;
      clearTimeout(poll); clearInterval(clock);
    };
  }, [refresh]);

  // A changed room code must not reuse the old room's position or controls while
  // the new room's state is still loading.
  const currentData = data?.state.room.code === room ? data : null;
  const game = currentData?.state.room;
  const position = game?.currentPosition ?? 1;
  const seconds = useMemo(
    () =>
      game?.deadlineAt
        ? Math.max(0, Math.ceil((new Date(game.deadlineAt).getTime() - now) / 1000))
        : 0,
    [game?.deadlineAt, now],
  );

  async function prepareRoom(code: string) {
    if (busy || !/^\d{6}$/.test(code)) return;
    preparingRoom.current = code;
    setBusy(true);
    setData(null);
    setMessage(`กำลังสร้างห้อง ${code} และเตรียมคำถาม…`);

    try {
      const response = await fetch("/api/game/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: code }),
        signal: AbortSignal.timeout(15000),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(`เตรียมห้องไม่สำเร็จ: ${payload.error ?? "ตรวจ migration และ Environment"}`);
        return;
      }

      setRoom(payload.room);
      setMessage(`เตรียมห้อง ${payload.room} พร้อมแล้ว`);
      const connected = await refresh(payload.room);
      if (connected !== true) {
        setMessage(
          `เตรียมห้อง ${payload.room} แล้ว แต่ยังอ่านสถานะไม่ได้: ${typeof connected === "string" ? connected : "ตรวจ migration และ Environment"}`,
        );
      }
    } catch {
      setMessage("การเชื่อมต่อสะดุด · ตรวจสถานะห้องก่อนลองเตรียมห้องอีกครั้ง");
    } finally {
      preparingRoom.current = null;
      setBusy(false);
    }
  }

  async function prepare(event: FormEvent) {
    event.preventDefault();
    await prepareRoom(room);
  }

  async function createRoom() {
    const nextRoom = String(Math.floor(100000 + Math.random() * 900000));
    setRoom(nextRoom);
    await prepareRoom(nextRoom);
  }

  async function command(status: RoomStatus, next = position) {
    if (busy || !currentData) return;
    setBusy(true);
    try {
      const response = await fetch("/api/game/host", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, position: next, status }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        setMessage("สั่งเกมไม่สำเร็จ · ตรวจสถานะห้องก่อนลองอีกครั้ง");
        return;
      }
      await refresh();
    } catch {
      setMessage("การเชื่อมต่อสะดุด · กำลังตรวจสถานะห้องก่อนสั่งเกมอีกครั้ง");
      await refresh();
    } finally { setBusy(false); }
  }

  const board =
    game?.status === "reveal" && position < 20 ? (
      <ChoiceDistributionBoard distribution={currentData?.state.distribution} />
    ) : game?.status === "q20_summary" ? (
      <BonusDistributionGrid summary={currentData?.state.bonusSummary} />
    ) : null;
  const rows = showAll ? (currentData?.leaderboard ?? []) : (currentData?.leaderboard.slice(0, 5) ?? []);

  return (
    <main className="page-shell">
      <section className="shell-content">
        <div className="topbar">
          <div>
            <div className="eyebrow-small">HOST CONTROL · PRIVATE</div>
            <h1 className="title">JIXGO Magical 24</h1>
          </div>
          <div className="topbar-actions">
            <Link className="back-link" href="/preview">ดู Preview</Link>
            <Link className="back-link" href="/">หน้าแรก</Link>
          </div>
        </div>

        <div className="host-grid">
          <div className="panel">
            <form className="form-stack" onSubmit={prepare}>
              <label>
                รหัสห้อง
                <input
                  className="code-input"
                  placeholder="รหัสห้อง 6 หลัก"
                  value={room}
                  onChange={(event) => setRoom(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                />
              </label>
              <div className="host-room-actions">
                <button className="button ghost" type="button" onClick={() => void createRoom()} disabled={busy}>
                  สร้างห้องใหม่
                </button>
                <button className="button ghost" type="submit" disabled={busy || !isRoomCode}>
                  เตรียมห้อง / seed คำถาม
                </button>
              </div>
            </form>

            <p className="answer-status">{message}</p>
            <Monitor
              game={game}
              players={currentData?.playerCount ?? 0}
              ready={currentData?.readyCount ?? 0}
              answered={currentData?.answerCount ?? 0}
              seconds={seconds}
            />
            {board}

            <div className="control-grid">
              <button
                className="button primary"
                disabled={busy || !currentData || game?.status === "q20_summary"}
                onClick={() => void command("question")}
              >
                {game?.status === "question" ? "เริ่มเวลาใหม่" : position === 1 ? "เริ่มเกม" : "เริ่มข้อนี้"}
              </button>
              {position < 20 ? (
                <button
                  className="button ghost"
                  disabled={busy || !currentData || game?.status !== "reveal"}
                  onClick={() => void command("question", position + 1)}
                >
                  ข้อต่อไป
                </button>
              ) : null}
              <button
                className="button ghost"
                disabled={busy || !currentData || game?.status !== "question"}
                onClick={() => void command("reveal")}
              >
                {position === 20 ? "แสดงเฉลย Q20" : "แสดงเฉลยข้อนี้"}
              </button>
              {position === 20 && game?.status === "reveal" ? (
                <button className="button primary" disabled={busy} onClick={() => void command("q20_summary")}>
                  แสดงสรุป Q20
                </button>
              ) : null}
              {position === 20 && game?.status === "q20_summary" ? (
                <button className="button primary" disabled={busy} onClick={() => void command("finished")}>
                  แสดงผลรวมเกม ✦
                </button>
              ) : null}
              <button
                className="button ghost"
                disabled={busy || !currentData || position === 20}
                onClick={() => void command("paused")}
              >
                พักเกม
              </button>
            </div>
          </div>

          <section className="panel">
            <div className="eyebrow-small">LIVE LEADERBOARD</div>
            <h2>{showAll ? "All players" : "Top 5"}</h2>
            <ol className="rank-list">
              {rows.map((row, index) => (
                <li key={row.nickname}>
                  <span>#{index + 1} {row.nickname}</span>
                  <strong>{row.score}</strong>
                </li>
              ))}
            </ol>
            <button className="button ghost" onClick={() => setShowAll(!showAll)}>
              {showAll ? "แสดง Top 5" : "แสดงทุกคน"}
            </button>
          </section>
        </div>
      </section>
    </main>
  );
}

function Monitor({
  game,
  players,
  ready,
  answered,
  seconds,
}: {
  game?: HostState["state"]["room"];
  players: number;
  ready: number;
  answered: number;
  seconds: number;
}) {
  const status = game?.status;
  return (
    <section className="host-monitor">
      <div className="host-monitor-head">
        <span>LIVE GAME MONITOR</span>
        <strong className={`host-phase ${status ?? "offline"}`}>
          {status ? phase[status] : "ยังไม่เชื่อมห้อง"}
        </strong>
      </div>
      <div className="host-monitor-main">
        <b>{game ? `ข้อ ${String(game.currentPosition).padStart(2, "0")} / 20` : "—"}</b>
        <em>
          {status === "question"
            ? `${seconds} SEC`
            : status === "q20_summary"
              ? "Q20 Summary"
              : status === "reveal"
                ? "Reveal"
                : "Waiting"}
        </em>
      </div>
      <div className="host-monitor-stats">
        <span><b>{players}</b>คนในห้อง</span>
        <span><b>{ready}</b>พร้อมแล้ว</span>
        <span><b>{answered}</b>ส่งคำตอบ</span>
      </div>
    </section>
  );
}
