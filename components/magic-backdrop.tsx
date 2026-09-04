"use client";

import { useEffect, useRef } from "react";

type Spark = { x: number; y: number; r: number; a: number; tw: number; };
type Burst = { x: number; y: number; age: number; max: number; hue: number; };

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
    const sparks: Spark[] = [];
    const bursts: Burst[] = [];
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

      if (!reduced && Math.random() < delta * .45) {
        bursts.push({ x: Math.random() * width, y: Math.random() * height * .48 + height * .08, age: 0, max: .9, hue: Math.random() > .5 ? 42 : 205 });
      }

      for (let i = bursts.length - 1; i >= 0; i--) {
        const burst = bursts[i];
        burst.age += delta;
        const progress = burst.age / burst.max;
        if (progress >= 1) { bursts.splice(i, 1); continue; }
        context.save();
        context.translate(burst.x, burst.y);
        context.globalAlpha = 1 - progress;
        context.strokeStyle = burst.hue === 42 ? "#ffe2a0" : "#b8d8ff";
        context.lineWidth = 1.2;
        for (let ray = 0; ray < 12; ray++) {
          const angle = ray / 12 * Math.PI * 2;
          const length = 10 + progress * 42;
          context.beginPath();
          context.moveTo(Math.cos(angle) * length * .25, Math.sin(angle) * length * .25);
          context.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
          context.stroke();
        }
        context.restore();
      }

      frame = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="magic-canvas" aria-hidden="true" />;
}