"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { JixgoMascotMode } from "./jixgo-mascot";
import styles from "./lobby-mascot.module.css";
const JixgoMascot = dynamic(() => import("./jixgo-mascot"), { ssr: false, loading: () => <img className={styles.fallback} src="/assets/jixgo-mascot-fallback.svg" alt="" aria-hidden="true" /> });
export function LobbyMascot({ waiting = false }: { waiting?: boolean }) { const [mode, setMode] = useState<JixgoMascotMode>("greeting"); const [showPopup, setShowPopup] = useState(!waiting); useEffect(() => { const idle = window.setTimeout(() => setMode("idle"), waiting ? 1800 : 3200); const close = window.setTimeout(() => setShowPopup(false), 6200); return () => { window.clearTimeout(idle); window.clearTimeout(close); }; }, [waiting]); return <aside className={`${styles.wrap} ${waiting ? styles.waiting : ""}`} aria-label="Jixgo Fairytale Host"><JixgoMascot mode={mode} />{showPopup ? <div className={styles.popup} role="status" aria-live="polite"><span>✨ ยินดีต้อนรับสู่โลก</span><strong>Jixgo Magical 24</strong><span>เตรียมตัวให้พร้อม…<br />การผจญภัยกำลังจะเริ่มขึ้นแล้ว!</span></div> : null}</aside>; }
export function MascotMoment({ mode, label }: { mode: JixgoMascotMode; label: string }) { return <aside className={styles.moment} aria-label={label}><JixgoMascot mode={mode} label={label} /></aside>; }
export function GameStartCountdown() { return <div className={styles.countdown} role="status" aria-live="assertive"><JixgoMascot mode="countdown" label="Jixgo กำลังเปิดประตูเวทมนตร์" /><div><span>ประตูเวทมนตร์กำลังเปิด…</span><strong aria-hidden="true">3 · 2 · 1</strong></div></div>; }
