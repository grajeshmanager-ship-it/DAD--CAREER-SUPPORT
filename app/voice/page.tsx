"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Vapi from "@vapi-ai/web";
import dynamic from "next/dynamic";

const SphereCanvas = dynamic(() => import("./SphereCanvas"), { ssr: false });

const COMPANION_IDS: Record<string, string> = {
  dad: "1312a1bf-ea33-48f7-aa21-1f16e414e885",
  mom: "5377cac8-e297-424d-8857-f062ff52741c",
  brother: "43dfa321-15d0-4480-9048-45fdeaa948d6",
  sister: "3569ddb6-a8f6-40d8-92c8-ec12a092f988",
  mentor: "2399897f-8e22-4d47-bc9e-5f88869669c4",
  friend: "50ff3ad7-2c6c-4e6b-805b-f3efc3527053",
  partner_male: "b26b0ecc-e173-46f1-b394-3f41446b448f",
  partner_female: "e4449654-c537-41db-8792-0d0f895ed12d",
};

const COMPANION_INFO: Record<string, { label: string; color: string; r: number; g: number; b: number }> = {
  dad:            { label: "Dad",     color: "#C9A84C", r: 201, g: 168, b: 76  },
  mom:            { label: "Mom",     color: "#C47BAA", r: 196, g: 123, b: 170 },
  brother:        { label: "Brother", color: "#5BAA78", r: 91,  g: 170, b: 120 },
  sister:         { label: "Sister",  color: "#E07878", r: 224, g: 120, b: 120 },
  mentor:         { label: "Mentor",  color: "#7896FF", r: 120, g: 150, b: 255 },
  friend:         { label: "Friend",  color: "#5BB4B4", r: 91,  g: 180, b: 180 },
  partner_male:   { label: "Partner", color: "#A882D4", r: 168, g: 130, b: 212 },
  partner_female: { label: "Partner", color: "#A882D4", r: 168, g: 130, b: 212 },
};

function detectSwitch(text: string, current: string, userGender: string): string | null {
  const lower = text.toLowerCase();
  const intentWords = ["talk", "speak", "get", "call", "want", "pass", "switch", "connect", "bring", "put", "need", "can you", "could you", "let me", "i want", "i need"];
  const hasIntent = intentWords.some(w => lower.includes(w));
  if (!hasIntent) return null;
  if ((lower.includes("mom") || lower.includes("mum") || lower.includes("mother")) && current !== "mom") return "mom";
  if (lower.includes("sister") && current !== "sister") return "sister";
  if (lower.includes("brother") && current !== "brother") return "brother";
  if (lower.includes("mentor") && current !== "mentor") return "mentor";
  if ((lower.includes("girlfriend") || lower.includes("wife")) && current !== "partner_female") return "partner_female";
  if ((lower.includes("boyfriend") || lower.includes("husband")) && current !== "partner_male") return "partner_male";
  if (lower.includes("friend") && !lower.includes("girlfriend") && current !== "friend") return "friend";
  if ((lower.includes("dad") || lower.includes("father")) && !lower.includes("grandfather") && current !== "dad") return "dad";
  if (lower.includes("partner") && !lower.includes("girlfriend") && !lower.includes("boyfriend")) {
    if (userGender === "male") return current !== "partner_female" ? "partner_female" : null;
    if (userGender === "female") return current !== "partner_male" ? "partner_male" : null;
    return current !== "partner_male" ? "partner_male" : null;
  }
  return null;
}

export default function VoicePage() {
  const [profile, setProfile] = useState<{ full_name: string; companion_type: string; companion_name: string; gender: string } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCompanion, setActiveCompanion] = useState<string>("dad");
  const [vapiActive, setVapiActive] = useState(false);
  const [vapiConnecting, setVapiConnecting] = useState(false);
  const [transcript, setTranscript] = useState<{ role: string; text: string; companion: string }[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  const [switching, setSwitching] = useState(false);
  const [showFamily, setShowFamily] = useState(false);
  const [volume, setVolume] = useState(0);
  const [greeting, setGreeting] = useState<string | null>(null);
  const [btnHover, setBtnHover] = useState(false);
  const vapiRef = useRef<Vapi | null>(null);
  const transcriptRef = useRef<{ role: string; text: string; companion: string }[]>([]);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const switchingRef = useRef(false);
  const userGenderRef = useRef<string>("male");
  const activeCompanionRef = useRef<string>("dad");
  const sessionTranscriptRef = useRef<string[]>([]);

  const sans = "'Helvetica Neue', Arial, sans-serif";
  const serif = "'Georgia', 'Times New Roman', serif";
  const gold = "#C9A84C";
  const dark = "#000510";
  const text = "#EBE5DC";

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data } = await supabase.from("profiles").select("full_name, companion_type, companion_name, gender").eq("id", user.id).single();
        if (data) {
          setProfile(data);
          setActiveCompanion(data.companion_type || "dad");
          activeCompanionRef.current = data.companion_type || "dad";
          userGenderRef.current = data.gender || "male";
        }

        // Get personalised greeting from DAD memory
        try {
          const res = await fetch("/api/dad-context", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              companionType: data?.companion_type || "dad",
              companionName: data?.companion_name || "DAD",
              page: "voice",
            }),
          });
          const ctx = await res.json();
          if (ctx.greeting) setGreeting(ctx.greeting);
        } catch { /* ignore */ }
      }
      setLoading(false);
    };
    load();
  }, []);

  // Write voice session memory when call ends
  const writeVoiceMemory = async (companionKey: string, durationSeconds: number) => {
    if (!userId) return;
    const transcript = sessionTranscriptRef.current.join(" ").slice(0, 500);
    const companionInfo = COMPANION_INFO[companionKey];
    try {
      await fetch("/api/dad-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "write",
          userId,
          memory: {
            memory_type: "journey",
            category: "voice_conversation",
            content: `Had a voice conversation with ${companionInfo?.label || companionKey} lasting ${Math.floor(durationSeconds / 60)} minutes ${durationSeconds % 60} seconds.${transcript ? ` Topics discussed: ${transcript.slice(0, 200)}...` : ""}`,
            importance: 7,
            metadata: {
              companion: companionKey,
              durationSeconds,
              transcriptSnippet: transcript.slice(0, 300),
            },
          },
        }),
      });
    } catch { /* ignore */ }
  };

  const startCall = async (companionKey: string) => {
    const vapiKey = process.env.NEXT_PUBLIC_VAPI_PUBLICKEY;
    if (!vapiKey) return;
    const assistantId = COMPANION_IDS[companionKey];
    if (!assistantId) return;
    setActiveCompanion(companionKey);
    activeCompanionRef.current = companionKey;
    setVapiConnecting(true);
    sessionTranscriptRef.current = [];

    // Build personalised first message using memory
    let firstMessage = "";
    if (greeting && !vapiActive) {
      firstMessage = greeting;
    }

    const vapiInstance = new Vapi(vapiKey);
    vapiRef.current = vapiInstance;

    vapiInstance.on("call-start", () => {
      setVapiActive(true); setVapiConnecting(false);
      setSwitching(false); switchingRef.current = false;
      callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    });

    vapiInstance.on("call-end", () => {
      setVapiActive(false);
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      // Write memory of this conversation
      writeVoiceMemory(activeCompanionRef.current, callDuration);
    });

    vapiInstance.on("error", () => {
      setVapiActive(false); setVapiConnecting(false);
      setSwitching(false); switchingRef.current = false;
    });

    vapiInstance.on("volume-level", (level: number) => { setVolume(level); });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vapiInstance.on("message", (msg: any) => {
      if (msg?.type === "transcript" && msg?.transcriptType === "final") {
        const entry = { role: msg.role, text: msg.transcript, companion: activeCompanionRef.current };
        transcriptRef.current = [...transcriptRef.current, entry];
        setTranscript([...transcriptRef.current]);
        // Accumulate transcript for memory
        if (msg.role === "user") {
          sessionTranscriptRef.current.push(msg.transcript);
        }
        if (msg.role === "user" && !switchingRef.current) {
          const switchTo = detectSwitch(msg.transcript, activeCompanionRef.current, userGenderRef.current);
          if (switchTo && switchTo !== activeCompanionRef.current) handleFamilySwitch(switchTo);
        }
      }
    });

    try {
      await vapiInstance.start(assistantId, firstMessage ? { firstMessage } : undefined);
    } catch {
      setVapiConnecting(false); setSwitching(false); switchingRef.current = false;
    }
  };

  const handleFamilySwitch = async (newCompanion: string) => {
    if (switchingRef.current) return;
    if (newCompanion === activeCompanionRef.current) return;
    switchingRef.current = true;
    const currentCompanion = activeCompanionRef.current;
    setSwitching(true);
    const currentVapi = vapiRef.current; vapiRef.current = null;
    if (currentVapi) { try { currentVapi.stop(); } catch { /* ignore */ } }
    setVapiActive(false);
    if (callTimerRef.current) clearInterval(callTimerRef.current);

    // Write switch memory
    if (userId) {
      fetch("/api/dad-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "write",
          userId,
          memory: {
            memory_type: "journey",
            category: "companion_switch",
            content: `Switched from ${COMPANION_INFO[currentCompanion]?.label} to ${COMPANION_INFO[newCompanion]?.label} mid-conversation.`,
            importance: 5,
            metadata: { from: currentCompanion, to: newCompanion },
          },
        }),
      }).catch(() => {});
    }

    transcriptRef.current = [...transcriptRef.current, {
      role: "system",
      text: `— ${COMPANION_INFO[currentCompanion]?.label} passed the call to ${COMPANION_INFO[newCompanion]?.label} —`,
      companion: "system"
    }];
    setTranscript([...transcriptRef.current]);
    await new Promise(r => setTimeout(r, 1500));
    switchingRef.current = false;
    await startCall(newCompanion);
  };

  const endCall = () => {
    const currentVapi = vapiRef.current; vapiRef.current = null;
    if (currentVapi) { try { currentVapi.stop(); } catch { /* ignore */ } }
    setVapiActive(false); setVapiConnecting(false);
    setSwitching(false); switchingRef.current = false;
    setVolume(0);
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    writeVoiceMemory(activeCompanionRef.current, callDuration);
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const currentInfo = COMPANION_INFO[activeCompanion] || COMPANION_INFO.dad;
  const accentColor = currentInfo.color;
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  if (loading) return (
    <div style={{ minHeight: "100vh", background: dark, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: "11px", letterSpacing: "0.42em", textTransform: "uppercase", color: gold, fontFamily: sans }}>DAD</div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes pulseRing {
          0% { transform: translate(-50%,-50%) scale(0.95); opacity: 0.6; }
          100% { transform: translate(-50%,-50%) scale(1.5); opacity: 0; }
        }
        @keyframes spinSlow {
          from { transform: translate(-50%,-50%) rotate(0deg); }
          to { transform: translate(-50%,-50%) rotate(360deg); }
        }
        @keyframes breatheBtn {
          0%,100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .pulse-ring-1 { animation: pulseRing 2.2s ease-out infinite; }
        .pulse-ring-2 { animation: pulseRing 2.2s ease-out infinite 0.7s; }
        .spin-ring { animation: spinSlow 8s linear infinite; }
        .breathe-dot { animation: breatheBtn 2s ease-in-out infinite; }
      `}</style>

      <div style={{ width: "100vw", height: "100vh", background: dark, color: text, fontFamily: serif, display: "grid", gridTemplateColumns: "1fr 400px", overflow: "hidden" }}>

        {/* Left — sphere */}
        <div style={{ position: "relative", height: "100vh", overflow: "hidden", borderRight: `0.5px solid ${accentColor}10` }}>
          <div style={{ position: "absolute", inset: 0 }}>
            <SphereCanvas
              color={{ r: currentInfo.r, g: currentInfo.g, b: currentInfo.b }}
              volume={volume}
              label={currentInfo.label}
            />
          </div>

          {/* Nav */}
          <div style={{ position: "absolute", top: "24px", left: "24px", right: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }}>
            <Link href="/dashboard" style={{ fontSize: "11px", letterSpacing: "0.42em", textTransform: "uppercase", color: `${gold}40`, fontFamily: sans, textDecoration: "none" }}>DAD</Link>
            <button onClick={() => setShowFamily(!showFamily)} style={{ background: "transparent", border: `0.5px solid rgba(235,229,220,0.08)`, color: "rgba(235,229,220,0.2)", padding: "8px 20px", cursor: "pointer", fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: sans }}>
              Family
            </button>
          </div>

          {/* Family dropdown */}
          {showFamily && (
            <div style={{ position: "absolute", top: "64px", right: "24px", zIndex: 20, background: "rgba(0,5,16,0.97)", border: `0.5px solid ${accentColor}20`, minWidth: "180px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(235,229,220,0.2)", padding: "10px 16px", borderBottom: "0.5px solid rgba(235,229,220,0.04)", fontFamily: sans }}>
                {vapiActive ? "Switch to" : "Talk to"}
              </div>
              {Object.entries(COMPANION_INFO).map(([key, info]) => (
                <div key={key}
                  onClick={() => {
                    setShowFamily(false);
                    if (vapiActive && key !== activeCompanion) handleFamilySwitch(key);
                    else if (!vapiActive) { setActiveCompanion(key); activeCompanionRef.current = key; }
                  }}
                  style={{ padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", background: activeCompanion === key ? `${info.color}08` : "transparent", borderLeft: activeCompanion === key ? `1px solid ${info.color}` : "1px solid transparent", transition: "all 0.2s" }}
                  onMouseEnter={e => { if (activeCompanion !== key) (e.currentTarget as HTMLDivElement).style.background = "rgba(235,229,220,0.02)"; }}
                  onMouseLeave={e => { if (activeCompanion !== key) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                >
                  <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: info.color, flexShrink: 0, opacity: activeCompanion === key ? 1 : 0.5 }} />
                  <div style={{ fontSize: "12px", fontWeight: "300", color: activeCompanion === key ? info.color : "rgba(235,229,220,0.4)" }}>{info.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Timer */}
          {vapiActive && (
            <div style={{ position: "absolute", bottom: "130px", left: "50%", transform: "translateX(-50%)", zIndex: 10, textAlign: "center" }}>
              <div style={{ fontSize: "11px", color: `${accentColor}40`, fontFamily: "monospace", letterSpacing: "0.14em" }}>
                {formatDuration(callDuration)}
              </div>
            </div>
          )}

          {/* Button */}
          <div style={{ position: "absolute", bottom: "44px", left: "50%", transform: "translateX(-50%)", zIndex: 10 }}>
            {!vapiActive && !vapiConnecting && !switching && (
              <div style={{ position: "relative", width: "80px", height: "80px", cursor: "pointer" }}
                onClick={() => startCall(activeCompanion)}
                onMouseEnter={() => setBtnHover(true)}
                onMouseLeave={() => setBtnHover(false)}
              >
                <div className="pulse-ring-1" style={{ position: "absolute", top: "50%", left: "50%", width: "80px", height: "80px", borderRadius: "50%", border: `1px solid ${accentColor}`, pointerEvents: "none" }} />
                <div className="pulse-ring-2" style={{ position: "absolute", top: "50%", left: "50%", width: "80px", height: "80px", borderRadius: "50%", border: `1px solid ${accentColor}80`, pointerEvents: "none" }} />
                <div className="spin-ring" style={{ position: "absolute", top: "50%", left: "50%", width: "80px", height: "80px", borderRadius: "50%", border: `1px dashed ${accentColor}40`, pointerEvents: "none" }} />
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "56px", height: "56px", borderRadius: "50%", background: btnHover ? `${accentColor}30` : `${accentColor}15`, border: `1px solid ${accentColor}${btnHover ? "90" : "50"}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s ease", boxShadow: btnHover ? `0 0 30px ${accentColor}40` : `0 0 15px ${accentColor}20` }}>
                  <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
                    <rect x="5" y="1" width="8" height="13" rx="4" stroke={accentColor} strokeWidth="1.5" opacity={btnHover ? 1 : 0.7} />
                    <path d="M1 10C1 15 17 15 17 10" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" opacity={btnHover ? 1 : 0.7} />
                    <line x1="9" y1="15" x2="9" y2="21" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" opacity={btnHover ? 1 : 0.7} />
                    <line x1="6" y1="21" x2="12" y2="21" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" opacity={btnHover ? 1 : 0.7} />
                  </svg>
                </div>
              </div>
            )}
            {vapiConnecting && !switching && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "56px", height: "56px", borderRadius: "50%", border: `1px solid ${accentColor}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div className="breathe-dot" style={{ width: "8px", height: "8px", borderRadius: "50%", background: accentColor }} />
                </div>
                <div style={{ fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: `${accentColor}50`, fontFamily: sans }}>connecting</div>
              </div>
            )}
            {vapiActive && !switching && (
              <div style={{ position: "relative", width: "60px", height: "60px", cursor: "pointer" }} onClick={endCall}>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "48px", height: "48px", borderRadius: "50%", background: "rgba(176,112,112,0.08)", border: "0.5px solid rgba(176,112,112,0.3)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.3s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(176,112,112,0.2)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(176,112,112,0.08)"; }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <line x1="2" y1="2" x2="12" y2="12" stroke="rgba(176,112,112,0.7)" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="12" y1="2" x2="2" y2="12" stroke="rgba(176,112,112,0.7)" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right — transcript */}
        <div style={{ display: "flex", flexDirection: "column", background: "#040303", height: "100vh", overflow: "hidden" }}>
          <div style={{ padding: "20px 28px", borderBottom: `0.5px solid ${accentColor}08`, flexShrink: 0 }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: `${accentColor}30`, marginBottom: "4px", fontFamily: sans }}>
              {vapiActive ? "Live" : "Conversation"}
            </div>
            <div style={{ fontSize: "14px", fontWeight: "300", color: "rgba(235,229,220,0.5)" }}>
              {firstName} & {currentInfo.label}
            </div>
          </div>

          {/* Greeting from memory */}
          {greeting && !vapiActive && transcript.length === 0 && (
            <div style={{ padding: "20px 28px 0", flexShrink: 0 }}>
              <div style={{ padding: "14px 18px", background: `${accentColor}08`, borderLeft: `2px solid ${accentColor}30` }}>
                <div style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: `${accentColor}50`, marginBottom: "6px", fontFamily: sans }}>{currentInfo.label} remembers</div>
                <div style={{ fontSize: "13px", color: "rgba(235,229,220,0.6)", fontFamily: sans, lineHeight: "1.65", fontStyle: "italic" }}>"{greeting}"</div>
              </div>
            </div>
          )}

          <div style={{ flex: 1, overflow: "auto", padding: "20px 28px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {transcript.length === 0 ? (
              <div style={{ paddingTop: greeting ? "12px" : "20px" }}>
                <p style={{ fontSize: "13px", color: "rgba(235,229,220,0.1)", fontFamily: sans, fontStyle: "italic", lineHeight: "1.8", marginBottom: "12px" }}>
                  The conversation appears here as you talk.
                </p>
                <p style={{ fontSize: "11px", color: "rgba(235,229,220,0.06)", fontFamily: sans, lineHeight: "1.7" }}>
                  Say "Can I talk to Mom?" to switch mid-call.
                </p>
              </div>
            ) : (
              transcript.map((t, i) => {
                if (t.role === "system") return (
                  <div key={i} style={{ textAlign: "center", padding: "6px 0" }}>
                    <span style={{ fontSize: "10px", color: "rgba(235,229,220,0.15)", fontFamily: sans, letterSpacing: "0.08em" }}>{t.text}</span>
                  </div>
                );
                const companionInfo = COMPANION_INFO[t.companion] || currentInfo;
                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: t.role === "user" ? "flex-end" : "flex-start" }}>
                    <div style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: t.role === "assistant" ? `${companionInfo.color}45` : "rgba(235,229,220,0.12)", fontFamily: sans }}>
                      {t.role === "assistant" ? companionInfo.label : firstName}
                    </div>
                    <div style={{ fontSize: "13px", color: t.role === "assistant" ? "rgba(235,229,220,0.6)" : "rgba(235,229,220,0.35)", fontFamily: sans, lineHeight: "1.7", maxWidth: "90%", padding: "10px 14px", background: t.role === "assistant" ? `${companionInfo.color}05` : "rgba(235,229,220,0.02)", border: `0.5px solid ${t.role === "assistant" ? `${companionInfo.color}10` : "rgba(235,229,220,0.04)"}` }}>
                      {t.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div style={{ padding: "14px 28px", borderTop: `0.5px solid rgba(235,229,220,0.03)`, flexShrink: 0 }}>
            <p style={{ fontSize: "10px", color: "rgba(235,229,220,0.07)", fontFamily: sans, lineHeight: "1.6", margin: 0 }}>
              Say <span style={{ color: `${accentColor}20` }}>"Can I talk to Mom?"</span> to switch mid-call.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
