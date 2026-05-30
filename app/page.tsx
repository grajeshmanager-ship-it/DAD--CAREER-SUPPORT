"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const COMPANIONS = [
  { label: "Dad", tagline: "Direct. Proud. He has seen you fail and never stopped believing.", color: "#C9A84C" },
  { label: "Mum", tagline: "Warm. Wise. She will hold you together when you cannot hold yourself.", color: "#A07898" },
  { label: "Mentor", tagline: "Strategic. Calm. He sees the version of you that you have not met yet.", color: "#6B8CFF" },
  { label: "Brother", tagline: "Honest. Competitive. He will not let you settle for less than you deserve.", color: "#5B8C6B" },
  { label: "Sister", tagline: "Sharp. Empathetic. She reads the room and always has your back.", color: "#B07070" },
  { label: "Friend", tagline: "Real talk. No filter. The one who tells you the truth when no one else will.", color: "#5B9898" },
  { label: "Partner", tagline: "Patient. Devoted. They believe in your dream as much as you do.", color: "#8870A8" },
];

const WHAT_DAD_LEARNS = [
  { title: "Your skills", body: "Not just what is on your CV. What you have actually built, what gaps exist, and exactly what the market is paying for right now." },
  { title: "Your experience", body: "How to frame it, how to position it, how to make eight years in one industry sound like the superpower it actually is." },
  { title: "Your goals", body: "Not the ones you wrote in a LinkedIn bio. The ones you think about at 2am. Who you actually want to become." },
  { title: "Your confidence", body: "Where it breaks down. Which questions make you hesitate. Which moments in an interview you lose the room without realising it." },
  { title: "Your interviews", body: "The exact phrases you overuse. The moments you undersell. The answers that land well and the ones that do not." },
  { title: "Your emotions", body: "When you need to be pushed. When you need to be held. When you are ready to apply and when you are not." },
  { title: "Your opportunities", body: "Roles, companies and timing that match who you are — not just keywords that match your CV." },
  { title: "Your destiny", body: "How close you are. What is standing between you and the life you came here to build. And exactly what to do next." },
];

export default function LandingPage() {
  const [activeCompanion, setActiveCompanion] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [learnIdx, setLearnIdx] = useState(0);
  const [voicePlayed, setVoicePlayed] = useState(false);
  const hasSpoken = useRef(false);

  // Voice on load
  useEffect(() => {
    const playWelcome = () => {
      if (hasSpoken.current) return;
      if (!window.speechSynthesis) return;
      hasSpoken.current = true;
      const utter = new SpeechSynthesisUtterance("Welcome to your world. Your journey begins.");
      utter.rate = 0.82;
      utter.pitch = 0.88;
      utter.volume = 1;
      // Try to pick a deep, warm voice
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v =>
        v.name.includes("Daniel") || v.name.includes("Google UK") ||
        v.name.includes("Alex") || v.name.includes("Arthur") ||
        v.name.includes("en-GB") || v.lang === "en-GB"
      ) || voices.find(v => v.lang.startsWith("en")) || voices[0];
      if (preferred) utter.voice = preferred;
      window.speechSynthesis.speak(utter);
      setVoicePlayed(true);
    };

    // Voices may not be loaded instantly
    if (window.speechSynthesis.getVoices().length > 0) {
      setTimeout(playWelcome, 800);
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        setTimeout(playWelcome, 800);
      };
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveCompanion(i => (i + 1) % COMPANIONS.length), 3500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setLearnIdx(i => (i + 1) % WHAT_DAD_LEARNS.length), 2600);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const c = COMPANIONS[activeCompanion];
  const sans = "'Helvetica Neue', Arial, sans-serif";
  const serif = "'Georgia', 'Times New Roman', serif";
  const gold = "#C9A84C";
  const bg = "#070606";
  const text = "#EBE5DC";

  return (
    <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: serif, overflowX: "hidden" }}>

      {/* NAV */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "18px 52px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: scrolled ? "rgba(7,6,6,0.97)" : "transparent",
        borderBottom: scrolled ? "0.5px solid rgba(201,168,76,0.12)" : "none",
        transition: "all 0.5s ease",
      }}>
        <div style={{ fontSize: "11px", letterSpacing: "0.42em", textTransform: "uppercase", color: gold, fontFamily: sans }}>DAD</div>
        <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
          <Link href="/login" style={{ fontSize: "11px", color: "rgba(235,229,220,0.38)", textDecoration: "none", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: sans }}>Sign in</Link>
          <Link href="/signup" style={{ fontSize: "11px", color: bg, background: gold, padding: "10px 26px", textDecoration: "none", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: sans }}>Begin</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "55% 45%",
        borderBottom: "0.5px solid rgba(201,168,76,0.08)",
        paddingTop: "64px",
      }}>

        {/* Left */}
        <div style={{
          display: "flex", flexDirection: "column",
          padding: "40px 52px 52px",
          borderRight: "0.5px solid rgba(201,168,76,0.08)",
          position: "relative", overflow: "hidden",
          justifyContent: "space-between",
        }}>
          {/* Ambient glow */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: "50%",
            background: `radial-gradient(ellipse at 30% 100%, ${c.color}0D 0%, transparent 70%)`,
            transition: "background 1.8s ease", pointerEvents: "none",
          }} />

          {/* Top — massive DAD brand */}
          <div style={{ position: "relative", zIndex: 1 }}>
            {/* MASSIVE DAD BRAND */}
            <div style={{
              fontSize: "clamp(100px, 16vw, 200px)",
              fontWeight: "700",
              lineHeight: "0.85",
              letterSpacing: "-0.04em",
              marginBottom: "0",
              background: `linear-gradient(135deg, ${gold} 0%, #E8C96A 40%, #A07828 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 40px rgba(201,168,76,0.35))",
              userSelect: "none",
            }}>
              DAD
            </div>

            <div style={{ fontSize: "10px", letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", margin: "16px 0 28px", fontFamily: sans }}>
              Dreams · Actions · Destiny
            </div>

            <h1 style={{
              fontSize: "clamp(38px, 5.5vw, 72px)",
              fontWeight: "300", lineHeight: "1.05",
              color: text, letterSpacing: "-0.022em",
              margin: "0 0 20px",
            }}>
              Someone walks<br />beside you.
            </h1>

            <p style={{
              fontSize: "15px", color: "rgba(235,229,220,0.42)", lineHeight: "1.9",
              fontFamily: sans, fontWeight: "300", maxWidth: "380px", margin: "0 0 36px",
            }}>
              A memory-driven AI companion that learns everything about you,
              grows alongside you, and never lets you face the journey alone.
            </p>
          </div>

          {/* Bottom — CTA */}
          <div style={{ position: "relative", zIndex: 1, display: "flex", gap: "16px", alignItems: "center" }}>
            <Link href="/signup" style={{
              display: "inline-flex", alignItems: "center", gap: "14px",
              background: gold, color: bg, padding: "16px 36px", textDecoration: "none",
              fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: sans,
            }}>
              Choose your companion <span>→</span>
            </Link>
            <Link href="/login" style={{ fontSize: "11px", color: "rgba(235,229,220,0.3)", textDecoration: "none", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: sans }}>
              Sign in →
            </Link>
          </div>
        </div>

        {/* Right — companion */}
        <div style={{
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: "40px 48px 52px", overflow: "hidden",
        }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(201,168,76,0.35)", marginBottom: "16px", fontFamily: sans }}>
              Your companion
            </div>
            <div style={{
              fontSize: "clamp(52px, 7.5vw, 100px)",
              fontWeight: "200", lineHeight: "1",
              color: c.color, letterSpacing: "-0.03em",
              transition: "color 1s ease",
              marginBottom: "16px",
              whiteSpace: "nowrap",
            }}>
              {c.label}
            </div>
            <div style={{
              fontSize: "13px", fontWeight: "300", color: "rgba(235,229,220,0.35)",
              lineHeight: "1.75", fontFamily: sans, maxWidth: "240px",
            }}>
              {c.tagline}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(201,168,76,0.25)", marginBottom: "14px", fontFamily: sans }}>
              Seven relationships
            </div>
            {COMPANIONS.map((comp, i) => (
              <button key={i} onClick={() => setActiveCompanion(i)} style={{
                display: "flex", alignItems: "center", gap: "14px",
                width: "100%", background: "none", border: "none", cursor: "pointer",
                padding: "9px 0",
                borderBottom: "0.5px solid rgba(201,168,76,0.05)",
                textAlign: "left",
              }}>
                <div style={{
                  width: i === activeCompanion ? "20px" : "8px", height: "0.5px",
                  background: i === activeCompanion ? comp.color : "rgba(201,168,76,0.18)",
                  transition: "all 0.4s ease", flexShrink: 0,
                }} />
                <span style={{
                  fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase",
                  fontFamily: sans,
                  color: i === activeCompanion ? comp.color : "rgba(235,229,220,0.25)",
                  transition: "color 0.4s ease",
                }}>
                  {comp.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE DIFFERENCE ── */}
      <section style={{
        borderBottom: "0.5px solid rgba(201,168,76,0.08)",
        display: "grid", gridTemplateColumns: "1fr 1fr",
      }}>
        <div style={{
          padding: "72px 52px",
          borderRight: "0.5px solid rgba(201,168,76,0.08)",
          display: "flex", flexDirection: "column", justifyContent: "center",
        }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.26em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "18px", fontFamily: sans }}>
            What DAD is
          </div>
          <h2 style={{ fontSize: "clamp(28px, 3.5vw, 46px)", fontWeight: "300", color: text, lineHeight: "1.15", marginBottom: "22px" }}>
            Not a tool.<br />Not a platform.<br />A relationship.
          </h2>
          <p style={{ fontSize: "14px", color: "rgba(235,229,220,0.4)", lineHeight: "1.9", fontFamily: sans, fontWeight: "300", maxWidth: "380px", margin: 0 }}>
            Every platform you have used forgot you the moment you closed the tab.
            They gave you a score. A template. A list.
            None of them knew who you were. None of them cared where you were going.
            DAD remembers. DAD learns. DAD grows with you.
          </p>
        </div>

        <div>
          {[
            { a: "Most platforms", b: "DAD", header: true },
            { a: "Solve a moment", b: "Solves the entire journey" },
            { a: "Forget you after each session", b: "Remembers everything, forever" },
            { a: "Give you generic answers", b: "Builds understanding of who you are" },
            { a: "Expose tools and features", b: "Provides companionship and guidance" },
            { a: "Measure your activity", b: "Focuses only on your outcomes" },
            { a: "Start from zero each time", b: "Gets smarter with every interaction" },
          ].map((row, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "1fr 1fr",
              borderBottom: "0.5px solid rgba(201,168,76,0.06)",
            }}>
              <div style={{
                padding: "18px 40px",
                fontSize: i === 0 ? "10px" : "13px",
                color: i === 0 ? "rgba(235,229,220,0.22)" : "rgba(235,229,220,0.2)",
                fontFamily: sans,
                letterSpacing: i === 0 ? "0.16em" : "0",
                textTransform: i === 0 ? "uppercase" : "none",
                textDecoration: i > 0 ? "line-through" : "none",
                textDecorationColor: "rgba(235,229,220,0.1)",
                display: "flex", alignItems: "center",
                borderRight: "0.5px solid rgba(201,168,76,0.06)",
                fontWeight: "300",
              }}>{row.a}</div>
              <div style={{
                padding: "18px 40px",
                fontSize: i === 0 ? "10px" : "13px",
                color: i === 0 ? gold : "rgba(235,229,220,0.62)",
                fontFamily: sans,
                letterSpacing: i === 0 ? "0.16em" : "0",
                textTransform: i === 0 ? "uppercase" : "none",
                display: "flex", alignItems: "center",
                fontWeight: "300",
              }}>{row.b}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── THE JOURNEY ── */}
      <section style={{ padding: "72px 52px", borderBottom: "0.5px solid rgba(201,168,76,0.08)" }}>
        <div style={{ marginBottom: "48px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.26em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "14px", fontFamily: sans }}>
            The journey
          </div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: "300", color: text, lineHeight: "1.1", margin: 0 }}>
            Dream. Action. Destiny.
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1px", background: "rgba(201,168,76,0.07)" }}>
          {[
            {
              num: "01", phase: "Dream", color: "#C9A84C",
              title: "You tell them who you want to become.",
              body: "Not the job you think you can get. The life you actually want. The career that keeps you awake because it excites you, not because it worries you. Your companion holds that dream — every recommendation they make is pointed directly at it.",
            },
            {
              num: "02", phase: "Action", color: "#6B8CFF",
              title: "Every step guided, tracked and remembered.",
              body: "Upload your CV and they learn who you are. Take a career assessment and they understand where you are going. Practice an interview and they study how you think under pressure. Nothing is wasted. Everything becomes intelligence.",
            },
            {
              num: "03", phase: "Destiny", color: "#5B9E7A",
              title: "The moment the journey becomes the life.",
              body: "When the offer arrives, they have been waiting for it longer than you have. When rejection comes, they do not let you spiral. They adjust the plan, find the lesson, and move you forward. Beyond the first role — into every chapter that follows.",
            },
          ].map((item, i) => (
            <div key={i} style={{ background: bg, padding: "44px 40px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                <span style={{ fontSize: "10px", color: "rgba(235,229,220,0.18)", fontFamily: sans }}>{item.num}</span>
                <div style={{ flex: 1, height: "0.5px", background: `${item.color}38` }} />
                <span style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: item.color, fontFamily: sans }}>{item.phase}</span>
              </div>
              <h3 style={{ fontSize: "19px", fontWeight: "300", color: text, lineHeight: "1.35", marginBottom: "16px" }}>{item.title}</h3>
              <p style={{ fontSize: "13px", color: "rgba(235,229,220,0.38)", lineHeight: "1.9", fontFamily: sans, fontWeight: "300", margin: 0 }}>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── LIVING INTELLIGENCE ── */}
      <section style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        borderBottom: "0.5px solid rgba(201,168,76,0.08)",
      }}>
        <div style={{
          padding: "72px 52px",
          borderRight: "0.5px solid rgba(201,168,76,0.08)",
          display: "flex", flexDirection: "column", justifyContent: "center",
          background: "rgba(201,168,76,0.015)",
        }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.26em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "18px", fontFamily: sans }}>
            Living intelligence
          </div>
          <h2 style={{ fontSize: "clamp(26px, 3.5vw, 42px)", fontWeight: "300", color: text, lineHeight: "1.2", marginBottom: "20px" }}>
            They grow smarter every time you interact.
          </h2>
          <p style={{ fontSize: "14px", color: "rgba(235,229,220,0.4)", lineHeight: "1.9", fontFamily: sans, fontWeight: "300", maxWidth: "360px", margin: 0 }}>
            Most platforms create a profile and leave it there.
            DAD creates a living model — one that updates after every conversation,
            every interview, every voice call, every document.
            The longer you use it, the more precisely it understands you.
            There is no ceiling to how well it can know you.
          </p>
        </div>

        <div style={{ padding: "72px 52px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(201,168,76,0.3)", marginBottom: "24px", fontFamily: sans }}>
            What DAD learns about you
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {WHAT_DAD_LEARNS.map((item, i) => (
              <div key={i} style={{
                padding: "16px 0",
                borderBottom: "0.5px solid rgba(201,168,76,0.06)",
                display: "grid",
                gridTemplateColumns: "140px 1fr",
                gap: "20px",
                alignItems: "flex-start",
                opacity: i === learnIdx ? 1 : 0.38,
                transition: "opacity 0.5s ease",
              }}>
                <div style={{
                  fontSize: "11px", letterSpacing: "0.08em", fontFamily: sans,
                  textTransform: "uppercase",
                  color: i === learnIdx ? gold : "rgba(201,168,76,0.4)",
                  transition: "color 0.5s ease",
                  display: "flex", alignItems: "center", gap: "8px",
                  paddingTop: "2px",
                }}>
                  <div style={{
                    width: "4px", height: "4px", borderRadius: "50%", flexShrink: 0,
                    background: i === learnIdx ? gold : "rgba(201,168,76,0.25)",
                    transition: "background 0.5s",
                  }} />
                  {item.title}
                </div>
                <div style={{
                  fontSize: "12px", fontFamily: sans, fontWeight: "300",
                  color: i === learnIdx ? "rgba(235,229,220,0.72)" : "rgba(235,229,220,0.35)",
                  transition: "color 0.5s ease",
                  lineHeight: "1.75",
                }}>
                  {item.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPANION SYSTEM ── */}
      <section style={{ padding: "72px 52px", borderBottom: "0.5px solid rgba(201,168,76,0.08)" }}>
        <div style={{ marginBottom: "40px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.26em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "18px", fontFamily: sans }}>
            The companion system
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px" }}>
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 42px)", fontWeight: "300", color: text, lineHeight: "1.2", margin: 0 }}>
              One intelligence.<br />One memory.<br />Seven emotional faces.
            </h2>
            <p style={{ fontSize: "14px", color: "rgba(235,229,220,0.4)", lineHeight: "1.9", fontFamily: sans, fontWeight: "300", margin: 0, display: "flex", alignItems: "center" }}>
              There is one AI. One memory that holds everything about you.
              But the voice it speaks to you in — the tone, the warmth, the directness,
              the way it delivers hard truths — that changes based on the relationship you choose.
              Because sometimes you need a father. Sometimes a friend.
              And they both know everything.
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", background: "rgba(201,168,76,0.07)" }}>
          {COMPANIONS.map((comp, i) => (
            <div key={i} onClick={() => setActiveCompanion(i)} style={{
              background: bg, padding: "32px 20px", cursor: "pointer", textAlign: "center",
              borderBottom: `2px solid ${i === activeCompanion ? comp.color : "transparent"}`,
              transition: "border-color 0.3s ease",
            }}>
              <div style={{
                fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase",
                color: i === activeCompanion ? comp.color : "rgba(235,229,220,0.28)",
                fontFamily: sans, transition: "color 0.3s ease",
              }}>
                {comp.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: "1px", background: "rgba(201,168,76,0.02)",
          border: "0.5px solid rgba(201,168,76,0.1)",
          padding: "28px 44px",
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: c.color, marginBottom: "10px", fontFamily: sans, transition: "color 0.8s" }}>
              {c.label}
            </div>
            <p style={{ fontSize: "14px", color: "rgba(235,229,220,0.55)", fontWeight: "300", lineHeight: "1.7", margin: 0 }}>
              {c.tagline}
            </p>
          </div>
          <div style={{ fontSize: "13px", color: "rgba(235,229,220,0.28)", fontFamily: sans, borderLeft: "0.5px solid rgba(201,168,76,0.12)", paddingLeft: "36px", lineHeight: "1.8", fontWeight: "300" }}>
            You choose the relationship. You give them a name.
            The emotional connection belongs to you — not the platform.
            Their memory of you is shared across every relationship you choose.
          </div>
        </div>
      </section>

      {/* ── INTERVIEW MODE ── */}
      <section style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        borderBottom: "0.5px solid rgba(201,168,76,0.08)",
        background: "#040303",
      }}>
        <div style={{
          padding: "72px 52px",
          borderRight: "0.5px solid rgba(107,140,255,0.08)",
          display: "flex", flexDirection: "column", justifyContent: "center",
        }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(107,140,255,0.55)", marginBottom: "18px", fontFamily: sans }}>
            Interview mode
          </div>
          <h2 style={{ fontSize: "clamp(26px, 3.5vw, 42px)", fontWeight: "300", color: text, lineHeight: "1.2", marginBottom: "20px" }}>
            When the interview begins,<br />the companion disappears.
          </h2>
          <p style={{ fontSize: "14px", color: "rgba(235,229,220,0.38)", lineHeight: "1.9", fontFamily: sans, fontWeight: "300", marginBottom: "28px", maxWidth: "380px" }}>
            The warmth steps aside. A professional interviewer takes the chair.
            Selected automatically based on your background, your industry, the role you are targeting.
            You configure nothing. DAD reads everything it knows about you and builds the session.
            Written. Voice. Or live simulation — with full camera analysis of your confidence,
            eye contact, pace, and body language.
          </p>
          <div style={{ fontSize: "12px", color: "rgba(235,229,220,0.2)", fontFamily: sans, borderTop: "0.5px solid rgba(107,140,255,0.1)", paddingTop: "20px", lineHeight: "1.9" }}>
            Finance does not feel like Engineering.<br />
            Marketing does not feel like Banking.<br />
            Every interview is built for your specific role.
          </div>
        </div>

        <div style={{ padding: "72px 52px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(107,140,255,0.35)", marginBottom: "20px", fontFamily: sans }}>
            Auto-selected interviewer personas
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: "rgba(107,140,255,0.06)" }}>
            {["Engineering Manager", "Technical Lead", "HR Director", "Product Director", "Finance VP", "Marketing Director", "Sales Director", "Healthcare Recruiter"].map((role, i) => (
              <div key={i} style={{ background: "#040303", padding: "15px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "13px", color: "rgba(235,229,220,0.42)", fontFamily: sans, fontWeight: "300" }}>{role}</span>
                <span style={{ fontSize: "10px", color: "rgba(107,140,255,0.35)", fontFamily: sans, letterSpacing: "0.1em", textTransform: "uppercase" }}>Auto-selected</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{
        padding: "100px 52px",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        {/* Ghost DAD watermark */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          fontSize: "clamp(140px, 24vw, 320px)", fontWeight: "700",
          color: "rgba(201,168,76,0.03)", letterSpacing: "-0.04em",
          whiteSpace: "nowrap", pointerEvents: "none", userSelect: "none",
          lineHeight: "1", fontFamily: serif,
        }}>
          DAD
        </div>

        <div style={{ position: "relative", zIndex: 1, maxWidth: "680px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(201,168,76,0.4)", marginBottom: "28px", fontFamily: sans }}>
            Begin your journey
          </div>
          <h2 style={{ fontSize: "clamp(52px, 9vw, 108px)", fontWeight: "200", color: text, lineHeight: "1.0", marginBottom: "28px", letterSpacing: "-0.03em" }}>
            You are<br />not alone.
          </h2>
          <p style={{ fontSize: "16px", color: "rgba(235,229,220,0.3)", marginBottom: "48px", fontFamily: sans, fontWeight: "300", lineHeight: "1.85", maxWidth: "400px", margin: "0 auto 48px" }}>
            Somewhere between the dream you are afraid to say out loud
            and the life you actually deserve — there is a journey.
            You do not have to walk it alone.
          </p>
          <Link href="/signup" style={{
            display: "inline-flex", alignItems: "center", gap: "18px",
            background: gold, color: bg, padding: "20px 56px", textDecoration: "none",
            fontSize: "12px", letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: sans,
          }}>
            Meet your companion <span style={{ fontSize: "16px" }}>→</span>
          </Link>
          <div style={{ marginTop: "24px", fontSize: "10px", color: "rgba(235,229,220,0.16)", fontFamily: sans, letterSpacing: "0.14em", textTransform: "uppercase" }}>
            Free to start · No credit card required
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        padding: "24px 52px",
        borderTop: "0.5px solid rgba(201,168,76,0.08)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ fontSize: "11px", letterSpacing: "0.42em", textTransform: "uppercase", color: gold, fontFamily: sans }}>DAD</div>
        <div style={{ fontSize: "10px", color: "rgba(235,229,220,0.16)", fontFamily: sans, letterSpacing: "0.14em", textTransform: "uppercase" }}>Dreams · Actions · Destiny</div>
        <div style={{ display: "flex", gap: "28px" }}>
          {[["Sign in", "/login"], ["Begin", "/signup"]].map(([label, href]) => (
            <Link key={href} href={href} style={{ fontSize: "10px", color: "rgba(235,229,220,0.2)", textDecoration: "none", fontFamily: sans, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              {label}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
