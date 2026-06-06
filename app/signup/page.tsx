"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const COMPANIONS = [
  { type: "dad", label: "Father", sub: "Dad", color: "#C9A84C", description: "He has watched you struggle and never once stopped believing. Direct. Proud. The kind of presence that makes you want to be better just by being in the room.", greeting: "I've been waiting for you. Let's get to work." },
  { type: "mom", label: "Mother", sub: "Mum", color: "#A07898", description: "She will hold you together when you cannot hold yourself. Warm beyond measure. Wise beyond words. The one who sees who you really are.", greeting: "Sweetheart. I'm here. We're going to figure this out together." },
  { type: "mentor", label: "Mentor", sub: "Mentor", color: "#6B8CFF", description: "Strategic. Calm. He has been where you are going and knows exactly which turns to take. He sees the version of you that you have not met yet.", greeting: "Good. You showed up. That's always the hardest part. Now let's talk about where you're going." },
  { type: "brother", label: "Brother", sub: "Brother", color: "#5B8C6B", description: "Honest. Competitive. He will not let you settle for less than you deserve — and he will give you grief if you try. The push you actually need.", greeting: "Finally. I was wondering when you'd get serious. Let's go." },
  { type: "sister", label: "Sister", sub: "Sister", color: "#B07070", description: "Sharp. Empathetic. She reads every room before you walk into it. Always in your corner. Never lets you walk in underprepared.", greeting: "Okay, I'm here. Tell me everything. What are we working with?" },
  { type: "friend", label: "Friend", sub: "Friend", color: "#5B9898", description: "Real talk. No filter. No performance. The one who tells you the truth when everyone else is being polite. Rides with you through all of it.", greeting: "Right, so — what's actually going on? Talk to me." },
  { type: "partner", label: "Partner", sub: "Partner", color: "#8870A8", description: "Patient. Devoted. They believe in your dream as much as you do — sometimes more. The one who never lets you give up on yourself.", greeting: "I'm so glad you're doing this. I've always known you could. Let's build this together." },
];

type Step = "choose" | "name" | "account" | "meeting";

export default function SignupPage() {
  const [step, setStep] = useState<Step>("choose");
  const [selectedCompanion, setSelectedCompanion] = useState<number | null>(null);
  const [companionName, setCompanionName] = useState("");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<string>("male");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hoveredCompanion, setHoveredCompanion] = useState<number | null>(null);
  const hasSpoken = useRef(false);
  const hasSpokenMeeting = useRef(false);

  const sans = "'Helvetica Neue', Arial, sans-serif";
  const serif = "'Georgia', 'Times New Roman', serif";
  const gold = "#C9A84C";
  const bg = "#070606";
  const text = "#EBE5DC";

  const companion = selectedCompanion !== null ? COMPANIONS[selectedCompanion] : null;
  const displayedCompanion = hoveredCompanion !== null ? COMPANIONS[hoveredCompanion] : companion;

  const speakLine = (line: string, pitch = 0.88, delay = 800) => {
    if (!window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(line);
    utter.rate = 0.82; utter.pitch = pitch; utter.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes("Daniel")) || voices.find(v => v.name.includes("Arthur")) || voices.find(v => v.lang === "en-GB") || voices.find(v => v.lang.startsWith("en")) || voices[0];
    if (preferred) utter.voice = preferred;
    setTimeout(() => window.speechSynthesis.speak(utter), delay);
  };

  useEffect(() => {
    if (hasSpoken.current || sessionStorage.getItem("dad_signup_voiced")) return;
    hasSpoken.current = true;
    sessionStorage.setItem("dad_signup_voiced", "1");
    const speak = () => speakLine("This is the beginning. Not of a product. Of a relationship that will change where you end up.", 0.86, 1000);
    if (window.speechSynthesis.getVoices().length > 0) speak();
    else window.speechSynthesis.onvoiceschanged = speak;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step !== "meeting" || hasSpokenMeeting.current || !companion) return;
    hasSpokenMeeting.current = true;
    const pitch = companion.type === "mom" || companion.type === "sister" ? 1.08 : 0.88;
    const speak = () => speakLine(companion.greeting, pitch, 1200);
    if (window.speechSynthesis.getVoices().length > 0) speak();
    else window.speechSynthesis.onvoiceschanged = speak;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, companion]);

  const handleSignup = async () => {
    if (!email || !password || !userName) { setError("Please fill in all fields."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true); setError("");
    try {
      const { data, error: signupError } = await supabase.auth.signUp({ email, password });
      if (signupError) throw signupError;

      if (data.user) {
        const userId = data.user.id;
        const finalCompanionName = companionName || companion?.sub || "DAD";
        const joinDate = new Date().toISOString();

        // Save profile
        await supabase.from("profiles").upsert({
          id: userId,
          email,
          full_name: userName,
          companion_type: companion?.type,
          companion_name: finalCompanionName,
          gender,
          created_at: joinDate,
          last_seen_at: joinDate,
          total_sessions: 1,
        });

        // ── WRITE DAY 1 IDENTITY MEMORIES ──
        // This is the most important moment. DAD learns who this person is
        // from the very first second. These memories last forever.
        const day1Memories = [
          {
            user_id: userId,
            memory_type: "identity",
            category: "first_meeting",
            content: `${userName} joined DAD on ${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}. They chose ${companion?.label} (${finalCompanionName}) as their companion. Gender: ${gender}. Email: ${email}. This is Day 1 of their journey.`,
            importance: 10,
            metadata: {
              joinDate,
              companionType: companion?.type,
              companionName: finalCompanionName,
              gender,
              isDay1: true,
            },
            session_date: new Date().toISOString().split("T")[0],
            created_at: joinDate,
          },
          {
            user_id: userId,
            memory_type: "identity",
            category: "companion_choice",
            content: `${userName} chose a ${companion?.label} as their primary companion and named them "${finalCompanionName}". This choice reveals something important about what kind of support they are looking for: ${companion?.description}`,
            importance: 9,
            metadata: {
              companionType: companion?.type,
              companionName: finalCompanionName,
              companionDescription: companion?.description,
              companionGreeting: companion?.greeting,
            },
            session_date: new Date().toISOString().split("T")[0],
            created_at: joinDate,
          },
          {
            user_id: userId,
            memory_type: "milestone",
            category: "journey_start",
            content: `Journey officially began. ${finalCompanionName} said: "${companion?.greeting}" — the first words ever spoken to ${userName} in this relationship.`,
            importance: 10,
            metadata: {
              firstWords: companion?.greeting,
              companionType: companion?.type,
            },
            session_date: new Date().toISOString().split("T")[0],
            created_at: joinDate,
          },
        ];

        // Write day 1 memories via API
        await fetch("/api/dad-memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "write_many",
            userId,
            memories: day1Memories,
          }),
        });
      }

      setStep("meeting");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── STEP: CHOOSE ──
  if (step === "choose") return (
    <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: serif, display: "flex", flexDirection: "column" }}>
      <nav style={{ padding: "20px 52px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "0.5px solid rgba(201,168,76,0.08)" }}>
        <Link href="/" style={{ fontSize: "11px", letterSpacing: "0.42em", textTransform: "uppercase", color: gold, fontFamily: sans, textDecoration: "none" }}>DAD</Link>
        <Link href="/login" style={{ fontSize: "11px", color: "rgba(235,229,220,0.3)", textDecoration: "none", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: sans }}>Already have an account →</Link>
      </nav>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "calc(100vh - 61px)" }}>
        <div style={{ padding: "60px 52px", borderRight: "0.5px solid rgba(201,168,76,0.08)", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60%", background: displayedCompanion ? `radial-gradient(ellipse at 20% 100%, ${displayedCompanion.color}12 0%, transparent 70%)` : "none", transition: "background 1s ease", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "36px", fontFamily: sans }}>Step one</div>
            <h1 style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: "300", lineHeight: "1.1", color: text, letterSpacing: "-0.02em", marginBottom: "24px" }}>Who walks<br />beside you?</h1>
            <p style={{ fontSize: "15px", color: "rgba(235,229,220,0.4)", lineHeight: "1.9", fontFamily: sans, fontWeight: "300", maxWidth: "360px", margin: 0 }}>
              This is not a chatbot you are configuring. This is a relationship you are choosing. Take your time. It matters.
            </p>
          </div>
          <div style={{ position: "relative", zIndex: 1, minHeight: "140px" }}>
            {displayedCompanion ? (
              <div>
                <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: displayedCompanion.color, marginBottom: "12px", fontFamily: sans, transition: "color 0.4s" }}>{displayedCompanion.label}</div>
                <p style={{ fontSize: "14px", color: "rgba(235,229,220,0.5)", lineHeight: "1.8", fontFamily: sans, fontWeight: "300", maxWidth: "360px", margin: "0 0 28px" }}>{displayedCompanion.description}</p>
                {selectedCompanion !== null && hoveredCompanion === null && (
                  <button onClick={() => setStep("name")} style={{ display: "inline-flex", alignItems: "center", gap: "14px", background: gold, color: bg, padding: "16px 36px", border: "none", cursor: "pointer", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: sans }}>
                    Continue with {companion?.label} →
                  </button>
                )}
              </div>
            ) : (
              <p style={{ fontSize: "13px", color: "rgba(235,229,220,0.2)", fontFamily: sans, fontStyle: "italic" }}>Select a relationship to continue</p>
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {COMPANIONS.map((comp, i) => (
            <div key={i} onClick={() => setSelectedCompanion(i)} onMouseEnter={() => setHoveredCompanion(i)} onMouseLeave={() => setHoveredCompanion(null)}
              style={{ flex: 1, padding: "0 52px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", borderBottom: "0.5px solid rgba(201,168,76,0.06)", borderLeft: selectedCompanion === i ? `2px solid ${comp.color}` : "2px solid transparent", background: selectedCompanion === i ? `${comp.color}06` : hoveredCompanion === i ? "rgba(235,229,220,0.015)" : "transparent", transition: "all 0.25s ease", minHeight: "80px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", border: `0.5px solid ${selectedCompanion === i || hoveredCompanion === i ? comp.color : "rgba(201,168,76,0.15)"}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "border-color 0.3s", flexShrink: 0 }}>
                  {selectedCompanion === i && <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: comp.color }} />}
                </div>
                <div>
                  <div style={{ fontSize: "14px", letterSpacing: "0.06em", color: selectedCompanion === i ? comp.color : hoveredCompanion === i ? "rgba(235,229,220,0.7)" : "rgba(235,229,220,0.35)", fontFamily: sans, transition: "color 0.3s", textTransform: "uppercase", marginBottom: "2px" }}>{comp.sub}</div>
                  <div style={{ fontSize: "11px", color: "rgba(235,229,220,0.25)", fontFamily: sans }}>{comp.label}</div>
                </div>
              </div>
              <div style={{ fontSize: "18px", color: selectedCompanion === i ? comp.color : "rgba(235,229,220,0.1)", fontFamily: sans, transition: "color 0.3s" }}>→</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── STEP: NAME ──
  if (step === "name") return (
    <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: serif, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: "clamp(120px, 20vw, 260px)", fontWeight: "700", color: `${companion?.color}06`, letterSpacing: "-0.04em", whiteSpace: "nowrap", pointerEvents: "none", userSelect: "none", lineHeight: "1" }}>
        {companion?.sub}
      </div>
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: "480px", width: "100%" }}>
        <div style={{ fontSize: "10px", letterSpacing: "0.28em", textTransform: "uppercase", color: companion?.color, marginBottom: "32px", fontFamily: sans }}>Step two · {companion?.label}</div>
        <h2 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: "300", color: text, lineHeight: "1.1", marginBottom: "16px" }}>What will you<br />call them?</h2>
        <p style={{ fontSize: "14px", color: "rgba(235,229,220,0.35)", lineHeight: "1.8", fontFamily: sans, fontWeight: "300", marginBottom: "48px" }}>
          This is the name they will use. The name you will hear. It belongs to you — not the platform.
        </p>
        <input type="text" placeholder={companion?.sub} value={companionName} onChange={e => setCompanionName(e.target.value)} autoFocus onKeyDown={e => e.key === "Enter" && setStep("account")}
          style={{ width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${companion?.color}40`, color: text, fontSize: "clamp(28px, 4vw, 48px)", fontFamily: serif, fontWeight: "300", textAlign: "center", padding: "12px 0", outline: "none", marginBottom: "48px", letterSpacing: "0.04em" }} />
        <div style={{ display: "flex", gap: "16px", justifyContent: "center", alignItems: "center" }}>
          <button onClick={() => setStep("choose")} style={{ background: "none", border: "0.5px solid rgba(235,229,220,0.12)", color: "rgba(235,229,220,0.3)", padding: "14px 28px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: sans }}>← Back</button>
          <button onClick={() => setStep("account")} style={{ background: companion?.color, color: bg, border: "none", padding: "14px 40px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: sans }}>
            {companionName ? `Continue with ${companionName}` : "Continue"} →
          </button>
        </div>
      </div>
    </div>
  );

  // ── STEP: ACCOUNT ──
  if (step === "account") return (
    <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: serif, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px" }}>
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: "420px", width: "100%" }}>
        <div style={{ fontSize: "10px", letterSpacing: "0.28em", textTransform: "uppercase", color: companion?.color, marginBottom: "32px", fontFamily: sans }}>Step three · Almost there</div>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: "300", color: text, lineHeight: "1.1", marginBottom: "12px" }}>Who are you?</h2>
        <p style={{ fontSize: "14px", color: "rgba(235,229,220,0.35)", lineHeight: "1.8", fontFamily: sans, fontWeight: "300", marginBottom: "40px" }}>
          {companionName || companion?.sub} is ready. We just need to know who they are walking beside.
        </p>
        <div style={{ marginBottom: "32px", textAlign: "left" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(201,168,76,0.4)", marginBottom: "12px", fontFamily: sans }}>You are</div>
          <div style={{ display: "flex", gap: "8px" }}>
            {[{ value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Other" }].map(g => (
              <button key={g.value} onClick={() => setGender(g.value)}
                style={{ flex: 1, padding: "12px", border: `0.5px solid ${gender === g.value ? companion?.color || gold : "rgba(201,168,76,0.15)"}`, background: gender === g.value ? `${companion?.color || gold}15` : "transparent", color: gender === g.value ? companion?.color || gold : "rgba(235,229,220,0.35)", cursor: "pointer", fontSize: "12px", fontFamily: sans, letterSpacing: "0.08em", transition: "all 0.2s" }}>
                {g.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginBottom: "32px", textAlign: "left" }}>
          {[
            { label: "Your name", value: userName, setter: setUserName, type: "text", placeholder: "What should we call you?" },
            { label: "Email address", value: email, setter: setEmail, type: "email", placeholder: "your@email.com" },
            { label: "Password", value: password, setter: setPassword, type: "password", placeholder: "At least 6 characters" },
          ].map((field, i) => (
            <div key={i} style={{ borderBottom: "0.5px solid rgba(201,168,76,0.12)", paddingBottom: "4px", marginBottom: "28px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(201,168,76,0.4)", marginBottom: "8px", fontFamily: sans }}>{field.label}</div>
              <input type={field.type} placeholder={field.placeholder} value={field.value}
                onChange={e => field.setter(e.target.value)}
                style={{ width: "100%", background: "transparent", border: "none", color: text, fontSize: "16px", fontFamily: sans, fontWeight: "300", padding: "4px 0", outline: "none" }} />
            </div>
          ))}
        </div>
        {error && <p style={{ fontSize: "12px", color: "#B07070", fontFamily: sans, marginBottom: "16px", textAlign: "center" }}>{error}</p>}
        <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
          <button onClick={() => setStep("name")} style={{ background: "none", border: "0.5px solid rgba(235,229,220,0.12)", color: "rgba(235,229,220,0.3)", padding: "14px 28px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: sans }}>← Back</button>
          <button onClick={handleSignup} disabled={loading}
            style={{ background: loading ? "rgba(201,168,76,0.5)" : companion?.color, color: bg, border: "none", padding: "14px 40px", cursor: loading ? "not-allowed" : "pointer", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: sans, transition: "background 0.3s" }}>
            {loading ? "Creating..." : `Meet ${companionName || companion?.sub} →`}
          </button>
        </div>
        <p style={{ marginTop: "28px", fontSize: "11px", color: "rgba(235,229,220,0.2)", fontFamily: sans, textAlign: "center" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: companion?.color, textDecoration: "none" }}>Sign in →</Link>
        </p>
      </div>
    </div>
  );

  // ── STEP: MEETING ──
  return (
    <div style={{ minHeight: "100vh", background: "#030202", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px", textAlign: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "500px", height: "400px", background: `radial-gradient(ellipse, ${companion?.color}18 0%, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: "clamp(100px, 18vw, 220px)", fontWeight: "700", color: `${companion?.color}08`, letterSpacing: "-0.04em", whiteSpace: "nowrap", pointerEvents: "none", userSelect: "none", lineHeight: "1", fontFamily: serif }}>
        {companionName || companion?.sub}
      </div>
      <div style={{ position: "relative", zIndex: 1, maxWidth: "560px" }}>
        <div style={{ fontSize: "10px", letterSpacing: "0.28em", textTransform: "uppercase", color: `${companion?.color}80`, marginBottom: "40px", fontFamily: sans }}>{companion?.label}</div>
        <div style={{ fontSize: "clamp(48px, 8vw, 96px)", fontWeight: "200", color: companion?.color, letterSpacing: "-0.03em", lineHeight: "1", marginBottom: "32px" }}>
          {companionName || companion?.sub}
        </div>
        <p style={{ fontSize: "clamp(16px, 2vw, 20px)", color: "rgba(235,229,220,0.55)", lineHeight: "1.7", fontStyle: "italic", marginBottom: "52px", fontFamily: serif }}>
          "{companion?.greeting}"
        </p>
        <div style={{ width: "40px", height: "0.5px", background: companion?.color, margin: "0 auto 40px", opacity: 0.4 }} />
        <Link href="/dream" style={{ display: "inline-flex", alignItems: "center", gap: "14px", background: companion?.color, color: bg, padding: "18px 48px", textDecoration: "none", fontSize: "11px", letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: sans }}>
          Begin the journey →
        </Link>
        <p style={{ marginTop: "24px", fontSize: "11px", color: "rgba(235,229,220,0.2)", fontFamily: sans, letterSpacing: "0.08em" }}>
          {companionName || companion?.sub} will remember everything from here.
        </p>
      </div>
    </div>
  );
}
