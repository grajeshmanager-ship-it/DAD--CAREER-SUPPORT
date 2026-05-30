"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const COMPANIONS = [
  { label: "Father", sub: "Dad", tagline: "Direct. Proud. Never gives up on you.", color: "#C9A84C" },
  { label: "Mother", sub: "Mum", tagline: "Warm. Wise. Believes in you always.", color: "#A07898" },
  { label: "Mentor", sub: "Mentor", tagline: "Strategic. Calm. Sees your potential.", color: "#6B8CFF" },
  { label: "Brother", sub: "Brother", tagline: "Honest. Competitive. Won't let you quit.", color: "#5B8C6B" },
  { label: "Sister", sub: "Sister", tagline: "Sharp. Empathetic. Always in your corner.", color: "#B07070" },
  { label: "Friend", sub: "Friend", tagline: "Real talk. No filter. Rides with you.", color: "#5B9898" },
  { label: "Partner", sub: "Partner", tagline: "Patient. Devoted. Your biggest supporter.", color: "#8870A8" },
];

const PRINCIPLES = [
  { label: "Memory", body: "Every conversation, every document, every call — DAD remembers. The profile never stops evolving." },
  { label: "Understanding", body: "DAD does not give answers. It builds a deep understanding of who you are and where you can succeed." },
  { label: "Companionship", body: "The user should never feel they are using software. They should feel they are walking through life with someone." },
  { label: "Destiny", body: "Most platforms solve moments. DAD solves the entire journey — from the first dream to the final offer." },
];

const WHAT_DAD_LEARNS = [
  "Your skills — what you have, what you are missing, what the market wants",
  "Your experience — how to position it, how to present it, how to own it",
  "Your goals — not just what you want, but who you actually want to become",
  "Your confidence — where it breaks down, and how to rebuild it",
  "Your interview patterns — what you do well, and where you lose the room",
  "Your emotional state — when you need pushing, when you need support",
  "Your opportunities — roles, companies, and timing that match your profile",
  "Your destiny — how close you are, and exactly what stands between you and it",
];

export default function LandingPage() {
  const [activeCompanion, setActiveCompanion] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [tick, setTick] = useState(0);
  const [learnIdx, setLearnIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setActiveCompanion(i => (i + 1) % COMPANIONS.length);
      setTick(t => t + 1);
    }, 3200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setLearnIdx(i => (i + 1) % WHAT_DAD_LEARNS.length), 2000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const c = COMPANIONS[activeCompanion];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#060505",
      color: "#EBE5DC",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      overflowX: "hidden",
    }}>

      {/* Nav */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "20px 52px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: scrolled ? "rgba(6,5,5,0.97)" : "transparent",
        borderBottom: scrolled ? "0.5px solid rgba(201,168,76,0.1)" : "none",
        transition: "all 0.5s ease",
      }}>
        <div style={{
          fontSize: "11px", fontWeight: "400", letterSpacing: "0.4em",
          textTransform: "uppercase", color: "#C9A84C",
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
        }}>
          DAD
        </div>
        <div style={{ display: "flex", gap: "40px", alignItems: "center" }}>
          <Link href="/login" style={{
            fontSize: "11px", color: "rgba(235,229,220,0.4)",
            textDecoration: "none", letterSpacing: "0.1em", textTransform: "uppercase",
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
          }}>
            Sign in
          </Link>
          <Link href="/signup" style={{
            fontSize: "11px", color: "#060505", background: "#C9A84C",
            padding: "10px 26px", textDecoration: "none",
            letterSpacing: "0.12em", textTransform: "uppercase",
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
          }}>
            Begin
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        position: "relative",
        borderBottom: "0.5px solid rgba(201,168,76,0.08)",
      }}>
        {/* Left — headline */}
        <div style={{
          display: "flex", flexDirection: "column", justifyContent: "flex-end",
          padding: "160px 52px 80px",
          borderRight: "0.5px solid rgba(201,168,76,0.08)",
          position: "relative",
        }}>
          {/* Ambient */}
          <div style={{
            position: "absolute", bottom: "0", left: "0",
            width: "100%", height: "60%",
            background: `radial-gradient(ellipse at 20% 80%, ${c.color}10 0%, transparent 65%)`,
            transition: "background 1.6s ease",
            pointerEvents: "none",
          }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{
              fontSize: "10px", letterSpacing: "0.28em", textTransform: "uppercase",
              color: "rgba(201,168,76,0.5)", marginBottom: "36px",
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
            }}>
              Dreams · Actions · Destiny
            </div>

            <h1 style={{
              fontSize: "clamp(52px, 7vw, 88px)",
              fontWeight: "300", lineHeight: "1.02",
              color: "#EBE5DC", letterSpacing: "-0.025em",
              marginBottom: "0",
            }}>
              Someone<br />
              walks<br />
              beside you.
            </h1>
          </div>

          {/* Bottom bar */}
          <div style={{
            position: "absolute", bottom: "52px", left: "52px", right: "52px",
            display: "flex", alignItems: "flex-end", justifyContent: "space-between",
          }}>
            <Link href="/signup" style={{
              display: "inline-flex", alignItems: "center", gap: "16px",
              background: "#C9A84C", color: "#060505",
              padding: "18px 40px", textDecoration: "none",
              fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase",
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
            }}>
              Choose your companion
              <span style={{ fontSize: "15px" }}>→</span>
            </Link>
            <Link href="/login" style={{
              fontSize: "11px", color: "rgba(235,229,220,0.3)", textDecoration: "none",
              letterSpacing: "0.1em", textTransform: "uppercase",
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
            }}>
              Sign in →
            </Link>
          </div>
        </div>

        {/* Right — companion display */}
        <div style={{
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: "160px 52px 80px",
          position: "relative",
        }}>
          {/* Companion name — large, typographic */}
          <div>
            <div style={{
              fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase",
              color: "rgba(201,168,76,0.4)", marginBottom: "28px",
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
            }}>
              Your companion
            </div>

            <div style={{
              fontSize: "clamp(64px, 9vw, 120px)",
              fontWeight: "200", lineHeight: "0.9",
              color: c.color, letterSpacing: "-0.03em",
              transition: "color 0.9s ease",
              marginBottom: "24px",
            }}>
              {c.sub}
            </div>

            <div style={{
              fontSize: "14px", fontWeight: "300",
              color: "rgba(235,229,220,0.38)", lineHeight: "1.7",
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
              maxWidth: "280px",
              transition: "opacity 0.5s ease",
            }}>
              {c.tagline}
            </div>
          </div>

          {/* Companion selector */}
          <div>
            <div style={{
              fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase",
              color: "rgba(201,168,76,0.3)", marginBottom: "20px",
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
            }}>
              Seven relationships
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {COMPANIONS.map((comp, i) => (
                <button key={i} onClick={() => setActiveCompanion(i)} style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: "10px 0",
                  borderBottom: "0.5px solid rgba(201,168,76,0.06)",
                  display: "flex", alignItems: "center", gap: "16px",
                  textAlign: "left",
                }}>
                  <div style={{
                    width: i === activeCompanion ? "20px" : "8px",
                    height: "0.5px",
                    background: i === activeCompanion ? comp.color : "rgba(201,168,76,0.2)",
                    transition: "all 0.4s ease", flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: "12px", letterSpacing: "0.06em",
                    fontFamily: "'Helvetica Neue', Arial, sans-serif",
                    color: i === activeCompanion ? comp.color : "rgba(235,229,220,0.3)",
                    transition: "color 0.4s ease",
                    textTransform: "uppercase",
                  }}>
                    {comp.sub}
                  </span>
                  {i === activeCompanion && (
                    <span style={{
                      fontSize: "10px", color: "rgba(235,229,220,0.25)",
                      fontFamily: "sans-serif", fontStyle: "italic",
                    }}>
                      — {comp.label}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PHILOSOPHY ── */}
      <section style={{
        padding: "0",
        borderBottom: "0.5px solid rgba(201,168,76,0.08)",
      }}>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr",
          borderBottom: "0.5px solid rgba(201,168,76,0.08)",
        }}>
          {PRINCIPLES.map((p, i) => (
            <div key={i} style={{
              padding: "64px 48px",
              borderRight: i < 3 ? "0.5px solid rgba(201,168,76,0.08)" : "none",
            }}>
              <div style={{
                fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase",
                color: "#C9A84C", marginBottom: "20px", fontFamily: "sans-serif",
              }}>
                {p.label}
              </div>
              <p style={{
                fontSize: "13px", color: "rgba(235,229,220,0.4)", lineHeight: "1.9",
                fontFamily: "sans-serif", fontWeight: "300",
              }}>
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHAT DAD IS ── */}
      <section style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        borderBottom: "0.5px solid rgba(201,168,76,0.08)",
        minHeight: "60vh",
      }}>
        <div style={{
          padding: "100px 52px",
          borderRight: "0.5px solid rgba(201,168,76,0.08)",
          display: "flex", flexDirection: "column", justifyContent: "center",
        }}>
          <div style={{
            fontSize: "10px", letterSpacing: "0.24em", textTransform: "uppercase",
            color: "rgba(201,168,76,0.5)", marginBottom: "28px", fontFamily: "sans-serif",
          }}>
            The difference
          </div>
          <h2 style={{
            fontSize: "clamp(32px, 4vw, 56px)", fontWeight: "300",
            color: "#EBE5DC", lineHeight: "1.15", marginBottom: "32px",
          }}>
            Not a tool.<br />Not a platform.<br />A relationship.
          </h2>
          <p style={{
            fontSize: "15px", color: "rgba(235,229,220,0.4)", lineHeight: "1.9",
            fontFamily: "sans-serif", fontWeight: "300", maxWidth: "420px",
          }}>
            DAD is a memory-driven AI companion. One intelligence.
            One memory that grows with every interaction. Many emotional faces —
            because sometimes you need a father, sometimes a friend.
          </p>
        </div>

        <div style={{
          display: "flex", flexDirection: "column",
          borderLeft: "none",
        }}>
          {[
            { platform: "Most platforms", dad: "DAD", isHeader: true },
            { platform: "Solve moments", dad: "Solves the entire journey" },
            { platform: "Forget after each session", dad: "Remembers everything" },
            { platform: "Give you answers", dad: "Builds understanding of you" },
            { platform: "Expose tools", dad: "Provides companionship" },
            { platform: "Measure activity", dad: "Focuses on outcomes" },
            { platform: "Start over each time", dad: "Grows smarter with time" },
          ].map((row, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "1fr 1fr",
              borderBottom: "0.5px solid rgba(201,168,76,0.06)",
              flex: 1,
            }}>
              <div style={{
                padding: "24px 48px",
                fontSize: i === 0 ? "10px" : "13px",
                color: i === 0 ? "rgba(235,229,220,0.25)" : "rgba(235,229,220,0.22)",
                fontFamily: "sans-serif",
                letterSpacing: i === 0 ? "0.16em" : "0",
                textTransform: i === 0 ? "uppercase" : "none",
                textDecoration: i > 0 ? "line-through" : "none",
                textDecorationColor: "rgba(235,229,220,0.1)",
                display: "flex", alignItems: "center",
                borderRight: "0.5px solid rgba(201,168,76,0.06)",
              }}>
                {row.platform}
              </div>
              <div style={{
                padding: "24px 48px",
                fontSize: i === 0 ? "10px" : "13px",
                color: i === 0 ? "#C9A84C" : "rgba(235,229,220,0.65)",
                fontFamily: "sans-serif",
                letterSpacing: i === 0 ? "0.16em" : "0",
                textTransform: i === 0 ? "uppercase" : "none",
                fontWeight: i === 0 ? "400" : "300",
                display: "flex", alignItems: "center",
              }}>
                {row.dad}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── THE JOURNEY ── */}
      <section style={{
        padding: "120px 52px",
        borderBottom: "0.5px solid rgba(201,168,76,0.08)",
        maxWidth: "1100px", margin: "0 auto",
      }}>
        <div style={{ marginBottom: "80px" }}>
          <div style={{
            fontSize: "10px", letterSpacing: "0.26em", textTransform: "uppercase",
            color: "rgba(201,168,76,0.5)", marginBottom: "20px", fontFamily: "sans-serif",
          }}>
            The journey
          </div>
          <h2 style={{
            fontSize: "clamp(32px, 4vw, 56px)", fontWeight: "300",
            color: "#EBE5DC", lineHeight: "1.1",
          }}>
            Dream. Action. Destiny.
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1px", background: "rgba(201,168,76,0.07)" }}>
          {[
            {
              num: "01", phase: "Dream", color: "#C9A84C",
              title: "You tell them who you want to become.",
              body: "Not your current CV. Not where you have been. Who you actually want to be. Your companion listens — and never forgets.",
            },
            {
              num: "02", phase: "Action", color: "#6B8CFF",
              title: "Every step guided, tracked, remembered.",
              body: "Upload your CV and they learn your skills. Practice interviews and they study your patterns. Every interaction makes them smarter about you.",
            },
            {
              num: "03", phase: "Destiny", color: "#5B9E7A",
              title: "The offer. The life you wanted.",
              body: "When it happens, they celebrate with you. When it does not, they pick you up. The journey evolves with you — beyond the first role.",
            },
          ].map((item, i) => (
            <div key={i} style={{ background: "#060505", padding: "52px 44px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "28px" }}>
                <span style={{
                  fontSize: "10px", color: "rgba(235,229,220,0.2)",
                  fontFamily: "sans-serif", letterSpacing: "0.1em",
                }}>
                  {item.num}
                </span>
                <div style={{ flex: 1, height: "0.5px", background: `${item.color}40` }} />
                <span style={{
                  fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase",
                  color: item.color, fontFamily: "sans-serif",
                }}>
                  {item.phase}
                </span>
              </div>
              <h3 style={{
                fontSize: "20px", fontWeight: "300",
                color: "#EBE5DC", lineHeight: "1.35", marginBottom: "18px",
              }}>
                {item.title}
              </h3>
              <p style={{
                fontSize: "13px", color: "rgba(235,229,220,0.38)", lineHeight: "1.9",
                fontFamily: "sans-serif", fontWeight: "300",
              }}>
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHAT DAD LEARNS ── */}
      <section style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        borderTop: "0.5px solid rgba(201,168,76,0.08)",
        borderBottom: "0.5px solid rgba(201,168,76,0.08)",
        minHeight: "70vh",
      }}>
        <div style={{
          padding: "100px 52px",
          borderRight: "0.5px solid rgba(201,168,76,0.08)",
          display: "flex", flexDirection: "column", justifyContent: "center",
          background: "rgba(201,168,76,0.015)",
        }}>
          <div style={{
            fontSize: "10px", letterSpacing: "0.24em", textTransform: "uppercase",
            color: "rgba(201,168,76,0.5)", marginBottom: "28px", fontFamily: "sans-serif",
          }}>
            Living intelligence
          </div>
          <h2 style={{
            fontSize: "clamp(28px, 3.5vw, 48px)", fontWeight: "300",
            color: "#EBE5DC", lineHeight: "1.2", marginBottom: "28px",
          }}>
            They grow smarter<br />every time you interact.
          </h2>
          <p style={{
            fontSize: "14px", color: "rgba(235,229,220,0.38)", lineHeight: "1.9",
            fontFamily: "sans-serif", fontWeight: "300", maxWidth: "380px",
          }}>
            Every conversation, every uploaded document, every voice call —
            all of it becomes part of a continuously evolving understanding of you.
            Not a profile. A living model of who you are and who you are becoming.
          </p>
        </div>

        <div style={{
          padding: "100px 52px",
          display: "flex", flexDirection: "column", justifyContent: "center",
        }}>
          <div style={{
            fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase",
            color: "rgba(201,168,76,0.35)", marginBottom: "32px", fontFamily: "sans-serif",
          }}>
            What DAD learns about you
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {WHAT_DAD_LEARNS.map((item, i) => (
              <div key={i} style={{
                padding: "18px 0",
                borderBottom: "0.5px solid rgba(201,168,76,0.05)",
                display: "flex", alignItems: "flex-start", gap: "18px",
                transition: "opacity 0.6s ease",
                opacity: i === learnIdx ? 1 : 0.22,
              }}>
                <div style={{
                  width: "5px", height: "5px", borderRadius: "50%", flexShrink: 0,
                  marginTop: "7px",
                  background: i === learnIdx ? "#C9A84C" : "rgba(201,168,76,0.15)",
                  transition: "background 0.5s ease",
                }} />
                <div style={{
                  fontSize: "13px", fontFamily: "sans-serif", fontWeight: "300",
                  color: i === learnIdx ? "rgba(235,229,220,0.78)" : "rgba(235,229,220,0.25)",
                  transition: "color 0.5s ease", lineHeight: "1.6",
                }}>
                  {item}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTERVIEW MODE ── */}
      <section style={{
        padding: "120px 52px",
        borderBottom: "0.5px solid rgba(201,168,76,0.08)",
        background: "#040303",
      }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "100px", alignItems: "center" }}>
            <div>
              <div style={{
                fontSize: "10px", letterSpacing: "0.24em", textTransform: "uppercase",
                color: "rgba(107,140,255,0.6)", marginBottom: "20px", fontFamily: "sans-serif",
              }}>
                Interview mode
              </div>
              <h2 style={{
                fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: "300",
                color: "#EBE5DC", lineHeight: "1.2", marginBottom: "24px",
              }}>
                When the interview begins,<br />the companion disappears.
              </h2>
              <p style={{
                fontSize: "14px", color: "rgba(235,229,220,0.38)", lineHeight: "1.9",
                fontFamily: "sans-serif", fontWeight: "300", marginBottom: "32px",
              }}>
                Professional evaluation begins. A realistic interviewer appears —
                selected automatically based on your profile, your industry, and the role.
                You configure nothing. DAD configures everything.
              </p>
              <div style={{
                fontSize: "13px", color: "rgba(235,229,220,0.25)", fontFamily: "sans-serif",
                lineHeight: "2", borderTop: "0.5px solid rgba(107,140,255,0.1)", paddingTop: "24px",
              }}>
                Written · Voice · Live simulation with camera analysis
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                "Engineering Manager",
                "Technical Lead",
                "HR Director",
                "Product Director",
                "Finance VP",
                "Marketing Director",
              ].map((role, i) => (
                <div key={i} style={{
                  padding: "16px 24px",
                  border: "0.5px solid rgba(107,140,255,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span style={{
                    fontSize: "13px", color: "rgba(235,229,220,0.45)",
                    fontFamily: "sans-serif",
                  }}>
                    {role}
                  </span>
                  <span style={{
                    fontSize: "10px", color: "rgba(107,140,255,0.4)",
                    fontFamily: "sans-serif", letterSpacing: "0.1em", textTransform: "uppercase",
                  }}>
                    Auto-selected
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{
        minHeight: "70vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "120px 52px",
        textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: "700px", height: "400px",
          background: "radial-gradient(ellipse, rgba(201,168,76,0.05) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Large background text */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          fontSize: "clamp(80px, 18vw, 200px)", fontWeight: "200",
          color: "rgba(201,168,76,0.03)", letterSpacing: "-0.04em",
          whiteSpace: "nowrap", pointerEvents: "none", userSelect: "none",
          lineHeight: "1",
        }}>
          DAD
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            fontSize: "10px", letterSpacing: "0.28em", textTransform: "uppercase",
            color: "rgba(201,168,76,0.45)", marginBottom: "32px", fontFamily: "sans-serif",
          }}>
            Begin your journey
          </div>
          <h2 style={{
            fontSize: "clamp(48px, 8vw, 100px)",
            fontWeight: "200", color: "#EBE5DC",
            lineHeight: "1.0", marginBottom: "32px",
            letterSpacing: "-0.03em",
          }}>
            You are<br />not alone.
          </h2>
          <p style={{
            fontSize: "15px", color: "rgba(235,229,220,0.32)", marginBottom: "60px",
            fontFamily: "sans-serif", fontWeight: "300", lineHeight: "1.8",
            maxWidth: "340px", margin: "0 auto 60px",
          }}>
            Choose your companion. Name them.<br />Begin the journey.
          </p>
          <Link href="/signup" style={{
            display: "inline-flex", alignItems: "center", gap: "18px",
            background: "#C9A84C", color: "#060505",
            padding: "22px 56px", textDecoration: "none",
            fontSize: "12px", letterSpacing: "0.16em", textTransform: "uppercase",
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
          }}>
            Meet your companion
            <span style={{ fontSize: "16px" }}>→</span>
          </Link>
          <div style={{
            marginTop: "32px", fontSize: "10px",
            color: "rgba(235,229,220,0.18)", fontFamily: "sans-serif",
            letterSpacing: "0.12em", textTransform: "uppercase",
          }}>
            Free to start · No credit card required
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: "28px 52px",
        borderTop: "0.5px solid rgba(201,168,76,0.08)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{
          fontSize: "10px", letterSpacing: "0.4em", textTransform: "uppercase",
          color: "#C9A84C", fontFamily: "sans-serif",
        }}>
          DAD
        </div>
        <div style={{
          fontSize: "10px", color: "rgba(235,229,220,0.18)", fontFamily: "sans-serif",
          letterSpacing: "0.14em", textTransform: "uppercase",
        }}>
          Dreams · Actions · Destiny
        </div>
        <div style={{ display: "flex", gap: "32px" }}>
          {[["Sign in", "/login"], ["Begin", "/signup"]].map(([label, href]) => (
            <Link key={href} href={href} style={{
              fontSize: "10px", color: "rgba(235,229,220,0.22)", textDecoration: "none",
              fontFamily: "sans-serif", letterSpacing: "0.14em", textTransform: "uppercase",
            }}>
              {label}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
