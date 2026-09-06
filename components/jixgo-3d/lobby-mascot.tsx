"use client";
import dynamic from "next/dynamic";
import styles from "./lobby-mascot.module.css";
const JixgoMascot = dynamic(() => import("./jixgo-mascot"), { ssr: false, loading: () => <img className={styles.fallback} src="/assets/jixgo-mascot-fallback.svg" alt="" aria-hidden="true" /> });
export function LobbyMascot({ waiting = false }: { waiting?: boolean }) { return <aside className={`${styles.wrap} ${waiting ? styles.waiting : ""}`} aria-label="Jixgo Fairytale Host"><JixgoMascot mode="greeting" /><div className={styles.popup} role="status" aria-live="polite"><span>✨ ยินดีต้อนรับสู่โลก</span><strong>Jixgo Magical 24</strong><span>เตรียมตัวให้พร้อม…<br />การผจญภัยกำลังจะเริ่มขึ้นแล้ว!</span></div></aside>; }
