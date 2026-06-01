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

const COMPANION_INFO: Record<string, {
  label: string;
  color: string;
  greeting: (name: string) => string;
}> = {
  dad: { label: "Dad", color: "#C9A84C", greeting: (n) => `Hey ${n}. Dad's here. What's going on?` },
  mom: { label: "Mom", color: "#A07898", greeting: (n) => `Hello my love. Mom's here. How are you really doing?` },
  brother: { label: "Brother", color: "#5B8C6B", greeting: (n) => `Hey, what's going on?` },
  sister: { label: "Sister", color: "#B07070", greeting: (n) => `Hey! So glad you called. What's up?` },
  mentor: { label: "Mentor", color: "#6B8CFF", greeting: (n) => `Good to hear from you ${n}. What's on your mind?` },
  friend: { label: "Friend", color: "#5B9898", greeting: (n) => `Hey! What's up?` },
  partner_male: { label: "Partner", color: "#8870A8", greeting: (n) => `Hey you. I'm here. What's going on?` },
  partner_female: { label: "Partner", color: "#8870A8", greeting: (n) => `Hey you. I'm here. What's going on?` },
};

const SWITCH_TRIGGERS: Record<string, string[]> = {
  mom: ["talk to mom", "speak to mom", "get mom", "call mom", "i want mom", "can i talk to mom", "put mom on", "where's mom", "pass to mom", "get me mom"],
  dad: ["talk to dad", "speak to dad", "get dad", "call dad", "i want dad", "can i talk to dad", "put dad on"],
  brother: ["talk to my brother", "speak to my brother", "get my brother", "call my brother", "i want my brother", "brother please", "get brother"],
  sister: ["talk to my sister", "speak to my sister", "get my sister", "call my sister", "i want my sister", "sister please", "get sister"],
  mentor: ["talk to my mentor", "speak to my mentor", "get my mentor", "i want my mentor", "mentor please"],
  friend: ["talk to my friend", "speak to my friend", "get my friend", "i want my friend", "friend please"],
  partner_male: ["talk to my partner", "speak to my partner", "get my partner", "i want my partner", "get my boyfriend", "get my husband"],
  partner_female: ["talk to my girlfriend", "speak to my girlfriend", "get my girlfriend", "i want my girlfriend", "get my wife"],
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

export default function VoicePage() {
  const [profile, setProfile] = useState<{ full_name: string; companion_type: string; companion_name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCompanion, setActiveCompanion] = useState<string>("dad");
  const [vapiActive, setVapiActive] = useState(false);
  const [vapiConnecting, setVapiConnecting] = useState(false);
  const [transcript, setTranscript] = useState<{ role: string; text: string; companion: string }[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  const [switching, setSwitching] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const [showFamily, setShowFamily] = useState(false);
  const vapiRef = useRef<Vapi | null>(null);
  const transcriptRef = useRef<{ role: string; text: string; companion: string }[]>([]);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const volumeRef = useRef(0);
  const activeCompanionRef = useRef<string>("dad");

  const sans = "'Helvetica Neue', Arial, sans-serif";
  const serif = "'Georgia', 'Times New Roman', serif";
  const gold = "#C9A84C";
  const bg = "#070606";
  const dark = "#030202";
  const text = "#EBE5DC";

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("full_name, companion_type, companion_name").eq("id", user.id).single();
        if (data) {
          setProfile(data);
          setActiveCompanion(data.companion_type || "dad");
          activeCompanionRef.current = data.companion_type || "dad";
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!vapiActive) { cancelAnimationFrame(animFrameRef.current); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const draw = () => {
      const color = COMPANION_INFO[activeCompanionRef.current]?.color || gold;
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
  }, [vapiActive]);

  const startCall = async (companionKey: string) => {
    const vapiKey = process.env.NEXT_PUBLIC_VAPI_PUBLICKEY;
    if (!vapiKey) return;

    const assistantId = COMPANION_IDS[companionKey];
    if (!assistantId) return;

    const firstName = profile?.full_name?.split(" ")[0] || "there";
    const firstMessage = COMPANION_INFO[companionKey].greeting(firstName);

    setActiveCompanion(companionKey);
    activeCompanionRef.current = companionKey;
    setVapiConnecting(true);

    // Always create fresh Vapi instance — this ensures new voice loads
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
        const entry = { role: msg.role, text: msg.transcript, companion: activeCompanionRef.current };
        transcriptRef.current = [...transcriptRef.current, entry];
        setTranscript([...transcriptRef.current]);

        if (msg.role === "user") {
          const switchTo = detectSwitch(msg.transcript);
          if (switchTo && switchTo !== activeCompanionRef.current) {
            handleFamilySwitch(switchTo);
          }
        }
      }
    });

    try {
      // Pass ONLY assistantId and firstMessage — let Vapi use the voice set in dashboard
      await vapiInstance.start(assistantId, { firstMessage });
    } catch {
      setVapiConnecting(false);
      setSwitching(false);
    }
  };

  const handleFamilySwitch = async (newCompanion: string) => {
    if (switching) return;
    const currentCompanion = activeCompanionRef.current;
    setSwitching(true);
    setSwitchingTo(newCompanion);

    // Stop current call completely
    if (vapiRef.current) {
      try { vapiRef.current.stop(); } catch { /* ignore */ }
      vapiRef.current = null;
    }
    setVapiActive(false);
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    cancelAnimationFrame(animFrameRef.current);

    // Add handoff line to transcript
    const handoffEntry = {
      role: "system",
      text: `— ${COMPANION_INFO[currentCompanion]?.label} passed the call to ${COMPANION_INFO[newCompanion]?.label} —`,
      companion: "system"
    };
    transcriptRef.current = [...transcriptRef.current, handoffEntry];
    setTranscript([...transcriptRef.current]);

    // Wait 2 seconds then start new companion with fresh Vapi instance
    await new Promise(r => setTimeout(r, 2000));
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

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: dark, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: "11px", letterSpacing: "0.42em", textTransform: "uppercase", color: gold, fontFamily: sans }}>DAD</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: dark, color: text, fontFamily: serif, display: "grid", gridTemplateColumns: "1fr 420px", height: "100vh", overflow: "hidden" }}>

      {/* Left — waveform */}
      <div style={{ position: "relative", borderRight: `0.5px solid ${accentColor}15`, transition: "border-color 0.8s" }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />

        {!vapiActive && (
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 50%, ${accentColor}06 0%, transparent 70%)`, transition: "background 0.8s" }} />
        )}

        {/* Centre */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", zIndex: 10, pointerEvents: "none" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.28em", textTransform: "uppercase", color: `${accentColor}60`, marginBottom: "16px", fontFamily: sans, transition: "color 0.8s" }}>
            {currentInfo.label}
          </div>
          <div style={{ fontSize: "clamp(48px, 7vw, 80px)", fontWeight: "200", color: accentColor, letterSpacing: "-0.03em", lineHeight: "1", marginBottom: "12px", textShadow: `0 0 60px ${accentColor}30`, transition: "color 0.8s, text-shadow 0.8s" }}>
            {companionName}
          </div>
          <div style={{ fontSize: "11px", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(235,229,220,0.25)", fontFamily: sans, marginBottom: "28px" }}>
            {switching ? `Connecting to ${COMPANION_INFO[switchingTo || ""]?.label || ""}...` : vapiConnecting ? "Connecting..." : vapiActive ? "Listening" : "Ready"}
          </div>
          {vapiActive && (
            <div style={{ fontSize: "13px", color: "rgba(235,229,220,0.2)", fontFamily: "monospace", letterSpacing: "0.12em" }}>
              {formatDuration(callDuration)}
            </div>
          )}
        </div>

        {/* Nav */}
        <div style={{ position: "absolute", top: "20px", left: "20px", right: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }}>
          <Link href="/dashboard" style={{ fontSize: "11px", letterSpacing: "0.42em", textTransform: "uppercase", color: gold, fontFamily: sans, textDecoration: "none" }}>DAD</Link>
          <button onClick={() => setShowFamily(!showFamily)} style={{ background: "rgba(235,229,220,0.04)", border: "0.5px solid rgba(235,229,220,0.08)", color: "rgba(235,229,220,0.35)", padding: "8px 20px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: sans }}>
            Family
          </button>
        </div>

        {/* Family dropdown */}
        {showFamily && (
          <div style={{ position: "absolute", top: "60px", right: "20px", zIndex: 20, background: "rgba(4,3,3,0.98)", border: `0.5px solid ${accentColor}20`, minWidth: "200px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(235,229,220,0.25)", padding: "12px 18px", borderBottom: "0.5px solid rgba(235,229,220,0.05)", fontFamily: sans }}>
              {vapiActive ? "Switch to" : "Talk to"}
            </div>
            {Object.entries(COMPANION_INFO).map(([key, info]) => (
              <div key={key}
                onClick={() => {
                  setShowFamily(false);
                  if (vapiActive && key !== activeCompanion) {
                    handleFamilySwitch(key);
                  } else if (!vapiActive) {
                    setActiveCompanion(key);
                    activeCompanionRef.current = key;
                  }
                }}
                style={{ padding: "12px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", background: activeCompanion === key ? `${info.color}10` : "transparent", borderLeft: activeCompanion === key ? `2px solid ${info.color}` : "2px solid transparent", transition: "all 0.2s" }}
                onMouseEnter={e => { if (activeCompanion !== key) (e.currentTarget as HTMLDivElement).style.background = "rgba(235,229,220,0.03)"; }}
                onMouseLeave={e => { if (activeCompanion !== key) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
              >
                <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: info.color, flexShrink: 0 }} />
                <div style={{ fontSize: "13px", fontWeight: "300", color: activeCompanion === key ? info.color : "rgba(235,229,220,0.5)" }}>{info.label}</div>
                {activeCompanion === key && <div style={{ fontSize: "9px", color: `${info.color}60`, fontFamily: sans, marginLeft: "auto", letterSpacing: "0.1em", textTransform: "uppercase" }}>Active</div>}
              </div>
            ))}
          </div>
        )}

        {/* Bottom controls */}
        <div style={{ position: "absolute", bottom: "40px", left: "50%", transform: "translateX(-50%)", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          {!vapiActive && !vapiConnecting && !switching && (
            <button onClick={() => startCall(activeCompanion)} style={{ background: accentColor, color: dark, border: "none", padding: "16px 52px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: sans, transition: "background 0.8s" }}>
              Begin →
            </button>
          )}
          {(vapiActive || vapiConnecting) && !switching && (
            <button onClick={endCall} style={{ background: "rgba(176,112,112,0.12)", border: "0.5px solid rgba(176,112,112,0.25)", color: "#B07070", padding: "14px 40px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: sans }}>
              End call
            </button>
          )}
          {switching && (
            <div style={{ fontSize: "11px", color: `${COMPANION_INFO[switchingTo || ""]?.color || gold}70`, fontFamily: sans, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Connecting to {COMPANION_INFO[switchingTo || ""]?.label}...
            </div>
          )}
        </div>
      </div>

      {/* Right — transcript */}
      <div style={{ display: "flex", flexDirection: "column", background: bg, overflow: "hidden" }}>
        <div style={{ padding: "20px 28px", borderBottom: `0.5px solid ${accentColor}10`, flexShrink: 0 }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: `${accentColor}50`, marginBottom: "4px", fontFamily: sans }}>
            {vapiActive ? "Live" : "Conversation"}
          </div>
          <div style={{ fontSize: "14px", fontWeight: "300", color: text }}>{firstName} & {currentInfo.label}</div>
        </div>

        {/* Who to talk to when not in call */}
        {!vapiActive && !vapiConnecting && (
          <div style={{ padding: "16px 28px", borderBottom: `0.5px solid rgba(235,229,220,0.04)`, flexShrink: 0 }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(235,229,220,0.18)", marginBottom: "12px", fontFamily: sans }}>Who do you want to talk to?</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {Object.entries(COMPANION_INFO).map(([key, info]) => (
                <button key={key}
                  onClick={() => { setActiveCompanion(key); activeCompanionRef.current = key; }}
                  style={{ background: activeCompanion === key ? `${info.color}15` : "transparent", border: `0.5px solid ${activeCompanion === key ? info.color : "rgba(235,229,220,0.08)"}`, color: activeCompanion === key ? info.color : "rgba(235,229,220,0.35)", padding: "6px 14px", cursor: "pointer", fontSize: "11px", fontFamily: sans, transition: "all 0.2s" }}>
                  {info.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflow: "auto", padding: "20px 28px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {transcript.length === 0 ? (
            <div>
              <p style={{ fontSize: "13px", color: "rgba(235,229,220,0.18)", fontFamily: sans, fontStyle: "italic", lineHeight: "1.7", marginBottom: "12px" }}>
                The conversation appears here as you talk.
              </p>
              <p style={{ fontSize: "12px", color: "rgba(235,229,220,0.1)", fontFamily: sans, lineHeight: "1.7" }}>
                Say "Can I talk to Mom?" or "Get my sister" at any time to switch mid-call.
              </p>
            </div>
          ) : (
            transcript.map((t, i) => {
              if (t.role === "system") {
                return (
                  <div key={i} style={{ textAlign: "center", padding: "6px 0" }}>
                    <span style={{ fontSize: "10px", color: "rgba(235,229,220,0.18)", fontFamily: sans, letterSpacing: "0.08em" }}>{t.text}</span>
                  </div>
                );
              }
              const companionInfo = COMPANION_INFO[t.companion] || currentInfo;
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: t.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: t.role === "assistant" ? `${companionInfo.color}70` : "rgba(235,229,220,0.2)", fontFamily: sans }}>
                    {t.role === "assistant" ? companionInfo.label : firstName}
                  </div>
                  <div style={{ fontSize: "13px", color: t.role === "assistant" ? "rgba(235,229,220,0.7)" : "rgba(235,229,220,0.5)", fontFamily: sans, lineHeight: "1.65", maxWidth: "90%", padding: "10px 14px", background: t.role === "assistant" ? `${companionInfo.color}08` : "rgba(235,229,220,0.03)", border: `0.5px solid ${t.role === "assistant" ? `${companionInfo.color}15` : "rgba(235,229,220,0.05)"}` }}>
                    {t.text}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ padding: "14px 28px", borderTop: `0.5px solid rgba(235,229,220,0.04)`, flexShrink: 0 }}>
          <p style={{ fontSize: "11px", color: "rgba(235,229,220,0.12)", fontFamily: sans, lineHeight: "1.6", margin: 0 }}>
            Say <span style={{ color: `${accentColor}35` }}>"Can I talk to Mom?"</span> or <span style={{ color: `${accentColor}35` }}>"Get my sister"</span> to switch mid-call.
          </p>
        </div>
      </div>
    </div>
  );
}
