"use client";

import { useEffect, useRef } from "react";

type Spark = { x: number; y: number; r: number; a: number; tw: number; };

export function MagicBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let width = 0;
    let height = 0;
    let frame = 0;
    let last = 0;
    let hidden = document.hidden;
    const sparks: Spark[] = [];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      sparks.length = 0;
      for (let i = 0; i < Math.min(90, Math.floor(width / 5)); i++) {
        sparks.push({ x: Math.random() * width, y: Math.random() * height, r: Math.random() * 1.4 + .2, a: Math.random() * .65 + .2, tw: Math.random() * 4 + 1 });
      }
    };

    const draw = (time: number) => {
      if (hidden) return;
      const delta = Math.min((time - last) / 1000, .05);
      last = time;
      context.clearRect(0, 0, width, height);

      for (const spark of sparks) {
        const pulse = reduced ? 1 : .7 + Math.sin(time / 1000 * spark.tw) * .3;
        context.beginPath();
        context.fillStyle = `rgba(255, 232, 164, ${spark.a * pulse})`;
        context.arc(spark.x, spark.y, spark.r, 0, Math.PI * 2);
        context.fill();
      }

      frame = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    const visibility = () => {
      hidden = document.hidden;
      if (!hidden) { last = performance.now(); frame = requestAnimationFrame(draw); }
    };
    document.addEventListener("visibilitychange", visibility);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="magic-canvas" aria-hidden="true" />;
}
