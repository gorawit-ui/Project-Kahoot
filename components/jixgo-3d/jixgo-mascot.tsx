"use client";

import { Sparkles } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { Group } from "three";
import styles from "./jixgo-mascot.module.css";

export type JixgoMascotMode = "idle" | "greeting" | "countdown" | "celebrate";

type Props = { mode?: JixgoMascotMode; className?: string; label?: string };

function MascotFallback({ className = "" }: { className?: string }) {
  return <img className={`${styles.fallback} ${className}`} src="/assets/jixgo-mascot-fallback.svg" alt="" aria-hidden="true" />;
}

function FairytaleHost({ mode }: { mode: JixgoMascotMode }) {
  const figure = useRef<Group>(null);
  const head = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const eyes = useRef<Group>(null);
  const bow = useRef<Group>(null);
  const cape = useRef<Group>(null);
  const apple = useRef<Group>(null);
  useFrame(({ clock }) => {
    const seconds = clock.getElapsedTime();
    if (!figure.current) return;
    const celebrate = mode === "celebrate";
    const greeting = mode === "greeting";
    const countdown = mode === "countdown";
    figure.current.position.y = Math.sin(seconds * (celebrate ? 8 : 2.1)) * (celebrate ? 0.1 : 0.035);
    figure.current.rotation.y = Math.sin(seconds * .7) * (countdown ? .035 : .08);
    figure.current.rotation.z = greeting ? -.055 : Math.sin(seconds * 1.15) * .015;
    if (head.current) { head.current.rotation.z = greeting ? -.11 : Math.sin(seconds * .8) * .025; head.current.rotation.y = countdown ? 0 : Math.sin(seconds * .45) * .06; }
    if (rightArm.current) rightArm.current.rotation.z = greeting ? -.7 + Math.sin(seconds * 5) * .3 : celebrate ? -.58 + Math.sin(seconds * 7) * .25 : -.22;
    if (leftArm.current) leftArm.current.rotation.z = celebrate ? .58 - Math.sin(seconds * 7) * .25 : .48;
    if (eyes.current) { const blink = seconds % 4.6 < .13 ? .12 : 1; eyes.current.scale.y = blink; }
    if (bow.current) bow.current.rotation.z = Math.sin(seconds * 1.6) * .04;
    if (cape.current) cape.current.rotation.y = Math.sin(seconds * 1.1) * .08;
    if (apple.current) { apple.current.position.y = .97 + Math.sin(seconds * 1.8) * .035; apple.current.rotation.y = seconds * .4; }
  });
  const sparkleCount = mode === "celebrate" ? 18 : mode === "greeting" || mode === "countdown" ? 10 : 4;
  return <group ref={figure} position={[0, -1.35, 0]}>
    <ambientLight intensity={1.25} />
    <directionalLight position={[3, 4, 4]} intensity={2.1} color="#fff2c9" />
    <pointLight position={[-2, 1, 2]} intensity={9} color="#ffc962" distance={5} />
    <Sparkles count={sparkleCount} scale={[3.1, 3.4, 2]} size={2.2} speed={.28} color="#ffe6a6" />
    <group position={[0, .16, 0]}>
      <mesh position={[0, .1, 0]}><coneGeometry args={[.87, 1.26, 24]} /><meshStandardMaterial color="#f4c85e" roughness={.7} /></mesh>
      <mesh position={[0, .64, .02]}><cylinderGeometry args={[.49, .55, .88, 20]} /><meshStandardMaterial color="#102c72" roughness={.5} /></mesh>
      <mesh position={[0, .63, -.28]}><boxGeometry args={[.06, .82, .05]} /><meshStandardMaterial color="#e9bc4f" metalness={.5} roughness={.32} /></mesh>
      <group ref={cape}><mesh position={[.02, .63, .31]}><boxGeometry args={[.9, 1.02, .08]} /><meshStandardMaterial color="#8d1838" roughness={.68} /></mesh></group>
      <group ref={leftArm} position={[-.56, .78, 0]}><mesh position={[0, -.24, 0]}><cylinderGeometry args={[.13, .15, .58, 12]} /><meshStandardMaterial color="#f1b592" /></mesh><mesh position={[0, .16, 0]}><sphereGeometry args={[.29, 14, 10]} /><meshStandardMaterial color="#173d8b" /></mesh><mesh position={[.06, -.58, 0]}><sphereGeometry args={[.14, 12, 10]} /><meshStandardMaterial color="#f1b592" /></mesh></group>
      <group ref={rightArm} position={[.57, .83, 0]}><mesh position={[0, -.28, 0]}><cylinderGeometry args={[.13, .15, .6, 12]} /><meshStandardMaterial color="#f1b592" /></mesh><mesh position={[0, .15, 0]}><sphereGeometry args={[.29, 14, 10]} /><meshStandardMaterial color="#173d8b" /></mesh><mesh position={[.06, -.61, 0]}><sphereGeometry args={[.14, 12, 10]} /><meshStandardMaterial color="#f1b592" /></mesh></group>
      <group ref={head}><mesh position={[0, 1.49, 0]}><sphereGeometry args={[.43, 22, 16]} /><meshStandardMaterial color="#f4bd9e" roughness={.68} /></mesh><mesh position={[0, 1.57, .02]} scale={[1.03, 1.08, 1]}><sphereGeometry args={[.45, 18, 14, 0, Math.PI * 2, 0, 1.72]} /><meshStandardMaterial color="#251d28" roughness={.82} /></mesh><group ref={bow}><mesh position={[0, 1.9, 0]}><sphereGeometry args={[.09, 12, 8]} /><meshStandardMaterial color="#b51f3b" /></mesh><mesh position={[-.14, 1.93, 0]} rotation={[0, 0, .28]}><sphereGeometry args={[.17, 12, 8]} /><meshStandardMaterial color="#c72243" /></mesh><mesh position={[.14, 1.93, 0]} rotation={[0, 0, -.28]}><sphereGeometry args={[.17, 12, 8]} /><meshStandardMaterial color="#c72243" /></mesh></group><group ref={eyes}><mesh position={[-.13, 1.54, -.39]}><sphereGeometry args={[.032, 10, 8]} /><meshStandardMaterial color="#2a1b21" /></mesh><mesh position={[.13, 1.54, -.39]}><sphereGeometry args={[.032, 10, 8]} /><meshStandardMaterial color="#2a1b21" /></mesh></group><mesh position={[0, 1.36, -.4]} scale={[1.15, .3, 1]}><sphereGeometry args={[.08, 12, 6]} /><meshStandardMaterial color="#cf5a6e" /></mesh></group>
      <group ref={apple} position={[0, .97, -.55]}><mesh><sphereGeometry args={[.18, 18, 14]} /><meshStandardMaterial color="#d92036" metalness={.18} roughness={.22} /></mesh><mesh position={[0, .18, 0]}><cylinderGeometry args={[.022, .026, .12, 8]} /><meshStandardMaterial color="#6a4a20" /></mesh><pointLight intensity={mode === "countdown" || mode === "celebrate" ? 8 : 2.4} color="#ffdd75" distance={1.8} /></group>
    </group>
  </group>;
}

export default function JixgoMascot({ mode = "idle", className = "", label = "Jixgo Fairytale Host" }: Props) {
  const [canRender, setCanRender] = useState(false);
  useEffect(() => {
    const lowPower = navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 2;
    const canvas = document.createElement("canvas");
    setCanRender(!window.matchMedia("(prefers-reduced-motion: reduce)").matches && !lowPower && Boolean(canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
  }, []);
  if (!canRender) return <MascotFallback className={className} />;
  return <div className={`${styles.root} ${styles[mode]} ${className}`} role="img" aria-label={label}><Canvas dpr={[1, 1.5]} camera={{ position: [0, .55, 4.1], fov: 33 }} gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}><FairytaleHost mode={mode} /></Canvas></div>;
}
