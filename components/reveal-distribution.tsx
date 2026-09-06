export type ChoiceDistribution = { totalPlayers: number; answered: number; unanswered: number; options: { option: string; count: number; percent: number; correct: boolean }[] };
export type BonusSummary = { totalPlayers: number; submitted: number; notSubmitted: number; perfect: number; rows: { id: string; correct: number; wrong: number; unanswered: number }[] };

export function ChoiceDistributionBoard({ distribution }: { distribution?: ChoiceDistribution | null }) {
  if (!distribution) return null;
  return <section className="reveal-distribution" aria-live="polite"><div className="reveal-distribution-head"><span>✨ เสียงสะท้อนจากทั้งห้อง</span><b>ตอบแล้ว {distribution.answered} / {distribution.totalPlayers} คน</b></div><div className="choice-bars">{distribution.options.map((item) => <div className={`choice-bar ${item.correct ? "correct" : ""}`} key={item.option}><div className="choice-bar-plot"><i style={{ "--bar-height": `${Math.max(item.percent, item.count ? 12 : 0)}%` } as CSSProperties} /></div><strong>{item.correct ? "✓ " : ""}{item.option}</strong><b>{item.count} คน</b><small>{item.percent}%</small></div>)}</div><p>— ไม่ได้ตอบ {distribution.unanswered} คน</p></section>;
}

export function BonusDistributionGrid({ summary }: { summary?: BonusSummary | null }) {
  if (!summary) return null;
  return <section className="bonus-room-summary" aria-live="polite"><div className="eyebrow-small">FINAL CHAPTER · ROOM SUMMARY</div><h1>บันทึกบทสุดท้ายของทั้งห้อง</h1><div className="bonus-summary-stats"><span><b>{summary.submitted}</b>ส่งครบแล้ว</span><span><b>{summary.perfect}</b>ถูกครบ 10 เพลง</span><span><b>{summary.notSubmitted}</b>ยังไม่ได้ส่ง</span></div><div className="bonus-summary-grid">{summary.rows.map((row) => <div className="bonus-summary-row" key={row.id}><b>{row.id}</b><span className="ok">✓ {row.correct}</span><span className="bad">✕ {row.wrong}</span><span className="blank">— {row.unanswered}</span></div>)}</div><p className="waiting">Host กำลังพาไปสู่ผลรวมเกม ✦</p></section>;
}
import type { CSSProperties } from "react";
