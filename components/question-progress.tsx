type QuestionProgressProps = { current: number; total?: number };

export function QuestionProgress({ current, total = 20 }: QuestionProgressProps) {
  return <ol className="question-progress" aria-label={`ความคืบหน้าข้อ ${current} จาก ${total}`}>
    {Array.from({ length: total }, (_, index) => {
      const position = index + 1;
      const state = position < current ? "done" : position === current ? "active" : "upcoming";
      return <li className={state} key={position}><span>{String(position).padStart(2, "0")}</span></li>;
    })}
  </ol>;
}
