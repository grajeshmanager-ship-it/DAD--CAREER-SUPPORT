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

const COMPANION_INFO: Record<string, { label: string; color: string; r: number; g: number; b: number }> = {
  dad:            { label: "Dad",     color: "#C9A84C", r: 201, g: 168, b: 76  },
  mom:            { label: "Mom",     color: "#C47BAA", r: 196, g: 123, b: 170 },
  brother:        { label: "Brother", color: "#5BAA78", r: 91,  g: 170, b: 120 },
  sister:         { label: "Sister",  color: "#E07878", r: 224, g: 120, b: 120 },
  mentor:         { label: "Mentor",  color: "#7896FF", r: 120, g: 150, b: 255 },
  friend:         { label: "Friend",  color: "#5BB4B4", r: 91,  g: 180, b: 180 },
  partner_male:   { label: "Partner", color: "#A882D4", r: 168, g: 130, b: 212 },
  partner_female: { label: "Partner", color: "#A882D4", r: 168, g: 130, b: 212 },
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
  const timeRef = useRef(0);

  const sans = "'Helvetica Neue', Arial, sans-serif";
  const serif = "'Georgia', 'Times New Roman', serif";
  const gold = "#C9A84C";
  const dark = "#000000";
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

  // 3D sphere animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const draw = () => {
      const W = canvas.width = canvas.offsetWidth;
      const H = canvas.height = canvas.offsetHeight;
      if (W === 0 || H === 0) { animFrameRef.current = requestAnimationFrame(draw); return; }

      const cx = W / 2;
      const cy = H / 2;
      const comp = COMPANION_INFO[activeCompanionRef.current] || COMPANION_INFO.dad;
      const vol = Math.max(0.08, volumeRef.current);

      timeRef.current += 0.012;
      const t = timeRef.current;

      // Pure black background
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, W, H);

      const sphereR = Math.min(W, H) * 0.28 + vol * 20;
      const breathe = 1 + Math.sin(t * 0.7) * 0.03 + vol * 0.05;
      const R = sphereR * breathe;

      // ── GROUND GLOW — light pooling below ──
      const groundY = cy + R * 1.1;
      const groundGlow = ctx.createRadialGradient(cx, groundY, 0, cx, groundY, R * 1.8);
      groundGlow.addColorStop(0, `rgba(${comp.r},${comp.g},${comp.b},${0.18 + vol * 0.15})`);
      groundGlow.addColorStop(0.4, `rgba(${comp.r},${comp.g},${comp.b},${0.06})`);
      groundGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = groundGlow;
      ctx.fillRect(0, 0, W, H);

      // ── OUTER ATMOSPHERE GLOW ──
      const atmoGlow = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R * 2.2);
      atmoGlow.addColorStop(0, `rgba(${comp.r},${comp.g},${comp.b},${0.08 + vol * 0.08})`);
      atmoGlow.addColorStop(0.5, `rgba(${comp.r},${comp.g},${comp.b},${0.03})`);
      atmoGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = atmoGlow;
      ctx.fillRect(0, 0, W, H);

      // ── SPHERE DARK BASE ──
      const baseSphere = ctx.createRadialGradient(
        cx - R * 0.25, cy - R * 0.2, 0,
        cx, cy, R
      );
      baseSphere.addColorStop(0, `rgba(${Math.min(255, comp.r + 80)},${Math.min(255, comp.g + 80)},${Math.min(255, comp.b + 80)},1)`);
      baseSphere.addColorStop(0.3, `rgba(${comp.r},${comp.g},${comp.b},1)`);
      baseSphere.addColorStop(0.7, `rgba(${Math.floor(comp.r * 0.4)},${Math.floor(comp.g * 0.4)},${Math.floor(comp.b * 0.4)},1)`);
      baseSphere.addColorStop(1, `rgba(${Math.floor(comp.r * 0.1)},${Math.floor(comp.g * 0.1)},${Math.floor(comp.b * 0.1)},1)`);
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = baseSphere;
      ctx.fill();

      // ── MESH / GRID on sphere surface ──
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();

      const gridAlpha = 0.15 + vol * 0.1;
      const cols = 18;
      const rows = 12;

      // Vertical lines — longitude
      for (let i = 0; i <= cols; i++) {
        const angle = (i / cols) * Math.PI * 2 + t * 0.08;
        const cosA = Math.cos(angle);
        // Only draw front-facing lines
        if (cosA < -0.1) continue;
        const xOffset = cosA * R;
        const scaleY = Math.sqrt(Math.max(0, 1 - (xOffset / R) ** 2));

        ctx.beginPath();
        ctx.ellipse(cx + xOffset, cy, 2, R * scaleY, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${Math.min(255, comp.r + 100)},${Math.min(255, comp.g + 100)},${Math.min(255, comp.b + 100)},${gridAlpha * cosA})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Horizontal lines — latitude
      for (let j = 1; j < rows; j++) {
        const phi = (j / rows) * Math.PI;
        const yPos = cy - R * Math.cos(phi);
        const rowR = R * Math.sin(phi);
        if (rowR < 2) continue;

        ctx.beginPath();
        ctx.ellipse(cx, yPos, rowR, rowR * 0.15, 0, 0, Math.PI * 2);
        const rowAlpha = gridAlpha * Math.sin(phi) * 0.8;
        ctx.strokeStyle = `rgba(${Math.min(255, comp.r + 100)},${Math.min(255, comp.g + 100)},${Math.min(255, comp.b + 100)},${rowAlpha})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      ctx.restore();

      // ── SPECULAR HIGHLIGHT — top left bright spot ──
      const specX = cx - R * 0.28;
      const specY = cy - R * 0.32;
      const specGlow = ctx.createRadialGradient(specX, specY, 0, specX, specY, R * 0.55);
      specGlow.addColorStop(0, `rgba(255,255,255,${0.55 + vol * 0.2})`);
      specGlow.addColorStop(0.3, `rgba(255,255,255,${0.15})`);
      specGlow.addColorStop(0.6, `rgba(${comp.r},${comp.g},${comp.b},0.05)`);
      specGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = specGlow; ctx.fillRect(0, 0, W, H);
      ctx.restore();

      // ── EDGE GLOW — rim lighting ──
      const rimGrad = ctx.createRadialGradient(cx, cy, R * 0.75, cx, cy, R * 1.05);
      rimGrad.addColorStop(0, "rgba(0,0,0,0)");
      rimGrad.addColorStop(0.7, `rgba(${comp.r},${comp.g},${comp.b},${0.08 + vol * 0.1})`);
      rimGrad.addColorStop(1, `rgba(${comp.r},${comp.g},${comp.b},${0.25 + vol * 0.15})`);
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.05, 0, Math.PI * 2);
      ctx.fillStyle = rimGrad; ctx.fill();

      // ── PULSE RINGS when speaking ──
      if (vol > 0.15) {
        for (let i = 0; i < 3; i++) {
          const pulseR = R * (1.1 + i * 0.15) + Math.sin(t * 3 + i * 1.2) * vol * 15;
          const pulseAlpha = (0.12 - i * 0.03) * vol;
          ctx.beginPath(); ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${comp.r},${comp.g},${comp.b},${pulseAlpha})`;
          ctx.lineWidth = 1.5 - i * 0.4;
          ctx.stroke();
        }
      }

      // ── COMPANION NAME below sphere ──
      ctx.font = `200 14px 'Helvetica Neue', sans-serif`;
      ctx.fillStyle = `rgba(${comp.r},${comp.g},${comp.b},0.5)`;
      ctx.textAlign = "center";
      ctx.letterSpacing = "0.3em";
      ctx.fillText(comp.label.toUpperCase(), cx, cy + R + 36);

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
      setVapiActive(true); setVapiConnecting(false);
      setSwitching(false); switchingRef.current = false;
      callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    });
    vapiInstance.on("call-end", () => { setVapiActive(false); if (callTimerRef.current) clearInterval(callTimerRef.current); });
    vapiInstance.on("error", () => { setVapiActive(false); setVapiConnecting(false); setSwitching(false); switchingRef.current = false; });
    vapiInstance.on("volume-level", (level: number) => { volumeRef.current = level; });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vapiInstance.on("message", (msg: any) => {
      if (msg?.type === "transcript" && msg?.transcriptType === "final") {
        const entry = { role: msg.role, text: msg.transcript, companion: activeCompanionRef.current };
        transcriptRef.current = [...transcriptRef.current, entry];
        setTranscript([...transcriptRef.current]);
        if (msg.role === "user" && !switchingRef.current) {
          const switchTo = detectSwitch(msg.transcript, activeCompanionRef.current, userGenderRef.current);
          if (switchTo && switchTo !== activeCompanionRef.current) handleFamilySwitch(switchTo);
        }
      }
    });
    try { await vapiInstance.start(assistantId); }
    catch { setVapiConnecting(false); setSwitching(false); switchingRef.current = false; }
  };

  const handleFamilySwitch = async (newCompanion: string) => {
    if (switchingRef.current) return;
    if (newCompanion === activeCompanionRef.current) return;
    switchingRef.current = true;
    const currentCompanion = activeCompanionRef.current;
    setSwitching(true);
    const currentVapi = vapiRef.current; vapiRef.current = null;
    if (currentVapi) { try { currentVapi.stop(); } catch { /* ignore */ } }
    setVapiActive(false);
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    transcriptRef.current = [...transcriptRef.current, {
      role: "system",
      text: `— ${COMPANION_INFO[currentCompanion]?.label} passed the call to ${COMPANION_INFO[newCompanion]?.label} —`,
      companion: "system"
    }];
    setTranscript([...transcriptRef.current]);
    await new Promise(r => setTimeout(r, 1500));
    switchingRef.current = false;
    await startCall(newCompanion);
  };

  const endCall = () => {
    const currentVapi = vapiRef.current; vapiRef.current = null;
    if (currentVapi) { try { currentVapi.stop(); } catch { /* ignore */ } }
    setVapiActive(false); setVapiConnecting(false);
    setSwitching(false); switchingRef.current = false;
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

      {/* Left — 3D sphere */}
      <div style={{ position: "relative", height: "100vh", overflow: "hidden", borderRight: `0.5px solid ${accentColor}10` }}>
        <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "block" }} />

        {/* Status */}
        <div style={{ position: "absolute", bottom: "120px", left: "50%", transform: "translateX(-50%)", textAlign: "center", zIndex: 10, pointerEvents: "none" }}>
          {vapiActive && (
            <div style={{ fontSize: "11px", color: `${accentColor}40`, fontFamily: "monospace", letterSpacing: "0.14em" }}>
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
          <div style={{ position: "absolute", top: "64px", right: "24px", zIndex: 20, background: "rgba(3,2,2,0.98)", border: `0.5px solid ${accentColor}20`, minWidth: "180px" }}>
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
              style={{ background: "transparent", color: `${accentColor}70`, border: `0.5px solid ${accentColor}30`, padding: "14px 52px", cursor: "pointer", fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: sans }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${accentColor}10`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              Begin
            </button>
          )}
          {(vapiActive || vapiConnecting) && !switching && (
            <button onClick={endCall} style={{ background: "transparent", border: "0.5px solid rgba(176,112,112,0.2)", color: "rgba(176,112,112,0.4)", padding: "12px 36px", cursor: "pointer", fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: sans }}>
              End
            </button>
          )}
        </div>
      </div>

      {/* Right — transcript */}
      <div style={{ display: "flex", flexDirection: "column", background: "#050404", height: "100vh", overflow: "hidden" }}>
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
