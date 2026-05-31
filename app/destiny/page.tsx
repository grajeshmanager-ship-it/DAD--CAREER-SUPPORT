"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Profile {
  full_name: string;
  companion_type?: string;
  companion_name?: string;
  dream?: string;
  dream_reason?: string;
  career_path?: string;
  resume_ats_score?: number;
  resume_skills?: string[];
  career_roles?: string[];
  resume_summary?: string;
}

const COMPANION_COLORS: Record<string, string> = {
  dad: "#C9A84C", mom: "#A07898", mentor: "#6B8CFF",
  brother: "#5B8C6B", sister: "#B07070", friend: "#5B9898", partner: "#8870A8",
};

export default function DestinyPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const hasSpoken = useRef(false);

  const sans = "'Helvetica Neue', Arial, sans-serif";
  const serif = "'Georgia', 'Times New Roman', serif";
  const gold = "#C9A84C";
  const bg = "#070606";
  const dark = "#030202";
  const text = "#EBE5DC";

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) setProfile(data);
      setLoading(false);
    };
    load();
  }, [router]);

  useEffect(() => {
    if (loading || !profile || hasSpoken.current) return;
    if (sessionStorage.getItem("dad_destiny_voiced")) return;
    hasSpoken.current = true;
    sessionStorage.setItem("dad_destiny_voiced", "1");
    const speak = () => {
      if (!window.speechSynthesis) return;
      const utter = new SpeechSynthesisUtterance(
        "This is where you are. This is where you are going. And this is exactly what stands between the two."
      );
      utter.rate = 0.78; utter.pitch = 0.86; utter.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.name.includes("Daniel")) || voices.find(v => v.lang === "en-GB") || voices.find(v => v.lang.startsWith("en")) || voices[0];
      if (preferred) utter.voice = preferred;
      window.speechSynthesis.speak(utter);
    };
    if (window.speechSynthesis.getVoices().length > 0) setTimeout(speak, 800);
    else window.speechSynthesis.onvoiceschanged = () => setTimeout(speak, 800);
  }, [loading, profile]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: dark, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: "11px", letterSpacing: "0.42em", textTransform: "uppercase", color: gold, fontFamily: sans }}>DAD</div>
      </div>
    );
  }

  const companionColor = profile?.companion_type ? COMPANION_COLORS[profile.companion_type] : gold;
  const companionName = profile?.companion_name || "DAD";
  const hasDream = !!profile?.dream;
  const hasResume = !!profile?.resume_summary;
  const hasCareer = !!profile?.career_path;
  const atsScore = profile?.resume_ats_score || 0;

  const overallProgress = (hasDream ? 20 : 0) + (hasResume ? 30 : 0) + (hasCareer ? 30 : 0) + (atsScore >= 70 ? 20 : 0);
  const monthsLeft = hasDream && hasResume && hasCareer ? 6 : hasDream && hasResume ? 9 : 12;

  const obstacle = !hasDream
    ? "Dream not set — no direction yet"
    : !hasResume
    ? "CV not uploaded — journey not started"
    : !hasCareer
    ? "Career direction unclear"
    : atsScore < 60
    ? "ATS score too low — applications filtered out"
    : "Interview performance — practice more";

  const fastestPath = !hasDream
    ? "Set your dream first. It anchors everything."
    : !hasResume
    ? "Upload your CV. Let " + companionName + " learn who you are."
    : !hasCareer
    ? "Complete career assessment. Get your roadmap."
    : atsScore < 60
    ? "Rewrite CV to score above 70. Then apply aggressively."
    : "Practice 3 mock interviews this week. Debrief each one.";

  const milestones = [
    { label: "Dream set", done: hasDream, color: gold, desc: "The foundation. Without this nothing else has meaning." },
    { label: "CV uploaded", done: hasResume, color: "#6B8CFF", desc: "First real step. " + companionName + " starts learning." },
    { label: "Career direction", done: hasCareer, color: "#A07898", desc: "The roadmap is built. You know where you are going." },
    { label: "ATS score 70+", done: atsScore >= 70, color: "#5B9898", desc: "Applications passing filters. Recruiters see you." },
    { label: "First interview", done: false, color: "#5B9E7A", desc: "Practice until the real one feels easy." },
    { label: "The offer", done: false, color: "#C9A84C", desc: "This is Destiny. " + companionName + " is walking you there." },
  ];

  return (
    <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: serif }}>

      <nav style={{ padding: "18px 52px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "0.5px solid rgba(201,168,76,0.08)", position: "sticky", top: 0, zIndex: 100, background: "rgba(7,6,6,0.97)" }}>
        <Link href="/dashboard" style={{ fontSize: "11px", letterSpacing: "0.42em", textTransform: "uppercase", color: gold, fontFamily: sans, textDecoration: "none" }}>DAD</Link>
        <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(235,229,220,0.25)", fontFamily: sans }}>Your Destiny</div>
        <Link href="/dashboard" style={{ fontSize: "11px", color: "rgba(235,229,220,0.25)", textDecoration: "none", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: sans }}>← Dashboard</Link>
      </nav>

      {/* Hero */}
      <section style={{ display: "grid", gridTemplateColumns: "55% 45%", borderBottom: "0.5px solid rgba(201,168,76,0.08)", minHeight: "50vh" }}>
        <div style={{ padding: "56px 52px", borderRight: "0.5px solid rgba(201,168,76,0.08)", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60%", background: `radial-gradient(ellipse at 30% 100%, ${companionColor}0A 0%, transparent 70%)`, pointerEvents: "none" }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.24em", textTransform: "uppercase", color: `${companionColor}70`, marginBottom: "20px", fontFamily: sans }}>
              {companionName} · Your destiny tracker
            </div>

            <div style={{ marginBottom: "40px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(201,168,76,0.4)", marginBottom: "10px", fontFamily: sans }}>Your dream</div>
              {hasDream ? (
                <>
                  <h1 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: "300", lineHeight: "1.15", marginBottom: "8px", letterSpacing: "-0.02em" }}>{profile?.dream}</h1>
                  {profile?.dream_reason && <p style={{ fontSize: "14px", color: "rgba(235,229,220,0.4)", fontFamily: sans, fontWeight: "300", lineHeight: "1.7" }}>{profile.dream_reason}</p>}
                </>
              ) : (
                <Link href="/dream" style={{ textDecoration: "none" }}>
                  <div style={{ fontSize: "18px", fontWeight: "300", color: "rgba(235,229,220,0.25)", fontStyle: "italic" }}>Not set yet → Tell {companionName} your dream</div>
                </Link>
              )}
            </div>

            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(201,168,76,0.4)", marginBottom: "16px", fontFamily: sans }}>Current progress</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "16px" }}>
                <div style={{ fontSize: "clamp(72px, 10vw, 110px)", fontWeight: "200", lineHeight: "1", color: companionColor }}>{overallProgress}</div>
                <div style={{ fontSize: "24px", color: "rgba(235,229,220,0.3)", fontFamily: sans }}>%</div>
              </div>
              <div style={{ height: "3px", background: "rgba(235,229,220,0.06)", borderRadius: "99px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${overallProgress}%`, background: `linear-gradient(90deg, ${companionColor}80, ${companionColor})`, borderRadius: "99px", transition: "width 1.5s ease" }} />
              </div>
            </div>
          </div>

          {profile?.career_path && (
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(201,168,76,0.4)", marginBottom: "8px", fontFamily: sans }}>Target role</div>
              <div style={{ fontSize: "20px", fontWeight: "300", color: text }}>{profile.career_path}</div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "40px 48px", borderBottom: "0.5px solid rgba(201,168,76,0.08)", flex: 1 }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(201,168,76,0.4)", marginBottom: "12px", fontFamily: sans }}>Expected timeline</div>
            <div style={{ fontSize: "clamp(36px, 5vw, 56px)", fontWeight: "200", color: text, lineHeight: "1", marginBottom: "8px" }}>
              {monthsLeft} <span style={{ fontSize: "20px", color: "rgba(235,229,220,0.3)", fontFamily: sans }}>months</span>
            </div>
            <div style={{ fontSize: "12px", color: "rgba(235,229,220,0.3)", fontFamily: sans }}>Estimate based on current progress.</div>
          </div>

          <div style={{ padding: "40px 48px", borderBottom: "0.5px solid rgba(201,168,76,0.08)", flex: 1 }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#B07070", marginBottom: "12px", fontFamily: sans }}>Biggest obstacle</div>
            <div style={{ fontSize: "16px", fontWeight: "300", color: text, lineHeight: "1.5", marginBottom: "8px" }}>{obstacle}</div>
            <div style={{ fontSize: "12px", color: "rgba(235,229,220,0.3)", fontFamily: sans }}>{companionName} identified this as your current blocker.</div>
          </div>

          <div style={{ padding: "40px 48px", flex: 1 }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#5B9E7A", marginBottom: "12px", fontFamily: sans }}>Fastest path forward</div>
            <div style={{ fontSize: "16px", fontWeight: "300", color: text, lineHeight: "1.5", marginBottom: "8px" }}>{fastestPath}</div>
            <div style={{ fontSize: "12px", color: "rgba(235,229,220,0.3)", fontFamily: sans }}>Do this first. Everything else follows.</div>
          </div>
        </div>
      </section>

      {/* Milestones */}
      <section style={{ padding: "56px 52px", borderBottom: "0.5px solid rgba(201,168,76,0.08)" }}>
        <div style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(201,168,76,0.35)", marginBottom: "40px", fontFamily: sans }}>
          The journey · Every step that matters
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: "rgba(201,168,76,0.06)" }}>
          {milestones.map((m, i) => (
            <div key={i} style={{ background: bg, padding: "24px 36px", display: "flex", alignItems: "center", gap: "28px" }}>
              <div style={{ flexShrink: 0, width: "40px", height: "40px", borderRadius: "50%", border: `0.5px solid ${m.done ? m.color : "rgba(235,229,220,0.08)"}`, background: m.done ? `${m.color}15` : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {m.done
                  ? <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: m.color }} />
                  : <div style={{ fontSize: "11px", color: "rgba(235,229,220,0.18)", fontFamily: sans }}>{i + 1}</div>
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: "300", color: m.done ? text : "rgba(235,229,220,0.35)", marginBottom: "4px" }}>{m.label}</div>
                <div style={{ fontSize: "12px", color: "rgba(235,229,220,0.3)", fontFamily: sans, fontWeight: "300" }}>{m.desc}</div>
              </div>
              <div style={{ flexShrink: 0, fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: m.done ? m.color : "rgba(235,229,220,0.15)", fontFamily: sans, border: `0.5px solid ${m.done ? `${m.color}40` : "rgba(235,229,220,0.08)"}`, padding: "4px 12px" }}>
                {m.done ? "Done" : i === milestones.findIndex(x => !x.done) ? "Next" : "Ahead"}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Companion message */}
      <section style={{ padding: "56px 52px" }}>
        <div style={{ padding: "40px 48px", border: `0.5px solid ${companionColor}20`, background: `${companionColor}04`, maxWidth: "720px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: `${companionColor}70`, marginBottom: "16px", fontFamily: sans }}>{companionName} · On your progress</div>
          <p style={{ fontSize: "17px", color: "rgba(235,229,220,0.65)", fontStyle: "italic", lineHeight: "1.85", margin: "0 0 16px", fontFamily: serif }}>
            {overallProgress === 0
              ? `"Every journey starts with one decision. You have made it by being here. Now let's build the foundation."`
              : overallProgress < 50
              ? `"You have started. That already puts you ahead of most people who talk about it but never begin."`
              : overallProgress < 80
              ? `"You are more than halfway there. Stay consistent when progress slows."`
              : `"You are close. Closer than it feels. The final stretch is always the hardest."`
            }
          </p>
          <div style={{ fontSize: "11px", color: companionColor, fontFamily: sans, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.6 }}>— {companionName}</div>
        </div>

        <div style={{ display: "flex", gap: "16px", marginTop: "40px" }}>
          <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: "12px", background: "none", border: "0.5px solid rgba(235,229,220,0.12)", color: "rgba(235,229,220,0.4)", padding: "16px 32px", textDecoration: "none", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: sans }}>← Dashboard</Link>
          <Link href={!hasDream ? "/dream" : !hasResume ? "/resume" : !hasCareer ? "/career" : "/interview"} style={{ display: "inline-flex", alignItems: "center", gap: "12px", background: companionColor, color: bg, padding: "16px 36px", textDecoration: "none", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: sans }}>
            Take next step →
          </Link>
        </div>
      </section>
    </div>
  );
}
