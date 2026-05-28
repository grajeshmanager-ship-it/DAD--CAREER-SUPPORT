"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const COMPANION_VOICE_LINES: Record<string, (name: string) => string> = {
  dad: (name) => `${name} is working for you right now. He believes in you.`,
  mom: (name) => `${name} is working for you right now. She believes in you.`,
  brother: (name) => `${name} is working for you right now. He's got your back.`,
  sister: (name) => `${name} is working for you right now. She's got your back.`,
  teacher: (name) => `${name} is working for you right now. They believe in what you're capable of.`,
  mentor: (name) => `${name} is working for you right now. They know you can do this.`,
  friend: (name) => `${name} is working for you right now. They're in your corner.`,
  partner: (name) => `${name} is working for you right now. They believe in you completely.`,
  self: (name) => `${name}, you are working for yourself right now. Keep going.`,
};

const COMPANION_FEMALE = ["mom", "sister", "partner"];

function speakLine(line: string, isFemale: boolean) {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(line);
  utterance.rate = 0.88;
  utterance.pitch = isFemale ? 1.05 : 0.92;
  utterance.volume = 1;

  const trySpeak = () => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return false;

    const preferred = isFemale
      ? voices.find(v =>
          v.name.includes("Samantha") ||
          v.name.includes("Google UK English Female") ||
          v.name.includes("Microsoft Hazel") ||
          v.name.includes("Victoria") ||
          (v.lang?.startsWith("en") && v.name.toLowerCase().includes("female"))
        )
      : voices.find(v =>
          v.name.includes("Daniel") ||
          v.name.includes("Arthur") ||
          v.name.includes("Google UK English Male") ||
          v.name.includes("Microsoft George") ||
          v.name.includes("Alex") ||
          (v.lang?.startsWith("en") && !v.name.toLowerCase().includes("female"))
        );

    if (preferred) utterance.voice = preferred;
    window.speechSynthesis.speak(utterance);
    return true;
  };

  if (!trySpeak()) {
    window.speechSynthesis.onvoiceschanged = () => {
      trySpeak();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }
}

export function DadLoading({ message = "Just a moment..." }: { message?: string }) {
  const [displayLine, setDisplayLine] = useState("Someone who believes in you is working for you right now.");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // First speak the default line immediately
      speakLine("Someone who believes in you is working for you right now.", false);

      // Then try to get personalised profile
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const { data } = await supabase
          .from("profiles")
          .select("companion_name, companion_type")
          .eq("id", user.id)
          .single();

        if (cancelled) return;

        if (data?.companion_name && data?.companion_type) {
          const line = COMPANION_VOICE_LINES[data.companion_type]?.(data.companion_name)
            || `${data.companion_name} is working for you right now.`;
          const isFemale = COMPANION_FEMALE.includes(data.companion_type);

          setDisplayLine(line);

          // Speak personalised version after a short delay
          setTimeout(() => {
            if (!cancelled) speakLine(line, isFemale);
          }, 500);
        }
      } catch {
        // silently fall back to default
      }
    };

    load();

    return () => {
      cancelled = true;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      fontFamily: "'Georgia', serif",
    }}>
      <style>{`
        @keyframes dadWalk {
          0%   { transform: translateX(-80px); }
          50%  { transform: translateX(80px); }
          100% { transform: translateX(-80px); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 1; }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 30px rgba(212,160,80,0.1); }
          50%       { box-shadow: 0 0 80px rgba(212,160,80,0.35); }
        }
        @keyframes shimmer {
          0%   { background-position: -300% center; }
          100% { background-position: 300% center; }
        }
        @keyframes soundWave {
          0%, 100% { transform: scaleY(0.4); opacity: 0.3; }
          50%       { transform: scaleY(1); opacity: 1; }
        }
        .dad-dot-1 { animation: pulse 1.4s ease-in-out infinite; animation-delay: 0s; }
        .dad-dot-2 { animation: pulse 1.4s ease-in-out infinite; animation-delay: 0.2s; }
        .dad-dot-3 { animation: pulse 1.4s ease-in-out infinite; animation-delay: 0.4s; }
        .wave-bar-1 { animation: soundWave 1s ease-in-out infinite; animation-delay: 0s; }
        .wave-bar-2 { animation: soundWave 1s ease-in-out infinite; animation-delay: 0.15s; }
        .wave-bar-3 { animation: soundWave 1s ease-in-out infinite; animation-delay: 0.3s; }
        .wave-bar-4 { animation: soundWave 1s ease-in-out infinite; animation-delay: 0.45s; }
        .wave-bar-5 { animation: soundWave 1s ease-in-out infinite; animation-delay: 0.6s; }
      `}</style>

      {/* Glow ring */}
      <div style={{
        width: 160, height: 160, borderRadius: "50%",
        background: "rgba(212,160,80,0.04)",
        border: "1px solid rgba(212,160,80,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 48,
        animation: "glow 3s ease-in-out infinite",
        position: "relative",
      }}>
        <div style={{
          width: 120, height: 120, borderRadius: "50%",
          background: "rgba(212,160,80,0.06)",
          border: "1px solid rgba(212,160,80,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            fontSize: "2.8rem",
            animation: "dadWalk 2s ease-in-out infinite",
            display: "inline-block", lineHeight: 1,
          }}>
            🏃
          </div>
        </div>
        <div style={{
          position: "absolute", top: 8, right: 12,
          width: 10, height: 10, borderRadius: "50%",
          background: "#d4a050",
          animation: "pulse 2s ease-in-out infinite",
        }} />
      </div>

      {/* Text */}
      <div style={{
        textAlign: "center", maxWidth: 480,
        animation: "fadeUp 0.8s ease both",
      }}>
        <p style={{
          fontSize: "clamp(1rem, 3vw, 1.35rem)",
          fontWeight: 400, fontStyle: "italic",
          lineHeight: 1.7, marginBottom: 16,
          background: "linear-gradient(90deg,#b8863c 0%,#d4a050 30%,#f5d48a 50%,#d4a050 70%,#b8863c 100%)",
          backgroundSize: "300% auto",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          animation: "shimmer 4s linear infinite",
        }}>
          "{displayLine}"
        </p>

        {/* Sound wave */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "center", gap: 4,
          marginBottom: 20, height: 24,
        }}>
          {["wave-bar-1","wave-bar-2","wave-bar-3","wave-bar-4","wave-bar-5"].map((cls, i) => (
            <div key={i} className={cls} style={{
              width: 3, height: 20, borderRadius: 999,
              background: "#d4a050", transformOrigin: "center",
            }} />
          ))}
        </div>

        <p style={{
          fontSize: "0.78rem",
          color: "rgba(255,255,255,0.25)",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          fontFamily: "sans-serif",
          marginBottom: 32,
        }}>
          {message}
        </p>

        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <div className="dad-dot-1" style={{ width: 6, height: 6, borderRadius: "50%", background: "#d4a050" }} />
          <div className="dad-dot-2" style={{ width: 6, height: 6, borderRadius: "50%", background: "#d4a050" }} />
          <div className="dad-dot-3" style={{ width: 6, height: 6, borderRadius: "50%", background: "#d4a050" }} />
        </div>
      </div>

      <div style={{
        position: "absolute", bottom: 40,
        fontFamily: "sans-serif", fontSize: "0.65rem",
        color: "rgba(255,255,255,0.12)",
        letterSpacing: "0.2em", textTransform: "uppercase",
      }}>
        DAD · Your career guide
      </div>
    </div>
  );
}
