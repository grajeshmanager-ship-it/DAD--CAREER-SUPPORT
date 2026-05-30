"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface AnalysisResult {
  atsScore: number;
  salaryRange: { min: number; max: number; currency: string };
  currentLevel: string;
  topSkills: string[];
  missingKeywords: string[];
  skillGaps: string[];
  improvements: { title: string; description: string }[];
  formattingIssues: string[];
  jobMatches: { title: string; match: number; reason: string }[];
  courses: { name: string; provider: string; reason: string }[];
  summary: string;
}

export default function ResumePage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const hasSpoken = useRef(false);

  const sans = "'Helvetica Neue', Arial, sans-serif";
  const serif = "'Georgia', 'Times New Roman', serif";
  const gold = "#C9A84C";
  const bg = "#070606";
  const text = "#EBE5DC";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthToken(data.session?.access_token ?? null);
    });
  }, []);

  // Voice on load — once per session
  useEffect(() => {
    if (hasSpoken.current || sessionStorage.getItem("dad_resume_voiced")) return;
    hasSpoken.current = true;
    sessionStorage.setItem("dad_resume_voiced", "1");

    const speak = () => {
      if (!window.speechSynthesis) return;
      const utter = new SpeechSynthesisUtterance(
        "Your CV is not a document. It is the first thing they learn about you. Let's make sure it tells the right story."
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

  const handleFileChange = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted. Please convert your CV to PDF and try again.");
      setFile(null);
      return;
    }
    setError(null);
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("resume", file);
      const res = await fetch("/api/analyze-resume", {
        method: "POST",
        headers: { ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || data.error || "Failed to analyse resume");
      setResult(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const getCurrencySymbol = (currency: string) => {
    if (currency === "GBP") return "£";
    if (currency === "USD") return "$";
    if (currency === "INR") return "₹";
    return currency + " ";
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "24px" }}>
        <div style={{ fontSize: "clamp(60px, 10vw, 120px)", fontWeight: "700", color: "rgba(201,168,76,0.08)", letterSpacing: "-0.04em", fontFamily: serif, userSelect: "none" }}>DAD</div>
        <div style={{ fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", fontFamily: sans }}>
          Reading your story...
        </div>
        <div style={{ width: "120px", height: "0.5px", background: "rgba(201,168,76,0.15)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: "40%", background: gold, animation: "slide 1.4s ease-in-out infinite" }} />
        </div>
        <style>{`@keyframes slide { 0%{left:-40%} 100%{left:140%} }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: serif }}>

      {/* Nav */}
      <nav style={{ padding: "18px 52px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "0.5px solid rgba(201,168,76,0.08)", position: "sticky", top: 0, zIndex: 100, background: "rgba(7,6,6,0.97)" }}>
        <Link href="/dashboard" style={{ fontSize: "11px", letterSpacing: "0.42em", textTransform: "uppercase", color: gold, fontFamily: sans, textDecoration: "none" }}>DAD</Link>
        <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(235,229,220,0.25)", fontFamily: sans }}>CV Intelligence</div>
        <Link href="/dashboard" style={{ fontSize: "11px", color: "rgba(235,229,220,0.25)", textDecoration: "none", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: sans }}>← Dashboard</Link>
      </nav>

      {!result ? (
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "80px 52px" }}>

          {/* Header */}
          <div style={{ marginBottom: "64px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.26em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "18px", fontFamily: sans }}>CV Intelligence</div>
            <h1 style={{ fontSize: "clamp(32px, 5vw, 60px)", fontWeight: "300", color: text, lineHeight: "1.1", marginBottom: "20px", letterSpacing: "-0.02em" }}>
              What does your CV<br />actually say about you?
            </h1>
            <p style={{ fontSize: "15px", color: "rgba(235,229,220,0.4)", lineHeight: "1.9", fontFamily: sans, fontWeight: "300", maxWidth: "480px", margin: 0 }}>
              Upload it. Your companion will read every line — the skills, the gaps,
              the salary you should be asking for, and exactly what needs to change.
              This is not an ATS checker. This is a learning event.
            </p>
          </div>

          {/* Upload area */}
          <div
            onClick={() => document.getElementById("resume-file")?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileChange(f); }}
            style={{
              border: `0.5px solid ${dragOver ? gold : file ? "rgba(201,168,76,0.4)" : "rgba(201,168,76,0.15)"}`,
              padding: "80px 52px", textAlign: "center", cursor: "pointer",
              background: dragOver ? "rgba(201,168,76,0.04)" : file ? "rgba(201,168,76,0.02)" : "transparent",
              transition: "all 0.3s ease", marginBottom: "32px",
            }}
          >
            <input id="resume-file" type="file" accept=".pdf" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }} />

            {file ? (
              <div>
                <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: gold, marginBottom: "12px", fontFamily: sans }}>Ready</div>
                <div style={{ fontSize: "20px", fontWeight: "300", color: text, marginBottom: "8px" }}>{file.name}</div>
                <div style={{ fontSize: "12px", color: "rgba(235,229,220,0.3)", fontFamily: sans }}>{(file.size / 1024).toFixed(0)} KB · Click to change</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(201,168,76,0.35)", marginBottom: "16px", fontFamily: sans }}>Upload your CV</div>
                <div style={{ fontSize: "22px", fontWeight: "300", color: "rgba(235,229,220,0.4)", marginBottom: "10px" }}>Drop your PDF here</div>
                <div style={{ fontSize: "12px", color: "rgba(235,229,220,0.2)", fontFamily: sans }}>or click to browse · PDF only · Max 5MB</div>
              </div>
            )}
          </div>

          {error && (
            <div style={{ padding: "16px 24px", border: "0.5px solid rgba(176,112,112,0.3)", marginBottom: "24px" }}>
              <p style={{ fontSize: "13px", color: "#B07070", fontFamily: sans, margin: 0, lineHeight: "1.6" }}>{error}</p>
            </div>
          )}

          <button onClick={handleUpload} disabled={!file} style={{
            width: "100%", background: file ? gold : "rgba(201,168,76,0.15)",
            color: file ? bg : "rgba(235,229,220,0.2)", border: "none",
            padding: "20px", cursor: file ? "pointer" : "not-allowed",
            fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase",
            fontFamily: sans, transition: "all 0.3s",
          }}>
            {file ? "Let them read it →" : "Select a file to continue"}
          </button>
        </div>
      ) : (
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "60px 52px" }}>

          <button onClick={() => { setResult(null); setFile(null); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: "rgba(235,229,220,0.3)", fontFamily: sans, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "48px", display: "flex", alignItems: "center", gap: "8px", padding: 0 }}>
            ← Upload another
          </button>

          {/* Summary */}
          <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.08)", paddingBottom: "48px", marginBottom: "48px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "16px", fontFamily: sans }}>What your companion learned</div>
            <p style={{ fontSize: "17px", color: "rgba(235,229,220,0.6)", lineHeight: "1.9", fontFamily: sans, fontWeight: "300", maxWidth: "680px", margin: 0 }}>
              {result.summary}
            </p>
          </div>

          {/* Score + Salary */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "rgba(201,168,76,0.07)", marginBottom: "48px" }}>
            <div style={{ background: bg, padding: "40px 44px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(201,168,76,0.4)", marginBottom: "16px", fontFamily: sans }}>ATS Score</div>
              <div style={{ fontSize: "clamp(52px, 7vw, 80px)", fontWeight: "200", color: result.atsScore >= 70 ? "#5B9E7A" : result.atsScore >= 50 ? gold : "#B07070", lineHeight: "1", marginBottom: "16px" }}>
                {result.atsScore}<span style={{ fontSize: "20px", opacity: 0.4 }}>/100</span>
              </div>
              <div style={{ width: "100%", height: "2px", background: "rgba(235,229,220,0.05)" }}>
                <div style={{ height: "100%", width: `${result.atsScore}%`, background: result.atsScore >= 70 ? "#5B9E7A" : result.atsScore >= 50 ? gold : "#B07070", transition: "width 1s ease" }} />
              </div>
            </div>
            <div style={{ background: bg, padding: "40px 44px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(201,168,76,0.4)", marginBottom: "16px", fontFamily: sans }}>Estimated salary</div>
              <div style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: "200", color: gold, lineHeight: "1", marginBottom: "8px" }}>
                {getCurrencySymbol(result.salaryRange?.currency || "GBP")}{Number(result.salaryRange?.min || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: "14px", color: "rgba(235,229,220,0.35)", fontFamily: sans, fontWeight: "300" }}>
                up to {getCurrencySymbol(result.salaryRange?.currency || "GBP")}{Number(result.salaryRange?.max || 0).toLocaleString()} / year
              </div>
              {result.currentLevel && (
                <div style={{ fontSize: "12px", color: "rgba(235,229,220,0.25)", fontFamily: sans, marginTop: "12px" }}>{result.currentLevel}</div>
              )}
            </div>
          </div>

          {/* What to fix */}
          {result.improvements?.length > 0 && (
            <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.08)", paddingBottom: "40px", marginBottom: "40px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "24px", fontFamily: sans }}>What needs to change</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: "rgba(176,112,112,0.06)" }}>
                {result.improvements.map((imp, i) => (
                  <div key={i} style={{ background: bg, padding: "20px 28px" }}>
                    <div style={{ fontSize: "13px", color: "#B07070", marginBottom: "6px", fontFamily: sans }}>{imp.title}</div>
                    <div style={{ fontSize: "12px", color: "rgba(235,229,220,0.35)", fontFamily: sans, fontWeight: "300", lineHeight: "1.7" }}>{imp.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing keywords */}
          {result.missingKeywords?.length > 0 && (
            <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.08)", paddingBottom: "40px", marginBottom: "40px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "20px", fontFamily: sans }}>Missing keywords</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {result.missingKeywords.map((kw, i) => (
                  <span key={i} style={{ fontSize: "11px", color: "rgba(235,229,220,0.45)", border: "0.5px solid rgba(201,168,76,0.2)", padding: "5px 14px", fontFamily: sans }}>{kw}</span>
                ))}
              </div>
            </div>
          )}

          {/* Top skills */}
          {result.topSkills?.length > 0 && (
            <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.08)", paddingBottom: "40px", marginBottom: "40px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "20px", fontFamily: sans }}>Your strongest skills</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {result.topSkills.map((skill, i) => (
                  <span key={i} style={{ fontSize: "11px", color: gold, border: `0.5px solid ${gold}40`, padding: "5px 14px", fontFamily: sans }}>{skill}</span>
                ))}
              </div>
            </div>
          )}

          {/* Job matches */}
          {result.jobMatches?.length > 0 && (
            <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.08)", paddingBottom: "40px", marginBottom: "40px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "24px", fontFamily: sans }}>Best role matches</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: "rgba(201,168,76,0.06)" }}>
                {result.jobMatches.map((job, i) => (
                  <div key={i} style={{ background: bg, padding: "18px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: "14px", color: text, fontWeight: "300", marginBottom: "4px" }}>{job.title}</div>
                      <div style={{ fontSize: "11px", color: "rgba(235,229,220,0.3)", fontFamily: sans }}>{job.reason}</div>
                    </div>
                    <div style={{ fontSize: "13px", color: job.match >= 70 ? "#5B9E7A" : gold, fontFamily: sans, flexShrink: 0, marginLeft: "20px" }}>{job.match}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Courses */}
          {result.courses?.length > 0 && (
            <div style={{ marginBottom: "40px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "24px", fontFamily: sans }}>Recommended next steps</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: "rgba(201,168,76,0.06)" }}>
                {result.courses.map((c, i) => (
                  <div key={i} style={{ background: bg, padding: "18px 28px" }}>
                    <div style={{ fontSize: "14px", color: text, fontWeight: "300", marginBottom: "4px" }}>{c.name}</div>
                    <div style={{ fontSize: "11px", color: "rgba(235,229,220,0.3)", fontFamily: sans }}>{c.provider} · {c.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "16px", paddingTop: "24px", borderTop: "0.5px solid rgba(201,168,76,0.08)" }}>
            <button onClick={() => { setResult(null); setFile(null); }} style={{ border: "0.5px solid rgba(235,229,220,0.12)", background: "none", color: "rgba(235,229,220,0.4)", padding: "16px 32px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: sans }}>
              Upload another
            </button>
            <Link href="/interview" style={{ display: "inline-flex", alignItems: "center", gap: "12px", background: gold, color: bg, padding: "16px 36px", textDecoration: "none", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: sans }}>
              Practice interview →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
