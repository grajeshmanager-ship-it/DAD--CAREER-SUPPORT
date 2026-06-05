"use client";

import { useEffect, useRef } from "react";

interface Props {
  color: { r: number; g: number; b: number };
  volume: number;
  label: string;
}

export default function SphereCanvas({ color, volume, label }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const volRef = useRef(volume);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => { volRef.current = volume; }, [volume]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const { r, g, b } = color;

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      };
    };
    window.addEventListener("mousemove", onMouseMove);

    const draw = () => {
      const W = canvas.width = canvas.offsetWidth || canvas.parentElement?.clientWidth || 600;
      const H = canvas.height = canvas.offsetHeight || canvas.parentElement?.clientHeight || 900;
      const cx = W / 2;
      const cy = H / 2;
      const vol = Math.max(0.12, volRef.current);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      timeRef.current += 0.012;
      const t = timeRef.current;

      // Mouse tilt — sphere tilts toward cursor
      const tiltX = (mx - 0.5) * 0.4;
      const tiltY = (my - 0.5) * 0.3;

      ctx.fillStyle = "#000510";
      ctx.fillRect(0, 0, W, H);

      const sphereR = Math.min(W, H) * 0.28;
      const breathe = 1 + Math.sin(t * 0.7) * 0.03 + vol * 0.04;
      const R = sphereR * breathe;

      // Ground glow
      const groundY = cy + R * 1.12;
      const gg = ctx.createRadialGradient(cx, groundY, 0, cx, groundY, R * 2.2);
      gg.addColorStop(0, `rgba(${r},${g},${b},${0.28 + vol * 0.15})`);
      gg.addColorStop(0.4, `rgba(${r},${g},${b},0.06)`);
      gg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H);

      // Atmosphere
      const ag = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, R * 3);
      ag.addColorStop(0, `rgba(${r},${g},${b},${0.08 + vol * 0.06})`);
      ag.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = ag; ctx.fillRect(0, 0, W, H);

      // Sphere base — dark deep colour
      const sg = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.25, 0, cx, cy, R);
      sg.addColorStop(0, `rgba(${Math.min(255,r+50)},${Math.min(255,g+50)},${Math.min(255,b+50)},1)`);
      sg.addColorStop(0.3, `rgba(${r},${g},${b},1)`);
      sg.addColorStop(0.7, `rgba(${Math.floor(r*0.25)},${Math.floor(g*0.25)},${Math.floor(b*0.25)},1)`);
      sg.addColorStop(1, `rgba(${Math.floor(r*0.04)},${Math.floor(g*0.04)},${Math.floor(b*0.04)},1)`);
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = sg; ctx.fill();

      // PARTICLE TEXTURE — mouse affects rotation direction
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();

      const count = 2400;
      for (let i = 0; i < count; i++) {
        const phi = Math.acos(1 - 2 * (i + 0.5) / count);
        // Mouse X shifts rotation speed, mouse Y shifts axis
        const theta = Math.PI * (1 + Math.sqrt(5)) * i
          + t * (0.18 + mx * 0.2)
          + tiltX * 2;

        const sinPhi = Math.sin(phi + tiltY);
        const cosPhi = Math.cos(phi + tiltY);
        const x3 = sinPhi * Math.cos(theta);
        const y3 = sinPhi * Math.sin(theta);
        const z3 = cosPhi;

        if (z3 < -0.05) continue;

        const px = cx + x3 * R;
        const py = cy - y3 * R * 0.94;
        const bright = (z3 + 1) / 2;
        const sz = 0.5 + bright * 2.0 + vol * 0.8;
        const alpha = 0.2 + bright * 0.75 + vol * 0.1;

        ctx.beginPath();
        ctx.arc(px, py, sz, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${Math.min(255,r+110)},${Math.min(255,g+110)},${Math.min(255,b+110)},${alpha})`;
        ctx.fill();
      }
      ctx.restore();

      // Specular — follows mouse position
      const specX = cx + (mx - 0.5) * R * 0.6 - R * 0.2;
      const specY = cy + (my - 0.5) * R * 0.6 - R * 0.2;
      const shg = ctx.createRadialGradient(specX, specY, 0, specX, specY, R * 0.5);
      shg.addColorStop(0, `rgba(255,255,255,${0.7 + vol * 0.2})`);
      shg.addColorStop(0.2, "rgba(255,255,255,0.15)");
      shg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = shg; ctx.fillRect(0, 0, W, H);
      ctx.restore();

      // Rim glow
      const rg = ctx.createRadialGradient(cx, cy, R * 0.72, cx, cy, R * 1.1);
      rg.addColorStop(0, "rgba(0,0,0,0)");
      rg.addColorStop(0.6, `rgba(${r},${g},${b},${0.18 + vol * 0.12})`);
      rg.addColorStop(1, `rgba(${r},${g},${b},${0.55 + vol * 0.2})`);
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.1, 0, Math.PI * 2);
      ctx.fillStyle = rg; ctx.fill();

      // Pulse rings when speaking
      if (vol > 0.15) {
        for (let i = 0; i < 3; i++) {
          const pr = R * (1.15 + i * 0.18) + Math.sin(t * 3 + i * 1.2) * vol * 12;
          ctx.beginPath(); ctx.arc(cx, cy, pr, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${r},${g},${b},${(0.25 - i * 0.07) * vol})`;
          ctx.lineWidth = 1.5 - i * 0.4; ctx.stroke();
        }
      }

      // Label
      ctx.font = `300 11px 'Helvetica Neue', sans-serif`;
      ctx.fillStyle = `rgba(${r},${g},${b},0.4)`;
      ctx.textAlign = "center";
      ctx.fillText(label.toUpperCase(), cx, cy + R + 36);

      animRef.current = requestAnimationFrame(draw);
    };

    let attempts = 0;
    const tryStart = () => {
      const w = canvas.offsetWidth || canvas.parentElement?.clientWidth || 0;
      const h = canvas.offsetHeight || canvas.parentElement?.clientHeight || 0;
      if (w > 10 && h > 10) {
        animRef.current = requestAnimationFrame(draw);
      } else if (attempts++ < 30) {
        setTimeout(tryStart, 100);
      }
    };
    tryStart();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("mousemove", onMouseMove);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color.r, color.g, color.b, label]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
