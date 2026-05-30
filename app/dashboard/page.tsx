"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Profile {
  full_name: string;
  country: string;
  situation: string;
  companion_type?: string;
  companion_name?: string;
  resume_summary?: string;
  resume_ats_score?: number;
  career_path?: string;
  career_roles?: string[];
  resume_skills?: string[];
}

const COMPANION_COLORS: Record<string, string> = {
  dad: "#C9A84C",
  mom: "#A07898",
  mentor: "#6B8CFF",
  brother: "#5B8C6B",
  sister: "#B07070",
  friend: "#5B9898",
  partner: "#8870A8",
};

const COMPANION_VOICES: Record<string, string> = {
  dad: "Every day you show up is a day you move forward. Let's see what we can get done today.",
  mom: "I'm so glad you're here. Whatever today brings, we'll face it together.",
  mentor: "The best time to make progress was yesterday. The second best time is right now.",
  brother: "Alright, you're here. Stop overthinking. Let's just get to work.",
  sister: "You've got more going for you than you realise. Let's remind you of that today.",
  friend: "Good. You showed up. That's honestly half the battle. Now let's talk.",
  partner: "Every step you take on this journey — I'm right here beside you. Let's go.",
};

const SITUATION_LABELS: Record<string, string> = {
  student: "Currently studying",
  fresh_graduate: "Recently graduated",
  job_seeker: "Actively job seeking",
  employed_looking: "Open to new opportunities",
  career_change: "Changing careers",
  returning: "Returning to work",
};

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const hasSpoken = useRef(false);

  const sans = "'Helvetica Neue', Arial, sans-serif";
  const serif = "'Georgia', 'Times New Roman', serif";
  const gold = "#C9A84C";
  const bg = "#070606";
  const text = "#EBE5DC";

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserEmail(user.email || "");
      const { data: profileData } = await supabase
        .from("profiles").select("*").eq("id", user.id).single();
      if (profileData) setProfile(profileData);
      setLoading(false);
    };
    load();
  }, [router]);

  // Voice on load — companion-aware
  useEffect(() => {
    if (loading || !profile || hasSpoken.current) return;
    hasSpoken.current = true;

    const speak = () => {
      if (!window.speechSynthesis) return;
      const companionType = profile.companion_type || "dad";
      const voiceLine = COMPANION_VOICES[companionType] || COMPANION_VOICES.dad;
      const utter = new SpeechSynthesisUtterance(voiceLine);
      utter.rate = 0.82;
      utter.pitch = companionType === "mom" || companionType === "sister" ? 1.08 : 0.88;
      utter.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find(v => v.name.includes("Daniel")) ||
        voices.find(v => v.name.includes("Arthur")) ||
        voices.find(v => v.lang === "en-GB") ||
        voices.find(v => v.lang.startsWith("en")) ||
        voices[0];
      if (preferred) utter.voice = preferred;
      window.speechSynthesis.speak(utter);
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      setTimeout(speak, 900);
    } else {
      window.speechSynthesis.onvoiceschanged = () => setTimeout(speak, 900);
    }
  }, [loading, profile]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px" }}>
        <div style={{ fontSize: "11px", letterSpacing: "0.42em", textTransform: "uppercase", color: gold, fontFamily: sans }}>DAD</div>
        <div style={{ fontSize: "13px", color: "rgba(235,229,220,0.3)", fontFamily: sans, letterSpacing: "0.06em" }}>
          Getting everything ready for you...
        </div>
      </div>
    );
  }

  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const companionColor = profile?.companion_type ? COMPANION_COLORS[profile.companion_type] : gold;
  const companionName = profile?.companion_name || "DAD";
  const hasResume = !!profile?.resume_summary;
  const hasCareer = !!profile?.career_path;
  const atsScore = profile?.resume_ats_score || 0;

  // Determine next best action
  const nextAction = !hasResume
    ? { label: "Upload your CV", desc: "Let " + companionName + " learn who you are. This is where everything starts.", href: "/resume", phase: "First step" }
    : !hasCareer
    ? { label: "Complete your career assessment", desc: companionName + " knows your skills. Now let them understand your direction.", href: "/career", phase: "Next step" }
    : { label: "Practice your interview", desc: "Your profile is built. Now sharpen the edge. One session changes everything.", href: "/interview", phase: "Level up" };

  return (
    <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: serif }}>

      {/* Nav */}
      <nav style={{
        padding: "18px 52px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "0.5px solid rgba(201,168,76,0.08)",
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(7,6,6,0.97)",
      }}>
        <Link href="/" style={{ fontSize: "11px", letterSpacing: "0.42em", textTransform: "uppercase", color: gold, fontFamily: sans, textDecoration: "none" }}>
          DAD
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
          <span style={{ fontSize: "11px", color: "rgba(235,229,220,0.25)", fontFamily: sans, letterSpacing: "0.04em" }}>
            {userEmail}
          </span>
          <button onClick={handleSignOut} style={{
            background: "none", border: "0.5px solid rgba(235,229,220,0.1)",
            color: "rgba(235,229,220,0.3)", padding: "8px 20px", cursor: "pointer",
            fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: sans,
          }}>
            Sign out
          </button>
        </div>
      </nav>

      {/* ── HERO — What DAD knows ── */}
      <section style={{
        display: "grid", gridTemplateColumns: "55% 45%",
        borderBottom: "0.5px solid rgba(201,168,76,0.08)",
        minHeight: "52vh",
      }}>
        {/* Left — greeting and companion voice */}
        <div style={{
          padding: "56px 52px",
          borderRight: "0.5px solid rgba(201,168,76,0.08)",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: "50%",
            background: `radial-gradient(ellipse at 20% 100%, ${companionColor}0C 0%, transparent 70%)`,
            pointerEvents: "none",
          }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.24em", textTransform: "uppercase", color: companionColor, marginBottom: "20px", fontFamily: sans, opacity: 0.7 }}>
              {companionName} · {profile?.companion_type ? profile.companion_type.charAt(0).toUpperCase() + profile.companion_type.slice(1) : "Companion"}
            </div>
            <h1 style={{ fontSize: "clamp(32px, 4.5vw, 58px)", fontWeight: "300", color: text, lineHeight: "1.1", marginBottom: "20px", letterSpacing: "-0.02em" }}>
              {firstName}.<br />
              <span style={{ color: "rgba(235,229,220,0.45)" }}>Where were we?</span>
            </h1>
            <p style={{ fontSize: "15px", color: "rgba(235,229,220,0.38)", lineHeight: "1.9", fontFamily: sans, fontWeight: "300", maxWidth: "380px", margin: 0 }}>
              {COMPANION_VOICES[profile?.companion_type || "dad"]}
            </p>
          </div>

          {/* Situation tag */}
          <div style={{ position: "relative", zIndex: 1 }}>
            {profile?.situation && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: companionColor }} />
                <span style={{ fontSize: "11px", color: "rgba(235,229,220,0.3)", fontFamily: sans, letterSpacing: "0.08em" }}>
                  {SITUATION_LABELS[profile.situation] || profile.situation}
                  {profile.country ? ` · ${profile.country}` : ""}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right — what DAD knows */}
        <div style={{ padding: "56px 48px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(201,168,76,0.35)", marginBottom: "28px", fontFamily: sans }}>
              What {companionName} knows about you
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {/* Resume */}
              <div style={{ padding: "18px 0", borderBottom: "0.5px solid rgba(201,168,76,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: hasResume ? gold : "rgba(235,229,220,0.2)", fontFamily: sans, marginBottom: "4px" }}>
                    Your CV
                  </div>
                  <div style={{ fontSize: "12px", color: hasResume ? "rgba(235,229,220,0.55)" : "rgba(235,229,220,0.18)", fontFamily: sans, fontWeight: "300" }}>
                    {hasResume ? profile?.resume_summary?.slice(0, 80) + "..." : "Not uploaded yet"}
                  </div>
                </div>
                {hasResume && (
                  <div style={{ fontSize: "13px", fontWeight: "300", color: atsScore >= 70 ? "#5B9E7A" : atsScore >= 50 ? gold : "#B07070", fontFamily: sans, flexShrink: 0, marginLeft: "16px" }}>
                    {atsScore}/100
                  </div>
                )}
              </div>

              {/* Career */}
              <div style={{ padding: "18px 0", borderBottom: "0.5px solid rgba(201,168,76,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: hasCareer ? gold : "rgba(235,229,220,0.2)", fontFamily: sans, marginBottom: "4px" }}>
                    Your direction
                  </div>
                  <div style={{ fontSize: "12px", color: hasCareer ? "rgba(235,229,220,0.55)" : "rgba(235,229,220,0.18)", fontFamily: sans, fontWeight: "300" }}>
                    {hasCareer ? profile?.career_path : "Assessment not completed"}
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div style={{ padding: "18px 0", borderBottom: "0.5px solid rgba(201,168,76,0.06)" }}>
                <div style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: profile?.resume_skills?.length ? gold : "rgba(235,229,220,0.2)", fontFamily: sans, marginBottom: "8px" }}>
                  Your skills
                </div>
                {profile?.resume_skills?.length ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {profile.resume_skills.slice(0, 5).map((skill, i) => (
                      <span key={i} style={{ fontSize: "11px", color: "rgba(235,229,220,0.45)", fontFamily: sans, border: "0.5px solid rgba(201,168,76,0.15)", padding: "3px 10px" }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: "12px", color: "rgba(235,229,220,0.18)", fontFamily: sans, fontWeight: "300" }}>
                    Will appear after CV upload
                  </div>
                )}
              </div>

              {/* Roles */}
              <div style={{ padding: "18px 0" }}>
                <div style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: profile?.career_roles?.length ? gold : "rgba(235,229,220,0.2)", fontFamily: sans, marginBottom: "8px" }}>
                  Target roles
                </div>
                {profile?.career_roles?.length ? (
                  <div style={{ fontSize: "12px", color: "rgba(235,229,220,0.45)", fontFamily: sans, fontWeight: "300", lineHeight: "1.7" }}>
                    {profile.career_roles.slice(0, 3).join(" · ")}
                  </div>
                ) : (
                  <div style={{ fontSize: "12px", color: "rgba(235,229,220,0.18)", fontFamily: sans, fontWeight: "300" }}>
                    Will appear after career assessment
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── NEXT ACTION ── */}
      <section style={{
        padding: "0",
        borderBottom: "0.5px solid rgba(201,168,76,0.08)",
      }}>
        <Link href={nextAction.href} style={{ textDecoration: "none", display: "block" }}>
          <div style={{
            padding: "48px 52px",
            display: "grid", gridTemplateColumns: "1fr auto",
            alignItems: "center", gap: "40px",
            background: "rgba(201,168,76,0.02)",
            cursor: "pointer",
            transition: "background 0.3s",
          }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(201,168,76,0.04)"}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(201,168,76,0.02)"}
          >
            <div>
              <div style={{ fontSize: "10px", letterSpacing: "0.24em", textTransform: "uppercase", color: companionColor, marginBottom: "12px", fontFamily: sans, opacity: 0.7 }}>
                {nextAction.phase} · Recommended by {companionName}
              </div>
              <h2 style={{ fontSize: "clamp(22px, 3vw, 36px)", fontWeight: "300", color: text, lineHeight: "1.2", marginBottom: "10px" }}>
                {nextAction.label}
              </h2>
              <p style={{ fontSize: "14px", color: "rgba(235,229,220,0.38)", fontFamily: sans, fontWeight: "300", lineHeight: "1.7", maxWidth: "560px", margin: 0 }}>
                {nextAction.desc}
              </p>
            </div>
            <div style={{
              width: "52px", height: "52px", border: `0.5px solid ${companionColor}40`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "20px", color: companionColor, flexShrink: 0,
            }}>
              →
            </div>
          </div>
        </Link>
      </section>

      {/* ── ALL CAPABILITIES ── */}
      <section style={{ borderBottom: "0.5px solid rgba(201,168,76,0.08)" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: "1px", background: "rgba(201,168,76,0.06)",
        }}>
          {[
            {
              href: "/resume",
              label: "CV Intelligence",
              desc: "Upload your CV. Let " + companionName + " learn who you are, what you are worth, and exactly what needs to change.",
              tag: hasResume ? "Updated" : "Start here",
              tagActive: hasResume,
            },
            {
              href: "/career",
              label: "Career Assessment",
              desc: "Answer honestly. " + companionName + " will tell you who you are, where you can succeed, and what to do next.",
              tag: hasCareer ? "Completed" : "Next step",
              tagActive: hasCareer,
            },
            {
              href: "/interview",
              label: "Interview Mode",
              desc: "The companion steps aside. A professional interviewer takes the chair. You configure nothing. DAD builds everything.",
              tag: "Practice",
              tagActive: false,
            },
            {
              href: "/voice",
              label: "Talk to " + companionName,
              desc: "Voice call. Real conversation. " + companionName + " knows everything about your journey and is ready to listen.",
              tag: "Live",
              tagActive: true,
            },
          ].map((item, i) => (
            <Link key={i} href={item.href} style={{ textDecoration: "none", display: "block" }}>
              <div style={{
                background: bg, padding: "40px 36px",
                cursor: "pointer", height: "100%",
                transition: "background 0.25s",
              }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(201,168,76,0.03)"}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = bg}
              >
                <div style={{
                  fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase",
                  color: item.tagActive ? companionColor : "rgba(235,229,220,0.2)",
                  fontFamily: sans, marginBottom: "16px",
                }}>
                  {item.tag}
                </div>
                <div style={{ fontSize: "15px", fontWeight: "300", color: text, marginBottom: "12px", lineHeight: "1.3" }}>
                  {item.label}
                </div>
                <p style={{ fontSize: "12px", color: "rgba(235,229,220,0.32)", fontFamily: sans, fontWeight: "300", lineHeight: "1.75", margin: "0 0 20px" }}>
                  {item.desc}
                </p>
                <div style={{ fontSize: "12px", color: companionColor, fontFamily: sans, opacity: 0.6 }}>
                  Enter →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── DESTINY PROGRESS ── */}
      <section style={{ padding: "56px 52px", borderBottom: "0.5px solid rgba(201,168,76,0.08)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1px", background: "rgba(201,168,76,0.06)" }}>
          {[
            {
              phase: "Dream",
              color: gold,
              status: "Active",
              desc: hasCareer ? profile?.career_path || "Career direction set" : "Tell " + companionName + " who you want to become",
              done: hasCareer,
            },
            {
              phase: "Action",
              color: "#6B8CFF",
              status: hasResume && hasCareer ? "In progress" : "Not started",
              desc: hasResume ? "CV analysed · " + (hasCareer ? "Direction set · Practice interviews" : "Career assessment next") : "Upload your CV to begin",
              done: hasResume,
            },
            {
              phase: "Destiny",
              color: "#5B9E7A",
              status: "Ahead",
              desc: "The offer. The role. The life. " + companionName + " is walking you there.",
              done: false,
            },
          ].map((item, i) => (
            <div key={i} style={{ background: bg, padding: "36px 40px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <span style={{ fontSize: "10px", color: "rgba(235,229,220,0.18)", fontFamily: sans }}>{String(i + 1).padStart(2, "0")}</span>
                <div style={{ flex: 1, height: "0.5px", background: `${item.color}30` }} />
                <span style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: item.color, fontFamily: sans }}>{item.phase}</span>
              </div>
              <div style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: item.done ? item.color : "rgba(235,229,220,0.22)", fontFamily: sans, marginBottom: "8px" }}>
                {item.status}
              </div>
              <p style={{ fontSize: "13px", color: "rgba(235,229,220,0.38)", fontFamily: sans, fontWeight: "300", lineHeight: "1.7", margin: 0 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: "24px 52px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ fontSize: "10px", letterSpacing: "0.42em", textTransform: "uppercase", color: gold, fontFamily: sans }}>DAD</div>
        <div style={{ fontSize: "10px", color: "rgba(235,229,220,0.15)", fontFamily: sans, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Dreams · Actions · Destiny
        </div>
        <button onClick={handleSignOut} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "10px", color: "rgba(235,229,220,0.18)", fontFamily: sans, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Sign out
        </button>
      </footer>
    </div>
  );
}
