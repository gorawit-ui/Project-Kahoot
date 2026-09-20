"use client";

import { useEffect } from "react";

export default function PlayError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Player screen error", error);
  }, [error]);

  return (
    <main className="page-shell">
      <section className="shell-content player-shell">
        <div className="panel lobby-center finish-card">
          <div className="eyebrow-small">MAGICAL CONNECTION</div>
          <h1 className="title">หน้าจอสะดุดชั่วคราว</h1>
          <p className="waiting">ข้อมูลห้องและคะแนนยังอยู่ ลองเปิดหน้าจอเดิมอีกครั้งได้เลย</p>
          <button className="button primary" type="button" onClick={reset}>
            ลองโหลดหน้าจออีกครั้ง
          </button>
          <a className="back-link" href="/join">กลับไปเข้าร่วมห้อง</a>
        </div>
      </section>
    </main>
  );
}
