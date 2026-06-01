"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Vapi from "@vapi-ai/web";

// ── ALL COMPANION ASSISTANT IDs ──
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

const COMPANION_INFO: Record<string, {
  label: string;
  color: string;
  greeting: (name: string) => string;
  switchLine: (from: string, to: string) => string;
}> = {
  dad: {
    label: "Dad",
    color: "#C9A84C",
    greeting: (name) => `Hey ${name}. Dad's here. What's going on?`,
    switchLine: (from, to) => `Of course. Let me get ${to} for you.`,
  },
  mom: {
    label: "Mom",
    color: "#A07898",
    greeting: (name) => `Hello my love. Mom's here. How are you really doing?`,
    switchLine: (from, to) => `Of course sweetheart. Let me get ${to} for you.`,
  },
  brother: {
    label: "Brother",
    color: "#5B8C6B",
    greeting: (name) => `Hey, what's going on?`,
    switchLine: (from, to) => `Yeah sure. Passing you to ${to}.`,
  },
  sister: {
    label: "Sister",
    color: "#B07070",
    greeting: (name) => `Hey! So glad you called. What's up?`,
    switchLine: (from, to) => `Of course! Let me get ${to} for you right now.`,
  },
  mentor: {
    label: "Mentor",
    color: "#6B8CFF",
    greeting: (name) => `Good to hear from you ${name}. What's on your mind?`,
    switchLine: (from, to) => `Of course. I'll pass you to ${to}.`,
  },
  friend: {
    label: "Friend",
    color: "#5B9898",
    greeting: (name) => `Hey! What's up?`,
    switchLine: (from, to) => `Yeah no worries. Getting ${to} for you.`,
  },
  partner_male: {
    label: "Partner",
    color: "#8870A8",
    greeting: (name) => `Hey you. I'm here. What's going on?`,
    switchLine: (from, to) => `Of course. Let me get ${to}.`,
  },
  partner_female: {
    label: "Partner",
    color: "#8870A8",
    greeting: (name) => `Hey you. I'm here. What's going on?`,
    switchLine: (from, to) => `Of course. Let me get ${to}.`,
  },
};

// Detect family switch request in transcript
const SWITCH_TRIGGERS: Record<string, string[]> = {
  mom: ["talk to mom", "speak to mom", "get mom", "call mom", "i want mom", "can i talk to mom", "put mom on", "where's mom", "pass to mom"],
  dad: ["talk to dad", "speak to dad", "get dad", "call dad", "i want dad", "can i talk to dad", "put dad on"],
  brother: ["talk to my brother", "speak to my brother", "get my brother", "call my brother", "i want my brother", "brother please"],
  sister: ["talk to my sister", "speak to my sister", "get my sister", "call my sister", "i want my sister", "sister please"],
  mentor: ["talk to my mentor", "speak to my mentor", "get my mentor", "i want my mentor", "mentor please"],
  friend: ["talk to my friend", "speak to my friend", "get my friend", "i want my friend", "friend please"],
  partner_male: ["talk to my partner", "speak to my partner", "get my partner", "i want my partner"],
  partner_female: ["talk to my partner", "speak to my partner", "get my partner", "i want my partner"],
};

function detectSwitch(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [companion, triggers] of Object.entries(SWITCH_TRIGGERS)) {
    for (const trigger of triggers) {
      if (lower.includes(trigger)) return companion;
    }
  }
  return null;
}

interface Profile {
  full_name: string;
  companion_type: string;
  companion_name: string;
  companion_gender?: string;
  resume_summary?: string;
  career_path?: string;
  dream?: string;
}

export default function VoicePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [activeCompanion, setActiveCompanion] = useState<string>("dad");
  const [vapiActive, setVapiActive] = useState(false);
  const [vapiConnecting, setVapiConnecting] = useState(false);
  const [transcript, setTranscript] = useState<{ role: string; text: string; companion?: string }[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  const [switching, setSwitching] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const [showFamilyPanel, setShowFamilyPanel] = useState(false);
  const vapiRef = useRef<Vapi | null>(null);
  const transcriptRef = useRef<{ role: string; text: string; companion?: string }[]>([]);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const volumeRef = useRef(0);
  const hasSpoken = useRef(false);

  const sans = "'Helvetica Neue', Arial, sans-serif";
  const serif = "'Georgia', 'Times New Roman', serif";
  const gold = "#C9A84C";
  const bg = "#070606";
  const dark = "#030202";
  const text = "#EBE5DC";

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      setAuthToken(session?.access_token ?? null);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (data) {
          setProfile(data);
          setActiveCompanion(data.companion_type || "dad");
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  // Canvas waveform
  useEffect(() => {
    if (!vapiActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const color = COMPANION_INFO[activeCompanion]?.color || gold;

    const draw = () => {
      const W = canvas.width = canvas.offsetWidth;
      const H = canvas.height = canvas.offsetHeight;
      const cx = W / 2; const cy = H / 2;
      const vol = volumeRef.current;
      const t = Date.now() / 1000;

      ctx.fillStyle = dark;
      ctx.fillRect(0, 0, W, H);

      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.45);
      glow.addColorStop(0, `${color}${Math.round((0.08 + vol * 0.12) * 255).toString(16).padStart(2, "0")}`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      [0.20, 0.28, 0.36].forEach((r, i) => {
        const radius = Math.min(W, H) * r + vol * 28 * (i + 1);
        const alpha = 0.06 + Math.sin(t * 0.8 + i) * 0.02 + vol * 0.08;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `${color}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });

      const bars = 48;
      const baseR = Math.min(W, H) * 0.24;
      const maxH = Math.min(W, H) * 0.14;
      for (let i = 0; i < bars; i++) {
        const angle = (i / bars) * Math.PI * 2 - Math.PI / 2;
        const wave = Math.sin(t * 2 + i * 0.4) * 0.4 + Math.sin(t * 3.5 + i * 0.8) * 0.3 + vol * (0.4 + Math.sin(t * 5 + i) * 0.3);
        const barH = (0.2 + Math.max(0, wave) * 0.8) * maxH;
        const x1 = cx + Math.cos(angle) * baseR;
        const y1 = cy + Math.sin(angle) * baseR;
        const x2 = cx + Math.cos(angle) * (baseR + barH);
        const y2 = cy + Math.sin(angle) * (baseR + barH);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `${color}${Math.round(Math.min(1, 0.3 + Math.max(0, wave) * 0.5) * 255).toString(16).padStart(2, "0")}`;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.stroke();
      }

      const dotR = 5 + vol * 12 + Math.sin(t * 2) * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
      ctx.fillStyle = `${color}${Math.round(Math.min(1, 0.6 + vol * 0.4) * 255).toString(16).padStart(2, "0")}`;
      ctx.fill();

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [vapiActive, activeCompanion]);

  const startCall = async (companionKey: string) => {
    const vapiKey = process.env.NEXT_PUBLIC_VAPI_PUBLICKEY;
    if (!vapiKey || !profile) return;

    const assistantId = COMPANION_IDS[companionKey];
    if (!assistantId) return;

    const info = COMPANION_INFO[companionKey];
    const firstName = profile.full_name?.split(" ")[0] || "there";
    const firstMessage = info.greeting(firstName);

    setVapiConnecting(true);
    setActiveCompanion(companionKey);

    try {
      const vapiInstance = new Vapi(vapiKey);
      vapiRef.current = vapiInstance;

      vapiInstance.on("call-start", () => {
        setVapiActive(true);
        setVapiConnecting(false);
        setSwitching(false);
        setSwitchingTo(null);
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
      });

      vapiInstance.on("volume-level", (level: number) => {
        volumeRef.current = level;
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vapiInstance.on("message", (msg: any) => {
        if (msg?.type === "transcript" && msg?.transcriptType === "final") {
          const entry = { role: msg.role, text: msg.transcript, companion: companionKey };
          transcriptRef.current = [...transcriptRef.current, entry];
          setTranscript([...transcriptRef.current]);

          // Detect family switch request in user speech
          if (msg.role === "user") {
            const switchTo = detectSwitch(msg.transcript);
            if (switchTo && switchTo !== companionKey) {
              handleFamilySwitch(switchTo, companionKey);
            }
          }
        }
      });

      await vapiInstance.start(assistantId, { firstMessage });
    } catch {
      setVapiConnecting(false);
      setSwitching(false);
    }
  };

  const handleFamilySwitch = async (newCompanion: string, currentCompanion: string) => {
    if (switching) return;
    setSwitching(true);
    setSwitchingTo(newCompanion);

    // Stop current call
    if (vapiRef.current) {
      try { vapiRef.current.stop(); } catch { /* ignore */ }
      vapiRef.current = null;
    }
    setVapiActive(false);
    if (callTimerRef.current) clearInterval(callTimerRef.current);

    // Small pause then start new companion
    await new Promise(r => setTimeout(r, 1500));

    // Add switch notification to transcript
    const switchEntry = {
      role: "system",
      text: `— ${COMPANION_INFO[currentCompanion]?.label || currentCompanion} passed the call to ${COMPANION_INFO[newCompanion]?.label || newCompanion} —`,
      companion: "system"
    };
    transcriptRef.current = [...transcriptRef.current, switchEntry];
    setTranscript([...transcriptRef.current]);

    await startCall(newCompanion);
  };

  const endCall = () => {
    if (vapiRef.current) {
      try { vapiRef.current.stop(); } catch { /* ignore */ }
      vapiRef.current = null;
    }
    setVapiActive(false);
    setVapiConnecting(false);
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    cancelAnimationFrame(animFrameRef.current);
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const currentInfo = COMPANION_INFO[activeCompanion] || COMPANION_INFO.dad;
  const accentColor = currentInfo.color;
  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const companionName = profile?.companion_name || "DAD";

  // Available family members (exclude current active)
  const familyMembers = Object.entries(COMPANION_INFO).filter(([key]) => key !== activeCompanion);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: dark, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: "11px", letterSpacing: "0.42em", textTransform: "uppercase", color: gold, fontFamily: sans }}>DAD</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: dark, color: text, fontFamily: serif, display: "grid", gridTemplateColumns: "1fr 420px", height: "100vh", overflow: "hidden" }}>

      {/* Left — canvas + companion */}
      <div style={{ position: "relative", borderRight: `0.5px solid ${accentColor}15` }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", opacity: vapiActive ? 1 : 0.3, transition: "opacity 0.8s" }} />

        {/* Ambient background when not active */}
        {!vapiActive && (
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 50%, ${accentColor}06 0%, transparent 70%)` }} />
        )}

        {/* Centre overlay */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", zIndex: 10, pointerEvents: "none" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.28em", textTransform: "uppercase", color: `${accentColor}60`, marginBottom: "16px", fontFamily: sans }}>
            {currentInfo.label}
          </div>
          <div style={{ fontSize: "clamp(48px, 7vw, 80px)", fontWeight: "200", color: accentColor, letterSpacing: "-0.03em", lineHeight: "1", marginBottom: "12px", textShadow: `0 0 60px ${accentColor}30` }}>
            {companionName}
          </div>
          <div style={{ fontSize: "11px", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(235,229,220,0.25)", fontFamily: sans, marginBottom: "28px" }}>
            {switching ? `Passing to ${COMPANION_INFO[switchingTo || ""]?.label || ""}...` : vapiConnecting ? "Connecting..." : vapiActive ? "Listening" : "Ready"}
          </div>
          {vapiActive && (
            <div style={{ fontSize: "13px", color: "rgba(235,229,220,0.2)", fontFamily: "monospace", letterSpacing: "0.12em" }}>
              {formatDuration(callDuration)}
            </div>
          )}
        </div>

        {/* Bottom controls */}
        <div style={{ position: "absolute", bottom: "40px", left: "50%", transform: "translateX(-50%)", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          {!vapiActive && !vapiConnecting && (
            <button
              onClick={() => startCall(activeCompanion)}
              style={{ background: accentColor, color: dark, border: "none", padding: "16px 48px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: sans }}
            >
              Begin →
            </button>
          )}
          {(vapiActive || vapiConnecting) && (
            <button
              onClick={endCall}
              style={{ background: "rgba(176,112,112,0.15)", border: "0.5px solid rgba(176,112,112,0.3)", color: "#B07070", padding: "14px 36px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: sans }}
            >
              End call
            </button>
          )}
        </div>

        {/* Nav */}
        <div style={{ position: "absolute", top: "20px", left: "20px", right: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }}>
          <Link href="/dashboard" style={{ fontSize: "11px", letterSpacing: "0.42em", textTransform: "uppercase", color: gold, fontFamily: sans, textDecoration: "none" }}>DAD</Link>
          <button
            onClick={() => setShowFamilyPanel(!showFamilyPanel)}
            style={{ background: "rgba(235,229,220,0.05)", border: "0.5px solid rgba(235,229,220,0.1)", color: "rgba(235,229,220,0.4)", padding: "8px 20px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: sans }}
          >
            Family
          </button>
        </div>

        {/* Family panel */}
        {showFamilyPanel && (
          <div style={{ position: "absolute", top: "60px", right: "20px", zIndex: 20, background: "rgba(7,6,6,0.97)", border: `0.5px solid ${accentColor}20`, minWidth: "220px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(235,229,220,0.3)", padding: "14px 20px", borderBottom: "0.5px solid rgba(235,229,220,0.06)", fontFamily: sans }}>
              Switch companion
            </div>
            {familyMembers.map(([key, info]) => (
              <div
                key={key}
                onClick={() => {
                  setShowFamilyPanel(false);
                  if (vapiActive) {
                    handleFamilySwitch(key, activeCompanion);
                  } else {
                    setActiveCompanion(key);
                  }
                }}
                style={{ padding: "14px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", borderBottom: "0.5px solid rgba(235,229,220,0.04)", transition: "background 0.2s" }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(235,229,220,0.03)"}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
              >
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: info.color, flexShrink: 0 }} />
                <div style={{ fontSize: "13px", fontWeight: "300", color: text }}>{info.label}</div>
                {vapiActive && <div style={{ fontSize: "10px", color: "rgba(235,229,220,0.25)", fontFamily: sans, marginLeft: "auto" }}>Switch →</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right — transcript + info */}
      <div style={{ display: "flex", flexDirection: "column", background: bg, overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "20px 28px", borderBottom: `0.5px solid ${accentColor}12`, flexShrink: 0 }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: `${accentColor}50`, marginBottom: "4px", fontFamily: sans }}>
            {vapiActive ? "Live conversation" : "Your family"}
          </div>
          <div style={{ fontSize: "14px", fontWeight: "300", color: text }}>
            {vapiActive ? `${firstName} & ${currentInfo.label}` : `${firstName}'s support network`}
          </div>
        </div>

        {/* Family members list when not in call */}
        {!vapiActive && !vapiConnecting && (
          <div style={{ padding: "20px 28px", borderBottom: `0.5px solid ${accentColor}08`, flexShrink: 0 }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(235,229,220,0.2)", marginBottom: "16px", fontFamily: sans }}>
              Who do you want to talk to?
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {Object.entries(COMPANION_INFO).map(([key, info]) => (
                <div
                  key={key}
                  onClick={() => { setActiveCompanion(key); }}
                  style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", borderLeft: activeCompanion === key ? `2px solid ${info.color}` : "2px solid transparent", background: activeCompanion === key ? `${info.color}08` : "transparent", transition: "all 0.2s" }}
                >
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: info.color, flexShrink: 0 }} />
                  <div style={{ fontSize: "13px", fontWeight: "300", color: activeCompanion === key ? info.color : "rgba(235,229,220,0.45)" }}>{info.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Switching indicator */}
        {switching && (
          <div style={{ padding: "20px 28px", background: `${COMPANION_INFO[switchingTo || ""]?.color || gold}08`, borderBottom: `0.5px solid ${COMPANION_INFO[switchingTo || ""]?.color || gold}20`, flexShrink: 0 }}>
            <div style={{ fontSize: "12px", color: COMPANION_INFO[switchingTo || ""]?.color || gold, fontFamily: sans }}>
              Connecting to {COMPANION_INFO[switchingTo || ""]?.label}...
            </div>
          </div>
        )}

        {/* Transcript */}
        <div style={{ flex: 1, overflow: "auto", padding: "20px 28px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {transcript.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingTop: "20px" }}>
              <p style={{ fontSize: "13px", color: "rgba(235,229,220,0.2)", fontFamily: sans, fontStyle: "italic", lineHeight: "1.7" }}>
                The conversation appears here as you talk.
              </p>
              <p style={{ fontSize: "12px", color: "rgba(235,229,220,0.12)", fontFamily: sans, lineHeight: "1.7" }}>
                You can say "Can I talk to Mom?" or "Get my sister" at any time to switch companions mid-call.
              </p>
            </div>
          ) : (
            transcript.map((t, i) => {
              if (t.role === "system") {
                return (
                  <div key={i} style={{ textAlign: "center", padding: "8px 0" }}>
                    <span style={{ fontSize: "10px", color: "rgba(235,229,220,0.2)", fontFamily: sans, letterSpacing: "0.1em" }}>{t.text}</span>
                  </div>
                );
              }
              const companionInfo = t.companion ? COMPANION_INFO[t.companion] : currentInfo;
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: t.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: t.role === "assistant" ? `${companionInfo?.color || accentColor}70` : "rgba(235,229,220,0.2)", fontFamily: sans }}>
                    {t.role === "assistant" ? (companionInfo?.label || currentInfo.label) : firstName}
                  </div>
                  <div style={{ fontSize: "13px", color: t.role === "assistant" ? "rgba(235,229,220,0.7)" : "rgba(235,229,220,0.5)", fontFamily: sans, lineHeight: "1.65", maxWidth: "90%", padding: "10px 14px", background: t.role === "assistant" ? `${companionInfo?.color || accentColor}08` : "rgba(235,229,220,0.03)", border: `0.5px solid ${t.role === "assistant" ? `${companionInfo?.color || accentColor}15` : "rgba(235,229,220,0.05)"}` }}>
                    {t.text}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div style={{ padding: "16px 28px", borderTop: `0.5px solid ${accentColor}08`, flexShrink: 0 }}>
          <p style={{ fontSize: "11px", color: "rgba(235,229,220,0.15)", fontFamily: sans, lineHeight: "1.6", margin: 0 }}>
            Say <span style={{ color: `${accentColor}40` }}>"Can I talk to Mom?"</span> or <span style={{ color: `${accentColor}40` }}>"Get my sister"</span> to switch mid-call.
          </p>
        </div>
      </div>
    </div>
  );
}
