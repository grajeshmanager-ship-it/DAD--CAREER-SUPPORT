"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Vapi from "@vapi-ai/web";

const VAPI_ASSISTANT_IDS: Record<string, string> = {
  student: "1679c582-82b1-4cf5-84b7-130fdddfc09e",
  fresh_graduate: "2dc517f7-b55f-4d79-8e76-5933fdbd0c0f",
  job_seeker: "448c1eaf-df29-4b32-a60b-ce880b6b552e",
  employed_looking: "7d02717e-7ff6-470a-82b2-60b2b5b99a16",
  career_change: "6cf7f967-5502-4b56-b033-d816fbee9043",
  returning: "cdad5baf-c64a-4d0b-b259-93589c8564dc",
  founder: "c5769b26-facf-442b-a2a0-9c749e650934",
};

const PERSONAS: Record<string, {
  title: string;
  name: string;
  style: string;
  color: string;
  openingLine: (cvSummary: string, name: string) => string;
  description: string;
}> = {
  student: {
    title: "Curiosity Guide",
    name: "Maya",
    style: "Warm, exploratory, patient. Never pushes. Opens doors.",
    color: "#6B8CFF",
    description: "A warm guide who helps you discover what you actually want — not what you think you should want.",
    openingLine: (cv, name) => `Hi ${name}! I'm Maya. Before we talk about careers — I want to understand you first. What subject or topic makes you completely lose track of time?`,
  },
  fresh_graduate: {
    title: "Career Strategist",
    name: "James",
    style: "Strategic, encouraging, precise. Reads CVs like a senior recruiter.",
    color: "#C9A84C",
    description: "A senior HR professional who has hired hundreds of graduates and knows exactly how to position you.",
    openingLine: (cv, name) => `${name}, good to meet you. I'm James. I've reviewed your background — ${cv ? cv.slice(0, 100) + "..." : "your profile looks interesting"}. Before I tell you what I think, I want to hear from you — what did you actually enjoy most in the last three years? Not what looked good on paper. What genuinely excited you?`,
  },
  job_seeker: {
    title: "Senior Recruiter",
    name: "Sandra",
    style: "Direct, honest, no-nonsense. Identifies exactly what is and isn't working.",
    color: "#B07070",
    description: "A direct senior recruiter who will tell you exactly why you're not landing — and how to fix it.",
    openingLine: (cv, name) => `${name}, I'm Sandra. I've looked at your background — ${cv ? cv.slice(0, 80) + "..." : "solid background"}. Tell me honestly — how long have you been searching and what's actually been happening? Because something isn't connecting and I want to find out what.`,
  },
  employed_looking: {
    title: "Executive Coach",
    name: "David",
    style: "Strategic, challenging, ambitious. Pushes beyond the surface answer.",
    color: "#5B9E7A",
    description: "An executive coach who helps ambitious professionals break through the ceiling they've hit.",
    openingLine: (cv, name) => `${name}. I'm David. I've looked at your background — ${cv ? cv.slice(0, 100) + "..." : "strong profile"}. You're employed. You're not desperate. So when someone in your position comes to me, I always ask the same question first — what's the thing your current role is never going to give you?`,
  },
  career_change: {
    title: "Transition Specialist",
    name: "Rachel",
    style: "Empathetic but strategic. Sees transferable skills others miss.",
    color: "#A07898",
    description: "A specialist who has guided hundreds of career changers and knows exactly how to build the bridge.",
    openingLine: (cv, name) => `${name}, I'm Rachel. I've looked at your background — ${cv ? cv.slice(0, 80) + "..." : "interesting journey"}. Tell me — what finally made you decide enough is enough? And what is it you're actually moving towards?`,
  },
  returning: {
    title: "Reintegration Advisor",
    name: "Claire",
    style: "Warm, non-judgmental, practical. Makes the gap feel like an asset.",
    color: "#5B9898",
    description: "A specialist who helps people returning to work reframe their break and rebuild their confidence.",
    openingLine: (cv, name) => `${name}, lovely to meet you. I'm Claire. I've looked at your background — ${cv ? cv.slice(0, 80) + "..." : "solid foundation"}. Before anything else — how are you feeling about coming back? Be honest with me.`,
  },
  founder: {
    title: "Startup Advisor",
    name: "Alex",
    style: "Direct, challenging, YC-partner energy. No comfort. Only clarity.",
    color: "#FF6B35",
    description: "A battle-hardened startup advisor who knows what separates founders who make it from those who don't.",
    openingLine: (cv, name) => `${name}. Alex here. I don't do careers — I do companies. I've looked at your background — ${cv ? cv.slice(0, 80) + "..." : "interesting profile"}. Before we go anywhere — what problem are you trying to solve, and why are you the person to solve it?`,
  },
};

const SITUATIONS = [
  { id: "student", label: "Still Studying", desc: "Currently in university or college", persona: "Curiosity Guide · Maya" },
  { id: "fresh_graduate", label: "Just Graduated", desc: "Recently graduated, looking for first role", persona: "Career Strategist · James" },
  { id: "job_seeker", label: "Looking for Work", desc: "Have experience, actively job hunting", persona: "Senior Recruiter · Sandra" },
  { id: "employed_looking", label: "Open to Opportunities", desc: "Employed but want something better", persona: "Executive Coach · David" },
  { id: "career_change", label: "Changing Careers", desc: "Moving into a completely different field", persona: "Transition Specialist · Rachel" },
  { id: "returning", label: "Returning to Work", desc: "Coming back after a break", persona: "Reintegration Advisor · Claire" },
  { id: "founder", label: "Building a Company", desc: "Want to start or grow a business", persona: "Startup Advisor · Alex" },
];

type Stage = "select" | "upload" | "calling" | "processing" | "results";

interface RoadmapResult {
  careerPath: string;
  headline: string;
  whoYouAre: string;
  strongestTraits: string[];
  topRoles: { title: string; salaryMin: number; salaryMax: number; currency: string; fit: number; why: string }[];
  skillsToLearn: { skill: string; priority: string; timeMonths: number; why: string }[];
  actionPlan: { week: string; action: string; outcome: string }[];
  courses: { name: string; provider: string; durationWeeks: number; free: boolean; why: string }[];
  encouragement: string;
  founderPath?: {
    idea: string;
    validation: string[];
    firstSteps: string[];
    skills: string[];
    resources: string[];
  };
}

export default function CareerPage() {
  const [stage, setStage] = useState<Stage>("select");
  const [situation, setSituation] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvText, setCvText] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RoadmapResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userName, setUserName] = useState("there");
  const [vapiActive, setVapiActive] = useState(false);
  const [vapiConnecting, setVapiConnecting] = useState(false);
  const [transcript, setTranscript] = useState<{ role: string; text: string }[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  const vapiRef = useRef<Vapi | null>(null);
  const transcriptRef = useRef<{ role: string; text: string }[]>([]);
  const hasSpoken = useRef(false);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const volumeRef = useRef(0);

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
        const { data: profile } = await supabase.from("profiles").select("full_name, companion_name, resume_summary").eq("id", user.id).single();
        if (profile?.full_name) setUserName(profile.full_name.split(" ")[0]);
        if (profile?.resume_summary) setCvText(profile.resume_summary);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (hasSpoken.current || sessionStorage.getItem("dad_career_voiced")) return;
    hasSpoken.current = true;
    sessionStorage.setItem("dad_career_voiced", "1");
    const speak = () => {
      if (!window.speechSynthesis) return;
      const utter = new SpeechSynthesisUtterance("Most people never stop to ask who they actually want to become. You just did. That changes everything.");
      utter.rate = 0.80; utter.pitch = 0.87; utter.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.name.includes("Daniel")) || voices.find(v => v.lang === "en-GB") || voices.find(v => v.lang.startsWith("en")) || voices[0];
      if (preferred) utter.voice = preferred;
      window.speechSynthesis.speak(utter);
    };
    if (window.speechSynthesis.getVoices().length > 0) setTimeout(speak, 800);
    else window.speechSynthesis.onvoiceschanged = () => setTimeout(speak, 800);
  }, []);

  useEffect(() => {
    if (stage !== "calling") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const persona = situation ? PERSONAS[situation] : null;
    const color = persona?.color || gold;

    const draw = () => {
      const W = canvas.width = canvas.offsetWidth;
      const H = canvas.height = canvas.offsetHeight;
      const cx = W / 2; const cy = H / 2;
      const vol = volumeRef.current;
      const t = Date.now() / 1000;

      ctx.fillStyle = dark;
      ctx.fillRect(0, 0, W, H);

      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.4);
      glow.addColorStop(0, `${color}${Math.round((0.06 + vol * 0.1) * 255).toString(16).padStart(2, "0")}`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      [0.22, 0.30, 0.38].forEach((r, i) => {
        const radius = Math.min(W, H) * r + vol * 30 * (i + 1);
        const alpha = 0.06 + Math.sin(t * 0.8 + i) * 0.02 + vol * 0.08;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `${color}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });

      if (vapiActive) {
        const bars = 48;
        const baseR = Math.min(W, H) * 0.25;
        const maxH = Math.min(W, H) * 0.12;
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
      }

      const dotR = 4 + vol * 10 + Math.sin(t * 2) * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
      ctx.fillStyle = `${color}${Math.round(Math.min(1, 0.5 + vol * 0.4) * 255).toString(16).padStart(2, "0")}`;
      ctx.fill();

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [stage, situation, vapiActive]);

  const handleCvUpload = async (file: File) => {
    setCvFile(file);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("resume", file);
      const res = await fetch("/api/analyze-resume", {
        method: "POST",
        headers: { ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.analysis?.summary) setCvText(data.analysis.summary);
    } catch { /* continue without CV */ }
    finally { setLoading(false); }
  };

  const startVoiceSession = async () => {
    if (!situation) return;
    const vapiKey = process.env.NEXT_PUBLIC_VAPI_PUBLICKEY;
    if (!vapiKey) { setError("Voice not configured."); return; }
    const persona = PERSONAS[situation];
    const assistantId = VAPI_ASSISTANT_IDS[situation];
    setStage("calling");
    setVapiConnecting(true);
    const firstMessage = persona.openingLine(cvText, userName);

    try {
      const vapiInstance = new Vapi(vapiKey);
      vapiRef.current = vapiInstance;

      vapiInstance.on("call-start", () => {
        setVapiActive(true);
        setVapiConnecting(false);
        callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
      });

      vapiInstance.on("call-end", () => {
  setVapiActive(false);
  if (callTimerRef.current) clearInterval(callTimerRef.current);
  // Wait 2 seconds for final transcript messages to arrive before generating
  setTimeout(() => {
    generateRoadmap();
  }, 2000);
});

      vapiInstance.on("error", () => {
        setVapiActive(false);
        setVapiConnecting(false);
        setError("Connection failed. Please try again.");
        setStage("upload");
      });

      vapiInstance.on("volume-level", (level: number) => {
        volumeRef.current = level;
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vapiInstance.on("message", (msg: any) => {
        if (msg?.type === "transcript" && msg?.transcriptType === "final") {
          const entry = { role: msg.role, text: msg.transcript };
          transcriptRef.current = [...transcriptRef.current, entry];
          setTranscript([...transcriptRef.current]);
        }
      });

      await vapiInstance.start(assistantId, { firstMessage });
    } catch {
      setVapiConnecting(false);
      setError("Failed to connect. Please try again.");
      setStage("upload");
    }
  };

  const endCall = () => {
    if (vapiRef.current) { try { vapiRef.current.stop(); } catch { /* ignore */ } vapiRef.current = null; }
    setVapiActive(false);
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    generateRoadmap();
  };

  const generateRoadmap = async () => {
    setStage("processing");
    const fullTranscript = transcriptRef.current.map(t => `${t.role === "assistant" ? "Counsellor" : "User"}: ${t.text}`).join("\n");
    try {
      const res = await fetch("/api/career-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify({ situation, answers: { transcript: fullTranscript, cvSummary: cvText }, isVoiceSession: true, persona: situation ? PERSONAS[situation].title : "" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed");
      setResult(data.roadmap);
      setStage("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStage("upload");
    }
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const persona = situation ? PERSONAS[situation] : null;
  const accentColor = persona?.color || gold;

  // ── SELECT ──
  if (stage === "select") {
    return (
      <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: serif }}>
        <nav style={{ padding: "18px 52px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "0.5px solid rgba(201,168,76,0.08)", position: "sticky", top: 0, zIndex: 100, background: "rgba(7,6,6,0.97)" }}>
          <Link href="/dashboard" style={{ fontSize: "11px", letterSpacing: "0.42em", textTransform: "uppercase", color: gold, fontFamily: sans, textDecoration: "none" }}>DAD</Link>
          <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(235,229,220,0.25)", fontFamily: sans }}>Career Assessment</div>
          <Link href="/dashboard" style={{ fontSize: "11px", color: "rgba(235,229,220,0.25)", textDecoration: "none", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: sans }}>← Dashboard</Link>
        </nav>
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "80px 52px" }}>
          <div style={{ marginBottom: "64px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.26em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "18px", fontFamily: sans }}>Career Assessment · Voice-first</div>
            <h1 style={{ fontSize: "clamp(32px, 5vw, 60px)", fontWeight: "300", lineHeight: "1.1", marginBottom: "20px", letterSpacing: "-0.02em" }}>
              Not a form.<br /><span style={{ color: "rgba(235,229,220,0.4)" }}>A real conversation.</span>
            </h1>
            <p style={{ fontSize: "15px", color: "rgba(235,229,220,0.4)", lineHeight: "1.9", fontFamily: sans, fontWeight: "300", maxWidth: "520px", margin: 0 }}>
              Upload your CV. Then talk to a specialist who already knows your background. No boxes to fill in. No generic questions. A real counsellor who listens, challenges, and builds your roadmap from what you actually say.
            </p>
          </div>
          <div style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(201,168,76,0.35)", marginBottom: "24px", fontFamily: sans }}>Who is your counsellor today?</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: "rgba(201,168,76,0.06)" }}>
            {SITUATIONS.map((s, i) => (
              <div key={i} onClick={() => { setSituation(s.id); setStage("upload"); }}
                style={{ background: bg, padding: "24px 36px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.2s", borderLeft: "2px solid transparent" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = `${PERSONAS[s.id].color}08`; (e.currentTarget as HTMLDivElement).style.borderLeftColor = PERSONAS[s.id].color; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = bg; (e.currentTarget as HTMLDivElement).style.borderLeftColor = "transparent"; }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "16px", fontWeight: "300", color: text, marginBottom: "6px" }}>{s.label}</div>
                  <div style={{ fontSize: "12px", color: "rgba(235,229,220,0.35)", fontFamily: sans, marginBottom: "6px" }}>{s.desc}</div>
                  <div style={{ fontSize: "11px", color: PERSONAS[s.id].color, fontFamily: sans, opacity: 0.7 }}>{s.persona}</div>
                </div>
                <div style={{ flexShrink: 0, marginLeft: "24px", maxWidth: "240px" }}>
                  <div style={{ fontSize: "12px", color: "rgba(235,229,220,0.3)", fontFamily: sans, lineHeight: "1.5", textAlign: "right" }}>{PERSONAS[s.id].description}</div>
                </div>
                <div style={{ fontSize: "18px", color: "rgba(201,168,76,0.2)", marginLeft: "24px" }}>→</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── UPLOAD ──
  if (stage === "upload") {
    return (
      <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: serif }}>
        <nav style={{ padding: "18px 52px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "0.5px solid rgba(201,168,76,0.08)", position: "sticky", top: 0, zIndex: 100, background: "rgba(7,6,6,0.97)" }}>
          <Link href="/dashboard" style={{ fontSize: "11px", letterSpacing: "0.42em", textTransform: "uppercase", color: gold, fontFamily: sans, textDecoration: "none" }}>DAD</Link>
          <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(235,229,220,0.25)", fontFamily: sans }}>Career Assessment</div>
          <button onClick={() => setStage("select")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: "rgba(235,229,220,0.25)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: sans }}>← Back</button>
        </nav>
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "80px 52px" }}>
          {persona && (
            <div style={{ marginBottom: "60px", padding: "36px 44px", border: `0.5px solid ${accentColor}20`, background: `${accentColor}06`, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: "-20px", right: "-20px", fontSize: "120px", fontWeight: "700", color: `${accentColor}04`, lineHeight: "1", pointerEvents: "none" }}>{persona.name[0]}</div>
              <div style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: `${accentColor}70`, marginBottom: "12px", fontFamily: sans }}>{persona.title}</div>
              <div style={{ fontSize: "28px", fontWeight: "300", color: text, marginBottom: "10px" }}>{persona.name}</div>
              <p style={{ fontSize: "14px", color: "rgba(235,229,220,0.45)", fontFamily: sans, fontWeight: "300", lineHeight: "1.7", margin: 0 }}>{persona.description}</p>
            </div>
          )}
          <div style={{ marginBottom: "48px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "16px", fontFamily: sans }}>Before the call</div>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 44px)", fontWeight: "300", lineHeight: "1.15", marginBottom: "16px", letterSpacing: "-0.02em" }}>
              {cvText ? `${persona?.name} has read your background.` : `Give ${persona?.name} your CV first.`}
            </h2>
            <p style={{ fontSize: "14px", color: "rgba(235,229,220,0.4)", fontFamily: sans, fontWeight: "300", lineHeight: "1.8" }}>
              {cvText ? `Your CV has been read. ${persona?.name} already knows your background before the call begins.` : `Upload your CV so ${persona?.name} can read it before the call. They will know your background before you say a single word.`}
            </p>
          </div>

          {cvText ? (
            <div style={{ padding: "24px 28px", border: `0.5px solid ${accentColor}30`, background: `${accentColor}06`, marginBottom: "40px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: accentColor, marginBottom: "10px", fontFamily: sans }}>CV read ✓</div>
              <p style={{ fontSize: "13px", color: "rgba(235,229,220,0.55)", fontFamily: sans, lineHeight: "1.7", margin: 0 }}>{cvText.slice(0, 160)}...</p>
            </div>
          ) : (
            <div
              onClick={() => document.getElementById("cv-upload")?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleCvUpload(f); }}
              style={{ border: "0.5px solid rgba(201,168,76,0.2)", padding: "60px 40px", textAlign: "center", cursor: "pointer", marginBottom: "40px", transition: "background 0.3s" }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(201,168,76,0.02)"}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
            >
              <input id="cv-upload" type="file" accept=".pdf" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleCvUpload(f); }} />
              {loading ? (
                <div style={{ fontSize: "13px", color: "rgba(201,168,76,0.5)", fontFamily: sans }}>Reading your CV...</div>
              ) : cvFile ? (
                <div>
                  <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: gold, marginBottom: "8px", fontFamily: sans }}>Uploaded</div>
                  <div style={{ fontSize: "16px", fontWeight: "300", color: text }}>{cvFile.name}</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(201,168,76,0.35)", marginBottom: "12px", fontFamily: sans }}>Upload CV (optional but recommended)</div>
                  <div style={{ fontSize: "18px", fontWeight: "300", color: "rgba(235,229,220,0.35)", marginBottom: "8px" }}>Drop your PDF here</div>
                  <div style={{ fontSize: "12px", color: "rgba(235,229,220,0.2)", fontFamily: sans }}>or click to browse · PDF only</div>
                </div>
              )}
            </div>
          )}

          {error && <p style={{ fontSize: "12px", color: "#B07070", fontFamily: sans, marginBottom: "20px" }}>{error}</p>}

          <button onClick={startVoiceSession} disabled={loading} style={{ width: "100%", background: loading ? "rgba(201,168,76,0.3)" : accentColor, color: dark, border: "none", padding: "20px", cursor: loading ? "not-allowed" : "pointer", fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: sans }}>
            {loading ? "Preparing..." : `Begin session with ${persona?.name} →`}
          </button>
          <p style={{ marginTop: "16px", fontSize: "11px", color: "rgba(235,229,220,0.2)", fontFamily: sans }}>The session takes 8–12 minutes. Find somewhere quiet. Speak naturally.</p>
        </div>
      </div>
    );
  }

  // ── CALLING ──
  if (stage === "calling") {
    return (
      <div style={{ minHeight: "100vh", background: dark, color: text, fontFamily: serif, display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ position: "relative", borderRight: `0.5px solid ${accentColor}15` }}>
          <canvas ref={canvasRef} style={{ width: "100%", height: "100%", minHeight: "100vh", display: "block" }} />
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", zIndex: 10 }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.24em", textTransform: "uppercase", color: `${accentColor}70`, marginBottom: "12px", fontFamily: sans }}>{persona?.title}</div>
            <div style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: "200", color: accentColor, letterSpacing: "-0.03em", lineHeight: "1", marginBottom: "8px", textShadow: `0 0 40px ${accentColor}40` }}>{persona?.name}</div>
            <div style={{ fontSize: "11px", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(235,229,220,0.3)", fontFamily: sans, marginBottom: "24px" }}>
              {vapiConnecting ? "Connecting..." : vapiActive ? "Listening..." : "Session complete"}
            </div>
            {vapiActive && <div style={{ fontSize: "13px", color: "rgba(235,229,220,0.25)", fontFamily: "monospace", letterSpacing: "0.12em" }}>{formatDuration(callDuration)}</div>}
          </div>
          <div style={{ position: "absolute", bottom: "40px", left: "50%", transform: "translateX(-50%)", zIndex: 10 }}>
            <button onClick={endCall} style={{ background: "rgba(176,112,112,0.15)", border: "0.5px solid rgba(176,112,112,0.3)", color: "#B07070", padding: "14px 32px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: sans }}>
              End session →
            </button>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", padding: "40px", overflow: "hidden" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: `${accentColor}50`, marginBottom: "24px", fontFamily: sans }}>Live transcript</div>
          <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
            {transcript.length === 0 ? (
              <p style={{ fontSize: "13px", color: "rgba(235,229,220,0.2)", fontFamily: sans, fontStyle: "italic" }}>The conversation will appear here as you talk...</p>
            ) : (
              transcript.map((t, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: t.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: t.role === "assistant" ? `${accentColor}70` : "rgba(235,229,220,0.25)", fontFamily: sans }}>
                    {t.role === "assistant" ? persona?.name : userName}
                  </div>
                  <div style={{ fontSize: "13px", color: t.role === "assistant" ? "rgba(235,229,220,0.7)" : "rgba(235,229,220,0.5)", fontFamily: sans, lineHeight: "1.65", maxWidth: "85%", padding: "12px 16px", background: t.role === "assistant" ? `${accentColor}08` : "rgba(235,229,220,0.03)", border: `0.5px solid ${t.role === "assistant" ? `${accentColor}15` : "rgba(235,229,220,0.06)"}` }}>
                    {t.text}
                  </div>
                </div>
              ))
            )}
          </div>
          <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: `0.5px solid ${accentColor}12` }}>
            <p style={{ fontSize: "11px", color: "rgba(235,229,220,0.2)", fontFamily: sans, lineHeight: "1.6" }}>Speak naturally. {persona?.name} is listening. When the session ends, your roadmap will be generated automatically.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── PROCESSING ──
  if (stage === "processing") {
    return (
      <div style={{ minHeight: "100vh", background: dark, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "28px" }}>
        <div style={{ fontSize: "clamp(60px, 10vw, 110px)", fontWeight: "700", color: `${accentColor}08`, letterSpacing: "-0.04em", fontFamily: serif, userSelect: "none" }}>DAD</div>
        <div style={{ fontSize: "10px", letterSpacing: "0.24em", textTransform: "uppercase", color: `${accentColor}60`, fontFamily: sans }}>{persona?.name} is building your roadmap...</div>
        <div style={{ width: "120px", height: "0.5px", background: `${accentColor}15`, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: "40%", background: accentColor, animation: "slide 1.4s ease-in-out infinite" }} />
        </div>
        <p style={{ fontSize: "13px", color: "rgba(235,229,220,0.25)", fontFamily: sans, maxWidth: "360px", textAlign: "center", lineHeight: "1.7" }}>Everything you said in the session is being analysed. This produces a much more accurate roadmap than any form could.</p>
        <style>{`@keyframes slide { 0%{left:-40%} 100%{left:140%} }`}</style>
      </div>
    );
  }

  // ── RESULTS ──
  if (stage === "results" && result) {
    return (
      <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: serif }}>
        <nav style={{ padding: "18px 52px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "0.5px solid rgba(201,168,76,0.08)", position: "sticky", top: 0, zIndex: 100, background: "rgba(7,6,6,0.97)" }}>
          <Link href="/dashboard" style={{ fontSize: "11px", letterSpacing: "0.42em", textTransform: "uppercase", color: gold, fontFamily: sans, textDecoration: "none" }}>DAD</Link>
          <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(235,229,220,0.25)", fontFamily: sans }}>Your Roadmap</div>
          <Link href="/dashboard" style={{ fontSize: "11px", color: "rgba(235,229,220,0.25)", textDecoration: "none", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: sans }}>← Dashboard</Link>
        </nav>
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "60px 52px" }}>
          <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: `${accentColor}60`, fontFamily: sans }}>Session with {persona?.name} · {persona?.title}</div>
            <div style={{ height: "0.5px", flex: 1, background: `${accentColor}15` }} />
          </div>
          <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.08)", paddingBottom: "48px", marginBottom: "48px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "16px", fontFamily: sans }}>Based on our conversation</div>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 40px)", fontWeight: "300", color: accentColor, lineHeight: "1.2", marginBottom: "20px" }}>{result.careerPath}</h2>
            <p style={{ fontSize: "16px", color: "rgba(235,229,220,0.6)", lineHeight: "1.9", fontFamily: sans, fontWeight: "300", marginBottom: "20px", maxWidth: "680px" }}>{result.whoYouAre}</p>
            <p style={{ fontSize: "15px", color: "rgba(235,229,220,0.45)", lineHeight: "1.7", fontFamily: serif, fontStyle: "italic", maxWidth: "600px", margin: 0 }}>"{result.headline}"</p>
          </div>
          {result.strongestTraits?.length > 0 && (
            <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.08)", paddingBottom: "40px", marginBottom: "40px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "20px", fontFamily: sans }}>What {persona?.name} saw in you</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {result.strongestTraits.map((trait, i) => <span key={i} style={{ fontSize: "13px", color: accentColor, border: `0.5px solid ${accentColor}50`, padding: "6px 16px", fontFamily: sans }}>{trait}</span>)}
              </div>
            </div>
          )}
          {result.founderPath && (
            <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.08)", paddingBottom: "40px", marginBottom: "40px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,107,53,0.6)", marginBottom: "24px", fontFamily: sans }}>Founder roadmap</div>
              <div style={{ fontSize: "16px", fontWeight: "300", color: text, marginBottom: "16px" }}>{result.founderPath.idea}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "rgba(255,107,53,0.08)" }}>
                <div style={{ background: bg, padding: "24px 28px" }}>
                  <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,107,53,0.5)", marginBottom: "14px", fontFamily: sans }}>Validate first</div>
                  {result.founderPath.validation.map((v, i) => <div key={i} style={{ fontSize: "13px", color: "rgba(235,229,220,0.5)", fontFamily: sans, marginBottom: "8px", lineHeight: "1.6", display: "flex", gap: "10px" }}><span style={{ color: "#FF6B35", flexShrink: 0 }}>→</span>{v}</div>)}
                </div>
                <div style={{ background: bg, padding: "24px 28px" }}>
                  <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,107,53,0.5)", marginBottom: "14px", fontFamily: sans }}>First 90 days</div>
                  {result.founderPath.firstSteps.map((s, i) => <div key={i} style={{ fontSize: "13px", color: "rgba(235,229,220,0.5)", fontFamily: sans, marginBottom: "8px", lineHeight: "1.6", display: "flex", gap: "10px" }}><span style={{ color: "#FF6B35", flexShrink: 0 }}>→</span>{s}</div>)}
                </div>
              </div>
            </div>
          )}
          {result.topRoles?.length > 0 && (
            <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.08)", paddingBottom: "40px", marginBottom: "40px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "24px", fontFamily: sans }}>Roles where you can succeed</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: "rgba(201,168,76,0.06)" }}>
                {result.topRoles.map((role, i) => (
                  <div key={i} style={{ background: bg, padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "15px", fontWeight: "300", color: text, marginBottom: "6px" }}>{role.title}</div>
                      <div style={{ fontSize: "12px", color: "rgba(235,229,220,0.35)", fontFamily: sans, lineHeight: "1.6" }}>{role.why}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "24px" }}>
                      <div style={{ fontSize: "14px", color: gold, fontFamily: sans, marginBottom: "4px" }}>{role.currency === "GBP" ? "£" : role.currency === "USD" ? "$" : "₹"}{Number(role.salaryMin).toLocaleString()}–{Number(role.salaryMax).toLocaleString()}</div>
                      <div style={{ fontSize: "11px", color: "rgba(235,229,220,0.25)", fontFamily: sans }}>{role.fit}% fit</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {result.skillsToLearn?.length > 0 && (
            <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.08)", paddingBottom: "40px", marginBottom: "40px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "20px", fontFamily: sans }}>Skills to build next</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: "rgba(201,168,76,0.06)" }}>
                {result.skillsToLearn.map((s, i) => (
                  <div key={i} style={{ background: bg, padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: "300", color: text, marginBottom: "4px" }}>{s.skill}</div>
                      <div style={{ fontSize: "12px", color: "rgba(235,229,220,0.3)", fontFamily: sans }}>{s.why}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "20px" }}>
                      <div style={{ fontSize: "11px", color: s.priority === "high" ? gold : "rgba(235,229,220,0.3)", fontFamily: sans, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.priority}</div>
                      <div style={{ fontSize: "11px", color: "rgba(235,229,220,0.2)", fontFamily: sans }}>{s.timeMonths}mo</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {result.actionPlan?.length > 0 && (
            <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.08)", paddingBottom: "40px", marginBottom: "40px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "24px", fontFamily: sans }}>Your action plan</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {result.actionPlan.map((a, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "24px" }}>
                    <div style={{ fontSize: "11px", color: "rgba(201,168,76,0.4)", fontFamily: sans, paddingTop: "2px" }}>{a.week}</div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "300", color: text, marginBottom: "4px" }}>{a.action}</div>
                      <div style={{ fontSize: "12px", color: "rgba(235,229,220,0.3)", fontFamily: sans }}>{a.outcome}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {result.courses?.length > 0 && (
            <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.08)", paddingBottom: "40px", marginBottom: "40px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "24px", fontFamily: sans }}>Recommended courses</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: "rgba(201,168,76,0.06)" }}>
                {result.courses.map((c, i) => (
                  <div key={i} style={{ background: bg, padding: "18px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: "300", color: text, marginBottom: "4px" }}>{c.name}</div>
                      <div style={{ fontSize: "11px", color: "rgba(235,229,220,0.3)", fontFamily: sans }}>{c.provider} · {c.durationWeeks} weeks · {c.why}</div>
                    </div>
                    {c.free && <span style={{ fontSize: "10px", color: "#5B9E7A", border: "0.5px solid #5B9E7A40", padding: "3px 10px", fontFamily: sans, letterSpacing: "0.1em", textTransform: "uppercase", flexShrink: 0, marginLeft: "16px" }}>Free</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {result.encouragement && (
            <div style={{ padding: "36px 44px", border: `0.5px solid ${accentColor}20`, background: `${accentColor}04`, marginBottom: "40px" }}>
              <p style={{ fontSize: "17px", color: "rgba(235,229,220,0.65)", fontStyle: "italic", lineHeight: "1.85", margin: "0 0 16px", fontFamily: serif }}>"{result.encouragement}"</p>
              <div style={{ fontSize: "11px", color: accentColor, fontFamily: sans, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.6 }}>— {persona?.name}</div>
            </div>
          )}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <button onClick={() => { setStage("select"); setResult(null); setTranscript([]); transcriptRef.current = []; setCallDuration(0); }}
              style={{ border: "0.5px solid rgba(235,229,220,0.12)", background: "none", color: "rgba(235,229,220,0.4)", padding: "16px 32px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: sans }}>
              Start over
            </button>
            <Link href="/interview" style={{ display: "inline-flex", alignItems: "center", gap: "12px", background: gold, color: bg, padding: "16px 36px", textDecoration: "none", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: sans }}>
              Practice interview →
            </Link>
            {situation === "founder" && (
              <Link href="/voice" style={{ display: "inline-flex", alignItems: "center", gap: "12px", background: "#FF6B35", color: dark, padding: "16px 36px", textDecoration: "none", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: sans }}>
                Talk to business advisor →
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
