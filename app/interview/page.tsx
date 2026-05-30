"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Question {
  id: string;
  question: string;
  type: string;
  why: string;
  tips: string;
}

interface Prep {
  roleTitle: string;
  company: string;
  roleAnalysis: string;
  whatGetsYouHired: string[];
  whatGetsYouRejected: string[];
  keySkills: { skill: string; importance: string }[];
  questions: Question[];
  cheatSheet: string[];
}

interface Debrief {
  overallScore: number;
  verdict: string;
  strengths: string[];
  weaknesses: string[];
  questionBreakdown: { question: string; score: number; whatTheyDid: string; idealAnswer: string; tip: string }[];
  top3Improvements: { area: string; why: string; howToImprove: string }[];
  cheatSheet: string[];
  encouragement: string;
}

type Stage = "input" | "intel" | "interview" | "debrief";

export default function InterviewPage() {
  const [stage, setStage] = useState<Stage>("input");
  const [jd, setJd] = useState("");
  const [prep, setPrep] = useState<Prep | null>(null);
  const [debrief, setDebrief] = useState<Debrief | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const hasSpoken = useRef(false);

  const sans = "'Helvetica Neue', Arial, sans-serif";
  const serif = "'Georgia', 'Times New Roman', serif";
  const gold = "#C9A84C";
  const bg = "#070606";
  const dark = "#040303";
  const text = "#EBE5DC";
  const blue = "#6B8CFF";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthToken(data.session?.access_token ?? null);
    });
  }, []);

  // Voice on load — once per session
  useEffect(() => {
    if (hasSpoken.current || sessionStorage.getItem("dad_interview_voiced")) return;
    hasSpoken.current = true;
    sessionStorage.setItem("dad_interview_voiced", "1");

    const speak = () => {
      if (!window.speechSynthesis) return;
      const utter = new SpeechSynthesisUtterance(
        "Every great answer was once a terrible one. The difference is practice. Let's begin."
      );
      utter.rate = 0.80;
      utter.pitch = 0.87;
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
      setTimeout(speak, 800);
    } else {
      window.speechSynthesis.onvoiceschanged = () => setTimeout(speak, 800);
    }
  }, []);

  const handlePrepare = async () => {
    if (!jd.trim() || jd.trim().length < 50) {
      setError("Please paste the full job description — at least 50 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("jobDescription", jd);
      const res = await fetch("/api/prepare-interview", {
        method: "POST",
        headers: { ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to prepare interview");
      setPrep(data.prep);
      setAnswers(new Array(data.prep.questions.length).fill(""));
      setStage("intel");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDebrief = async () => {
    if (!prep) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/debrief-interview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ questions: prep.questions, answers, roleTitle: prep.roleTitle }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to generate debrief");
      setDebrief(data.debrief);
      setStage("debrief");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: dark, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "24px" }}>
        <div style={{ fontSize: "clamp(60px, 10vw, 120px)", fontWeight: "700", color: "rgba(107,140,255,0.06)", letterSpacing: "-0.04em", fontFamily: serif, userSelect: "none" }}>DAD</div>
        <div style={{ fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(107,140,255,0.5)", fontFamily: sans }}>
          {stage === "input" ? "Analysing the role..." : "Evaluating your performance..."}
        </div>
        <div style={{ width: "120px", height: "0.5px", background: "rgba(107,140,255,0.1)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: "40%", background: blue, animation: "slide 1.4s ease-in-out infinite" }} />
        </div>
        <style>{`@keyframes slide { 0%{left:-40%} 100%{left:140%} }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: stage === "interview" || stage === "intel" ? dark : bg, color: text, fontFamily: serif }}>

      {/* Nav */}
      <nav style={{ padding: "18px 52px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `0.5px solid ${stage === "interview" || stage === "intel" ? "rgba(107,140,255,0.1)" : "rgba(201,168,76,0.08)"}`, position: "sticky", top: 0, zIndex: 100, background: stage === "interview" || stage === "intel" ? "rgba(4,3,3,0.97)" : "rgba(7,6,6,0.97)" }}>
        <Link href="/dashboard" style={{ fontSize: "11px", letterSpacing: "0.42em", textTransform: "uppercase", color: stage === "interview" || stage === "intel" ? blue : gold, fontFamily: sans, textDecoration: "none" }}>DAD</Link>
        <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(235,229,220,0.2)", fontFamily: sans }}>Interview Mode</div>
        <Link href="/dashboard" style={{ fontSize: "11px", color: "rgba(235,229,220,0.25)", textDecoration: "none", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: sans }}>← Dashboard</Link>
      </nav>

      {/* ── STAGE: INPUT ── */}
      {stage === "input" && (
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "80px 52px" }}>
          <div style={{ marginBottom: "64px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.26em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "18px", fontFamily: sans }}>Interview Mode</div>
            <h1 style={{ fontSize: "clamp(32px, 5vw, 60px)", fontWeight: "300", color: text, lineHeight: "1.1", marginBottom: "20px", letterSpacing: "-0.02em" }}>
              Paste the job description.<br />
              <span style={{ color: "rgba(235,229,220,0.4)" }}>DAD does the rest.</span>
            </h1>
            <p style={{ fontSize: "15px", color: "rgba(235,229,220,0.4)", lineHeight: "1.9", fontFamily: sans, fontWeight: "300", maxWidth: "480px", margin: 0 }}>
              No configuration. No setup. Paste the JD and your companion reads it,
              selects the right interviewer, builds the questions, and puts you in the chair.
              The companion disappears. The evaluation begins.
            </p>
          </div>

          <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.15)", marginBottom: "40px", paddingBottom: "4px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(201,168,76,0.4)", marginBottom: "12px", fontFamily: sans }}>Job description</div>
            <textarea
              placeholder="Paste the full job description here..."
              value={jd}
              onChange={e => setJd(e.target.value)}
              rows={12}
              style={{ width: "100%", background: "transparent", border: "none", color: text, fontSize: "14px", fontFamily: sans, fontWeight: "300", padding: "4px 0", outline: "none", resize: "none", lineHeight: "1.8" }}
            />
          </div>

          {error && <p style={{ fontSize: "12px", color: "#B07070", fontFamily: sans, marginBottom: "20px" }}>{error}</p>}

          <button onClick={handlePrepare} disabled={jd.trim().length < 50} style={{ width: "100%", background: jd.trim().length >= 50 ? gold : "rgba(201,168,76,0.15)", color: jd.trim().length >= 50 ? bg : "rgba(235,229,220,0.2)", border: "none", padding: "20px", cursor: jd.trim().length >= 50 ? "pointer" : "not-allowed", fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: sans, transition: "all 0.3s" }}>
            Enter the room →
          </button>
        </div>
      )}

      {/* ── STAGE: INTEL ── */}
      {stage === "intel" && prep && (
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "60px 52px" }}>
          <div style={{ marginBottom: "48px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.24em", textTransform: "uppercase", color: `${blue}80`, marginBottom: "16px", fontFamily: sans }}>Intelligence report</div>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 44px)", fontWeight: "300", color: text, lineHeight: "1.1", marginBottom: "12px" }}>{prep.roleTitle}</h2>
            <div style={{ fontSize: "13px", color: "rgba(235,229,220,0.35)", fontFamily: sans }}>{prep.company}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: `rgba(107,140,255,0.08)`, marginBottom: "40px" }}>
            <div style={{ background: dark, padding: "32px 36px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "#5B9E7A", marginBottom: "16px", fontFamily: sans }}>What gets you hired</div>
              {prep.whatGetsYouHired.map((w, i) => (
                <div key={i} style={{ fontSize: "13px", color: "rgba(235,229,220,0.5)", fontFamily: sans, marginBottom: "10px", lineHeight: "1.6", display: "flex", gap: "10px" }}>
                  <span style={{ color: "#5B9E7A", flexShrink: 0 }}>→</span>{w}
                </div>
              ))}
            </div>
            <div style={{ background: dark, padding: "32px 36px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "#B07070", marginBottom: "16px", fontFamily: sans }}>What gets you rejected</div>
              {prep.whatGetsYouRejected.map((w, i) => (
                <div key={i} style={{ fontSize: "13px", color: "rgba(235,229,220,0.5)", fontFamily: sans, marginBottom: "10px", lineHeight: "1.6", display: "flex", gap: "10px" }}>
                  <span style={{ color: "#B07070", flexShrink: 0 }}>×</span>{w}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "40px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: `${blue}60`, marginBottom: "16px", fontFamily: sans }}>Role analysis</div>
            <p style={{ fontSize: "14px", color: "rgba(235,229,220,0.45)", lineHeight: "1.9", fontFamily: sans, fontWeight: "300", margin: 0 }}>{prep.roleAnalysis}</p>
          </div>

          <button onClick={() => { setCurrentQ(0); setStage("interview"); }} style={{ width: "100%", background: blue, color: "#030202", border: "none", padding: "20px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: sans }}>
            Begin the interview →
          </button>
        </div>
      )}

      {/* ── STAGE: INTERVIEW ── */}
      {stage === "interview" && prep && (
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "60px 52px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "52px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: `${blue}60`,
