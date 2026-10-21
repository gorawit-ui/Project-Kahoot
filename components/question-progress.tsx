import { useEffect, useRef } from "react";

type QuestionProgressProps = { current: number; total?: number };

export function QuestionProgress({ current, total = 20 }: QuestionProgressProps) {
  const activeRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    // Scrolling can return a Promise in newer browsers. An effect must only
    // return a cleanup function or undefined, including when the rail unmounts.
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [current]);
  return <ol className="question-progress" aria-label={`ความคืบหน้าข้อ ${current} จาก ${total}`}>
    {Array.from({ length: total }, (_, index) => {
      const position = index + 1;
      const state = position < current ? "done" : position === current ? "active" : "upcoming";
      return <li ref={position === current ? activeRef : undefined} className={state} key={position}><span>{String(position).padStart(2, "0")}</span></li>;
    })}
  </ol>;
}
