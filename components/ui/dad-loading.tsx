"use client";

import { useEffect } from "react";

export function DadLoading({ message = "Just a moment..." }: { message?: string }) {
  useEffect(() => {
    // Speak as soon as loading appears
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      // Cancel any existing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(
        "Someone who believes in you is working for you right now."
      );

      // Try to get a good voice
      const setVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        // Prefer a warm English voice
        const preferred = voices.find(v =>
          v.name.includes("Daniel") ||
          v.name.includes("Arthur") ||
          v.name.includes("Google UK English Male") ||
          v.name.includes("Microsoft George") ||
          v.name.includes("Alex") ||
          (v.lang === "en-GB" && !v.name.toLowerCase().includes("female"))
        );
        if (preferred) utterance.voice = preferred;
        utterance.rate = 0.88;
        utterance.pitch = 0.95;
        utterance.volume = 1;
        window.speechSynthesis.speak(utterance);
      };

      // Voices may not be loaded yet
      if (window.speechSynthesis.getVoices().length > 0) {
        setVoice();
      } else {
        window.speechSynthesis.onvoiceschanged = setVoice;
      }
    }

    // Cancel speech when component unmounts
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "'Georgia', serif",
      }}
    >
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

      {/* Outer glow ring */}
      <div style={{
        width: 160,
        height: 160,
        borderRadius: "50%",
        background: "rgba(212,160,80,0.04)",
        border: "1px solid rgba(212,160,80,0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 48,
        animation: "glow 3s ease-in-out infinite",
        position: "relative",
      }}>
        {/* Inner ring */}
        <div style={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: "rgba(212,160,80,0.06)",
          border: "1px solid rgba(212,160,80,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div style={{
            fontSize: "2.8rem",
            animation: "dadWalk 2s ease-in-out infinite",
            display: "inline-block",
            lineHeight: 1,
          }}>
            🏃
          </div>
        </div>

        {/* Orbiting dot */}
        <div style={{
          position: "absolute",
          top: 8,
          right: 12,
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: "#d4a050",
          animation: "pulse 2s ease-in-out infinite",
        }} />
      </div>

      {/* Main message */}
      <div style={{
        textAlign: "center",
        maxWidth: 440,
        animation: "fadeUp 0.8s ease both",
      }}>
        <p style={{
          fontSize: "clamp(1.1rem, 3vw, 1.4rem)",
          fontWeight: 400,
          fontStyle: "italic",
          lineHeight: 1.7,
          marginBottom: 16,
          background: "linear-gradient(90deg, #b8863c 0%, #d4a050 30%, #f5d48a 50%, #d4a050 70%, #b8863c 100%)",
          backgroundSize: "300% auto",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          animation: "shimmer 4s linear infinite",
        }}>
          "Someone who believes in you<br />is working for you right now."
        </p>

        {/* Sound wave — shows DAD is speaking */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          marginBottom: 20,
          height: 24,
        }}>
          {["wave-bar-1","wave-bar-2","wave-bar-3","wave-bar-4","wave-bar-5"].map((cls, i) => (
            <div
              key={i}
              className={cls}
              style={{
                width: 3,
                height: 20,
                borderRadius: 999,
                background: "#d4a050",
                transformOrigin: "center",
              }}
            />
          ))}
        </div>

        {/* Dynamic message */}
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

        {/* Three dots */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <div className="dad-dot-1" style={{ width: 6, height: 6, borderRadius: "50%", background: "#d4a050" }} />
          <div className="dad-dot-2" style={{ width: 6, height: 6, borderRadius: "50%", background: "#d4a050" }} />
          <div className="dad-dot-3" style={{ width: 6, height: 6, borderRadius: "50%", background: "#d4a050" }} />
        </div>
      </div>

      {/* Bottom brand line */}
      <div style={{
        position: "absolute",
        bottom: 40,
        fontFamily: "sans-serif",
        fontSize: "0.65rem",
        color: "rgba(255,255,255,0.12)",
        letterSpacing: "0.2em",
        textTransform: "uppercase",
      }}>
        DAD · Your career guide
      </div>
    </div>
  );
}
