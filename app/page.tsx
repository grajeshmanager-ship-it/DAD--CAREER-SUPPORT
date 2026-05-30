"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const COMPANIONS = [
  { type: "Father", label: "Dad", tagline: "Direct. Proud. Never gives up on you.", color: "#C9A84C" },
  { type: "Mother", label: "Mum", tagline: "Warm. Wise. Believes in you always.", color: "#B07BA0" },
  { type: "Mentor", label: "Mentor", tagline: "Strategic. Calm. Sees your potential.", color: "#6B8CFF" },
  { type: "Brother", label: "Brother", tagline: "Honest. Competitive. Won't let you quit.", color: "#5B9E5B" },
  { type: "Sister", label: "Sister", tagline: "Sharp. Empathetic. Always in your corner.", color: "#C07070" },
  { type: "Friend", label: "Friend", tagline: "Real talk. No filter. Rides with you.", color: "#5BA8A8" },
  { type: "Partner", label: "Partner", tagline: "Patient. Devoted. Your biggest supporter.", color: "#9070B8" },
];

const STORIES = [
  {
    name: "Priya S.",
    role: "Software Engineer — Google",
    quote: "She knew my profile better than I did. She helped me see strengths I had been ignoring for years.",
    companion: "Mum",
  },
  {
    name: "James O.",
    role: "Product Manager — career change at 38",
    quote: "He never judged the gap in my CV. He helped me reframe eight years of experience into something powerful.",
    companion: "Mentor",
  },
  {
    name: "Ravi K.",
    role: "Data Analyst — first role after university",
    quote: "He told me to apply even when I felt completely unready. Every single time, he was right.",
    companion: "Dad",
  },
];

const WHAT_DAD_KNOWS = [
  "Your skills and where they stand in the market",
  "Your experience and how to position it",
  "Your goals and what is actually holding you back",
  "Your interview patterns and where you lose confidence",
  "Your application history and what is working",
  "Your emotional state and when you need support",
  "Your market opportunities in real time",
  "How close you are to your destiny",
];

export default function LandingPage() {
  const [activeCompanion, setActiveCompanion] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [storyIdx, setStoryIdx] = useState(0);
  const [visibleKnowledge, setVisibleKnowledge] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActiveCompanion(i => (i + 1) % COMPANIONS.length), 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setStoryIdx(i => (i + 1) % STORIES.length), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setVisibleKnowledge(i => (i + 1) % WHAT_DAD_KNOWS.length), 2200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const companion = COMPANIONS[activeCompanion];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#070606",
      color: "#EDE8E0",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      overflowX: "hidden",
    }}>

      {/* Navigation */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "20px 48px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: scrolled ? "rgba(7,6,6,0.96)" : "transparent",
        borderBottom: scrolled ? "0.5px solid rgba(201,168,76,0.12)" : "none",
        transition: "all 0.5s ease",
      }}>
        <div style={{
          fontSize: "13px", fontWeight: "400", letterSpacing: "0.3em",
          textTransform: "uppercase", color: "#C9A84C",
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
        }}>
          DAD
        </div>
        <div style={{ display: "flex", gap: "36px", alignItems: "center" }}>
          <Link href="/login" style={{
            fontSize: "13px", color: "rgba(237,232,224,0.5)",
            textDecoration: "none", letterSpacing: "0.08em",
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
          }}>
            Sign in
          </Link>
          <Link href="/signup" style={{
            fontSize: "12px", color: "#070606", background: "#C9A84C",
            padding: "10px 24px", textDecoration: "none",
            letterSpacing: "0.1em", textTransform: "uppercase",
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
          }}>
            Begin
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        minHeight: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "flex-start", justifyContent: "flex-end",
        padding: "0 48px 80px",
        position: "relative",
        borderBottom: "0.5px solid rgba(201,168,76,0.1)",
      }}>

        {/* Background atmosphere */}
        <div style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(ellipse at 70% 40%, ${companion.color}0D 0%, transparent 60%)`,
          transition: "background 1.5s ease",
          pointerEvents: "none",
        }} />

        {/* Top right — rotating companion label */}
        <div style={{
          position: "absolute", top: "120px", right: "48px",
          textAlign: "right",
        }}>
          <div style={{
            fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase",
            color: "rgba(237,232,224,0.3)", marginBottom: "10px",
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
          }}>
            Your companion
          </div>
          <div style={{
            fontSize: "clamp(32px, 4vw, 52px)", fontWeight: "300",
            color: companion.color, letterSpacing: "0.04em",
            transition: "color 0.8s ease",
            lineHeight: "1",
          }}>
            {companion.label}
          </div>
          <div style={{
            fontSize: "13px", color: "rgba(237,232,224,0.4)", marginTop: "10px",
            fontFamily: "'Helvetica Neue', Arial, sans-serif", fontWeight: "300",
            maxWidth: "220px", lineHeight: "1.6", textAlign: "right",
            transition: "opacity 0.5s ease",
          }}>
            {companion.tagline}
          </div>

          {/* Companion selector dots */}
          <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", marginTop: "20px" }}>
            {COMPANIONS.map((_, i) => (
              <button key={i} onClick={() => setActiveCompanion(i)} style={{
                width: i === activeCompanion ? "20px" : "5px",
                height: "5px", borderRadius: "99px",
                background: i === activeCompanion ? companion.color : "rgba(201,168,76,0.2)",
                border: "none", cursor: "pointer", transition: "all 0.4s ease",
              }} />
            ))}
          </div>
        </div>

        {/* Main headline */}
        <div style={{ position: "relative", zIndex: 1, maxWidth: "780px" }}>
          <div style={{
            fontSize: "11px", letterSpacing: "0.25em", textTransform: "uppercase",
            color: "#C9A84C", marginBottom: "32px",
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
          }}>
            Dreams · Actions · Destiny
          </div>

          <h1 style={{
            fontSize: "clamp(48px, 8vw, 96px)",
            fontWeight: "300", lineHeight: "1.05",
            color: "#EDE8E0", letterSpacing: "-0.02em",
            marginBottom: "36px",
          }}>
            Someone walks<br />
            beside you.
          </h1>

          <p style={{
            fontSize: "clamp(15px, 1.8vw, 19px)",
            color: "rgba(237,232,224,0.5)",
            lineHeight: "1.8", maxWidth: "480px",
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
            fontWeight: "300", marginBottom: "48px",
          }}>
            A memory-driven career companion that learns everything about you,
            grows alongside you, and never lets you face the journey alone.
          </p>

          <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
            <Link href="/signup" style={{
              display: "inline-flex", alignItems: "center", gap: "14px",
              background: "#C9A84C", color: "#070606",
              padding: "18px 40px", textDecoration: "none",
              fontSize: "13px", letterSpacing: "0.12em", textTransform: "uppercase",
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
              transition: "opacity 0.2s",
            }}>
              Choose your companion
              <span style={{ fontSize: "16px", fontFamily: "sans-serif" }}>→</span>
            </Link>
            <Link href="/login" style={{
              display: "inline-flex", alignItems: "center",
              border: "0.5px solid rgba(201,168,76,0.25)",
              color: "rgba(237,232,224,0.5)",
              padding: "18px 40px", textDecoration: "none",
              fontSize: "13px", letterSpacing: "0.12em", textTransform: "uppercase",
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
            }}>
              Sign in
            </Link>
          </div>
        </div>

        {/* Bottom right — scroll */}
        <div style={{
          position: "absolute", bottom: "40px", right: "48px",
          display: "flex", alignItems: "center", gap: "12px",
        }}>
          <div style={{
            fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase",
            color: "rgba(201,168,76,0.35)", fontFamily: "sans-serif",
          }}>
            Scroll
          </div>
          <div style={{ width: "40px", height: "0.5px", background: "rgba(201,168,76,0.2)" }} />
        </div>
      </section>

      {/* What DAD actually is */}
      <section style={{
        padding: "120px 48px",
        borderBottom: "0.5px solid rgba(201,168,76,0.08)",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px",
        alignItems: "center", maxWidth: "1200px", margin: "0 auto",
      }}>
        <div>
          <div style={{
            fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase",
            color: "#C9A84C", marginBottom: "24px", fontFamily: "sans-serif",
          }}>
            What DAD is
          </div>
          <h2 style={{
            fontSize: "clamp(28px, 3.5vw, 48px)", fontWeight: "300",
            color: "#EDE8E0", lineHeight: "1.2", marginBottom: "24px",
          }}>
            Not a tool.<br />A relationship.
          </h2>
          <p style={{
            fontSize: "15px", color: "rgba(237,232,224,0.45)", lineHeight: "1.9",
            fontFamily: "sans-serif", fontWeight: "300",
          }}>
            Most platforms solve moments. DAD solves the entire journey.
            Most platforms forget you. DAD remembers everything.
            Most platforms give answers. DAD builds understanding.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {[
            { left: "Most platforms", right: "DAD" },
            { left: "Solve moments", right: "Solves the entire journey" },
            { left: "Forget the user", right: "Remembers everything" },
            { left: "Provide answers", right: "Builds understanding" },
            { left: "Expose tools", right: "Provides companionship" },
          ].map((row, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "1fr 1fr",
              borderBottom: "0.5px solid rgba(201,168,76,0.08)",
              padding: "16px 0",
            }}>
              <div style={{
                fontSize: "13px", color: "rgba(237,232,224,0.3)",
                fontFamily: "sans-serif",
                textDecoration: i > 0 ? "line-through" : "none",
                textDecorationColor: "rgba(237,232,224,0.15)",
              }}>
                {row.left}
              </div>
              <div style={{
                fontSize: "13px",
                color: i === 0 ? "#C9A84C" : "rgba(237,232,224,0.7)",
                fontFamily: "sans-serif",
                fontWeight: i === 0 ? "500" : "300",
              }}>
                {row.right}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Companion system */}
      <section style={{
        padding: "120px 48px",
        borderBottom: "0.5px solid rgba(201,168,76,0.08)",
        maxWidth: "1200px", margin: "0 auto",
      }}>
        <div style={{ textAlign: "center", marginBottom: "72px" }}>
          <div style={{
            fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase",
            color: "#C9A84C", marginBottom: "20px", fontFamily: "sans-serif",
          }}>
            The companion system
          </div>
          <h2 style={{
            fontSize: "clamp(28px, 3.5vw, 48px)", fontWeight: "300",
            color: "#EDE8E0", lineHeight: "1.2", maxWidth: "560px", margin: "0 auto 20px",
          }}>
            Choose your relationship.<br />Name them yourself.
          </h2>
          <p style={{
            fontSize: "14px", color: "rgba(237,232,224,0.4)", fontFamily: "sans-serif",
            fontWeight: "300", lineHeight: "1.8", maxWidth: "460px", margin: "0 auto",
          }}>
            One intelligence. One memory. Seven emotional faces.
            The voice and personality change. The understanding of you never splits.
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "1px",
          background: "rgba(201,168,76,0.08)",
          border: "0.5px solid rgba(201,168,76,0.08)",
        }}>
          {COMPANIONS.map((c, i) => (
            <div key={i} style={{
              background: "#070606",
              padding: "36px 20px",
              textAlign: "center",
              cursor: "pointer",
              transition: "background 0.3s",
              borderBottom: `2px solid ${i === activeCompanion ? c.color : "transparent"}`,
            }}
              onClick={() => setActiveCompanion(i)}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(201,168,76,0.04)"}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "#070606"}
            >
              <div style={{
                fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase",
                color: i === activeCompanion ? c.color : "rgba(237,232,224,0.35)",
                marginBottom: "8px", fontFamily: "sans-serif",
                transition: "color 0.3s",
              }}>
                {c.label}
              </div>
              <div style={{
                fontSize: "10px", color: "rgba(237,232,224,0.2)", fontFamily: "sans-serif",
                lineHeight: "1.6", fontWeight: "300",
              }}>
                {c.type}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: "32px", padding: "28px 36px",
          border: "0.5px solid rgba(201,168,76,0.12)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: "20px",
        }}>
          <div>
            <div style={{
              fontSize: "11px", letterSpacing: "0.16em", textTransform: "uppercase",
              color: companion.color, marginBottom: "8px", fontFamily: "sans-serif",
              transition: "color 0.6s",
            }}>
              {companion.label}
            </div>
            <div style={{
              fontSize: "16px", color: "rgba(237,232,224,0.7)", fontWeight: "300",
            }}>
              {companion.tagline}
            </div>
          </div>
          <div style={{
            fontSize: "13px", color: "rgba(237,232,224,0.3)", fontFamily: "sans-serif",
            borderLeft: "0.5px solid rgba(201,168,76,0.15)", paddingLeft: "28px",
            maxWidth: "300px", lineHeight: "1.7",
          }}>
            You name them. They remember everything about your journey — forever.
          </div>
        </div>
      </section>

      {/* The journey */}
      <section style={{
        padding: "120px 48px",
        borderBottom: "0.5px solid rgba(201,168,76,0.08)",
      }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ marginBottom: "80px" }}>
            <div style={{
              fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase",
              color: "#C9A84C", marginBottom: "20px", fontFamily: "sans-serif",
            }}>
              The journey
            </div>
            <h2 style={{
              fontSize: "clamp(28px, 3.5vw, 48px)", fontWeight: "300",
              color: "#EDE8E0", lineHeight: "1.2",
            }}>
              Dream. Action. Destiny.
            </h2>
          </div>

          {[
            {
              num: "01", phase: "Dream", color: "#C9A84C",
              title: "You tell them who you want to become.",
              body: "Not your current CV. Not where you have been. Who you actually want to be. Your companion listens — and never forgets.",
            },
            {
              num: "02", phase: "Action", color: "#6B8CFF",
              title: "Every step is guided, tracked, and remembered.",
              body: "Upload your CV and they learn your skills. Practice interviews and they study your patterns. Apply for roles and they see what is working. Every interaction makes them smarter about you.",
            },
            {
              num: "03", phase: "Destiny", color: "#5B9E7A",
              title: "The offer. The promotion. The life you wanted.",
              body: "When it happens, they celebrate with you. When it does not, they pick you up and adjust the plan. The journey does not end at the first role — it evolves with you.",
            },
          ].map((item, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "80px 1fr",
              gap: "48px", alignItems: "flex-start",
              padding: "56px 0",
              borderTop: "0.5px solid rgba(201,168,76,0.08)",
            }}>
              <div>
                <div style={{
                  fontSize: "11px", color: "rgba(237,232,224,0.2)",
                  fontFamily: "sans-serif", letterSpacing: "0.1em", marginBottom: "6px",
                }}>
                  {item.num}
                </div>
                <div style={{
                  fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase",
                  color: item.color, fontFamily: "sans-serif",
                }}>
                  {item.phase}
                </div>
              </div>
              <div>
                <h3 style={{
                  fontSize: "clamp(20px, 2.5vw, 30px)", fontWeight: "300",
                  color: "#EDE8E0", lineHeight: "1.3", marginBottom: "18px",
                }}>
                  {item.title}
                </h3>
                <p style={{
                  fontSize: "15px", color: "rgba(237,232,224,0.42)", lineHeight: "1.9",
                  fontFamily: "sans-serif", fontWeight: "300", maxWidth: "580px",
                }}>
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* What DAD knows */}
      <section style={{
        padding: "120px 48px",
        borderBottom: "0.5px solid rgba(201,168,76,0.08)",
        background: "rgba(201,168,76,0.02)",
      }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "center" }}>
            <div>
              <div style={{
                fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase",
                color: "#C9A84C", marginBottom: "20px", fontFamily: "sans-serif",
              }}>
                Living intelligence
              </div>
              <h2 style={{
                fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: "300",
                color: "#EDE8E0", lineHeight: "1.2", marginBottom: "24px",
              }}>
                They grow smarter every time you interact.
              </h2>
              <p style={{
                fontSize: "15px", color: "rgba(237,232,224,0.42)", lineHeight: "1.9",
                fontFamily: "sans-serif", fontWeight: "300",
              }}>
                Every conversation, every uploaded document, every practice session — 
                all of it becomes part of a continuously evolving understanding of you.
                Not a profile. A living model.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {WHAT_DAD_KNOWS.map((item, i) => (
                <div key={i} style={{
                  padding: "18px 0",
                  borderBottom: "0.5px solid rgba(201,168,76,0.06)",
                  display: "flex", alignItems: "center", gap: "16px",
                  transition: "all 0.4s ease",
                  opacity: i === visibleKnowledge ? 1 : 0.3,
                }}>
                  <div style={{
                    width: "4px", height: "4px", borderRadius: "50%", flexShrink: 0,
                    background: i === visibleKnowledge ? "#C9A84C" : "rgba(201,168,76,0.2)",
                    transition: "background 0.4s",
                  }} />
                  <div style={{
                    fontSize: "13px", fontFamily: "sans-serif", fontWeight: "300",
                    color: i === visibleKnowledge ? "rgba(237,232,224,0.8)" : "rgba(237,232,224,0.3)",
                    transition: "color 0.4s",
                    lineHeight: "1.5",
                  }}>
                    {item}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stories */}
      <section style={{
        padding: "120px 48px",
        borderBottom: "0.5px solid rgba(201,168,76,0.08)",
      }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{
            fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase",
            color: "#C9A84C", marginBottom: "64px", fontFamily: "sans-serif",
          }}>
            Real journeys
          </div>

          <div style={{ minHeight: "180px" }}>
            <blockquote style={{
              fontSize: "clamp(18px, 2.8vw, 28px)", fontWeight: "300",
              color: "rgba(237,232,224,0.75)", lineHeight: "1.6",
              marginBottom: "32px", fontStyle: "italic",
            }}>
              "{STORIES[storyIdx].quote}"
            </blockquote>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div style={{ width: "24px", height: "0.5px", background: "rgba(201,168,76,0.4)" }} />
              <span style={{
                fontSize: "13px", color: "#C9A84C", fontFamily: "sans-serif",
                letterSpacing: "0.04em",
              }}>
                {STORIES[storyIdx].name}
              </span>
              <span style={{
                fontSize: "12px", color: "rgba(237,232,224,0.3)", fontFamily: "sans-serif",
              }}>
                {STORIES[storyIdx].role}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "40px" }}>
            {STORIES.map((_, i) => (
              <button key={i} onClick={() => setStoryIdx(i)} style={{
                width: i === storyIdx ? "28px" : "5px", height: "5px", borderRadius: "99px",
                background: i === storyIdx ? "#C9A84C" : "rgba(201,168,76,0.2)",
                border: "none", cursor: "pointer", transition: "all 0.4s ease",
              }} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{
        padding: "140px 48px",
        textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          width: "600px", height: "400px",
          background: "radial-gradient(ellipse, rgba(201,168,76,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase",
          color: "#C9A84C", marginBottom: "28px", fontFamily: "sans-serif",
        }}>
          Begin your journey
        </div>
        <h2 style={{
          fontSize: "clamp(36px, 6vw, 72px)", fontWeight: "300",
          color: "#EDE8E0", lineHeight: "1.05", marginBottom: "24px",
          letterSpacing: "-0.01em",
        }}>
          You are not alone.
        </h2>
        <p style={{
          fontSize: "16px", color: "rgba(237,232,224,0.38)", marginBottom: "56px",
          fontFamily: "sans-serif", fontWeight: "300", lineHeight: "1.8",
          maxWidth: "380px", margin: "0 auto 56px",
        }}>
          Choose your companion. Name them. Begin the journey.
        </p>
        <Link href="/signup" style={{
          display: "inline-flex", alignItems: "center", gap: "16px",
          background: "#C9A84C", color: "#070606",
          padding: "22px 52px", textDecoration: "none",
          fontSize: "13px", letterSpacing: "0.14em", textTransform: "uppercase",
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
        }}>
          Meet your companion
          <span style={{ fontSize: "18px" }}>→</span>
        </Link>
        <p style={{
          marginTop: "28px", fontSize: "11px",
          color: "rgba(237,232,224,0.2)", fontFamily: "sans-serif",
          letterSpacing: "0.08em",
        }}>
          Free to start · No credit card required
        </p>
      </section>

      {/* Footer */}
      <footer style={{
        padding: "28px 48px",
        borderTop: "0.5px solid rgba(201,168,76,0.08)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "16px",
      }}>
        <div style={{
          fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase",
          color: "#C9A84C", fontFamily: "sans-serif",
        }}>
          DAD
        </div>
        <div style={{
          fontSize: "11px", color: "rgba(237,232,224,0.2)", fontFamily: "sans-serif",
          letterSpacing: "0.1em", textTransform: "uppercase",
        }}>
          Dreams · Actions · Destiny
        </div>
        <div style={{ display: "flex", gap: "28px" }}>
          {["Sign in", "Begin"].map((label, i) => (
            <Link key={i} href={i === 0 ? "/login" : "/signup"} style={{
              fontSize: "11px", color: "rgba(237,232,224,0.25)", textDecoration: "none",
              fontFamily: "sans-serif", letterSpacing: "0.1em", textTransform: "uppercase",
            }}>
              {label}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
