"use client";

import { useState, useEffect, useRef } from "react";
import { Phone, PhoneOff, Mic, MicOff, ArrowLeft } from "lucide-react";
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

const COMPANION_GREETINGS: Record<string, string[]> = {
  dad: ["Hey. There's my kid. You okay?", "Hey. Good to hear your voice. Everything alright?", "Oh hey — I was just thinking about you. You good?", "Hey. There you are. I was wondering when you'd call.", "Hey kid. Good timing. How are you doing?"],
  mom: ["Oh my god — you called! I was literally just praying for you. Are you okay? How are you?", "Oh sweetheart! Oh I'm so happy you called. I miss you so much. How are you, really?", "Oh! Oh it's you! I was just thinking about you — I was going to call you tonight. Are you okay?", "Oh my baby called! Oh I miss you so much. How are you doing? Tell me everything.", "Oh thank god. I've been thinking about you all week. Are you okay? How are you really doing?"],
  brother: ["Ohhhh there he is!! Bro I was literally just talking about you! How are you man?", "Oh hey!! Finally!! I missed you bro, how are you doing?", "Ayyyy! There's my guy! How are you? What's going on with you?", "Oh bro! Good timing — I was just thinking about you. How are you doing?", "Hey!! Oh man it's good to hear from you. How are you? What's going on?"],
  sister: ["Oh my god hi!! Oh I was literally JUST about to call you — are you okay? Wait, are you okay?", "OH HI!! Finally!! I missed you so much, oh my god. How are you? Tell me everything.", "Oh thank god you called. I've been thinking about you. Are you okay? Like actually okay?", "Oh hey!! Oh I'm so happy you called. I miss you so much. How are you doing?", "Oh my goodness hi!! I was literally just looking at our photos. I miss you! How are you?"],
  teacher: ["Oh how wonderful — I think about you, you know. I genuinely do. How are you getting on?", "Oh! What a lovely surprise. I was just thinking about how you were doing. How are you?", "Oh hello! Oh this made my day. How are you? I think about you often.", "Oh! Oh how nice to hear from you. I was literally just thinking about you recently. How are you doing?", "Oh what a wonderful surprise. You know I think about my students. How are you really doing?"],
  mentor: ["Well this is a wonderful surprise. I was literally just thinking about how you were getting on. How are you?", "Oh hey! Oh it's so good to hear from you. I think about you, you know. How are you doing?", "Oh! Good timing — I was just wondering how things were going for you. How are you?", "Hey! Oh I'm really glad you called. I've been thinking about you. How are you getting on?", "Oh what a nice surprise. I was literally just thinking about you. How are you doing?"],
  friend: ["OH MY GOD. Finally!! I literally missed you so much — I was just looking at our old photos. How are you?!", "Oh HEY!! Oh I'm so happy you called. I was literally just thinking about you. How are you?!", "Oh thank god you called — I missed you! How are you? What's been going on with you?", "AYYYY!! Oh I missed you so much. How are you? Tell me everything, what's going on?", "Oh hey!! Finally! I was literally about to text you. I miss you. How are you doing?"],
  partner: ["Hey you... I was just thinking about you. Like literally just now. How are you?", "Hey my love... I missed you. I'm so glad you called. How are you doing?", "Oh hey... there you are. I've been thinking about you all day. You okay?", "Hey you... oh I'm so happy you called. I miss you so much. How are you?", "Hey... I was just sitting here thinking about you. I love you. How are you doing?"],
  self: ["Hey. Hi. I know you've been running. It's okay to stop for a second. I'm here.", "Hey you. I see you. I know it's been a lot. Take a breath. I'm right here.", "Hey. It's okay. You're allowed to pause. What's going on? I'm listening.", "Hi. I've been waiting for you to slow down. How are you actually doing?", "Hey. You're safe here. No performance, no pretending. Just us. How are you?"],
};

const COMPANION_LABELS: Record<string, string> = {
  dad: "Dad", mom: "Mom", brother: "Brother", sister: "Sister",
  teacher: "Teacher", mentor: "Mentor", friend: "Friend",
  partner: "Partner", self: "Yourself",
};

const COMPANION_PRESENCE: Record<string, string> = {
  dad: "He's right here with you.",
  mom: "She's right here with you.",
  brother: "He's got your back.",
  sister: "She's right here with you.",
  teacher: "They believe in you.",
  mentor: "They're in your corner.",
  friend: "They've got you.",
  partner: "They love you.",
  self: "You've got this.",
};

const VAPI_ASSISTANT_ID = "1312a1bf-ea33-48f7-aa21-1f16e414e885";

type OrbState = "idle" | "connecting" | "listening" | "speaking";

export default function VoicePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [muted, setMuted] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const vapiRef = useRef<Vapi | null>(null);

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
    if (isActive) {
      interval = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    return () => { if (vapiRef.current) vapiRef.current.stop(); };
  }, []);

  // Simulate speaking/listening state changes for orb animation
  useEffect(() => {
    if (!isActive) return;
    setOrbState("listening");
    const vapiInstance = vapiRef.current;
    if (!vapiInstance) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (vapiInstance as any).on("speech-start", () => setOrbState("speaking"));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (vapiInstance as any).on("speech-end", () => setOrbState("listening"));
  }, [isActive]);

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const startCall = async () => {
    const vapiKey = process.env.NEXT_PUBLIC_VAPI_PUBLICKEY;
    if (!vapiKey) return;
    const type = profile?.companion_type || "dad";
    const greetings = COMPANION_GREETINGS[type] || COMPANION_GREETINGS.dad;
    const selectedGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    setGreeting(selectedGreeting);
    setOrbState("connecting");
    try {
      const vapiInstance = new Vapi(vapiKey);
      vapiRef.current = vapiInstance;
      vapiInstance.on("call-start", () => { setIsActive(true); setOrbState("listening"); });
      vapiInstance.on("call-end", () => { setIsActive(false); setOrbState("idle"); vapiRef.current = null; });
      vapiInstance.on("error", () => { setIsActive(false); setOrbState("idle"); vapiRef.current = null; });
      await vapiInstance.start(VAPI_ASSISTANT_ID, { firstMessage: selectedGreeting });
    } catch {
      setOrbState("idle");
    }
  };

  const endCall = () => {
    if (vapiRef.current) { try { vapiRef.current.stop(); } catch { /* ignore */ } vapiRef.current = null; }
    setIsActive(false);
    setOrbState("idle");
    setGreeting("");
  };

  const toggleMute = () => {
    if (vapiRef.current) { try { vapiRef.current.setMuted(!muted); setMuted(!muted); } catch { /* ignore */ } }
  };

  const companionType = profile?.companion_type || "dad";
  const companionName = profile?.companion_name || "DAD";

  return (
    <div style={{
      minHeight: "100vh",
      background: "#050505",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
      fontFamily: "sans-serif",
    }}>
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes orbListen {
          0%, 100% { transform: scale(1); }
          25% { transform: scale(1.04); }
          75% { transform: scale(0.97); }
        }
        @keyframes orbSpeak {
          0%, 100% { transform: scale(1.05); }
          50% { transform: scale(1.15); }
        }
        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes rippleSpeaking {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(3.5); opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.4; }
          33% { transform: translateY(-20px) translateX(10px); opacity: 0.8; }
          66% { transform: translateY(-10px) translateX(-15px); opacity: 0.6; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -300% center; }
          100% { background-position: 300% center; }
        }
        @keyframes connectPulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.3); opacity: 1; }
        }
        @keyframes starFloat {
          0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-10vh) rotate(720deg); opacity: 0; }
        }
        .orb-breathe { animation: breathe 4s ease-in-out infinite; }
        .orb-listen { animation: orbListen 1.2s ease-in-out infinite; }
        .orb-speak { animation: orbSpeak 0.6s ease-in-out infinite; }
        .orb-connect { animation: connectPulse 1s ease-in-out infinite; }
      `}</style>

      {/* Floating particles */}
      {[...Array(12)].map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          width: i % 3 === 0 ? 3 : i % 3 === 1 ? 2 : 1.5,
          height: i % 3 === 0 ? 3 : i % 3 === 1 ? 2 : 1.5,
          borderRadius: "50%",
          background: i % 4 === 0 ? "#d4a050" : i % 4 === 1 ? "#f5d48a" : i % 4 === 2 ? "#b8863c" : "#ffffff",
          left: `${8 + (i * 7.5)}%`,
          bottom: "-20px",
          animation: `starFloat ${6 + (i * 0.8)}s linear infinite`,
          animationDelay: `${i * 0.7}s`,
          opacity: 0,
        }} />
      ))}

      {/* Back button */}
      <Link href="/dashboard" style={{
        position: "absolute",
        top: 24,
        left: 24,
        color: "rgba(255,255,255,0.4)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: "0.8rem",
        textDecoration: "none",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
      }}>
        <ArrowLeft size={14} /> Back
      </Link>

      {/* Duration */}
      {isActive && (
        <div style={{
          position: "absolute",
          top: 28,
          right: 24,
          color: "rgba(212,160,80,0.7)",
          fontSize: "0.8rem",
          fontFamily: "monospace",
          letterSpacing: "0.1em",
        }}>
          {formatDuration(callDuration)}
        </div>
      )}

      {/* Main content */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 48,
        zIndex: 10,
      }}>

        {/* Companion name */}
        <div style={{ textAlign: "center", animation: "fadeUp 0.8s ease both" }}>
          <p style={{
            fontSize: "0.7rem",
            color: "rgba(255,255,255,0.3)",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}>
            {COMPANION_LABELS[companionType]}
          </p>
          <h1 style={{
            fontSize: "clamp(2rem, 6vw, 3.5rem)",
            fontWeight: 300,
            letterSpacing: "0.15em",
            background: "linear-gradient(90deg, #b8863c 0%, #d4a050 30%, #f5d48a 50%, #d4a050 70%, #b8863c 100%)",
            backgroundSize: "300% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            animation: "shimmer 4s linear infinite",
            margin: 0,
          }}>
            {companionName}
          </h1>
        </div>

        {/* THE ORB */}
        <div style={{ position: "relative", width: 240, height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>

          {/* Ripple rings */}
          {(orbState === "listening" || orbState === "speaking") && [...Array(3)].map((_, i) => (
            <div key={i} style={{
              position: "absolute",
              width: 240,
              height: 240,
              borderRadius: "50%",
              border: `1px solid ${orbState === "speaking" ? "rgba(212,160,80,0.5)" : "rgba(212,160,80,0.25)"}`,
              animation: `${orbState === "speaking" ? "rippleSpeaking" : "ripple"} ${1.8 + i * 0.6}s ease-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }} />
          ))}

          {/* Outer glow ring */}
          <div style={{
            position: "absolute",
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "transparent",
            border: `1px solid rgba(212,160,80,${orbState === "speaking" ? "0.4" : "0.15"})`,
            boxShadow: orbState === "speaking"
              ? "0 0 60px rgba(212,160,80,0.3), inset 0 0 60px rgba(212,160,80,0.1)"
              : "0 0 30px rgba(212,160,80,0.1)",
            transition: "all 0.5s ease",
          }} />

          {/* The main orb */}
          <div
            className={
              orbState === "idle" ? "orb-breathe" :
              orbState === "connecting" ? "orb-connect" :
              orbState === "listening" ? "orb-listen" :
              "orb-speak"
            }
            style={{
              width: 160,
              height: 160,
              borderRadius: "50%",
              background: orbState === "speaking"
                ? "radial-gradient(circle at 35% 35%, #f5d48a 0%, #d4a050 35%, #b8863c 60%, #7a5520 85%, #2a1a08 100%)"
                : orbState === "listening"
                ? "radial-gradient(circle at 35% 35%, #e8c070 0%, #c4903c 35%, #a07030 60%, #6a4818 85%, #1a0e04 100%)"
                : "radial-gradient(circle at 35% 35%, #c8a060 0%, #a07030 35%, #805020 60%, #4a2e10 85%, #0a0604 100%)",
              boxShadow: orbState === "speaking"
                ? "0 0 80px rgba(212,160,80,0.6), 0 0 140px rgba(212,160,80,0.3), 0 0 200px rgba(212,160,80,0.1)"
                : orbState === "listening"
                ? "0 0 50px rgba(180,130,60,0.4), 0 0 100px rgba(180,130,60,0.2)"
                : "0 0 40px rgba(140,100,40,0.3), 0 0 80px rgba(140,100,40,0.1)",
              transition: "background 0.5s ease, box-shadow 0.5s ease",
              cursor: !isActive ? "pointer" : "default",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Inner shimmer */}
            <div style={{
              position: "absolute",
              top: "15%",
              left: "20%",
              width: "35%",
              height: "30%",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              filter: "blur(8px)",
            }} />
          </div>
        </div>

        {/* Status text */}
        <div style={{ textAlign: "center", minHeight: 60, animation: "fadeUp 1s ease both", animationDelay: "0.2s" }}>
          {!isActive && orbState !== "connecting" && (
            <>
              <p style={{
                fontSize: "1rem",
                color: "rgba(255,255,255,0.5)",
                fontStyle: "italic",
                marginBottom: 8,
              }}>
                {COMPANION_PRESENCE[companionType]}
              </p>
              <p style={{
                fontSize: "0.7rem",
                color: "rgba(255,255,255,0.2)",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}>
                Tap to connect
              </p>
            </>
          )}
          {orbState === "connecting" && (
            <p style={{ fontSize: "0.8rem", color: "rgba(212,160,80,0.6)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
              Connecting...
            </p>
          )}
          {isActive && orbState === "listening" && (
            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", fontStyle: "italic" }}>
              {companionName} is listening...
            </p>
          )}
          {isActive && orbState === "speaking" && greeting && (
            <p style={{
              fontSize: "0.9rem",
              color: "rgba(212,160,80,0.8)",
              fontStyle: "italic",
              maxWidth: 300,
              lineHeight: 1.6,
            }}>
              "{greeting}"
            </p>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 20, alignItems: "center", animation: "fadeUp 1.2s ease both", animationDelay: "0.4s" }}>
          {!isActive ? (
            <button
              onClick={startCall}
              disabled={orbState === "connecting"}
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #d4a050, #b8863c)",
                border: "none",
                cursor: orbState === "connecting" ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 30px rgba(212,160,80,0.4)",
                transition: "all 0.3s ease",
                opacity: orbState === "connecting" ? 0.6 : 1,
              }}
            >
              <Phone size={28} color="#050505" />
            </button>
          ) : (
            <>
              <button
                onClick={toggleMute}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: muted ? "rgba(220,50,50,0.2)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${muted ? "rgba(220,50,50,0.5)" : "rgba(255,255,255,0.1)"}`,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.3s ease",
                }}
              >
                {muted
                  ? <MicOff size={20} color="rgba(220,100,100,0.9)" />
                  : <Mic size={20} color="rgba(255,255,255,0.6)" />
                }
              </button>

              <button
                onClick={endCall}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: "rgba(220,50,50,0.2)",
                  border: "1px solid rgba(220,50,50,0.4)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 20px rgba(220,50,50,0.2)",
                  transition: "all 0.3s ease",
                }}
              >
                <PhoneOff size={28} color="rgba(220,100,100,0.9)" />
              </button>
            </>
          )}
        </div>

        {/* Bottom line */}
        <p style={{
          fontSize: "0.6rem",
          color: "rgba(255,255,255,0.1)",
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          animation: "fadeUp 1.5s ease both",
          animationDelay: "0.6s",
        }}>
          DAD · Your career guide
        </p>
      </div>
    </div>
  );
}
