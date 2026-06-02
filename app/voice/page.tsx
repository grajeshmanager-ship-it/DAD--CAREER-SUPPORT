"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Vapi from "@vapi-ai/web";

const COMPANION_IDS: Record<string, string> = {
  dad: "1312a1bf-ea33-48f7-aa21-1f16e414e885",
  mom: "5377cac8-e297-424d-8857-f062ff52741c",
  brother: "43dfa321-15d0-4480-9048-45fdeaa948d6",
  sister: "3569ddb6-a8f6-40d8-92c8-ec12a092f988",
  mentor: "2399897f-8e22-4d47-bc9e-5f88869669c4",
  friend: "50ff3ad7-2c6c-4e6b-805b-f3efc3527053",
  partner_male: "b26b0ecc-e173-46f1-b394-3f41446b448f",
  partner_female: "e4449654-c537-41db-8792-0d0f895ed12d",
};

const COMPANION_INFO: Record<string, { label: string; color: string; rgb: string; rgb2: string }> = {
  dad:            { label: "Dad",     color: "#C9A84C", rgb: "201,168,76",  rgb2: "255,210,120" },
  mom:            { label: "Mom",     color: "#C47BAA", rgb: "196,123,170", rgb2: "255,180,220" },
  brother:        { label: "Brother", color: "#5BAA78", rgb: "91,170,120",  rgb2: "140,230,170" },
  sister:         { label: "Sister",  color: "#E07878", rgb: "224,120,120", rgb2: "255,180,160" },
  mentor:         { label: "Mentor",  color: "#7896FF", rgb: "120,150,255", rgb2: "180,200,255" },
  friend:         { label: "Friend",  color: "#5BB4B4", rgb: "91,180,180",  rgb2: "140,230,230" },
  partner_male:   { label: "Partner", color: "#A882D4", rgb: "168,130,212", rgb2: "210,170,255" },
  partner_female: { label: "Partner", color: "#A882D4", rgb: "168,130,212", rgb2: "210,170,255" },
};

function detectSwitch(text: string, current: string, userGender: string): string | null {
  const lower = text.toLowerCase();
  const intentWords = ["talk", "speak", "get", "call", "want", "pass", "switch", "connect", "bring", "put", "need", "can you", "could you", "let me", "i want", "i need"];
  const hasIntent = intentWords.some(w => lower.includes(w));
  if (!hasIntent) return null;
  if ((lower.includes("mom") || lower.includes("mum") || lower.includes("mother")) && current !== "mom") return "mom";
  if (lower.includes("sister") && current !== "sister") return "sister";
  if (lower.includes("brother") && current !== "brother") return "brother";
  if (lower.includes("mentor") && current !== "mentor") return "mentor";
  if ((lower.includes("girlfriend") || lower.includes("wife")) && current !== "partner_female") return "partner_female";
  if ((lower.includes("boyfriend") || lower.includes("husband")) && current !== "partner_male") return "partner_male";
  if (lower.includes("friend") && !lower.includes("girlfriend") && current !== "friend") return "friend";
  if ((lower.includes("dad") || lower.includes("father")) && !lower.includes("grandfather") && current !== "dad") return "dad";
  if (lower.includes("partner") && !lower.includes("girlfriend") && !lower.includes("boyfriend")) {
    if (userGender === "male") return current !== "partner_female" ? "partner_female" : null;
    if (userGender === "female") return current !== "partner_male" ? "partner_male" : null;
    return current !== "partner_male" ? "partner_male" : null;
  }
  return null;
}

interface Particle { angle: number; baseR: number; speed: number; size: number; life: number; phase: number; layer: number; tilt: number; }
interface Tendril { angle: number; length: number; speed: number; wave: number; width: number; phase: number; }
interface Dust { x: number; y: number; s: number; a: number; speed: number; angle: number; }

export default function VoicePage() {
  const [profile, setProfile] = useState<{ full_name: string; companion_type: string; companion_name: string; gender: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCompanion, setActiveCompanion] = useState<string>("dad");
  const [vapiActive, setVapiActive] = useState(false);
  const [vapiConnecting, setVapiConnecting] = useState(false);
  const [transcript, setTranscript] = useState<{ role: string; text: string; companion: string }[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  const [switching, setSwitching] = useState(false);
  const [showFamily, setShowFamily] = useState(false);
  const vapiRef = useRef<Vapi | null>(null);
  const transcriptRef = useRef<{ role: string; text: string; companion: string }[]>([]);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const volumeRef = useRef(0);
  const activeCompanionRef = useRef<string>("dad");
  const switchingRef = useRef(false);
  const userGenderRef = useRef<string>("male");
  const particlesRef = useRef<Particle[]>([]);
  const tendrilsRef = useRef<Tendril[]>([]);
  const dustRef = useRef<Dust[]>([]);
  const timeRef = useRef(0);

  const sans = "'Helvetica Neue', Arial, sans-serif";
  const serif = "'Georgia', 'Times New Roman', serif";
  const gold = "#C9A84C";
  const dark = "#020101";
  const textColor = "#EBE5DC";

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("full_name, companion_type, companion_name, gender").eq("id", user.id).single();
        if (data) {
          setProfile(data);
          setActiveCompanion(data.companion_type || "dad");
          activeCompanionRef.current = data.companion_type || "dad";
          userGenderRef.current = data.gender || "male";
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  const initScene = () => {
    particlesRef.current = Array.from({ length: 200 }, () => ({
      angle: Math.random() * Math.PI * 2,
      baseR: 40 + Math.random() * 220,
      speed: (0.0002 + Math.random() * 0.0008) * (Math.random() > 0.5 ? 1 : -1),
      size: 0.4 + Math.random() * 3,
      life: Math.random(),
      phase: Math.random() * Math.PI * 2,
      layer: Math.floor(Math.random() * 3),
      tilt: 0.3 + Math.random() * 0.7,
    }));
    tendrilsRef.current = Array.from({ length: 12 }, (_, i) => ({
      angle: (i / 12) * Math.PI * 2,
      length: 80 + Math.random() * 120,
      speed: 0.002 + Math.random() * 0.003,
      wave: Math.random() * Math.PI * 2,
      width: 1 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2,
    }));
    dustRef.current = Array.from({ length: 300 }, () => ({
      x: Math.random() * 800 - 400,
      y: Math.random() * 600 - 300,
      s: 0.2 + Math.random() * 1,
      a: Math.random() * 0.3,
      speed: 0.1 + Math.random() * 0.3,
      angle: Math.random() * Math.PI * 2,
    }));
  };

  // Animation — runs once on mount, never stops
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    initScene();

    const draw = () => {
      const W = canvas.width = canvas.offsetWidth;
      const H = canvas.height = canvas.offsetHeight;
      if (W === 0 || H === 0) { animFrameRef.current = requestAnimationFrame(draw); return; }
      const cx = W / 2, cy = H / 2;
      const comp = COMPANION_INFO[activeCompanionRef.current] || COMPANION_INFO.dad;
      const { rgb, rgb2 } = comp;

      timeRef.current += 0.007;
      const t = timeRef.current;
      const vol = Math.max(0.15, volumeRef.current);

      ctx.fillStyle = "#010101";
      ctx.fillRect(0, 0, W, H);

      // Nebula
      const nebula = ctx.createRadialGradient(cx, cy - H * 0.1, 0, cx, cy, Math.min(W, H) * 0.8);
      nebula.addColorStop(0, `rgba(${rgb},0.04)`);
      nebula.addColorStop(0.4, `rgba(${rgb},0.02)`);
      nebula.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = nebula; ctx.fillRect(0, 0, W, H);

      // Dust
      dustRef.current.forEach(d => {
        d.x += Math.cos(d.angle) * d.speed * 0.3;
        d.y += Math.sin(d.angle) * d.speed * 0.3;
        if (Math.abs(d.x) > 500) d.x = -d.x;
        if (Math.abs(d.y) > 400) d.y = -d.y;
        ctx.beginPath(); ctx.arc(cx + d.x, cy + d.y, d.s, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${d.a * (0.3 + vol * 0.5)})`; ctx.fill();
      });

      // Corona
      const coronaR = 180 + vol * 80 + Math.sin(t * 0.6) * 20;
      for (let i = 0; i < 3; i++) {
        const r = coronaR * (1 + i * 0.35);
        const g2 = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r);
        g2.addColorStop(0, `rgba(${rgb},${(0.06 - i * 0.018) * (1 + vol)})`);
        g2.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      }

      // Tendrils
      tendrilsRef.current.forEach(td => {
        td.angle += td.speed;
        td.wave += 0.02;
        const len = td.length * (1 + vol * 1.5);
        ctx.beginPath();
        for (let j = 0; j <= 20; j++) {
          const p = j / 20;
          const a = td.angle + Math.sin(td.wave + p * Math.PI * 2) * 0.3;
          const r = p * len + Math.sin(td.phase + t * 2 + p * Math.PI) * (30 + vol * 50) * p;
          j === 0 ? ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.85)
                  : ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.85);
        }
        const grad = ctx.createLinearGradient(cx, cy, cx + Math.cos(td.angle) * len, cy + Math.sin(td.angle) * len * 0.85);
        grad.addColorStop(0, `rgba(${rgb2},${(0.12 + vol * 0.2) * 0.8})`);
        grad.addColorStop(0.5, `rgba(${rgb},${0.12 + vol * 0.2})`);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.strokeStyle = grad; ctx.lineWidth = td.width * (1 + vol * 2); ctx.stroke();
      });

      // Sacred geometry
      [3, 4, 6, 8].forEach((sides, si) => {
        const geoR = (90 + si * 45) * (1 + vol * 0.4) + Math.sin(t * 0.5 + si) * 15;
        const rotSpeed = [0.12, -0.08, 0.05, -0.03][si];
        ctx.beginPath();
        for (let i = 0; i <= sides; i++) {
          const angle = (i / sides) * Math.PI * 2 + t * rotSpeed;
          const morphR = geoR * (0.85 + 0.15 * Math.cos(sides * angle));
          i === 0 ? ctx.moveTo(cx + Math.cos(angle) * morphR, cy + Math.sin(angle) * morphR * 0.9)
                  : ctx.lineTo(cx + Math.cos(angle) * morphR, cy + Math.sin(angle) * morphR * 0.9);
        }
        ctx.strokeStyle = `rgba(${rgb},${(0.06 - si * 0.01) * (1 + vol * 0.8)})`;
        ctx.lineWidth = 0.5; ctx.stroke();
      });

      // Interference rings
      for (let i = 0; i < 6; i++) {
        const r = 50 + i * 35 + Math.sin(t * 0.8 + i * 0.9) * 20 * (1 + vol * 2);
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rgb2},${Math.max(0, 0.12 - i * 0.018) * (0.5 + vol)})`;
        ctx.lineWidth = 1.5 - i * 0.2; ctx.stroke();
      }

      // Particles
      particlesRef.current.forEach(p => {
        p.life += 0.004 + vol * 0.008;
        if (p.life > 1) p.life = 0;
        p.angle += p.speed * (1 + vol * 4);
        const breathe = 1 + Math.sin(t * 0.9 + p.phase) * 0.15;
        const orbitR = p.baseR * breathe + vol * 60 * p.layer * 0.5;
        const wobble = Math.sin(t * 1.5 + p.phase) * 20 * (1 + vol);
        const x = cx + Math.cos(p.angle) * orbitR + Math.cos(p.angle + Math.PI / 2) * wobble;
        const y = cy + Math.sin(p.angle) * orbitR * p.tilt + Math.sin(p.angle + Math.PI / 2) * wobble * p.tilt;
        const fade = Math.sin(p.life * Math.PI);
        const alpha = fade * (0.5 + vol * 0.6) * [0.8, 0.5, 0.3][p.layer];
        const sz = p.size * (1 + vol * 1.5) * fade;
        if (alpha > 0.01) {
          const col = p.layer === 0 ? rgb2 : rgb;
          ctx.beginPath(); ctx.arc(x, y, sz, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${col},${alpha})`; ctx.fill();
          if (sz > 1.2) {
            const pg = ctx.createRadialGradient(x, y, 0, x, y, sz * 5);
            pg.addColorStop(0, `rgba(${col},${alpha * 0.5})`);
            pg.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(x, y, sz * 5, 0, Math.PI * 2); ctx.fill();
          }
        }
      });

      // Core
      const coreR = (55 + vol * 45) * (Math.sin(t * 0.7) * 0.12 + 1);
      const fireGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2);
      fireGrad.addColorStop(0, `rgba(255,255,255,${0.6 + vol * 0.3})`);
      fireGrad.addColorStop(0.15, `rgba(${rgb2},${0.8 + vol * 0.2})`);
      fireGrad.addColorStop(0.4, `rgba(${rgb},${0.4 + vol * 0.3})`);
      fireGrad.addColorStop(0.7, `rgba(${rgb},0.15)`);
      fireGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = fireGrad; ctx.beginPath(); ctx.arc(cx, cy, coreR * 2.5, 0, Math.PI * 2); ctx.fill();

      const hl = ctx.createRadialGradient(cx - coreR * 0.2, cy - coreR * 0.25, 0, cx, cy, coreR);
      hl.addColorStop(0, `rgba(255,255,255,${0.7 + vol * 0.2})`);
      hl.addColorStop(0.3, "rgba(255,255,255,0.1)");
      hl.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = hl; ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2); ctx.fill();

      // Energy bursts when speaking
      if (vol > 0.3) {
        const burstCount = Math.floor(vol * 8) + 3;
        for (let i = 0; i < burstCount; i++) {
          const angle = (i / burstCount) * Math.PI * 2 + t * 0.8;
          const bLen = coreR * (2 + vol * 4);
          const x1 = cx + Math.cos(angle) * coreR * 0.6, y1 = cy + Math.sin(angle) * coreR * 0.6;
          const x2 = cx + Math.cos(angle) * bLen, y2 = cy + Math.sin(angle) * bLen;
          const bg = ctx.createLinearGradient(x1, y1, x2, y2);
          bg.addColorStop(0, `rgba(${rgb2},${vol * 0.6})`);
          bg.addColorStop(1, "rgba(0,0,0,0)");
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
          ctx.strokeStyle = bg; ctx.lineWidth = 0.5 + vol * 3; ctx.lineCap = "round"; ctx.stroke();
        }
      }

      // Companion name
      const fontSize = Math.min(W * 0.09, 70);
      ctx.font = `200 ${fontSize}px Georgia,serif`;
      ctx.fillStyle = `rgba(${rgb2},0.9)`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.shadowColor = comp.color; ctx.shadowBlur = 40 + vol * 30;
      ctx.fillText(comp.label, cx, cy);
      ctx.shadowBlur = 0;

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCall = async (companionKey: string) => {
    const vapiKey = process.env.NEXT_PUBLIC_VAPI_PUBLICKEY;
    if (!vapiKey) return;
    const assistantId = COMPANION_IDS[companionKey];
    if (!assistantId) return;

    setActiveCompanion(companionKey);
    activeCompanionRef.current = companionKey;
    setVapiConnecting(true);

    const vapiInstance = new Vapi(vapiKey);
    vapiRef.current = vapiInstance;

    vapiInstance.on("call-start", () => {
      setVapiActive(true);
      setVapiConnecting(false);
      setSwitching(false);
      switchingRef.current = false;
      callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    });

    vapiInstance.on("call-end", () => {
      setVapiActive(false);
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    });

    vapiInstance.on("error", () => {
      setVapiActive(false);
      setVapiConnecting(false);
      setSwitching(false);
      switchingRef.current = false;
    });

    vapiInstance.on("volume-level", (level: number) => {
      volumeRef.current = level;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vapiInstance.on("message", (msg: any) => {
      if (msg?.type === "transcript" && msg?.transcriptType === "final") {
        const entry = { role: msg.role, text: msg.transcript, companion: activeCompanionRef.current };
        transcriptRef.current = [...transcriptRef.current, entry];
        setTranscript([...transcriptRef.current]);
        if (msg.role === "user" && !switchingRef.current) {
          const switchTo = detectSwitch(msg.transcript, activeCompanionRef.current, userGenderRef.current);
          if (switchTo && switchTo !== activeCompanionRef.current) {
            handleFamilySwitch(switchTo);
          }
        }
      }
    });

    try {
      await vapiInstance.start(assistantId);
    } catch {
      setVapiConnecting(false);
      setSwitching(false);
      switchingRef.current = false;
    }
  };

  const handleFamilySwitch = async (newCompanion: string) => {
    if (switchingRef.current) return;
    if (newCompanion === activeCompanionRef.current) return;
    switchingRef.current = true;

    const currentCompanion = activeCompanionRef.current;
    setSwitching(true);

    // Stop current call
    const currentVapi = vapiRef.current;
    vapiRef.current = null;
    if (currentVapi) { try { currentVapi.stop(); } catch { /* ignore */ } }
    setVapiActive(false);
    if (callTimerRef.current) clearInterval(callTimerRef.current);

    // Add handoff to transcript
    transcriptRef.current = [...transcriptRef.current, {
      role: "system",
      text: `— ${COMPANION_INFO[currentCompanion]?.label} passed the call to ${COMPANION_INFO[newCompanion]?.label} —`,
      companion: "system"
    }];
    setTranscript([...transcriptRef.current]);

    // Wait then start new companion
    await new Promise(r => setTimeout(r, 1500));
    switchingRef.current = false;
    await startCall(newCompanion);
  };

  const endCall = () => {
    const currentVapi = vapiRef.current;
    vapiRef.current = null;
    if (currentVapi) { try { currentVapi.stop(); } catch { /* ignore */ } }
    setVapiActive(false);
    setVapiConnecting(false);
    setSwitching(false);
    switchingRef.current = false;
    volumeRef.current = 0;
    if (callTimerRef.current) clearInterval(callTimerRef.current);
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const currentInfo = COMPANION_INFO[activeCompanion] || COMPANION_INFO.dad;
  const accentColor = currentInfo.color;
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  if (loading) return (
    <div style={{ minHeight: "100vh", background: dark, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: "11px", letterSpacing: "0.42em", textTransform: "uppercase", color: gold, fontFamily: sans }}>DAD</div>
    </div>
  );

  return (
    <div style={{ width: "100vw", height: "100vh", background: dark, color: textColor, fontFamily: serif, display: "grid", gridTemplateColumns: "1fr 400px", overflow: "hidden" }}>

      {/* Left — full height soul canvas */}
      <div style={{ position: "relative", height: "100vh", overflow: "hidden", borderRight: `0.5px solid ${accentColor}10` }}>
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "block" }}
        />

        {/* Status — very subtle, bottom of centre */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", zIndex: 10, pointerEvents: "none", marginTop: "72px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(235,229,220,0.12)", fontFamily: sans }}>
            {vapiActive ? "Present" : switching ? "" : vapiConnecting ? "" : "Ready"}
          </div>
          {vapiActive && (
            <div style={{ marginTop: "6px", fontSize: "11px", color: "rgba(235,229,220,0.1)", fontFamily: "monospace", letterSpacing: "0.14em" }}>
              {formatDuration(callDuration)}
            </div>
          )}
        </div>

        {/* Nav top */}
        <div style={{ position: "absolute", top: "24px", left: "24px", right: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }}>
          <Link href="/dashboard" style={{ fontSize: "11px", letterSpacing: "0.42em", textTransform: "uppercase", color: `${gold}40`, fontFamily: sans, textDecoration: "none" }}>DAD</Link>
          <button onClick={() => setShowFamily(!showFamily)} style={{ background: "transparent", border: `0.5px solid rgba(235,229,220,0.06)`, color: "rgba(235,229,220,0.18)", padding: "8px 20px", cursor: "pointer", fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: sans }}>
            Family
          </button>
        </div>

        {/* Family dropdown */}
        {showFamily && (
          <div style={{ position: "absolute", top: "64px", right: "24px", zIndex: 20, background: "rgba(3,2,2,0.98)", border: `0.5px solid ${accentColor}15`, minWidth: "180px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(235,229,220,0.2)", padding: "10px 16px", borderBottom: "0.5px solid rgba(235,229,220,0.04)", fontFamily: sans }}>
              {vapiActive ? "Switch to" : "Talk to"}
            </div>
            {Object.entries(COMPANION_INFO).map(([key, info]) => (
              <div key={key}
                onClick={() => {
                  setShowFamily(false);
                  if (vapiActive && key !== activeCompanion) handleFamilySwitch(key);
                  else if (!vapiActive) { setActiveCompanion(key); activeCompanionRef.current = key; }
                }}
                style={{ padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", background: activeCompanion === key ? `${info.color}08` : "transparent", borderLeft: activeCompanion === key ? `1px solid ${info.color}` : "1px solid transparent", transition: "all 0.2s" }}
                onMouseEnter={e => { if (activeCompanion !== key) (e.currentTarget as HTMLDivElement).style.background = "rgba(235,229,220,0.02)"; }}
                onMouseLeave={e => { if (activeCompanion !== key) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
              >
                <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: info.color, flexShrink: 0, opacity: activeCompanion === key ? 1 : 0.4 }} />
                <div style={{ fontSize: "12px", fontWeight: "300", color: activeCompanion === key ? info.color : "rgba(235,229,220,0.4)" }}>{info.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom controls */}
        <div style={{ position: "absolute", bottom: "40px", left: "50%", transform: "translateX(-50%)", zIndex: 10 }}>
          {!vapiActive && !vapiConnecting && !switching && (
            <button
              onClick={() => startCall(activeCompanion)}
              style={{ background: "transparent", color: `${accentColor}80`, border: `0.5px solid ${accentColor}30`, padding: "14px 52px", cursor: "pointer", fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: sans }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${accentColor}10`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              Begin
            </button>
          )}
          {(vapiActive || vapiConnecting) && !switching && (
            <button
              onClick={endCall}
              style={{ background: "transparent", border: "0.5px solid rgba(176,112,112,0.2)", color: "rgba(176,112,112,0.4)", padding: "12px 36px", cursor: "pointer", fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: sans }}
            >
              End
            </button>
          )}
        </div>
      </div>

      {/* Right — transcript only */}
      <div style={{ display: "flex", flexDirection: "column", background: "#040303", height: "100vh", overflow: "hidden" }}>
        <div style={{ padding: "20px 28px", borderBottom: `0.5px solid ${accentColor}08`, flexShrink: 0 }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: `${accentColor}30`, marginBottom: "4px", fontFamily: sans }}>
            {vapiActive ? "Live" : "Conversation"}
          </div>
          <div style={{ fontSize: "14px", fontWeight: "300", color: "rgba(235,229,220,0.5)" }}>
            {firstName} & {currentInfo.label}
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "20px 28px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {transcript.length === 0 ? (
            <div style={{ paddingTop: "20px" }}>
              <p style={{ fontSize: "13px", color: "rgba(235,229,220,0.1)", fontFamily: sans, fontStyle: "italic", lineHeight: "1.8", marginBottom: "12px" }}>
                The conversation appears here as you talk.
              </p>
              <p style={{ fontSize: "11px", color: "rgba(235,229,220,0.06)", fontFamily: sans, lineHeight: "1.7" }}>
                Say "Can I talk to Mom?" to switch mid-call.
              </p>
            </div>
          ) : (
            transcript.map((t, i) => {
              if (t.role === "system") return (
                <div key={i} style={{ textAlign: "center", padding: "6px 0" }}>
                  <span style={{ fontSize: "10px", color: "rgba(235,229,220,0.15)", fontFamily: sans, letterSpacing: "0.08em" }}>{t.text}</span>
                </div>
              );
              const companionInfo = COMPANION_INFO[t.companion] || currentInfo;
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: t.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: t.role === "assistant" ? `${companionInfo.color}45` : "rgba(235,229,220,0.12)", fontFamily: sans }}>
                    {t.role === "assistant" ? companionInfo.label : firstName}
                  </div>
                  <div style={{ fontSize: "13px", color: t.role === "assistant" ? "rgba(235,229,220,0.6)" : "rgba(235,229,220,0.35)", fontFamily: sans, lineHeight: "1.7", maxWidth: "90%", padding: "10px 14px", background: t.role === "assistant" ? `${companionInfo.color}05` : "rgba(235,229,220,0.02)", border: `0.5px solid ${t.role === "assistant" ? `${companionInfo.color}10` : "rgba(235,229,220,0.04)"}` }}>
                    {t.text}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ padding: "14px 28px", borderTop: `0.5px solid rgba(235,229,220,0.03)`, flexShrink: 0 }}>
          <p style={{ fontSize: "10px", color: "rgba(235,229,220,0.07)", fontFamily: sans, lineHeight: "1.6", margin: 0 }}>
            Say <span style={{ color: `${accentColor}20` }}>"Can I talk to Mom?"</span> to switch mid-call.
          </p>
        </div>
      </div>
    </div>
  );
}
