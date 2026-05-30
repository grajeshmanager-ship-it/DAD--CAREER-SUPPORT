"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const hasSpoken = useRef(false);

  const sans = "'Helvetica Neue', Arial, sans-serif";
  const serif = "'Georgia', 'Times New Roman', serif";
  const gold = "#C9A84C";
  const bg = "#070606";
  const text = "#EBE5DC";

  // Voice on load — written for someone returning to their journey
  useEffect(() => {
    const speak = () => {
      if (hasSpoken.current || !window.speechSynthesis) return;
      hasSpoken.current = true;

      const utter = new SpeechSynthesisUtterance(
        "You're back. Good. The journey doesn't stop — and neither do we."
      );
      utter.rate = 0.80;
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
      setTimeout(speak, 700);
    } else {
      window.speechSynthesis.onvoiceschanged = () => setTimeout(speak, 700);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: bg, color: text,
      fontFamily: serif, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px", position: "relative", overflow: "hidden",
    }}>

      {/* Ghost DAD watermark */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        fontSize: "clamp(160px, 28vw, 360px)", fontWeight: "700",
        color: "rgba(201,168,76,0.03)", letterSpacing: "-0.04em",
        whiteSpace: "nowrap", pointerEvents: "none", userSelect: "none",
        lineHeight: "1", fontFamily: serif,
      }}>
        DAD
      </div>

      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: "600px", height: "400px",
        background: "radial-gradient(ellipse, rgba(201,168,76,0.05) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Nav */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        padding: "20px 52px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "0.5px solid rgba(201,168,76,0.08)",
      }}>
        <Link href="/" style={{ fontSize: "11px", letterSpacing: "0.42em", textTransform: "uppercase", color: gold, fontFamily: sans, textDecoration: "none" }}>
          DAD
        </Link>
        <Link href="/signup" style={{ fontSize: "11px", color: "rgba(235,229,220,0.3)", textDecoration: "none", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: sans }}>
          New here? Begin →
        </Link>
      </div>

      {/* Form */}
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "400px", textAlign: "center" }}>

        <div style={{ fontSize: "10px", letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "20px", fontFamily: sans }}>
          Welcome back
        </div>

        <h1 style={{
          fontSize: "clamp(32px, 5vw, 52px)", fontWeight: "300",
          color: text, lineHeight: "1.1", marginBottom: "12px",
          letterSpacing: "-0.02em",
        }}>
          They remember you.
        </h1>

        <p style={{
          fontSize: "14px", color: "rgba(235,229,220,0.35)", lineHeight: "1.8",
          fontFamily: sans, fontWeight: "300", marginBottom: "52px",
        }}>
          Everything you shared. Every step you took.<br />
          None of it was lost.
        </p>

        <form onSubmit={handleLogin} style={{ textAlign: "left" }}>

          {/* Email */}
          <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.15)", marginBottom: "32px", paddingBottom: "4px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(201,168,76,0.4)", marginBottom: "8px", fontFamily: sans }}>
              Email address
            </div>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              style={{
                width: "100%", background: "transparent", border: "none",
                color: text, fontSize: "16px", fontFamily: sans, fontWeight: "300",
                padding: "4px 0", outline: "none",
              }}
            />
          </div>

          {/* Password */}
          <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.15)", marginBottom: "40px", paddingBottom: "4px", position: "relative" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(201,168,76,0.4)", marginBottom: "8px", fontFamily: sans }}>
              Password
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  flex: 1, background: "transparent", border: "none",
                  color: text, fontSize: "16px", fontFamily: sans, fontWeight: "300",
                  padding: "4px 0", outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "rgba(235,229,220,0.25)", fontSize: "11px",
                  fontFamily: sans, letterSpacing: "0.08em", textTransform: "uppercase",
                  padding: "0", flexShrink: 0,
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <p style={{
              fontSize: "12px", color: "#B07070", fontFamily: sans,
              marginBottom: "20px", textAlign: "center", lineHeight: "1.6",
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", background: loading ? "rgba(201,168,76,0.5)" : gold,
              color: bg, border: "none", padding: "18px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "11px", letterSpacing: "0.16em", textTransform: "uppercase",
              fontFamily: sans, transition: "background 0.3s",
            }}
          >
            {loading ? "Signing in..." : "Continue the journey →"}
          </button>
        </form>

        <p style={{ marginTop: "32px", fontSize: "11px", color: "rgba(235,229,220,0.2)", fontFamily: sans, textAlign: "center" }}>
          No account yet?{" "}
          <Link href="/signup" style={{ color: gold, textDecoration: "none" }}>
            Begin here →
          </Link>
        </p>
      </div>
    </div>
  );
}
