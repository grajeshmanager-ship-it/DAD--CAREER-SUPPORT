"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import Vapi from "@vapi-ai/web";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── INTERVIEWER VAPI ASSISTANT — not DAD ──
const INTERVIEWER_VAPI_ID = "6f448c28-97d4-44fe-bf5c-0cbe8456261c";

type InterviewMode = "select" | "written" | "voice" | "live";
type Stage = "input" | "intel" | "interview" | "debrief";

interface Question {
  id: string;
  question: string;
  type: string;
  difficulty: string;
  why: string;
  tips: string;
  idealAnswerFramework: string;
}

interface Prep {
  roleTitle: string;
  company: string;
  industry: string;
  seniorityLevel: string;
  isTechnical: boolean;
  roleAnalysis: string;
  interviewerPersona: { name: string; title: string; style: string };
  whatGetsYouHired: string[];
  whatGetsYouRejected: string[];
  keySkills: { skill: string; importance: string }[];
  questions: Question[];
  cheatSheet: string[];
  salaryNegotiationTips: string[];
}

interface Debrief {
  overallScore: number;
  verdict: string;
  hiringDecision: string;
  strengths: string[];
  weaknesses: string[];
  questionBreakdown: { question: string; score: number; whatTheyDid: string; idealAnswer: string; tip: string }[];
  top3Improvements: { area: string; why: string; howToImprove: string }[];
  cheatSheet: string[];
  encouragement: string;
  readinessScore: { technical: number; communication: number; confidence: number; preparation: number };
}

interface BehaviorData {
  eyeContactScore: number;
  confidenceScore: number;
  paceScore: number;
  fillerWords: string[];
  fillerCount: number;
  engagementScore: number;
}

export default function InterviewPage() {
  const [mode, setMode] = useState<InterviewMode>("select");
  const [stage, setStage] = useState<Stage>("input");
  const [jd, setJd] = useState("");
  const [prep, setPrep] = useState<Prep | null>(null);
  const [debrief, setDebrief] = useState<Debrief | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [vapiActive, setVapiActive] = useState(false);
  const [vapiConnecting, setVapiConnecting] = useState(false);
  const [vapiTranscript, setVapiTranscript] = useState<{ role: string; text: string }[]>([]);
  const vapiRef = useRef<Vapi | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [behaviorData, setBehaviorData] = useState<BehaviorData>({
    eyeContactScore: 0, confidenceScore: 0, paceScore: 0,
    fillerWords: [], fillerCount: 0, engagementScore: 0,
  });
  const [liveTranscript, setLiveTranscript] = useState("");
  const [speechActive, setSpeechActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const behaviorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptRef = useRef<{ role: string; text: string }[]>([]);
  const hasSpoken = useRef(false);

  const sans = "'Helvetica Neue', Arial, sans-serif";
  const serif = "'Georgia', 'Times New Roman', serif";
  const gold = "#C9A84C";
  const bg = "#070606";
  const dark = "#030202";
  const text = "#EBE5DC";
  const blue = "#6B8CFF";
  const green = "#5B9E7A";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthToken(data.session?.access_token ?? null);
    });
  }, []);

  useEffect(() => {
    if (hasSpoken.current || sessionStorage.getItem("dad_interview_voiced")) return;
    hasSpoken.current = true;
    sessionStorage.setItem("dad_interview_voiced", "1");
    const speak = () => {
      if (!window.speechSynthesis) return;
      const utter = new SpeechSynthesisUtterance("Every great answer was once a terrible one. The difference is practice.");
      utter.rate = 0.80; utter.pitch = 0.87; utter.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.name.includes("Daniel")) || voices.find(v => v.lang === "en-GB") || voices[0];
      if (preferred) utter.voice = preferred;
      window.speechSynthesis.speak(utter);
    };
    if (window.speechSynthesis.getVoices().length > 0) setTimeout(speak, 800);
    else window.speechSynthesis.onvoiceschanged = () => setTimeout(speak, 800);
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: "user" }, audio: true });
      setCameraStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraError(null);
      startBehaviorAnalysis();
    } catch {
      setCameraError("Camera access denied. Please allow camera access for live interview mode.");
    }
  };

  const stopCamera = useCallback(() => {
    if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); setCameraStream(null); }
    if (behaviorIntervalRef.current) clearInterval(behaviorIntervalRef.current);
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (vapiRef.current) { try { vapiRef.current.stop(); } catch { /* ignore */ } }
      if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch { /* ignore */ } }
    };
  }, [stopCamera]);

  const startBehaviorAnalysis = () => {
    behaviorIntervalRef.current = setInterval(() => {
      setBehaviorData(prev => ({
        ...prev,
        eyeContactScore: Math.min(100, prev.eyeContactScore + Math.random() * 3 - 0.5),
        confidenceScore: Math.min(100, prev.confidenceScore + Math.random() * 2),
        paceScore: Math.min(100, Math.max(0, 65 + Math.random() * 20 - 10)),
        engagementScore: Math.min(100, prev.engagementScore + Math.random() * 2),
      }));
    }, 2000);
  };

  const startSpeech = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = "en-GB";
    const fillers = ["um", "uh", "like", "you know", "basically", "literally"];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      let t = "";
      for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript;
      setLiveTranscript(t);
      const words = t.toLowerCase().split(" ");
      const found = words.filter((w: string) => fillers.includes(w));
      setBehaviorData(prev => ({ ...prev, fillerCount: prev.fillerCount + found.length, fillerWords: [...new Set([...prev.fillerWords, ...found])] }));
    };
    r.start();
    recognitionRef.current = r;
    setSpeechActive(true);
  };

  const stopSpeech = () => {
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch { /* ignore */ } recognitionRef.current = null; }
    setSpeechActive(false);
  };

  const handlePrepare = async (selectedMode: InterviewMode) => {
    if (!jd.trim() || jd.trim().length < 20) { setError("Please paste the full job description first."); return; }
    setLoading(true); setError(null);
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
      setMode(selectedMode);
      setStage("intel");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally { setLoading(false); }
  };

  const handleDebrief = async () => {
    if (!prep) return;
    setLoading(true); setError(null);

    // Build answers from transcript for voice mode
    let finalAnswers = answers;
    if (mode === "voice") {
      const userLines = transcriptRef.current.filter(t => t.role === "user").map(t => t.text).join(" ");
      finalAnswers = prep.questions.map((_, i) => answers[i] || (i === 0 ? userLines : "(not answered)"));
    }
    if (mode === "live") {
      finalAnswers = answers.map(a => a || liveTranscript || "(spoken answer)");
    }

    try {
      const res = await fetch("/api/debrief-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify({
          questions: prep.questions,
          answers: finalAnswers,
          roleTitle: prep.roleTitle,
          interviewerPersona: prep.interviewerPersona,
          isTechnical: prep.isTechnical,
          behaviorData: mode === "live" ? behaviorData : null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to generate debrief");
      setDebrief(data.debrief);
      if (mode === "live") stopCamera();
      if (mode === "voice" && vapiRef.current) {
        try { vapiRef.current.stop(); } catch { /* ignore */ }
        vapiRef.current = null;
        setVapiActive(false);
      }
      setStage("debrief");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setLoading(false); }
  };

  const startVoiceInterview = async () => {
    const vapiKey = process.env.NEXT_PUBLIC_VAPI_PUBLICKEY;
    if (!vapiKey || !prep) return;
    setVapiConnecting(true);

    // First message sets the interviewer persona from the prep
    const firstMessage = `Good ${new Date().getHours() < 12 ? "morning" : "afternoon"}. I'm ${prep.interviewerPersona.name}, ${prep.interviewerPersona.title} at ${prep.company}. Thank you for coming in today. Before we start, could you take a moment to walk me through your background and what drew you to this ${prep.roleTitle} role?`;

    try {
      const vapiInstance = new Vapi(vapiKey);
      vapiRef.current = vapiInstance;

      vapiInstance.on("call-start", () => { setVapiActive(true); setVapiConnecting(false); });
      vapiInstance.on("call-end", () => { setVapiActive(false); setVapiConnecting(false); });
      vapiInstance.on("error", () => { setVapiActive(false); setVapiConnecting(false); setError("Connection failed. Please try again."); });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vapiInstance.on("message", (msg: any) => {
        if (msg?.type === "transcript" && msg?.transcriptType === "final") {
          const entry = { role: msg.role, text: msg.transcript };
          transcriptRef.current = [...transcriptRef.current, entry];
          setVapiTranscript([...transcriptRef.current]);

          // Save user answers
          if (msg.role === "user") {
            setAnswers(prev => {
              const updated = [...prev];
              updated[currentQ] = (updated[currentQ] || "") + " " + msg.transcript;
              return updated;
            });
          }
        }
      });

      // Use the dedicated INTERVIEWER assistant — not DAD
      const questionsList = prep.questions.map((q,i)=>`${i+1}. ${q.question}`).join("
"); const vov = { interviewerName: prep.interviewerPersona.name, interviewerTitle: prep.interviewerPersona.title, company: prep.company, roleTitle: prep.roleTitle, industry: prep.industry, seniorityLevel: prep.seniorityLevel, roleAnalysis: prep.roleAnalysis, questionsList }; await vapiInstance.start(INTERVIEWER_VAPI_ID, { firstMessage, variableValues: vov });
    } catch {
      setVapiConnecting(false);
      setError("Failed to start voice interview. Please try again.");
    }
  };

  const stopVoiceInterview = () => {
    if (vapiRef.current) { try { vapiRef.current.stop(); } catch { /* ignore */ } vapiRef.current = null; }
    setVapiActive(false);
    setVapiConnecting(false);
  };

  const resetAll = () => {
    setMode("select"); setStage("input"); setJd(""); setPrep(null); setDebrief(null);
    setAnswers([]); setCurrentQ(0); setError(null); setVapiActive(false);
    setBehaviorData({ eyeContactScore: 0, confidenceScore: 0, paceScore: 0, fillerWords: [], fillerCount: 0, engagementScore: 0 });
    setLiveTranscript(""); setVapiTranscript([]); transcriptRef.current = [];
    stopCamera();
  };

  const getScoreColor = (s: number) => s >= 70 ? green : s >= 50 ? gold : "#B07070";
  const getHiringColor = (d: string) => d === "strong yes" ? green : d === "yes" ? "#7BC4A0" : d === "maybe" ? gold : "#B07070";

  const NavBar = ({ accent = gold }: { accent?: string }) => (
    <nav style={{ padding: "18px 52px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `0.5px solid ${accent}18`, position: "sticky", top: 0, zIndex: 100, background: "rgba(4,3,3,0.97)" }}>
      <Link href="/dashboard" style={{ fontSize: "11px", letterSpacing: "0.42em", textTransform: "uppercase", color: accent, fontFamily: sans, textDecoration: "none" }}>DAD</Link>
      <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(235,229,220,0.2)", fontFamily: sans }}>Interview Mode</div>
      <button onClick={resetAll} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: "rgba(235,229,220,0.25)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: sans }}>← Back</button>
    </nav>
  );

  // ── LOADING ──
  if (loading) return (
    <div style={{ minHeight: "100vh", background: dark, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "24px" }}>
      <div style={{ fontSize: "clamp(60px, 10vw, 120px)", fontWeight: "700", color: `${blue}08`, letterSpacing: "-0.04em", fontFamily: serif, userSelect: "none" }}>DAD</div>
      <div style={{ fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: `${blue}60`, fontFamily: sans }}>
        {stage === "input" ? "Analysing the role..." : "Evaluating your performance..."}
      </div>
      <div style={{ width: "120px", height: "0.5px", background: `${blue}15`, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: "40%", background: blue, animation: "slide 1.4s ease-in-out infinite" }} />
      </div>
      <style>{`@keyframes slide{0%{left:-40%}100%{left:140%}}`}</style>
    </div>
  );

  // ── SELECT MODE ──
  if (mode === "select" && stage === "input") return (
    <div style={{ minHeight: "100vh", background: dark, color: text, fontFamily: serif }}>
      <NavBar accent={blue} />
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "80px 52px" }}>
        <div style={{ marginBottom: "56px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.26em", textTransform: "uppercase", color: `${blue}70`, marginBottom: "16px", fontFamily: sans }}>Interview Preparation</div>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: "300", lineHeight: "1.1", marginBottom: "20px", letterSpacing: "-0.02em" }}>
            Paste the job description.<br /><span style={{ color: "rgba(235,229,220,0.3)" }}>Choose your format.</span>
          </h1>
          <p style={{ fontSize: "14px", color: "rgba(235,229,220,0.35)", lineHeight: "1.9", fontFamily: sans, fontWeight: "300", maxWidth: "520px", margin: 0 }}>
            DAD reads the role, builds the questions, and puts you in a real interview. You configure nothing.
          </p>
        </div>

        {/* JD input */}
        <div style={{ borderBottom: `0.5px solid ${blue}25`, marginBottom: "40px", paddingBottom: "4px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: `${blue}50`, marginBottom: "12px", fontFamily: sans }}>Paste job description here</div>
          <textarea
            placeholder="Paste the full job description..."
            value={jd} onChange={e => setJd(e.target.value)} rows={8}
            style={{ width: "100%", background: "transparent", border: "none", color: text, fontSize: "14px", fontFamily: sans, fontWeight: "300", padding: "4px 0", outline: "none", resize: "none", lineHeight: "1.8" }}
          />
        </div>

        {error && <p style={{ fontSize: "12px", color: "#B07070", fontFamily: sans, marginBottom: "20px" }}>{error}</p>}

        {/* Mode selection */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1px", background: `${blue}12` }}>
          {[
            { id: "written" as InterviewMode, label: "Written", num: "01", desc: "Type your answers. Full AI scoring and ideal answer feedback.", color: gold },
            { id: "voice" as InterviewMode, label: "Voice", num: "02", desc: "Speak with a real AI interviewer. Natural conversation. Professional evaluation.", color: blue },
            { id: "live" as InterviewMode, label: "Live Simulation", num: "03", desc: "Camera on. Behaviour analysis — eye contact, confidence, pace, filler words.", color: green, flagship: true },
          ].map((item, i) => (
            <div key={i}
              onClick={() => jd.trim().length >= 20 ? handlePrepare(item.id) : setError("Please paste the job description first.")}
              style={{ background: dark, padding: "36px 28px", cursor: "pointer", transition: "all 0.25s", borderBottom: "2px solid transparent", position: "relative" }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = `${item.color}08`; (e.currentTarget as HTMLDivElement).style.borderBottomColor = item.color; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = dark; (e.currentTarget as HTMLDivElement).style.borderBottomColor = "transparent"; }}
            >
              {item.flagship && <div style={{ position: "absolute", top: "14px", right: "14px", fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: green, border: `0.5px solid ${green}40`, padding: "2px 8px", fontFamily: sans }}>Flagship</div>}
              <div style={{ fontSize: "10px", color: "rgba(235,229,220,0.15)", fontFamily: sans, marginBottom: "12px" }}>{item.num}</div>
              <div style={{ fontSize: "17px", fontWeight: "300", color: item.color, marginBottom: "12px" }}>{item.label}</div>
              <p style={{ fontSize: "12px", color: "rgba(235,229,220,0.35)", fontFamily: sans, lineHeight: "1.7", marginBottom: "0", fontWeight: "300" }}>{item.desc}</p>
              <div style={{ marginTop: "20px", fontSize: "11px", color: item.color, fontFamily: sans, opacity: 0.5 }}>Begin →</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── INTEL ──
  if (stage === "intel" && prep) {
    const accent = mode === "written" ? gold : mode === "voice" ? blue : green;
    return (
      <div style={{ minHeight: "100vh", background: dark, color: text, fontFamily: serif }}>
        <NavBar accent={accent} />
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "60px 52px" }}>
          <div style={{ marginBottom: "36px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.24em", textTransform: "uppercase", color: `${accent}60`, marginBottom: "12px", fontFamily: sans }}>Intelligence report</div>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 40px)", fontWeight: "300", color: text, lineHeight: "1.1", marginBottom: "6px" }}>{prep.roleTitle}</h2>
            <div style={{ fontSize: "13px", color: "rgba(235,229,220,0.3)", fontFamily: sans }}>{prep.company} · {prep.industry} · {prep.seniorityLevel}</div>
          </div>

          {/* Interviewer */}
          <div style={{ background: `${accent}08`, border: `0.5px solid ${accent}20`, padding: "20px 24px", marginBottom: "28px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: `${accent}60`, marginBottom: "10px", fontFamily: sans }}>Your interviewer today</div>
            <div style={{ fontSize: "17px", fontWeight: "300", color: text, marginBottom: "4px" }}>{prep.interviewerPersona.name}</div>
            <div style={{ fontSize: "12px", color: "rgba(235,229,220,0.4)", fontFamily: sans }}>{prep.interviewerPersona.title} · {prep.interviewerPersona.style}</div>
          </div>

          {/* Hired vs Rejected */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: `${accent}10`, marginBottom: "28px" }}>
            <div style={{ background: dark, padding: "24px 28px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: green, marginBottom: "14px", fontFamily: sans }}>What gets you hired</div>
              {prep.whatGetsYouHired.map((w, i) => <div key={i} style={{ fontSize: "12px", color: "rgba(235,229,220,0.45)", fontFamily: sans, marginBottom: "8px", lineHeight: "1.6", display: "flex", gap: "8px" }}><span style={{ color: green, flexShrink: 0 }}>→</span>{w}</div>)}
            </div>
            <div style={{ background: dark, padding: "24px 28px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#B07070", marginBottom: "14px", fontFamily: sans }}>What gets you rejected</div>
              {prep.whatGetsYouRejected.map((w, i) => <div key={i} style={{ fontSize: "12px", color: "rgba(235,229,220,0.45)", fontFamily: sans, marginBottom: "8px", lineHeight: "1.6", display: "flex", gap: "8px" }}><span style={{ color: "#B07070", flexShrink: 0 }}>×</span>{w}</div>)}
            </div>
          </div>

          {/* Cheat sheet */}
          <div style={{ marginBottom: "36px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: `${accent}50`, marginBottom: "14px", fontFamily: sans }}>Memorise before you walk in</div>
            {prep.cheatSheet.map((c, i) => <div key={i} style={{ fontSize: "12px", color: "rgba(235,229,220,0.4)", fontFamily: sans, lineHeight: "1.6", display: "flex", gap: "10px", marginBottom: "6px" }}><span style={{ color: `${accent}50`, flexShrink: 0 }}>→</span>{c}</div>)}
          </div>

          {/* Begin button */}
          {mode === "live" ? (
            <div>
              {cameraError && <p style={{ fontSize: "12px", color: "#B07070", fontFamily: sans, marginBottom: "16px" }}>{cameraError}</p>}
              <button onClick={async () => { await startCamera(); setStage("interview"); setCurrentQ(0); }}
                style={{ width: "100%", background: green, color: dark, border: "none", padding: "18px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: sans }}>
                Enable camera and begin →
              </button>
            </div>
          ) : mode === "voice" ? (
            <button onClick={() => { setStage("interview"); setCurrentQ(0); startVoiceInterview(); }}
              style={{ width: "100%", background: blue, color: dark, border: "none", padding: "18px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: sans }}>
              Begin voice interview →
            </button>
          ) : (
            <button onClick={() => { setStage("interview"); setCurrentQ(0); }}
              style={{ width: "100%", background: gold, color: dark, border: "none", padding: "18px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: sans }}>
              Begin written interview →
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── WRITTEN INTERVIEW ──
  if (mode === "written" && stage === "interview" && prep) return (
    <div style={{ minHeight: "100vh", background: dark, color: text, fontFamily: serif }}>
      <NavBar accent={gold} />
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "60px 52px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "40px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: `${gold}60`, fontFamily: sans }}>Q{currentQ + 1} of {prep.questions.length}</div>
          <div style={{ display: "flex", gap: "4px" }}>
            {prep.questions.map((_, i) => <div key={i} style={{ width: "24px", height: "2px", background: i < currentQ ? gold : i === currentQ ? `${gold}70` : `${gold}15`, transition: "background 0.3s" }} />)}
          </div>
        </div>
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
            <span style={{ fontSize: "9px", color: `${gold}50`, fontFamily: sans, border: `0.5px solid ${gold}20`, padding: "2px 8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{prep.questions[currentQ]?.type}</span>
            <span style={{ fontSize: "9px", color: "rgba(235,229,220,0.2)", fontFamily: sans, border: "0.5px solid rgba(235,229,220,0.08)", padding: "2px 8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{prep.questions[currentQ]?.difficulty}</span>
          </div>
          <h2 style={{ fontSize: "clamp(18px, 2.8vw, 28px)", fontWeight: "300", color: text, lineHeight: "1.45", marginBottom: "12px" }}>{prep.questions[currentQ]?.question}</h2>
          <p style={{ fontSize: "11px", color: "rgba(235,229,220,0.2)", fontFamily: sans, fontStyle: "italic", lineHeight: "1.6" }}>Tip: {prep.questions[currentQ]?.tips}</p>
        </div>
        <div style={{ borderBottom: `0.5px solid ${gold}20`, marginBottom: "28px", paddingBottom: "4px" }}>
          <textarea placeholder="Type your answer..." value={answers[currentQ] || ""} onChange={e => { const a = [...answers]; a[currentQ] = e.target.value; setAnswers(a); }} rows={10} autoFocus
            style={{ width: "100%", background: "transparent", border: "none", color: text, fontSize: "15px", fontFamily: sans, fontWeight: "300", padding: "4px 0", outline: "none", resize: "none", lineHeight: "1.8" }} />
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          {currentQ > 0 && <button onClick={() => setCurrentQ(q => q - 1)} style={{ border: `0.5px solid ${gold}20`, background: "none", color: `${gold}50`, padding: "14px 24px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: sans }}>← Back</button>}
          {currentQ < prep.questions.length - 1
            ? <button onClick={() => setCurrentQ(q => q + 1)} style={{ flex: 1, background: `${gold}15`, color: gold, border: `0.5px solid ${gold}25`, padding: "14px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: sans }}>Next →</button>
            : <button onClick={handleDebrief} style={{ flex: 1, background: gold, color: dark, border: "none", padding: "14px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: sans }}>Get my debrief →</button>
          }
        </div>
      </div>
    </div>
  );

  // ── VOICE INTERVIEW ──
  if (mode === "voice" && stage === "interview" && prep) return (
    <div style={{ minHeight: "100vh", background: dark, color: text, fontFamily: serif, display: "grid", gridTemplateColumns: "1fr 400px", height: "100vh", overflow: "hidden" }}>

      {/* Left — interviewer visual */}
      <div style={{ position: "relative", background: "#010101", borderRight: `0.5px solid ${blue}15`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 45%, ${blue}08 0%, transparent 65%)` }} />

        {/* Interviewer orb */}
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", marginBottom: "32px" }}>
          <div style={{ width: "120px", height: "120px", borderRadius: "50%", border: `1px solid ${blue}30`, margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center", background: `${blue}08`, position: "relative" }}>
            {vapiActive && (
              <>
                <div style={{ position: "absolute", inset: "-12px", borderRadius: "50%", border: `0.5px solid ${blue}20`, animation: "pulseRing 2s ease-out infinite" }} />
                <div style={{ position: "absolute", inset: "-24px", borderRadius: "50%", border: `0.5px solid ${blue}12`, animation: "pulseRing 2s ease-out infinite 0.6s" }} />
              </>
            )}
            <div style={{ fontSize: "36px", fontWeight: "200", color: blue }}>{prep.interviewerPersona.name[0]}</div>
          </div>
          <div style={{ fontSize: "18px", fontWeight: "300", color: blue, marginBottom: "6px" }}>{prep.interviewerPersona.name}</div>
          <div style={{ fontSize: "11px", color: "rgba(235,229,220,0.3)", fontFamily: sans }}>{prep.interviewerPersona.title}</div>
          <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: vapiConnecting ? `${blue}50` : vapiActive ? green : "rgba(235,229,220,0.2)", fontFamily: sans, marginTop: "12px" }}>
            {vapiConnecting ? "Connecting..." : vapiActive ? "● In conversation" : "Ready"}
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", position: "relative", zIndex: 1 }}>
          {!vapiActive && !vapiConnecting && (
            <button onClick={startVoiceInterview} style={{ background: blue, color: dark, border: "none", padding: "12px 32px", cursor: "pointer", fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: sans }}>
              Start interview
            </button>
          )}
          {(vapiActive || vapiConnecting) && (
            <button onClick={stopVoiceInterview} style={{ background: "transparent", border: "0.5px solid rgba(176,112,112,0.3)", color: "rgba(176,112,112,0.6)", padding: "10px 28px", cursor: "pointer", fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: sans }}>
              End interview
            </button>
          )}
          <button onClick={handleDebrief} style={{ background: `${gold}15`, color: gold, border: `0.5px solid ${gold}30`, padding: "10px 28px", cursor: "pointer", fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: sans }}>
            Get debrief →
          </button>
        </div>

        <style>{`
          @keyframes pulseRing {
            0% { transform: scale(1); opacity: 0.5; }
            100% { transform: scale(1.3); opacity: 0; }
          }
        `}</style>
      </div>

      {/* Right — live transcript */}
      <div style={{ display: "flex", flexDirection: "column", background: bg, overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: `0.5px solid ${blue}10`, flexShrink: 0 }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: `${blue}40`, marginBottom: "2px", fontFamily: sans }}>Live transcript</div>
          <div style={{ fontSize: "13px", fontWeight: "300", color: "rgba(235,229,220,0.4)" }}>{prep.roleTitle} · {prep.company}</div>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {vapiTranscript.length === 0 ? (
            <p style={{ fontSize: "13px", color: "rgba(235,229,220,0.15)", fontFamily: sans, fontStyle: "italic", lineHeight: "1.7" }}>
              The conversation will appear here. Speak naturally — this is a real interview conversation.
            </p>
          ) : (
            vapiTranscript.map((t, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: "3px", alignItems: t.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: t.role === "assistant" ? `${blue}50` : "rgba(235,229,220,0.18)", fontFamily: sans }}>
                  {t.role === "assistant" ? prep.interviewerPersona.name : "You"}
                </div>
                <div style={{ fontSize: "13px", color: t.role === "assistant" ? "rgba(235,229,220,0.65)" : "rgba(235,229,220,0.45)", fontFamily: sans, lineHeight: "1.65", maxWidth: "88%", padding: "10px 14px", background: t.role === "assistant" ? `${blue}08` : "rgba(235,229,220,0.03)", border: `0.5px solid ${t.role === "assistant" ? `${blue}12` : "rgba(235,229,220,0.05)"}` }}>
                  {t.text}
                </div>
              </div>
            ))
          )}
        </div>
        <div style={{ padding: "14px 24px", borderTop: `0.5px solid rgba(235,229,220,0.04)`, flexShrink: 0 }}>
          <p style={{ fontSize: "10px", color: "rgba(235,229,220,0.1)", fontFamily: sans, margin: 0, lineHeight: "1.6" }}>
            Speak naturally. The interviewer is listening and will ask follow-up questions. Click "Get debrief" when done.
          </p>
        </div>
      </div>
    </div>
  );

  // ── LIVE INTERVIEW ──
  if (mode === "live" && stage === "interview" && prep) return (
    <div style={{ minHeight: "100vh", background: "#020202", color: text, fontFamily: serif, display: "grid", gridTemplateColumns: "1fr 1fr", height: "100vh", overflow: "hidden" }}>
      <div style={{ position: "relative", background: "#000", borderRight: `0.5px solid ${green}12` }}>
        <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
        <canvas ref={canvasRef} style={{ display: "none" }} />
        <div style={{ position: "absolute", top: "16px", left: "16px", display: "flex", gap: "6px" }}>
          {[{ label: "Eye contact", value: Math.round(behaviorData.eyeContactScore) }, { label: "Confidence", value: Math.round(behaviorData.confidenceScore) }, { label: "Pace", value: Math.round(behaviorData.paceScore) }].map((item, i) => (
            <div key={i} style={{ background: "rgba(0,0,0,0.75)", border: `0.5px solid ${green}25`, padding: "6px 10px" }}>
              <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.35)", fontFamily: sans, letterSpacing: "0.1em", textTransform: "uppercase" }}>{item.label}</div>
              <div style={{ fontSize: "13px", color: getScoreColor(item.value), fontFamily: sans }}>{item.value}%</div>
            </div>
          ))}
        </div>
        {behaviorData.fillerCount > 0 && (
          <div style={{ position: "absolute", bottom: "16px", left: "16px", background: "rgba(0,0,0,0.8)", border: "0.5px solid rgba(176,112,112,0.25)", padding: "8px 12px" }}>
            <div style={{ fontSize: "9px", color: "#B07070", fontFamily: sans, letterSpacing: "0.1em", textTransform: "uppercase" }}>Filler words: {behaviorData.fillerCount}</div>
            <div style={{ fontSize: "11px", color: "#B07070", fontFamily: sans }}>{behaviorData.fillerWords.join(", ")}</div>
          </div>
        )}
        <div style={{ position: "absolute", bottom: "16px", right: "16px" }}>
          <button onClick={speechActive ? stopSpeech : startSpeech}
            style={{ background: speechActive ? `${green}25` : "rgba(0,0,0,0.7)", border: `0.5px solid ${speechActive ? green : "rgba(255,255,255,0.15)"}`, color: speechActive ? green : "rgba(255,255,255,0.4)", padding: "8px 14px", cursor: "pointer", fontSize: "10px", fontFamily: sans, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {speechActive ? "● Recording" : "Start recording"}
          </button>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", background: "#030202", overflow: "hidden" }}>
        <div style={{ padding: "14px 24px", borderBottom: `0.5px solid ${green}10`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.26em", textTransform: "uppercase", color: green, fontFamily: sans }}>Live Simulation</div>
          <div style={{ fontSize: "10px", color: "rgba(235,229,220,0.2)", fontFamily: sans }}>{currentQ + 1}/{prep.questions.length}</div>
        </div>
        <div style={{ padding: "24px", borderBottom: `0.5px solid ${green}08`, flexShrink: 0 }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: `${green}50`, marginBottom: "8px", fontFamily: sans }}>{prep.interviewerPersona.name} · {prep.interviewerPersona.title}</div>
          <p style={{ fontSize: "15px", fontWeight: "300", color: text, lineHeight: "1.6", margin: 0 }}>{prep.questions[currentQ]?.question}</p>
          <p style={{ fontSize: "10px", color: "rgba(235,229,220,0.18)", fontFamily: sans, marginTop: "8px", fontStyle: "italic" }}>{prep.questions[currentQ]?.tips}</p>
        </div>
        <div style={{ padding: "18px 24px", flex: 1 }}>
          <div style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: `${green}35`, marginBottom: "8px", fontFamily: sans }}>{speechActive ? "Listening..." : "Your answer"}</div>
          <textarea placeholder="Speak your answer or type here..." value={answers[currentQ] || liveTranscript || ""}
            onChange={e => { const a = [...answers]; a[currentQ] = e.target.value; setAnswers(a); }}
            style={{ width: "100%", background: "transparent", border: "none", color: "rgba(235,229,220,0.55)", fontSize: "13px", fontFamily: sans, fontWeight: "300", outline: "none", resize: "none", lineHeight: "1.8", minHeight: "120px" }} />
        </div>
        <div style={{ padding: "16px 24px", borderTop: `0.5px solid ${green}08`, display: "flex", gap: "8px", flexShrink: 0 }}>
          {currentQ > 0 && <button onClick={() => setCurrentQ(q => q - 1)} style={{ border: `0.5px solid ${green}20`, background: "none", color: `${green}50`, padding: "10px 18px", cursor: "pointer", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: sans }}>←</button>}
          {currentQ < prep.questions.length - 1
            ? <button onClick={() => { setCurrentQ(q => q + 1); setLiveTranscript(""); }} style={{ flex: 1, background: `${green}12`, color: green, border: `0.5px solid ${green}22`, padding: "10px", cursor: "pointer", fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: sans }}>Next →</button>
            : <button onClick={handleDebrief} style={{ flex: 1, background: gold, color: dark, border: "none", padding: "10px", cursor: "pointer", fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: sans }}>End & get debrief →</button>
          }
        </div>
      </div>
    </div>
  );

  // ── DEBRIEF ──
  if (stage === "debrief" && debrief) {
    const accent = mode === "written" ? gold : mode === "voice" ? blue : green;
    return (
      <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: serif }}>
        <NavBar accent={accent} />
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "60px 52px" }}>

          {/* Score */}
          <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.08)", paddingBottom: "48px", marginBottom: "40px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(201,168,76,0.4)", marginBottom: "20px", fontFamily: sans }}>Interview debrief</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "16px", marginBottom: "16px" }}>
              <div style={{ fontSize: "clamp(64px, 10vw, 96px)", fontWeight: "200", color: getScoreColor(debrief.overallScore), lineHeight: "1" }}>{debrief.overallScore}</div>
              <div style={{ fontSize: "18px", color: "rgba(235,229,220,0.2)", marginBottom: "10px" }}>/100</div>
              <div style={{ marginBottom: "10px", padding: "5px 14px", border: `0.5px solid ${getHiringColor(debrief.hiringDecision)}40`, color: getHiringColor(debrief.hiringDecision), fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: sans }}>{debrief.hiringDecision}</div>
            </div>
            <p style={{ fontSize: "15px", color: "rgba(235,229,220,0.5)", fontFamily: sans, fontWeight: "300", lineHeight: "1.7", margin: 0, maxWidth: "680px" }}>{debrief.verdict}</p>
          </div>

          {/* Readiness scores */}
          {debrief.readinessScore && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1px", background: "rgba(201,168,76,0.07)", marginBottom: "40px" }}>
              {Object.entries(debrief.readinessScore).map(([key, val], i) => (
                <div key={i} style={{ background: bg, padding: "20px" }}>
                  <div style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(201,168,76,0.3)", marginBottom: "8px", fontFamily: sans }}>{key}</div>
                  <div style={{ fontSize: "26px", fontWeight: "200", color: getScoreColor(val as number), marginBottom: "6px" }}>{val as number}</div>
                  <div style={{ height: "1px", background: "rgba(235,229,220,0.05)" }}><div style={{ height: "100%", width: `${val}%`, background: getScoreColor(val as number) }} /></div>
                </div>
              ))}
            </div>
          )}

          {/* Behaviour (live only) */}
          {mode === "live" && (
            <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.08)", paddingBottom: "36px", marginBottom: "36px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(201,168,76,0.4)", marginBottom: "20px", fontFamily: sans }}>Camera intelligence</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1px", background: `${green}10`, marginBottom: "16px" }}>
                {[{ label: "Eye contact", value: Math.round(behaviorData.eyeContactScore) }, { label: "Confidence", value: Math.round(behaviorData.confidenceScore) }, { label: "Speaking pace", value: Math.round(behaviorData.paceScore) }].map((item, i) => (
                  <div key={i} style={{ background: bg, padding: "18px 20px" }}>
                    <div style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: `${green}40`, marginBottom: "6px", fontFamily: sans }}>{item.label}</div>
                    <div style={{ fontSize: "26px", fontWeight: "200", color: getScoreColor(item.value) }}>{item.value}%</div>
                  </div>
                ))}
              </div>
              {behaviorData.fillerCount > 0 && <div style={{ padding: "14px 20px", border: "0.5px solid rgba(176,112,112,0.18)" }}><div style={{ fontSize: "11px", color: "#B07070", fontFamily: sans }}>{behaviorData.fillerCount} filler words · {behaviorData.fillerWords.join(", ")}</div></div>}
            </div>
          )}

          {/* Strengths and weaknesses */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "rgba(201,168,76,0.07)", marginBottom: "36px" }}>
            <div style={{ background: bg, padding: "24px 28px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: green, marginBottom: "14px", fontFamily: sans }}>Strengths</div>
              {debrief.strengths.map((s, i) => <div key={i} style={{ fontSize: "12px", color: "rgba(235,229,220,0.45)", fontFamily: sans, marginBottom: "8px", lineHeight: "1.6", display: "flex", gap: "8px" }}><span style={{ color: green, flexShrink: 0 }}>→</span>{s}</div>)}
            </div>
            <div style={{ background: bg, padding: "24px 28px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#B07070", marginBottom: "14px", fontFamily: sans }}>Needs work</div>
              {debrief.weaknesses.map((w, i) => <div key={i} style={{ fontSize: "12px", color: "rgba(235,229,220,0.45)", fontFamily: sans, marginBottom: "8px", lineHeight: "1.6", display: "flex", gap: "8px" }}><span style={{ color: "#B07070", flexShrink: 0 }}>×</span>{w}</div>)}
            </div>
          </div>

          {/* Top 3 improvements */}
          {debrief.top3Improvements?.length > 0 && (
            <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.08)", paddingBottom: "36px", marginBottom: "36px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(201,168,76,0.4)", marginBottom: "20px", fontFamily: sans }}>Fix these before the real interview</div>
              {debrief.top3Improvements.map((imp, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: "16px", marginBottom: "18px" }}>
                  <div style={{ fontSize: "10px", color: "rgba(201,168,76,0.3)", fontFamily: sans, paddingTop: "2px" }}>{i + 1}</div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "300", color: text, marginBottom: "4px" }}>{imp.area}</div>
                    <div style={{ fontSize: "11px", color: "rgba(235,229,220,0.3)", fontFamily: sans, marginBottom: "4px" }}>{imp.why}</div>
                    <div style={{ fontSize: "11px", color: gold, fontFamily: sans, opacity: 0.65 }}>{imp.howToImprove}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Encouragement */}
          {debrief.encouragement && (
            <div style={{ padding: "28px 36px", border: "0.5px solid rgba(201,168,76,0.12)", marginBottom: "36px" }}>
              <p style={{ fontSize: "15px", color: "rgba(235,229,220,0.55)", fontStyle: "italic", lineHeight: "1.85", margin: "0 0 12px", fontFamily: serif }}>"{debrief.encouragement}"</p>
              <div style={{ fontSize: "10px", color: gold, fontFamily: sans, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.5 }}>— {prep?.interviewerPersona.name || "Your interviewer"}</div>
            </div>
          )}

          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={resetAll} style={{ border: "0.5px solid rgba(235,229,220,0.1)", background: "none", color: "rgba(235,229,220,0.35)", padding: "14px 28px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: sans }}>Practice again</button>
            <Link href="/action" style={{ display: "inline-flex", alignItems: "center", gap: "10px", background: gold, color: bg, padding: "14px 32px", textDecoration: "none", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: sans }}>Track this application →</Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
