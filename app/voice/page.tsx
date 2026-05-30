"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Vapi from "@vapi-ai/web";

interface Profile {
  full_name: string;
  situation: string;
  country: string;
  companion_type: string;
  companion_name: string;
  resume_summary?: string;
  resume_ats_score?: number;
  resume_skills?: string[];
  career_path?: string;
  career_roles?: string[];
}

type Emotion = "idle" | "talking" | "happy" | "excited" | "sad" | "empathetic" | "proud" | "thinking";

const COMPANION_GREETINGS: Record<string, string[]> = {
  dad:     ["Hey. You okay?", "Hey kid. What's going on?", "Hey. Talk to me."],
  mom:     ["Oh sweetheart, hi. How are you?", "Hey love. What's on your mind?", "Hi. Are you okay?"],
  brother: ["Yo. What's up?", "Hey. Talk to me, what's going on?", "Alright. What happened?"],
  sister:  ["Hey. You okay?", "Hi. What's going on with you?", "Hey, talk to me."],
  teacher: ["Hello. How are you getting on?", "Good to hear from you. How are things?", "Hi. What's on your mind?"],
  mentor:  ["Hey. What's going on?", "Hi. How are things progressing?", "Good timing. What do you need?"],
  friend:  ["Hey. What's going on?", "Oh hi. How are you?", "Hey. What's up?"],
  partner: ["Hey you. How are you?", "Hi. You okay?", "Hey. What's on your mind?"],
  self:    ["Hey. Take a breath. How are you?", "Hi. What's going on?", "Hey. I'm here. Talk to me."],
};

const COMPANION_COLORS: Record<string, string> = {
  dad: "#C9A84C",
  mom: "#A07898",
  mentor: "#6B8CFF",
  brother: "#5B8C6B",
  sister: "#B07070",
  friend: "#5B9898",
  partner: "#8870A8",
  self: "#888888",
  teacher: "#7A9CAA",
};

const COMPANION_LABELS: Record<string, string> = {
  dad: "Father", mom: "Mother", brother: "Brother", sister: "Sister",
  teacher: "Teacher", mentor: "Mentor", friend: "Friend", partner: "Partner", self: "Yourself",
};

const EMOTION_STATES: Record<Emotion, { label: string; textColor: string; glowOpacity: number }> = {
  idle:       { label: "Listening",          textColor: "rgba(235,229,220,0.25)", glowOpacity: 0.06 },
  talking:    { label: "Speaking",           textColor: "rgba(235,229,220,0.55)", glowOpacity: 0.12 },
  happy:      { label: "Happy for you",      textColor: "rgba(255,215,0,0.7)",    glowOpacity: 0.18 },
  excited:    { label: "Excited",            textColor: "rgba(255,140,60,0.7)",   glowOpacity: 0.22 },
  sad:        { label: "Feeling your pain",  textColor: "rgba(107,140,255,0.6)",  glowOpacity: 0.14 },
  empathetic: { label: "I hear you",         textColor: "rgba(192,132,252,0.6)",  glowOpacity: 0.14 },
  proud:      { label: "So proud of you",    textColor: "rgba(91,158,122,0.7)",   glowOpacity: 0.18 },
  thinking:   { label: "Thinking",           textColor: "rgba(235,229,220,0.35)", glowOpacity: 0.08 },
};

const VAPI_ASSISTANT_ID = "1312a1bf-ea33-48f7-aa21-1f16e414e885";

export default function VoicePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [emotion, setEmotion] = useState<Emotion>("idle");
  const [transcript, setTranscript] = useState("");
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [contextReady, setContextReady] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vapiRef = useRef<Vapi | null>(null);
  const emotionRef = useRef<Emotion>("idle");
  const frameRef = useRef<number>(0);
  const tRef = useRef(0);
  const analyzeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasSpoken = useRef(false);
  const volumeRef = useRef(0);

  const sans = "'Helvetica Neue', Arial, sans-serif";

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) { setProfile(data); setContextReady(true); }
    };
    loadProfile();
  }, []);

  // Voice on load — once per session
  useEffect(() => {
    if (hasSpoken.current || sessionStorage.getItem("dad_voice_voiced")) return;
    hasSpoken.current = true;
    sessionStorage.setItem("dad_voice_voiced", "1");

    const speak = () => {
      if (!window.speechSynthesis) return;
      const utter = new SpeechSynthesisUtterance(
        "I'm here. Take your time. Whatever is on your mind — this is the place to say it."
      );
      utter.rate = 0.78;
      utter.pitch = 0.86;
      utter.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find(v => v.name.includes("Daniel")) ||
        voices.find(v => v.name.includes("Arthur")) ||
        voices.find(v => v.lang === "en-GB") ||
        voices.find(v => v.lang.startsWith("en")) ||
        voices[0];
      if (preferred) utter.voice = preferred;
      window.speechSynthesis.speak(utter);
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      setTimeout(speak, 900);
    } else {
      window.speechSynthesis.onvoiceschanged = () => setTimeout(speak, 900);
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) interval = setInterval(() => setDuration(d => d + 1), 1000);
    else setDuration(0);
    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => { emotionRef.current = emotion; }, [emotion]);
  useEffect(() => { volumeRef.current = volumeLevel; }, [volumeLevel]);

  // Canvas — cinematic waveform + glow, no cartoon
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;
      const t = tRef.current++;
      const emo = emotionRef.current;
      const vol = volumeRef.current;
      const companionType = profile?.companion_type || "dad";
      const companionColor = COMPANION_COLORS[companionType] || "#C9A84C";

      // Background — pure black
      ctx.fillStyle = "#030202";
      ctx.fillRect(0, 0, W, H);

      // Emotion-driven glow radius
      const glowOpacity = EMOTION_STATES[emo].glowOpacity;
      const glowPulse = 1 + Math.sin(t * 0.025) * 0.15;
      const glowRadius = (Math.min(W, H) * 0.38 + vol * 80) * glowPulse;

      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
      glow.addColorStop(0, `${companionColor}${Math.round(glowOpacity * 255).toString(16).padStart(2, "0")}`);
      glow.addColorStop(0.4, `${companionColor}${Math.round(glowOpacity * 0.4 * 255).toString(16).padStart(2, "0")}`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      // Outer ring — breathes
      const ringR = Math.min(W, H) * 0.28 + vol * 40;
      const ringAlpha = 0.08 + Math.sin(t * 0.02) * 0.03 + vol * 0.15;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `${companionColor}${Math.round(ringAlpha * 255).toString(16).padStart(2, "0")}`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Inner ring
      const innerR = Math.min(W, H) * 0.18 + vol * 25;
      const innerAlpha = 0.12 + Math.sin(t * 0.03 + 1) * 0.04 + vol * 0.2;
      ctx.beginPath();
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
      ctx.strokeStyle = `${companionColor}${Math.round(innerAlpha * 255).toString(16).padStart(2, "0")}`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Waveform bars — only when active/talking
      if (isActive || vol > 0) {
        const bars = 48;
        const barMaxH = Math.min(W, H) * 0.14;
        const baseRadius = Math.min(W, H) * 0.22;

        for (let i = 0; i < bars; i++) {
          const angle = (i / bars) * Math.PI * 2 - Math.PI / 2;
          const wave = Math.sin(t * 0.04 + i * 0.4) * 0.5 +
            Math.sin(t * 0.07 + i * 0.8) * 0.3 +
            vol * (0.5 + Math.sin(t * 0.1 + i * 0.6) * 0.5);
          const barH = (0.15 + Math.max(0, wave) * 0.85) * barMaxH;

          const x1 = cx + Math.cos(angle) * baseRadius;
          const y1 = cy + Math.sin(angle) * baseRadius;
          const x2 = cx + Math.cos(angle) * (baseRadius + barH);
          const y2 = cy + Math.sin(angle) * (baseRadius + barH);

          const barAlpha = 0.3 + wave * 0.5;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = `${companionColor}${Math.round(Math.max(0, Math.min(1, barAlpha)) * 255).toString(16).padStart(2, "0")}`;
          ctx.lineWidth = 1.5;
          ctx.lineCap = "round";
          ctx.stroke();
        }
      }

      // Center dot — pulses with voice
      const dotR = 3 + vol * 8 + Math.sin(t * 0.03) * 1.5;
      const dotAlpha = 0.4 + vol * 0.5 + Math.sin(t * 0.025) * 0.1;
      ctx.beginPath();
      ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
      ctx.fillStyle = `${companionColor}${Math.round(Math.min(1, dotAlpha) * 255).toString(16).padStart(2, "0")}`;
      ctx.fill();

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
    };
  }, [profile, isActive]);

  const analyzeEmotion = useCallback(async (text: string) => {
    if (!text || text.length < 8) return;
    try {
      const res = await fetch("/api/analyze-emotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return;
      const { emotion: detected } = await res.json();
      if (detected && detected !== emotionRef.current) {
        emotionRef.current = detected as Emotion;
        setEmotion(detected as Emotion);
      }
    } catch { /* silent */ }
  }, []);

  const startCall = async () => {
    const vapiKey = process.env.NEXT_PUBLIC_VAPI_PUBLICKEY;
    if (!vapiKey || connecting) return;

    const type = profile?.companion_type || "dad";
    const greetings = COMPANION_GREETINGS[type] || COMPANION_GREETINGS.dad;
    const firstMessage = greetings[Math.floor(Math.random() * greetings.length)];

    setConnecting(true);
    setStatus("Connecting...");

    try {
      const vapiInstance = new Vapi(vapiKey);
      vapiRef.current = vapiInstance;

      vapiInstance.on("call-start", () => {
        setIsActive(true); setConnecting(false); setStatus("");
        setEmotion("talking"); emotionRef.current = "talking";
      });

      vapiInstance.on("call-end", () => {
        setIsActive(false); setConnecting(false); setStatus("");
        setEmotion("idle"); emotionRef.current = "idle";
        setVolumeLevel(0); volumeRef.current = 0;
        vapiRef.current = null;
      });

      vapiInstance.on("error", () => {
        setIsActive(false); setConnecting(false);
        setStatus("Connection failed. Try again.");
        vapiRef.current = null;
      });

      vapiInstance.on("volume-level", (level: number) => {
        setVolumeLevel(level);
        volumeRef.current = level;
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vapiInstance.on("message", (msg: any) => {
        if (msg?.type === "transcript" && msg?.role === "assistant" && msg?.transcriptType === "final") {
          const text = msg.transcript;
          setTranscript(text);
          if (analyzeTimeoutRef.current) clearTimeout(analyzeTimeoutRef.current);
          analyzeTimeoutRef.current = setTimeout(() => analyzeEmotion(text), 400);
        }
        if (msg?.type === "speech-start" && msg?.role === "assistant") {
          if (emotionRef.current === "idle" || emotionRef.current === "thinking") {
            setEmotion("talking"); emotionRef.current = "talking";
          }
        }
        if (msg?.type === "speech-end" && msg?.role === "assistant") {
          setTimeout(() => {
            if (emotionRef.current === "talking") {
              setEmotion("thinking"); emotionRef.current = "thinking";
            }
          }, 500);
        }
      });

      await vapiInstance.start(VAPI_ASSISTANT_ID, { firstMessage });

    } catch {
      setConnecting(false);
      setStatus("Failed to connect. Please try again.");
    }
  };

  const endCall = () => {
    if (vapiRef.current) { try { vapiRef.current.stop(); } catch { /* ignore */ } vapiRef.current = null; }
    setIsActive(false); setConnecting(false); setStatus("");
    setEmotion("idle"); emotionRef.current = "idle";
    setVolumeLevel(0); volumeRef.current = 0;
  };

  const toggleMute = () => {
    if (vapiRef.current) {
      try { vapiRef.current.setMuted(!muted); setMuted(!muted); } catch { /* ignore */ }
    }
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const companionType = profile?.companion_type || "dad";
  const companionName = profile?.companion_name || "DAD";
  const companionColor = COMPANION_COLORS[companionType] || "#C9A84C";
  const companionLabel = COMPANION_LABELS[companionType] || "Companion";
  const hasContext = profile?.resume_summary || profile?.career_path;
  const emotionState = EMOTION_STATES[emotion];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#030202",
      overflow: "hidden", display: "flex", flexDirection: "column",
    }}>
      {/* Canvas — full screen cinematic background */}
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

      {/* Nav */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 20,
        padding: "22px 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link href="/dashboard" style={{
          fontSize: "10px", color: "rgba(235,229,220,0.25)", textDecoration: "none",
          letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: sans,
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          ← Back
        </Link>

        {isActive && (
          <div style={{
            fontSize: "12px", color: "rgba(235,229,220,0.3)",
            fontFamily: "monospace", letterSpacing: "0.15em",
          }}>
            {formatDuration(duration)}
          </div>
        )}
      </div>

      {/* Center — companion identity */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 20, textAlign: "center",
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: "0",
      }}>
        {/* Companion label */}
        <div style={{
          fontSize: "10px", letterSpacing: "0.3em", textTransform: "uppercase",
          color: `${companionColor}60`, fontFamily: sans, marginBottom: "12px",
        }}>
          {companionLabel}
        </div>

        {/* Companion name — large, typographic, the visual centrepiece */}
        <div style={{
          fontSize: "clamp(52px, 9vw, 110px)",
          fontWeight: "200",
          letterSpacing: "-0.03em",
          color: companionColor,
          lineHeight: "1",
          fontFamily: "'Georgia', serif",
          transition: "color 1s ease",
          marginBottom: "20px",
          textShadow: `0 0 60px ${companionColor}40`,
        }}>
          {companionName}
        </div>

        {/* Emotion state */}
        <div style={{
          fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase",
          color: emotionState.textColor, fontFamily: sans,
          transition: "color 0.8s ease",
          marginBottom: "12px",
        }}>
          {isActive ? emotionState.label : connecting ? "Connecting..." : "Tap to begin"}
        </div>

        {/* Transcript */}
        {isActive && transcript && (
          <div style={{
            fontSize: "14px", color: "rgba(235,229,220,0.4)",
            fontStyle: "italic", maxWidth: "340px", lineHeight: "1.7",
            fontFamily: "'Georgia', serif", marginTop: "8px",
            textAlign: "center",
          }}>
            "{transcript.slice(0, 90)}{transcript.length > 90 ? "..." : ""}"
          </div>
        )}

        {status && (
          <div style={{ fontSize: "11px", color: "rgba(176,112,112,0.7)", fontFamily: sans, marginTop: "8px" }}>
            {status}
          </div>
        )}
      </div>

      {/* Context badge */}
      {hasContext && !isActive && (
        <div style={{
          position: "absolute", top: "calc(50% + 120px)", left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase",
          color: `${companionColor}50`, fontFamily: sans,
        }}>
          ✓ Knows your CV & career path
        </div>
      )}

      {/* Controls */}
      <div style={{
        position: "absolute", bottom: "52px", left: "50%",
        transform: "translateX(-50%)",
        zIndex: 20, display: "flex", gap: "20px", alignItems: "center",
      }}>
        {!isActive ? (
          /* Call button */
          <button
            onClick={startCall}
            disabled={connecting || !contextReady}
            style={{
              width: "64px", height: "64px", borderRadius: "50%",
              border: `0.5px solid ${companionColor}60`,
              background: `${companionColor}18`,
              cursor: connecting || !contextReady ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: connecting || !contextReady ? 0.4 : 1,
              transition: "all 0.3s ease",
              boxShadow: `0 0 32px ${companionColor}30`,
            }}
          >
            {/* Phone icon — pure SVG, no library */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={companionColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
            </svg>
          </button>
        ) : (
          <>
            {/* Mute button */}
            <button
              onClick={toggleMute}
              style={{
                width: "48px", height: "48px", borderRadius: "50%",
                border: `0.5px solid ${muted ? "rgba(176,112,112,0.4)" : "rgba(235,229,220,0.1)"}`,
                background: muted ? "rgba(176,112,112,0.1)" : "rgba(235,229,220,0.04)",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {muted ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(176,112,112,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="1" y1="1" x2="23" y2="23"/>
                  <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/>
                  <path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v3M8 23h8"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(235,229,220,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                  <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/>
                </svg>
              )}
            </button>

            {/* End call button */}
            <button
              onClick={endCall}
              style={{
                width: "64px", height: "64px", borderRadius: "50%",
                border: "0.5px solid rgba(176,112,112,0.3)",
                background: "rgba(176,112,112,0.12)",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 24px rgba(176,112,112,0.15)",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(176,112,112,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.42 19.42 0 01-3.33-2.67m-2.67-3.34a19.79 19.79 0 01-3.07-8.63A2 2 0 014 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91"/>
                <line x1="23" y1="1" x2="1" y2="23"/>
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{
        position: "absolute", bottom: "18px", left: "50%",
        transform: "translateX(-50%)",
        fontSize: "9px", color: "rgba(235,229,220,0.07)",
        letterSpacing: "0.3em", textTransform: "uppercase",
        fontFamily: sans, whiteSpace: "nowrap", zIndex: 20,
      }}>
        DAD · Dreams. Actions. Destiny.
      </div>
    </div>
  );
}
