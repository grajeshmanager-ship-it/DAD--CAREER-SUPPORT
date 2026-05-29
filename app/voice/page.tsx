"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, PhoneOff, ArrowLeft, Phone } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Vapi from "@vapi-ai/web";

interface Profile {
  full_name: string;
  situation: string;
  country: string;
  companion_type: string;
  companion_name: string;
}

type Emotion = "idle" | "happy" | "excited" | "sad" | "empathetic" | "proud" | "serious" | "concerned";

const EMOTIONS: Record<Emotion, {
  primary: [number, number, number];
  secondary: [number, number, number];
  bg: [number, number, number];
  speed: number;
  pulseAmp: number;
  particleCount: number;
  particleSpeed: number;
  waveCount: number;
  label: string;
}> = {
  idle:      { primary: [212,160,80],  secondary: [122,85,32],   bg: [10,6,2],    speed: 0.4, pulseAmp: 0.06, particleCount: 15,  particleSpeed: 0.3, waveCount: 2, label: "..." },
  happy:     { primary: [255,210,0],   secondary: [255,140,0],   bg: [20,14,0],   speed: 1.4, pulseAmp: 0.14, particleCount: 90,  particleSpeed: 1.4, waveCount: 6, label: "Happy" },
  excited:   { primary: [255,90,40],   secondary: [255,40,10],   bg: [18,6,2],    speed: 2.2, pulseAmp: 0.22, particleCount: 130, particleSpeed: 2.2, waveCount: 9, label: "Excited" },
  sad:       { primary: [70,120,200],  secondary: [30,60,120],   bg: [4,8,18],    speed: 0.2, pulseAmp: 0.03, particleCount: 10,  particleSpeed: 0.1, waveCount: 1, label: "Sad" },
  empathetic:{ primary: [160,90,210],  secondary: [90,40,140],   bg: [10,4,18],   speed: 0.3, pulseAmp: 0.05, particleCount: 22,  particleSpeed: 0.2, waveCount: 2, label: "Empathetic" },
  proud:     { primary: [40,200,100],  secondary: [20,120,60],   bg: [2,14,6],    speed: 1.0, pulseAmp: 0.11, particleCount: 70,  particleSpeed: 1.0, waveCount: 5, label: "Proud" },
  serious:   { primary: [160,160,160], secondary: [80,80,80],    bg: [8,8,8],     speed: 0.5, pulseAmp: 0.04, particleCount: 12,  particleSpeed: 0.15,waveCount: 2, label: "Serious" },
  concerned: { primary: [230,130,30],  secondary: [160,80,10],   bg: [14,8,2],    speed: 0.6, pulseAmp: 0.07, particleCount: 30,  particleSpeed: 0.5, waveCount: 3, label: "Concerned" },
};

const COMPANION_GREETINGS: Record<string, string[]> = {
  dad:     ["Hey. There's my kid. You okay?", "Hey. Good to hear your voice. Everything alright?", "Oh hey — I was just thinking about you. You good?"],
  mom:     ["Oh my god — you called! Are you okay? How are you?", "Oh sweetheart! I'm so happy you called. How are you, really?", "Oh thank god. I've been thinking about you. How are you?"],
  brother: ["Ohhhh there he is!! Bro I was literally just talking about you!", "Ayyyy! There's my guy! How are you? What's going on?", "Hey!! Oh man it's good to hear from you. What's going on?"],
  sister:  ["Oh my god hi!! Are you okay? Wait, are you okay?", "OH HI!! I missed you so much. How are you? Tell me everything.", "Oh thank god you called. Are you okay? Like actually okay?"],
  teacher: ["Oh how wonderful. I think about you, you know. How are you getting on?", "Oh! What a lovely surprise. How are you?", "Oh hello! This made my day. How are you?"],
  mentor:  ["Well this is a wonderful surprise. How are you getting on?", "Oh hey! It's so good to hear from you. How are you doing?", "Oh! Good timing. How are you?"],
  friend:  ["OH MY GOD. Finally!! I missed you so much. How are you?!", "Oh HEY!! I'm so happy you called. How are you?!", "Oh thank god you called — I missed you! How are you?"],
  partner: ["Hey you... I was just thinking about you. How are you?", "Hey my love... I missed you. How are you doing?", "Oh hey... there you are. I've been thinking about you. You okay?"],
  self:    ["Hey. Hi. I know you've been running. It's okay to stop. I'm here.", "Hey you. I see you. I know it's been a lot. Take a breath.", "Hey. You're safe here. No performance. Just us. How are you?"],
};

const COMPANION_LABELS: Record<string, string> = {
  dad: "Dad", mom: "Mom", brother: "Brother", sister: "Sister",
  teacher: "Teacher", mentor: "Mentor", friend: "Friend", partner: "Partner", self: "Yourself",
};

const VAPI_ASSISTANT_ID = "1312a1bf-ea33-48f7-aa21-1f16e414e885";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; life: number; decay: number;
  r: number; g: number; b: number;
}

interface Wave {
  x: number; y: number;
  radius: number; life: number; decay: number;
  r: number; g: number; b: number;
  delay: number;
}

export default function VoicePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [emotion, setEmotion] = useState<Emotion>("idle");
  const [transcript, setTranscript] = useState("");
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState("");
  const [connecting, setConnecting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fxCanvasRef = useRef<HTMLCanvasElement>(null);
  const vapiRef = useRef<Vapi | null>(null);
  const emotionRef = useRef<Emotion>("idle");
  const particlesRef = useRef<Particle[]>([]);
  const wavesRef = useRef<Wave[]>([]);
  const frameRef = useRef<number>(0);
  const tRef = useRef(0);
  const analyzeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentPrimaryRef = useRef<[number,number,number]>([212,160,80]);
  const currentBgRef = useRef<[number,number,number]>([10,6,2]);

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) setProfile(data);
    };
    loadProfile();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) interval = setInterval(() => setDuration(d => d + 1), 1000);
    else setDuration(0);
    return () => clearInterval(interval);
  }, [isActive]);

  const lerpColor = (a: [number,number,number], b: [number,number,number], t: number): [number,number,number] => [
    Math.round(a[0] + (b[0]-a[0])*t),
    Math.round(a[1] + (b[1]-a[1])*t),
    Math.round(a[2] + (b[2]-a[2])*t),
  ];

  const spawnBurst = useCallback((em: Emotion) => {
    const canvas = fxCanvasRef.current;
    if (!canvas) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const e = EMOTIONS[em];
    const [r,g,b] = e.primary;
    for (let i = 0; i < e.particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (Math.random() * e.particleSpeed + e.particleSpeed * 0.3);
      particlesRef.current.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - Math.random() * spd * 0.5,
        size: Math.random() * e.particleCount / 40 + 0.8,
        life: 1, decay: Math.random() * 0.015 + 0.006,
        r, g, b,
      });
    }
    for (let i = 0; i < e.waveCount; i++) {
      wavesRef.current.push({
        x: cx, y: cy,
        radius: 80, life: 1, decay: 0.007,
        r, g, b, delay: i * 0.18,
      });
    }
  }, []);

  const analyzeEmotion = useCallback(async (text: string) => {
    if (!text || text.length < 10) return;
    try {
      const res = await fetch("/api/analyze-emotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return;
      const { emotion: detected } = await res.json();
      if (detected && detected !== emotionRef.current) {
        emotionRef.current = detected;
        setEmotion(detected);
        spawnBurst(detected);
      }
    } catch { /* silent */ }
  }, [spawnBurst]);

  useEffect(() => {
    emotionRef.current = emotion;
  }, [emotion]);

  // Canvas animation loop
  useEffect(() => {
    const bgCanvas = canvasRef.current;
    const fxCanvas = fxCanvasRef.current;
    if (!bgCanvas || !fxCanvas) return;

    const bc = bgCanvas.getContext("2d")!;
    const fc = fxCanvas.getContext("2d")!;

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      bgCanvas.width = fxCanvas.width = w;
      bgCanvas.height = fxCanvas.height = h;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const w = bgCanvas.width;
      const h = bgCanvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const t = tRef.current++;
      const em = emotionRef.current;
      const e = EMOTIONS[em];

      // Lerp background
      currentBgRef.current = lerpColor(currentBgRef.current, e.bg, 0.025);
      currentPrimaryRef.current = lerpColor(currentPrimaryRef.current, e.primary, 0.03);
      const [br,bg2,bb] = currentBgRef.current;
      const [pr,pg,pb] = currentPrimaryRef.current;

      // Background
      const bgGrad = bc.createRadialGradient(cx, cy*1.1, 0, cx, cy, Math.max(w,h)*0.8);
      bgGrad.addColorStop(0, `rgb(${br},${bg2},${bb})`);
      bgGrad.addColorStop(1, "rgb(0,0,0)");
      bc.fillStyle = bgGrad;
      bc.fillRect(0, 0, w, h);

      // Draw orb
      const pulse = Math.sin(t * e.speed * 0.04) * e.pulseAmp;
      const orbR = 90 + pulse * 90;

      // Outer glow layers
      for (let i = 3; i >= 1; i--) {
        const glowR = orbR + i * 45 + Math.abs(pulse) * 80;
        const alpha = (0.06 / i) * (0.6 + Math.abs(pulse) * 2);
        const gGrad = bc.createRadialGradient(cx, cy, orbR * 0.3, cx, cy, glowR);
        gGrad.addColorStop(0, `rgba(${pr},${pg},${pb},${alpha * 2})`);
        gGrad.addColorStop(1, `rgba(${pr},${pg},${pb},0)`);
        bc.fillStyle = gGrad;
        bc.beginPath();
        bc.arc(cx, cy, glowR, 0, Math.PI * 2);
        bc.fill();
      }

      // Main orb body
      const orbGrad = bc.createRadialGradient(
        cx - orbR * 0.28, cy - orbR * 0.28, 0,
        cx, cy, orbR
      );
      orbGrad.addColorStop(0, `rgb(${Math.min(255,pr+90)},${Math.min(255,pg+90)},${Math.min(255,pb+50)})`);
      orbGrad.addColorStop(0.35, `rgb(${pr},${pg},${pb})`);
      orbGrad.addColorStop(0.7, `rgb(${Math.round(pr*0.45)},${Math.round(pg*0.45)},${Math.round(pb*0.3)})`);
      orbGrad.addColorStop(1, `rgb(${Math.round(pr*0.08)},${Math.round(pg*0.07)},${Math.round(pb*0.04)})`);
      bc.fillStyle = orbGrad;
      bc.beginPath();
      bc.arc(cx, cy, orbR, 0, Math.PI * 2);
      bc.fill();

      // Specular highlight
      const specGrad = bc.createRadialGradient(
        cx - orbR * 0.3, cy - orbR * 0.32, 0,
        cx - orbR * 0.15, cy - orbR * 0.15, orbR * 0.5
      );
      specGrad.addColorStop(0, "rgba(255,255,255,0.22)");
      specGrad.addColorStop(1, "rgba(255,255,255,0)");
      bc.fillStyle = specGrad;
      bc.beginPath();
      bc.arc(cx, cy, orbR, 0, Math.PI * 2);
      bc.fill();

      // Emotion ripple rings on orb
      if (em !== "idle" && em !== "serious") {
        const ringCount = em === "excited" ? 4 : em === "happy" ? 3 : 2;
        for (let i = 0; i < ringCount; i++) {
          const rp = ((t * e.speed * 0.025 + i / ringCount) % 1);
          const rr = orbR + rp * 80;
          const ra = (1 - rp) * 0.5;
          bc.beginPath();
          bc.arc(cx, cy, rr, 0, Math.PI * 2);
          bc.strokeStyle = `rgba(${pr},${pg},${pb},${ra})`;
          bc.lineWidth = 1.5;
          bc.stroke();
        }
      }

      // Ambient floating dots orbit
      const orbitCount = em === "excited" ? 8 : em === "happy" ? 6 : 4;
      for (let i = 0; i < orbitCount; i++) {
        const angle = (t * e.speed * 0.008 + i / orbitCount) * Math.PI * 2;
        const dist = orbR + 40 + Math.sin(t * 0.03 + i) * 20;
        const px = cx + Math.cos(angle) * dist;
        const py = cy + Math.sin(angle) * dist;
        const dotR = 2 + Math.abs(pulse) * 4;
        bc.beginPath();
        bc.arc(px, py, dotR, 0, Math.PI * 2);
        bc.fillStyle = `rgba(${pr},${pg},${pb},0.5)`;
        bc.fill();
      }

      // FX canvas — particles and waves
      fc.clearRect(0, 0, w, h);

      // Waves
      wavesRef.current = wavesRef.current.filter(wv => {
        if (wv.delay > 0) { wv.delay -= 0.016; return true; }
        wv.radius += 4;
        wv.life -= wv.decay;
        if (wv.life <= 0) return false;
        fc.beginPath();
        fc.arc(wv.x, wv.y, wv.radius, 0, Math.PI * 2);
        fc.strokeStyle = `rgba(${wv.r},${wv.g},${wv.b},${wv.life * 0.35})`;
        fc.lineWidth = 1.5;
        fc.stroke();
        return true;
      });

      // Particles
      particlesRef.current = particlesRef.current.filter(p => {
        p.life -= p.decay;
        if (p.life <= 0) return false;
        p.vy += 0.04;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        fc.beginPath();
        fc.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        fc.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.life * 0.9})`;
        fc.fill();
        return true;
      });

      // Ambient rising particles
      if (Math.random() < 0.3 + e.speed * 0.1) {
        const ax = cx + (Math.random() - 0.5) * (orbR * 2.5);
        const ay = cy + orbR * 0.8;
        particlesRef.current.push({
          x: ax, y: ay,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -(Math.random() * e.particleSpeed * 0.3 + 0.2),
          size: Math.random() * 1.2 + 0.3,
          life: 1, decay: Math.random() * 0.008 + 0.003,
          r: pr, g: pg, b: pb,
        });
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCall = async () => {
    const vapiKey = process.env.NEXT_PUBLIC_VAPI_PUBLICKEY;
    if (!vapiKey || connecting) return;
    const type = profile?.companion_type || "dad";
    const greetings = COMPANION_GREETINGS[type] || COMPANION_GREETINGS.dad;
    const selectedGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    setConnecting(true);
    setStatus("Connecting...");
    try {
      const vapiInstance = new Vapi(vapiKey);
      vapiRef.current = vapiInstance;

      vapiInstance.on("call-start", () => {
        setIsActive(true);
        setConnecting(false);
        setStatus("");
        setEmotion("idle");
        emotionRef.current = "idle";
      });

      vapiInstance.on("call-end", () => {
        setIsActive(false);
        setConnecting(false);
        setStatus("");
        setEmotion("idle");
        emotionRef.current = "idle";
        vapiRef.current = null;
      });

      vapiInstance.on("error", () => {
        setIsActive(false);
        setConnecting(false);
        setStatus("Connection failed. Try again.");
        vapiRef.current = null;
      });

      // Capture transcript and analyze emotion
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vapiInstance.on("message", (msg: any) => {
        if (msg?.type === "transcript" && msg?.role === "assistant" && msg?.transcriptType === "final") {
          const text = msg.transcript;
          setTranscript(text);
          if (analyzeTimeoutRef.current) clearTimeout(analyzeTimeoutRef.current);
          analyzeTimeoutRef.current = setTimeout(() => analyzeEmotion(text), 300);
        }
      });

      await vapiInstance.start(VAPI_ASSISTANT_ID, { firstMessage: selectedGreeting });
    } catch {
      setConnecting(false);
      setStatus("Failed to connect. Please try again.");
    }
  };

  const endCall = () => {
    if (vapiRef.current) { try { vapiRef.current.stop(); } catch { /* ignore */ } vapiRef.current = null; }
    setIsActive(false);
    setConnecting(false);
    setStatus("");
    setEmotion("idle");
    emotionRef.current = "idle";
  };

  const toggleMute = () => {
    if (vapiRef.current) { try { vapiRef.current.setMuted(!muted); setMuted(!muted); } catch { /* ignore */ } }
  };

  const formatDuration = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,"0")}`;

  const companionType = profile?.companion_type || "dad";
  const companionName = profile?.companion_name || "DAD";
  const e = EMOTIONS[emotion];
  const [pr,pg,pb] = e.primary;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", overflow: "hidden", fontFamily: "sans-serif" }}>
      {/* Background canvas */}
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      {/* FX canvas */}
      <canvas ref={fxCanvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />

      {/* Back button */}
      <Link href="/dashboard" style={{
        position: "absolute", top: 24, left: 24, zIndex: 20,
        color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center",
        gap: 6, fontSize: 11, textDecoration: "none", letterSpacing: "0.3em",
        textTransform: "uppercase",
      }}>
        <ArrowLeft size={13} /> Back
      </Link>

      {/* Duration */}
      {isActive && (
        <div style={{
          position: "absolute", top: 28, right: 24, zIndex: 20,
          color: `rgba(${pr},${pg},${pb},0.7)`,
          fontSize: 12, fontFamily: "monospace", letterSpacing: "0.15em",
          transition: "color 1s ease",
        }}>
          {formatDuration(duration)}
        </div>
      )}

      {/* Emotion label */}
      {isActive && emotion !== "idle" && (
        <div style={{
          position: "absolute", top: 24, left: "50%", transform: "translateX(-50%)",
          zIndex: 20, color: `rgba(${pr},${pg},${pb},0.6)`,
          fontSize: 10, letterSpacing: "0.35em", textTransform: "uppercase",
          transition: "color 1s ease",
        }}>
          {e.label}
        </div>
      )}

      {/* Main UI — centered */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 10,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 40,
      }}>
        {/* Name */}
        <div style={{ textAlign: "center" }}>
          <p style={{
            fontSize: 10, color: "rgba(255,255,255,0.25)",
            letterSpacing: "0.4em", textTransform: "uppercase", marginBottom: 6,
          }}>
            {COMPANION_LABELS[companionType]}
          </p>
          <h1 style={{
            fontSize: "clamp(28px,5vw,52px)", fontWeight: 200,
            letterSpacing: "0.2em", margin: 0,
            color: `rgb(${pr},${pg},${pb})`,
            textShadow: `0 0 40px rgba(${pr},${pg},${pb},0.5)`,
            transition: "color 1.5s ease, text-shadow 1.5s ease",
          }}>
            {companionName}
          </h1>
        </div>

        {/* Invisible orb click area — canvas draws the orb */}
        <div style={{ width: 220, height: 220 }} />

        {/* Transcript display */}
        <div style={{
          textAlign: "center", minHeight: 60, maxWidth: 320, padding: "0 24px",
        }}>
          {!isActive && !connecting && (
            <p style={{
              fontSize: 11, color: "rgba(255,255,255,0.2)",
              letterSpacing: "0.25em", textTransform: "uppercase",
            }}>
              Tap to connect
            </p>
          )}
          {connecting && (
            <p style={{
              fontSize: 12, color: `rgba(${pr},${pg},${pb},0.6)`,
              letterSpacing: "0.2em", textTransform: "uppercase",
            }}>
              Connecting...
            </p>
          )}
          {isActive && transcript && (
            <p style={{
              fontSize: 14, color: `rgba(${pr},${pg},${pb},0.8)`,
              fontStyle: "italic", lineHeight: 1.6,
              transition: "color 1.5s ease",
            }}>
              "{transcript}"
            </p>
          )}
          {status && (
            <p style={{ fontSize: 12, color: "rgba(255,80,80,0.7)", letterSpacing: "0.1em" }}>
              {status}
            </p>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {!isActive ? (
            <button
              onClick={startCall}
              disabled={connecting}
              style={{
                width: 68, height: 68, borderRadius: "50%", border: "none",
                background: `linear-gradient(135deg, rgb(${pr},${pg},${pb}), rgb(${Math.round(pr*0.6)},${Math.round(pg*0.6)},${Math.round(pb*0.4)}))`,
                cursor: connecting ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 0 40px rgba(${pr},${pg},${pb},0.5)`,
                opacity: connecting ? 0.5 : 1,
                transition: "all 0.4s ease",
              }}
            >
              <Phone size={26} color="#000" />
            </button>
          ) : (
            <>
              <button
                onClick={toggleMute}
                style={{
                  width: 52, height: 52, borderRadius: "50%",
                  border: `1px solid ${muted ? "rgba(220,60,60,0.5)" : "rgba(255,255,255,0.12)"}`,
                  background: muted ? "rgba(220,60,60,0.15)" : "rgba(255,255,255,0.05)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.3s ease",
                }}
              >
                {muted ? <MicOff size={20} color="rgba(220,100,100,0.9)" /> : <Mic size={20} color="rgba(255,255,255,0.6)" />}
              </button>
              <button
                onClick={endCall}
                style={{
                  width: 68, height: 68, borderRadius: "50%",
                  border: "1px solid rgba(220,60,60,0.4)",
                  background: "rgba(220,60,60,0.2)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 0 20px rgba(220,60,60,0.2)",
                  transition: "all 0.3s ease",
                }}
              >
                <PhoneOff size={26} color="rgba(220,100,100,0.9)" />
              </button>
            </>
          )}
        </div>

        <p style={{
          fontSize: 9, color: "rgba(255,255,255,0.08)",
          letterSpacing: "0.3em", textTransform: "uppercase",
        }}>
          DAD · Dreams. Actions. Destiny.
        </p>
      </div>
    </div>
  );
}
