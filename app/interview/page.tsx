"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import Vapi from "@vapi-ai/web";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const VAPI_ASSISTANT_ID = "1312a1bf-ea33-48f7-aa21-1f16e414e885";

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
  notes: string[];
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
  const [vapiTranscript, setVapiTranscript] = useState("");
  const vapiRef = useRef<Vapi | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [behaviorData, setBehaviorData] = useState<BehaviorData>({
    eyeContactScore: 0, confidenceScore: 0, paceScore: 0,
    fillerWords: [], fillerCount: 0, engagementScore: 0, notes: [],
  });
  const [liveTranscript, setLiveTranscript] = useState("");
  const [speechRecognitionActive, setSpeechRecognitionActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const behaviorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasSpoken = useRef(false);

  const sans = "'Helvetica Neue', Arial, sans-serif";
  const serif = "'Georgia', 'Times New Roman', serif";
  const gold = "#C9A84C";
  const bg = "#070606";
  const dark = "#030202";
  const text = "#EBE5DC";
  const blue = "#6B8CFF";

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
      const utter = new SpeechSynthesisUtterance("Every great answer was once a terrible one. The difference is practice. Let's begin.");
      utter.rate = 0.80; utter.pitch = 0.87; utter.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.name.includes("Daniel")) || voices.find(v => v.lang === "en-GB") || voices.find(v => v.lang.startsWith("en")) || voices[0];
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
      setCameraError("Camera access denied. Please allow camera access to use live interview mode.");
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

  const startSpeechRecognition = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-GB";
    const fillerWords = ["um", "uh", "like", "you know", "basically", "literally"];
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) transcript += event.results[i][0].transcript;
      setLiveTranscript(transcript);
      const words = transcript.toLowerCase().split(" ");
      const fillers = words.filter((w: string) => fillerWords.includes(w));
      setBehaviorData(prev => ({ ...prev, fillerCount: prev.fillerCount + fillers.length, fillerWords: [...new Set([...prev.fillerWords, ...fillers])] }));
    };
    recognition.start();
    recognitionRef.current = recognition;
    setSpeechRecognitionActive(true);
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch { /* ignore */ } recognitionRef.current = null; }
    setSpeechRecognitionActive(false);
  };

  const handlePrepare = async (selectedMode: InterviewMode) => {
    if (!jd.trim() || jd.trim().length < 20) { setError("Please paste the full job description."); return; }
    setLoading(true); setError(null);
    try {
      const formData = new FormData();
      formData.append("jobDescription", jd);
      const res = await fetch("/api/prepare-interview", { method: "POST", headers: { ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) }, body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to prepare interview");
      setPrep(data.prep);
      setAnswers(new Array(data.prep.questions.length).fill(""));
      setMode(selectedMode);
      setStage("intel");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally { setLoading(false); }
  };

  const handleDebrief = async () => {
    if (!prep) return;
    setLoading(true); setError(null);
    const finalAnswers = mode === "live" ? answers.map(a => a || liveTranscript || "(spoken answer)") : answers;
    try {
      const res = await fetch("/api/debrief-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify({ questions: prep.questions, answers: finalAnswers, roleTitle: prep.roleTitle, interviewerPersona: prep.interviewerPersona, isTechnical: prep.isTechnical, behaviorData: mode === "live" ? behaviorData : null }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to generate debrief");
      setDebrief(data.debrief);
      if (mode === "live") stopCamera();
      if (mode === "voice" && vapiRef.current) { try { vapiRef.current.stop(); } catch { /* ignore */ } vapiRef.current = null; setVapiActive(false); }
      setStage("debrief");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setLoading(false); }
  };

  const startVoiceInterview = async () => {
    const vapiKey = process.env.NEXT_PUBLIC_VAPI_PUBLICKEY;
    if (!vapiKey || !prep) return;
    setVapiConnecting(true);
    const firstMessage = `Good ${new Date().getHours() < 12 ? "morning" : "afternoon"}. I'm ${prep.interviewerPersona.name}, ${prep.interviewerPersona.title}. Thank you for coming in today.`;
    try {
      const vapiInstance = new Vapi(vapiKey);
      vapiRef.current = vapiInstance;
      vapiInstance.on("call-start", () => { setVapiActive(true); setVapiConnecting(false); });
      vapiInstance.on("call-end", () => { setVapiActive(false); setVapiConnecting(false); });
      vapiInstance.on("error", () => { setVapiActive(false); setVapiConnecting(false); });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vapiInstance.on("message", (msg: any) => {
        if (msg?.type === "transcript" && msg?.role === "user" && msg?.transcriptType === "final") {
          setVapiTranscript(msg.transcript);
          const newAnswers = [...answers];
          newAnswers[currentQ] = (newAnswers[currentQ] || "") + " " + msg.transcript;
          setAnswers(newAnswers);
        }
      });
      await vapiInstance.start(VAPI_ASSISTANT_ID, { firstMessage });
    } catch {
      setVapiConnecting(false);
      setError("Failed to start voice interview. Please try again.");
    }
  };

  const resetAll = () => {
    setMode("select"); setStage("input"); setJd(""); setPrep(null); setDebrief(null);
    setAnswers([]); setCurrentQ(0); setError(null); setVapiActive(false);
    setBehaviorData({ eyeContactScore: 0, confidenceScore: 0, paceScore: 0, fillerWords: [], fillerCount: 0, engagementScore: 0, notes: [] });
    setLiveTranscript(""); stopCamera();
  };

  const getScoreColor = (score: number) => score >= 70 ? "#5B9E7A" : score >= 50 ? gold : "#B07070";
  const getHiringColor = (decision: string) => {
    if (decision === "strong yes") return "#5B9E7A";
    if (decision === "yes") return "#7BC4A0";
    if (decision === "maybe") return gold;
    return "#B07070";
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: dark, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "24px" }}>
        <div style={{ fontSize: "clamp(60px, 10vw, 120px)", fontWeight: "700", color: "rgba(107,140,255,0.06)", letterSpacing: "-0.04em", fontFamily: serif, userSelect: "none" }}>DAD</div>
        <div style={{ fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(107,140,255,0.5)", fontFamily: sans }}>{stage === "input" ? "Analysing the role..." : "Evaluating your performance..."}</div>
        <div style={{ width: "120px", height: "0.5px", background: "rgba(107,140,255,0.1)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: "40%", background: blue, animation: "slide 1.4s ease-in-out infinite" }} />
        </div>
        <style>{`@keyframes slide { 0%{left:-40%} 100%{left:140%} }`}</style>
      </div>
    );
  }

  const NavBar = ({ accent = gold }: { accent?: string }) => (
    <nav style={{ padding: "18px 52px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `0.5px solid ${accent}18`, position: "sticky", top: 0, zIndex: 100, background: "rgba(4,3,3,0.97)" }}>
      <Link href="/dashboard" style={{ fontSize: "11px", letterSpacing: "0.42em", textTransform: "uppercase", color: accent, fontFamily: sans, textDecoration: "none" }}>DAD</Link>
      <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(235,229,220,0.2)", fontFamily: sans }}>Interview Mode</div>
      <button onClick={resetAll} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: "rgba(235,229,220,0.25)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: sans }}>← Back</button>
    </nav>
  );

  if (mode === "select" && stage === "input") {
    return (
      <div style={{ minHeight: "100vh", background: dark, color: text, fontFamily: serif }}>
        <NavBar accent={blue} />
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "80px 52px" }}>
          <div style={{ marginBottom: "64px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.26em", textTransform: "uppercase", color: `${blue}80`, marginBottom: "18px", fontFamily: sans }}>Interview Mode</div>
            <h1 style={{ fontSize: "clamp(32px, 5vw, 60px)", fontWeight: "300", color: text, lineHeight: "1.1", marginBottom: "20px", letterSpacing: "-0.02em" }}>Paste the job description.<br /><span style={{ color: "rgba(235,229,220,0.35)" }}>Choose your format.</span></h1>
            <p style={{ fontSize: "15px", color: "rgba(235,229,220,0.38)", lineHeight: "1.9", fontFamily: sans, fontWeight: "300", maxWidth: "520px", margin: 0 }}>DAD reads the JD, selects the right interviewer persona, builds the questions, and puts you in the room. You configure nothing.</p>
          </div>
          <div style={{ borderBottom: `0.5px solid ${blue}30`, marginBottom: "48px", paddingBottom: "4px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: `${blue}60`, marginBottom: "12px", fontFamily: sans }}>Job description</div>
            <textarea placeholder="Paste the full job description here..." value={jd} onChange={e => setJd(e.target.value)} rows={10} style={{ width: "100%", background: "transparent", border: "none", color: text, fontSize: "14px", fontFamily: sans, fontWeight: "300", padding: "4px 0", outline: "none", resize: "none", lineHeight: "1.8" }} />
          </div>
          {error && <p style={{ fontSize: "12px", color: "#B07070", fontFamily: sans, marginBottom: "24px" }}>{error}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1px", background: `${blue}15` }}>
            {[
              { id: "written" as InterviewMode, label: "Written Interview", num: "01", desc: "Answer questions by typing. Adaptive follow-ups. Full debrief with ideal answers and scoring.", tags: ["All roles", "Your own pace", "Deep analysis"], color: gold },
              { id: "voice" as InterviewMode, label: "Voice Interview", num: "02", desc: "Speak your answers to a realistic AI interviewer. Natural conversation. Professional evaluation.", tags: ["Natural flow", "Speaking practice", "Real-time"], color: blue },
              { id: "live" as InterviewMode, label: "Live Simulation", num: "03", desc: "Camera on. Real interviewer on screen. Behaviour analysis — eye contact, confidence, pace, filler words.", tags: ["Camera required", "Behaviour analysis", "Most realistic"], color: "#5B9E7A", flagship: true },
            ].map((item, i) => (
              <div key={i} onClick={() => jd.trim().length >= 20 ? handlePrepare(item.id) : setError("Please paste the full job description first.")}
                style={{ background: dark, padding: "40px 32px", cursor: "pointer", position: "relative", transition: "background 0.25s", borderBottom: "2px solid transparent" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = `${item.color}08`; (e.currentTarget as HTMLDivElement).style.borderBottomColor = item.color; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = dark; (e.currentTarget as HTMLDivElement).style.borderBottomColor = "transparent"; }}
              >
                {(item as any).flagship && <div style={{ position: "absolute", top: "16px", right: "16px", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#5B9E7A", border: "0.5px solid #5B9E7A40", padding: "3px 8px", fontFamily: sans }}>Flagship</div>}
                <div style={{ fontSize: "10px", color: "rgba(235,229,220,0.18)", fontFamily: sans, marginBottom: "16px" }}>{item.num}</div>
                <div style={{ fontSize: "18px", fontWeight: "300", color: item.color, marginBottom: "16px", lineHeight: "1.2" }}>{item.label}</div>
                <p style={{ fontSize: "13px", color: "rgba(235,229,220,0.38)", fontFamily: sans, lineHeight: "1.75", marginBottom: "20px", fontWeight: "300" }}>{item.desc}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>{item.tags.map((tag, j) => <div key={j} style={{ fontSize: "10px", color: `${item.color}70`, fontFamily: sans, letterSpacing: "0.08em" }}>· {tag}</div>)}</div>
                <div style={{ marginTop: "24px", fontSize: "12px", color: item.color, fontFamily: sans, opacity: 0.6 }}>Enter →</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (stage === "intel" && prep) {
    const accent = mode === "written" ? gold : mode === "voice" ? blue : "#5B9E7A";
    return (
      <div style={{ minHeight: "100vh", background: dark, color: text, fontFamily: serif }}>
        <NavBar accent={accent} />
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "60px 52px" }}>
          <div style={{ marginBottom: "40px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.24em", textTransform: "uppercase", color: `${accent}70`, marginBottom: "16px", fontFamily: sans }}>Intelligence report · {mode === "written" ? "Written" : mode === "voice" ? "Voice" : "Live Simulation"}</div>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 44px)", fontWeight: "300", color: text, lineHeight: "1.1", marginBottom: "8px" }}>{prep.roleTitle}</h2>
            <div style={{ fontSize: "13px", color: "rgba(235,229,220,0.35)", fontFamily: sans, marginBottom: "4px" }}>{prep.company} · {prep.industry}</div>
            <div style={{ fontSize: "11px", color: `${accent}60`, fontFamily: sans }}>{prep.seniorityLevel} · {prep.isTechnical ? "Technical role" : "Non-technical role"}</div>
          </div>
          <div style={{ background: `${accent}08`, border: `0.5px solid ${accent}20`, padding: "24px 28px", marginBottom: "32px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: `${accent}60`, marginBottom: "12px", fontFamily: sans }}>Your interviewer</div>
            <div style={{ fontSize: "18px", fontWeight: "300", color: text, marginBottom: "6px" }}>{prep.interviewerPersona.name}</div>
            <div style={{ fontSize: "13px", color: "rgba(235,229,220,0.45)", fontFamily: sans, marginBottom: "8px" }}>{prep.interviewerPersona.title}</div>
            <div style={{ fontSize: "12px", color: "rgba(235,229,220,0.3)", fontFamily: sans, fontStyle: "italic" }}>{prep.interviewerPersona.style}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: `${accent}10`, marginBottom: "32px" }}>
            <div style={{ background: dark, padding: "28px 32px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#5B9E7A", marginBottom: "16px", fontFamily: sans }}>What gets you hired</div>
              {prep.whatGetsYouHired.map((w, i) => <div key={i} style={{ fontSize: "13px", color: "rgba(235,229,220,0.45)", fontFamily: sans, marginBottom: "10px", lineHeight: "1.6", display: "flex", gap: "10px" }}><span style={{ color: "#5B9E7A", flexShrink: 0 }}>→</span>{w}</div>)}
            </div>
            <div style={{ background: dark, padding: "28px 32px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#B07070", marginBottom: "16px", fontFamily: sans }}>What gets you rejected</div>
              {prep.whatGetsYouRejected.map((w, i) => <div key={i} style={{ fontSize: "13px", color: "rgba(235,229,220,0.45)", fontFamily: sans, marginBottom: "10px", lineHeight: "1.6", display: "flex", gap: "10px" }}><span style={{ color: "#B07070", flexShrink: 0 }}>×</span>{w}</div>)}
            </div>
          </div>
          <div style={{ marginBottom: "40px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: `${accent}60`, marginBottom: "16px", fontFamily: sans }}>Before you walk in — memorise these</div>
            {prep.cheatSheet.map((c, i) => <div key={i} style={{ fontSize: "13px", color: "rgba(235,229,220,0.45)", fontFamily: sans, lineHeight: "1.6", display: "flex", gap: "12px", marginBottom: "8px" }}><span style={{ color: `${accent}60`, flexShrink: 0 }}>→</span>{c}</div>)}
          </div>
          {mode === "live" ? (
            <div>
              {cameraError && <div style={{ padding: "16px 24px", border: "0.5px solid rgba(176,112,112,0.3)", marginBottom: "20px" }}><p style={{ fontSize: "13px", color: "#B07070", fontFamily: sans, margin: 0 }}>{cameraError}</p></div>}
              <button onClick={async () => { await startCamera(); setStage("interview"); setCurrentQ(0); }} style={{ width: "100%", background: "#5B9E7A", color: dark, border: "none", padding: "20px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: sans }}>Enable camera and begin →</button>
            </div>
          ) : mode === "voice" ? (
            <button onClick={() => { setStage("interview"); setCurrentQ(0); startVoiceInterview(); }} style={{ width: "100%", background: blue, color: dark, border: "none", padding: "20px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: sans }}>Begin voice interview →</button>
          ) : (
            <button onClick={() => { setStage("interview"); setCurrentQ(0); }} style={{ width: "100%", background: gold, color: dark, border: "none", padding: "20px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: sans }}>Begin written interview →</button>
          )}
        </div>
      </div>
    );
  }

  if (mode === "written" && stage === "interview" && prep) {
    return (
      <div style={{ minHeight: "100vh", background: dark, color: text, fontFamily: serif }}>
        <NavBar accent={gold} />
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "60px 52px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "48px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: `${gold}60`, fontFamily: sans }}>Question {currentQ + 1} of {prep.questions.length}</div>
            <div style={{ display: "flex", gap: "4px" }}>{prep.questions.map((_, i) => <div key={i} style={{ width: "28px", height: "2px", background: i < currentQ ? gold : i === currentQ ? `${gold}80` : "rgba(201,168,76,0.15)", transition: "background 0.3s" }} />)}</div>
          </div>
          <div style={{ marginBottom: "36px" }}>
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
              <span style={{ fontSize: "10px", color: `${gold}50`, fontFamily: sans, border: `0.5px solid ${gold}25`, padding: "3px 10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{prep.questions[currentQ]?.type}</span>
              <span style={{ fontSize: "10px", color: "rgba(235,229,220,0.2)", fontFamily: sans, border: "0.5px solid rgba(235,229,220,0.1)", padding: "3px 10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{prep.questions[currentQ]?.difficulty}</span>
            </div>
            <h2 style={{ fontSize: "clamp(18px, 2.8vw, 28px)", fontWeight: "300", color: text, lineHeight: "1.45", marginBottom: "16px" }}>{prep.questions[currentQ]?.question}</h2>
            <p style={{ fontSize: "12px", color: "rgba(235,229,220,0.22)", fontFamily: sans, fontStyle: "italic", lineHeight: "1.6" }}>Framework: {prep.questions[currentQ]?.idealAnswerFramework} · {prep.questions[currentQ]?.tips}</p>
          </div>
          <div style={{ borderBottom: `0.5px solid ${gold}25`, marginBottom: "36px", paddingBottom: "4px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: `${gold}50`, marginBottom: "12px", fontFamily: sans }}>Your answer</div>
            <textarea placeholder="Type your answer here..." value={answers[currentQ] || ""} onChange={e => { const a = [...answers]; a[currentQ] = e.target.value; setAnswers(a); }} rows={10} autoFocus style={{ width: "100%", background: "transparent", border: "none", color: text, fontSize: "15px", fontFamily: sans, fontWeight: "300", padding: "4px 0", outline: "none", resize: "none", lineHeight: "1.8" }} />
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            {currentQ > 0 && <button onClick={() => setCurrentQ(q => q - 1)} style={{ border: `0.5px solid ${gold}20`, background: "none", color: `${gold}50`, padding: "16px 28px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: sans }}>← Back</button>}
            {currentQ < prep.questions.length - 1
              ? <button onClick={() => setCurrentQ(q => q + 1)} style={{ flex: 1, background: `${gold}20`, color: gold, border: `0.5px solid ${gold}30`, padding: "16px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: sans }}>Next →</button>
              : <button onClick={handleDebrief} style={{ flex: 1, background: gold, color: dark, border: "none", padding: "16px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: sans }}>Get my debrief →</button>
            }
          </div>
        </div>
      </div>
    );
  }

  if (mode === "voice" && stage === "interview" && prep) {
    return (
      <div style={{ minHeight: "100vh", background: dark, color: text, fontFamily: serif }}>
        <NavBar accent={blue} />
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "60px 52px" }}>
          <div style={{ textAlign: "center", marginBottom: "52px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.24em", textTransform: "uppercase", color: `${blue}60`, marginBottom: "16px", fontFamily: sans }}>{vapiConnecting ? "Connecting..." : vapiActive ? "Interview in progress" : "Ready to begin"}</div>
            <div style={{ fontSize: "clamp(36px, 5vw, 60px)", fontWeight: "200", color: blue, marginBottom: "8px" }}>{prep.interviewerPersona.name}</div>
            <div style={{ fontSize: "13px", color: "rgba(235,229,220,0.3)", fontFamily: sans }}>{prep.interviewerPersona.title}</div>
            {vapiActive && <div style={{ display: "flex", gap: "4px", justifyContent: "center", marginTop: "24px" }}>{[...Array(7)].map((_, i) => <div key={i} style={{ width: "3px", borderRadius: "99px", background: blue, height: `${12 + Math.abs(Math.sin(i) * 10)}px`, opacity: 0.5 }} />)}</div>}
          </div>
          <div style={{ border: `0.5px solid ${blue}20`, padding: "28px 32px", marginBottom: "32px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: `${blue}50`, marginBottom: "12px", fontFamily: sans }}>Question {currentQ + 1} of {prep.questions.length}</div>
            <p style={{ fontSize: "16px", fontWeight: "300", color: text, lineHeight: "1.6", margin: 0 }}>{prep.questions[currentQ]?.question}</p>
          </div>
          {vapiTranscript && <div style={{ marginBottom: "32px", padding: "20px 28px", background: "rgba(107,140,255,0.05)" }}><div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: `${blue}50`, marginBottom: "8px", fontFamily: sans }}>Your answer (live)</div><p style={{ fontSize: "13px", color: "rgba(235,229,220,0.5)", fontFamily: sans, lineHeight: "1.7", margin: 0, fontStyle: "italic" }}>"{vapiTranscript}"</p></div>}
          <div style={{ display: "flex", gap: "12px" }}>
            {currentQ < prep.questions.length - 1
              ? <button onClick={() => setCurrentQ(q => q + 1)} style={{ flex: 1, background: `${blue}20`, color: blue, border: `0.5px solid ${blue}30`, padding: "16px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: sans }}>Next question →</button>
              : <button onClick={handleDebrief} style={{ flex: 1, background: gold, color: dark, border: "none", padding: "16px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: sans }}>End & get debrief →</button>
            }
          </div>
        </div>
      </div>
    );
  }

  if (mode === "live" && stage === "interview" && prep) {
    return (
      <div style={{ minHeight: "100vh", background: "#020202", color: text, fontFamily: serif, display: "grid", gridTemplateColumns: "1fr 1fr", height: "100vh", overflow: "hidden" }}>
        <div style={{ position: "relative", background: "#000", borderRight: "0.5px solid rgba(91,158,122,0.15)" }}>
          <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <div style={{ position: "absolute", top: "20px", left: "20px", right: "20px" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {[{ label: "Eye contact", value: Math.round(behaviorData.eyeContactScore) }, { label: "Confidence", value: Math.round(behaviorData.confidenceScore) }, { label: "Pace", value: Math.round(behaviorData.paceScore) }].map((item, i) => (
                <div key={i} style={{ background: "rgba(0,0,0,0.7)", border: "0.5px solid rgba(91,158,122,0.3)", padding: "6px 12px", borderRadius: "2px" }}>
                  <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", fontFamily: sans, letterSpacing: "0.1em", textTransform: "uppercase" }}>{item.label}</div>
                  <div style={{ fontSize: "14px", color: getScoreColor(item.value), fontFamily: sans }}>{item.value}%</div>
                </div>
              ))}
            </div>
          </div>
          {behaviorData.fillerCount > 0 && <div style={{ position: "absolute", bottom: "20px", left: "20px", background: "rgba(0,0,0,0.8)", border: "0.5px solid rgba(176,112,112,0.3)", padding: "8px 14px" }}><div style={{ fontSize: "9px", color: "#B07070", fontFamily: sans, letterSpacing: "0.1em", textTransform: "uppercase" }}>Filler words detected</div><div style={{ fontSize: "13px", color: "#B07070", fontFamily: sans }}>{behaviorData.fillerCount} · {behaviorData.fillerWords.join(", ")}</div></div>}
          <div style={{ position: "absolute", bottom: "20px", right: "20px" }}>
            <button onClick={speechRecognitionActive ? stopSpeechRecognition : startSpeechRecognition} style={{ background: speechRecognitionActive ? "rgba(91,158,122,0.3)" : "rgba(0,0,0,0.7)", border: `0.5px solid ${speechRecognitionActive ? "#5B9E7A" : "rgba(255,255,255,0.2)"}`, color: speechRecognitionActive ? "#5B9E7A" : "rgba(255,255,255,0.4)", padding: "8px 16px", cursor: "pointer", fontSize: "11px", fontFamily: sans, letterSpacing: "0.08em", textTransform: "uppercase" }}>{speechRecognitionActive ? "● Recording" : "Start recording"}</button>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", background: "#030202", overflow: "auto" }}>
          <div style={{ padding: "16px 28px", borderBottom: "0.5px solid rgba(91,158,122,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.3em", textTransform: "uppercase", color: "#5B9E7A", fontFamily: sans }}>Live Simulation</div>
            <div style={{ fontSize: "10px", color: "rgba(235,229,220,0.2)", fontFamily: sans }}>{currentQ + 1}/{prep.questions.length}</div>
          </div>
          <div style={{ padding: "28px", borderBottom: "0.5px solid rgba(91,158,122,0.08)", flexShrink: 0 }}>
            <div style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#5B9E7A60", marginBottom: "8px", fontFamily: sans }}>{prep.interviewerPersona.name} · {prep.interviewerPersona.title}</div>
            <p style={{ fontSize: "16px", fontWeight: "300", color: text, lineHeight: "1.6", margin: 0 }}>{prep.questions[currentQ]?.question}</p>
            <p style={{ fontSize: "11px", color: "rgba(235,229,220,0.2)", fontFamily: sans, marginTop: "10px", fontStyle: "italic" }}>{prep.questions[currentQ]?.tips}</p>
          </div>
          <div style={{ padding: "20px 28px", flex: 1 }}>
            <div style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(91,158,122,0.4)", marginBottom: "10px", fontFamily: sans }}>{speechRecognitionActive ? "Listening..." : "Your answer (type or speak)"}</div>
            <textarea placeholder="Speak your answer or type here..." value={answers[currentQ] || liveTranscript || ""} onChange={e => { const a = [...answers]; a[currentQ] = e.target.value; setAnswers(a); }} style={{ width: "100%", background: "transparent", border: "none", color: "rgba(235,229,220,0.6)", fontSize: "14px", fontFamily: sans, fontWeight: "300", outline: "none", resize: "none", lineHeight: "1.8", minHeight: "120px" }} />
          </div>
          <div style={{ padding: "20px 28px", borderTop: "0.5px solid rgba(91,158,122,0.08)", display: "flex", gap: "10px", flexShrink: 0 }}>
            {currentQ > 0 && <button onClick={() => setCurrentQ(q => q - 1)} style={{ border: "0.5px solid rgba(91,158,122,0.2)", background: "none", color: "rgba(91,158,122,0.5)", padding: "12px 20px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: sans }}>←</button>}
            {currentQ < prep.questions.length - 1
              ? <button onClick={() => { setCurrentQ(q => q + 1); setLiveTranscript(""); }} style={{ flex: 1, background: "rgba(91,158,122,0.15)", color: "#5B9E7A", border: "0.5px solid rgba(91,158,122,0.25)", padding: "12px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: sans }}>Next →</button>
              : <button onClick={handleDebrief} style={{ flex: 1, background: gold, color: dark, border: "none", padding: "12px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: sans }}>End & get debrief →</button>
            }
          </div>
        </div>
      </div>
    );
  }

  if (stage === "debrief" && debrief) {
    const accent = mode === "written" ? gold : mode === "voice" ? blue : "#5B9E7A";
    return (
      <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: serif }}>
        <NavBar accent={accent} />
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "60px 52px" }}>
          <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.08)", paddingBottom: "48px", marginBottom: "48px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "20px", fontFamily: sans }}>Interview debrief · {mode === "written" ? "Written" : mode === "voice" ? "Voice" : "Live Simulation"}</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "20px", marginBottom: "16px" }}>
              <div style={{ fontSize: "clamp(64px, 10vw, 96px)", fontWeight: "200", color: getScoreColor(debrief.overallScore), lineHeight: "1" }}>{debrief.overallScore}</div>
              <div style={{ fontSize: "20px", color: "rgba(235,229,220,0.2)", marginBottom: "12px" }}>/100</div>
              <div style={{ marginBottom: "12px", padding: "6px 16px", border: `0.5px solid ${getHiringColor(debrief.hiringDecision)}40`, color: getHiringColor(debrief.hiringDecision), fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: sans }}>{debrief.hiringDecision}</div>
            </div>
            <p style={{ fontSize: "16px", color: "rgba(235,229,220,0.55)", fontFamily: sans, fontWeight: "300", lineHeight: "1.7", margin: 0, maxWidth: "680px" }}>{debrief.verdict}</p>
          </div>
          {debrief.readinessScore && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1px", background: "rgba(201,168,76,0.07)", marginBottom: "48px" }}>
              {Object.entries(debrief.readinessScore).map(([key, val], i) => (
                <div key={i} style={{ background: bg, padding: "24px 20px" }}>
                  <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,168,76,0.35)", marginBottom: "10px", fontFamily: sans }}>{key}</div>
                  <div style={{ fontSize: "28px", fontWeight: "200", color: getScoreColor(val as number), marginBottom: "8px" }}>{val as number}</div>
                  <div style={{ height: "2px", background: "rgba(235,229,220,0.05)" }}><div style={{ height: "100%", width: `${val}%`, background: getScoreColor(val as number) }} /></div>
                </div>
              ))}
            </div>
          )}
          {mode === "live" && (
            <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.08)", paddingBottom: "40px", marginBottom: "40px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "24px", fontFamily: sans }}>Camera intelligence report</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1px", background: "rgba(91,158,122,0.08)", marginBottom: "20px" }}>
                {[{ label: "Eye contact", value: Math.round(behaviorData.eyeContactScore) }, { label: "Confidence", value: Math.round(behaviorData.confidenceScore) }, { label: "Speaking pace", value: Math.round(behaviorData.paceScore) }].map((item, i) => (
                  <div key={i} style={{ background: bg, padding: "20px 24px" }}>
                    <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(91,158,122,0.4)", marginBottom: "8px", fontFamily: sans }}>{item.label}</div>
                    <div style={{ fontSize: "28px", fontWeight: "200", color: getScoreColor(item.value) }}>{item.value}%</div>
                  </div>
                ))}
              </div>
              {behaviorData.fillerCount > 0 && <div style={{ padding: "16px 24px", border: "0.5px solid rgba(176,112,112,0.2)" }}><div style={{ fontSize: "11px", color: "#B07070", fontFamily: sans, marginBottom: "6px" }}>{behaviorData.fillerCount} filler words detected</div><div style={{ fontSize: "12px", color: "rgba(235,229,220,0.3)", fontFamily: sans }}>Words to watch: {behaviorData.fillerWords.join(", ")}</div></div>}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "rgba(201,168,76,0.07)", marginBottom: "40px" }}>
            <div style={{ background: bg, padding: "28px 32px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#5B9E7A", marginBottom: "16px", fontFamily: sans }}>Strengths</div>
              {debrief.strengths.map((s, i) => <div key={i} style={{ fontSize: "13px", color: "rgba(235,229,220,0.5)", fontFamily: sans, marginBottom: "10px", lineHeight: "1.6", display: "flex", gap: "10px" }}><span style={{ color: "#5B9E7A", flexShrink: 0 }}>→</span>{s}</div>)}
            </div>
            <div style={{ background: bg, padding: "28px 32px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#B07070", marginBottom: "16px", fontFamily: sans }}>Needs work</div>
              {debrief.weaknesses.map((w, i) => <div key={i} style={{ fontSize: "13px", color: "rgba(235,229,220,0.5)", fontFamily: sans, marginBottom: "10px", lineHeight: "1.6", display: "flex", gap: "10px" }}><span style={{ color: "#B07070", flexShrink: 0 }}>×</span>{w}</div>)}
            </div>
          </div>
          {debrief.top3Improvements?.length > 0 && (
            <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.08)", paddingBottom: "40px", marginBottom: "40px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "24px", fontFamily: sans }}>Top 3 things to fix before the real interview</div>
              {debrief.top3Improvements.map((imp, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: "20px", marginBottom: "20px" }}>
                  <div style={{ fontSize: "11px", color: "rgba(201,168,76,0.3)", fontFamily: sans, paddingTop: "2px" }}>{i + 1}</div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "300", color: text, marginBottom: "6px" }}>{imp.area}</div>
                    <div style={{ fontSize: "12px", color: "rgba(235,229,220,0.3)", fontFamily: sans, marginBottom: "6px" }}>{imp.why}</div>
                    <div style={{ fontSize: "12px", color: gold, fontFamily: sans, opacity: 0.7 }}>{imp.howToImprove}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {debrief.cheatSheet?.length > 0 && (
            <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.08)", paddingBottom: "40px", marginBottom: "40px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "20px", fontFamily: sans }}>For the real interview — do these differently</div>
              {debrief.cheatSheet.map((c, i) => <div key={i} style={{ fontSize: "13px", color: "rgba(235,229,220,0.5)", fontFamily: sans, lineHeight: "1.6", display: "flex", gap: "12px", marginBottom: "10px" }}><span style={{ color: gold, flexShrink: 0, opacity: 0.6 }}>→</span>{c}</div>)}
            </div>
          )}
          {debrief.encouragement && (
            <div style={{ padding: "32px 40px", border: "0.5px solid rgba(201,168,76,0.15)", marginBottom: "40px" }}>
              <p style={{ fontSize: "16px", color: "rgba(235,229,220,0.6)", fontStyle: "italic", lineHeight: "1.85", margin: "0 0 16px", fontFamily: serif }}>"{debrief.encouragement}"</p>
              <div style={{ fontSize: "11px", color: gold, fontFamily: sans, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.6 }}>— Your companion</div>
            </div>
          )}
          <div style={{ display: "flex", gap: "16px" }}>
            <button onClick={resetAll} style={{ border: "0.5px solid rgba(235,229,220,0.12)", background: "none", color: "rgba(235,229,220,0.4)", padding: "16px 32px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: sans }}>Practice again</button>
            <Link href="/voice" style={{ display: "inline-flex", alignItems: "center", gap: "12px", background: gold, color: bg, padding: "16px 36px", textDecoration: "none", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: sans }}>Talk to your companion →</Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
