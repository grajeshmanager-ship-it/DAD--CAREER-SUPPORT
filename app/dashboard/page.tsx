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
  dream?: string;
  dream_reason?: string;
}

const COMPANION_COLORS: Record<string, string> = {
  dad: "#C9A84C", mom: "#A07898", mentor: "#6B8CFF",
  brother: "#5B8C6B", sister: "#B07070", friend: "#5B9898", partner: "#8870A8",
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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getDaysSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [lastAnalysis, setLastAnalysis] = useState<string | null>(null);
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
      setUserEmail(user.email || "");
      const { data: profileData } = await supabase
        .from("profiles").select("*").eq("id", user.id).single();
      if (profileData) {
        setProfile(profileData);
        setLastAnalysis(profileData.last_analysis_at || null);
      }
      setLoading(false);
    };
    load();
  }, [router]);

  useEffect(() => {
    if (loading || !profile || hasSpoken.current) return;
    if (sessionStorage.getItem("dad_dashboard_welcomed")) return;
    hasSpoken.current = true;
    sessionStorage.setItem("dad_dashboard_welcomed", "1");

    const speak = () => {
      if (!window.speechSynthesis) return;
      const companionType = profile.companion_type || "dad";
      const voiceLine = COMPANION_VOICES[companionType] || COMPANION_VOICES.dad;
      const utter = new SpeechSynthesisUtterance(voiceLine);
      utter.rate = 0.82; utter.pitch = companionType === "mom" || companionType === "sister" ? 1.08 : 0.88; utter.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.name.includes("Daniel")) || voices.find(v => v.lang === "en-GB") || voices.find(v => v.lang.startsWith("en")) || voices[0];
      if (preferred) utter.voice = preferred;
      window.speechSynthesis.speak(utter);
    };
    if (window.speechSynthesis.getVoices().length > 0) setTimeout(speak, 900);
    else window.speechSynthesis.onvoiceschanged = () => setTimeout(speak, 900);
  }, [loading, profile]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    sessionStorage.removeItem("dad_dashboard_welcomed");
    router.push("/");
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: dark, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px" }}>
        <div style={{ fontSize: "11px", letterSpacing: "0.42em", textTransform: "uppercase", color: gold, fontFamily: sans }}>DAD</div>
        <div style={{ fontSize: "13px", color: "rgba(235,229,220,0.3)", fontFamily: sans }}>Getting everything ready...</div>
      </div>
    );
  }

  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const companionColor = profile?.companion_type ? COMPANION_COLORS[profile.companion_type] : gold;
  const companionName = profile?.companion_name || "DAD";
  const hasResume = !!profile?.resume_summary;
  const hasCareer = !!profile?.career_path;
  const hasDream = !!profile?.dream;
  const atsScore = profile?.resume_ats_score || 0;
  const daysSinceAnalysis = lastAnalysis ? getDaysSince(lastAnalysis) : null;

  // Build the daily feed — what the companion noticed
  const feedItems: { type: "notice" | "alert" | "nudge" | "win"; message: string }[] = [];

  if (!hasDream) {
    feedItems.push({ type: "nudge", message: `I still don't know your dream. Everything I do for you works better when I understand why this matters. Tell me.` });
  }
  if (!hasResume) {
    feedItems.push({ type: "alert", message: `I haven't seen your CV yet. I can't help you properly until I know what we're working with.` });
  }
  if (hasResume && atsScore < 60) {
    feedItems.push({ type: "alert", message: `Your ATS score is ${atsScore}/100. That means most applications are being filtered out before a human ever sees your name. This needs to change today.` });
  }
  if (hasResume && atsScore >= 70) {
    feedItems.push({ type: "win", message: `Your CV is scoring ${atsScore}/100 on ATS. That's in the top range. Recruiters are seeing your name.` });
  }
  if (!hasCareer) {
    feedItems.push({ type: "nudge", message: `You haven't completed your career assessment yet. I need to understand your direction before I can build your roadmap.` });
  }
  if (daysSinceAnalysis !== null && daysSinceAnalysis > 7) {
    feedItems.push({ type: "alert", message: `You haven't practiced interviews in ${daysSinceAnalysis} days. That's too long. Skills fade without practice.` });
  }
  if (hasResume && hasCareer) {
    feedItems.push({ type: "win", message: `Your profile is built. ${companionName} knows your skills, your direction, and your target roles. Now we sharpen the edge.` });
  }
  if (hasDream) {
    feedItems.push({ type: "notice", message: `Your dream: ${profile?.dream}. ${companionName} hasn't forgotten. Every recommendation points there.` });
  }

  // Next action
  const nextAction = !hasDream
    ? { label: "Tell me your dream", desc: "Everything works better when " + companionName + " understands why this matters to you.", href: "/dream", phase: "Foundation" }
    : !hasResume
    ? { label: "Upload your CV", desc: "Let " + companionName + " learn who you are. This is where everything starts.", href: "/resume", phase: "First step" }
    : !hasCareer
    ? { label: "Complete your career assessment", desc: companionName + " knows your skills. Now let them understand your direction.", href: "/career", phase: "Next step" }
    : { label: "Practice your interview", desc: "Your profile is built. Now sharpen the edge. One session changes everything.", href: "/interview", phase: "Level up" };

  const typeColors = { notice: companionColor, alert: "#B07070", nudge: gold, win: "#5B9E7A" };
  const typeLabels = { notice: "Noticed", alert: "Urgent", nudge: "Waiting", win: "Progress" };

  return (
    <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: serif }}>

      {/* Nav */}
      <nav style={{ padding: "18px 52px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "0.5px solid rgba(201,168,76,0.08)", position: "sticky", top: 0, zIndex: 100, background: "rgba(7,6,6,0.97)" }}>
        <Link href="/" style={{ fontSize: "11px", letterSpacing: "0.42em", textTransform: "uppercase", color: gold, fontFamily: sans, textDecoration: "none" }}>DAD</Link>
        <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
          <span style={{ fontSize: "11px", color: "rgba(235,229,220,0.25)", fontFamily: sans }}>{userEmail}</span>
          <button onClick={handleSignOut} style={{ background: "none", border: "0.5px solid rgba(235,229,220,0.1)", color: "rgba(235,229,220,0.3)", padding: "8px 20px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: sans }}>
            Sign out
          </button>
        </div>
      </nav>

      {/* ── DAILY COMPANION FEED ── */}
      <section style={{ display: "grid", gridTemplateColumns: "55% 45%", borderBottom: "0.5px solid rgba(201,168,76,0.08)", minHeight: "60vh" }}>

        {/* Left — morning brief */}
        <div style={{ padding: "56px 52px", borderRight: "0.5px solid rgba(201,168,76,0.08)", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50%", background: `radial-gradient(ellipse at 20% 100%, ${companionColor}0C 0%, transparent 70%)`, pointerEvents: "none" }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.24em", textTransform: "uppercase", color: `${companionColor}80`, marginBottom: "12px", fontFamily: sans }}>
              {companionName} · {getGreeting()}
            </div>
            <h1 style={{ fontSize: "clamp(32px, 4.5vw, 56px)", fontWeight: "300", lineHeight: "1.1", marginBottom: "32px", letterSpacing: "-0.02em" }}>
              {getGreeting()},<br />{firstName}.
            </h1>

            {/* Dream reminder */}
            {hasDream && (
              <div style={{ marginBottom: "32px", padding: "20px 24px", borderLeft: `2px solid ${companionColor}40`, background: `${companionColor}06` }}>
                <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: `${companionColor}70`, marginBottom: "8px", fontFamily: sans }}>Your dream</div>
                <div style={{ fontSize: "16px", fontWeight: "300", color: text, lineHeight: "1.5" }}>{profile?.dream}</div>
                {profile?.dream_reason && (
                  <div style={{ fontSize: "12px", color: "rgba(235,229,220,0.35)", fontFamily: sans, marginTop: "6px" }}>{profile.dream_reason}</div>
                )}
              </div>
            )}

            {/* Feed items */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: "rgba(201,168,76,0.05)" }}>
              {feedItems.slice(0, 4).map((item, i) => (
                <div key={i} style={{ background: bg, padding: "16px 20px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
                  <div style={{ flexShrink: 0, marginTop: "2px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: typeColors[item.type] }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: typeColors[item.type], fontFamily: sans, marginBottom: "4px", opacity: 0.7 }}>
                      {typeLabels[item.type]}
                    </div>
                    <div style={{ fontSize: "13px", color: "rgba(235,229,220,0.6)", fontFamily: sans, fontWeight: "300", lineHeight: "1.65" }}>
                      {item.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: "relative", zIndex: 1, marginTop: "32px" }}>
            {profile?.situation && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: companionColor }} />
                <span style={{ fontSize: "11px", color: "rgba(235,229,220,0.3)", fontFamily: sans }}>
                  {SITUATION_LABELS[profile.situation] || profile.situation}
                  {profile.country ? ` · ${profile.country}` : ""}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right — what companion knows */}
        <div style={{ padding: "56px 48px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(201,168,76,0.35)", marginBottom: "28px", fontFamily: sans }}>
            What {companionName} knows about you
          </div>

          {[
            {
              label: "Your CV",
              value: hasResume ? profile?.resume_summary?.slice(0, 80) + "..." : "Not uploaded yet",
              active: hasResume,
              extra: hasResume ? `${atsScore}/100` : null,
              extraColor: atsScore >= 70 ? "#5B9E7A" : atsScore >= 50 ? gold : "#B07070",
            },
            {
              label: "Your dream",
              value: hasDream ? profile?.dream : "Not set yet",
              active: hasDream,
              extra: null,
              extraColor: null,
            },
            {
              label: "Your direction",
              value: hasCareer ? profile?.career_path : "Assessment not completed",
              active: hasCareer,
              extra: null,
              extraColor: null,
            },
            {
              label: "Your skills",
              value: profile?.resume_skills?.length ? profile.resume_skills.slice(0, 4).join(" · ") : "Will appear after CV upload",
              active: !!profile?.resume_skills?.length,
              extra: null,
              extraColor: null,
            },
            {
              label: "Target roles",
              value: profile?.career_roles?.length ? profile.career_roles.slice(0, 3).join(" · ") : "Will appear after career assessment",
              active: !!profile?.career_roles?.length,
              extra: null,
              extraColor: null,
            },
          ].map((item, i) => (
            <div key={i} style={{ padding: "16px 0", borderBottom: "0.5px solid rgba(201,168,76,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: item.active ? gold : "rgba(235,229,220,0.2)", fontFamily: sans, marginBottom: "4px" }}>
                  {item.label}
                </div>
                <div style={{ fontSize: "12px", color: item.active ? "rgba(235,229,220,0.55)" : "rgba(235,229,220,0.18)", fontFamily: sans, fontWeight: "300", lineHeight: "1.5" }}>
                  {item.value}
                </div>
              </div>
              {item.extra && (
                <div style={{ fontSize: "13px", color: item.extraColor || gold, fontFamily: sans, flexShrink: 0, marginLeft: "16px" }}>
                  {item.extra}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── NEXT ACTION ── */}
      <section style={{ borderBottom: "0.5px solid rgba(201,168,76,0.08)" }}>
        <Link href={nextAction.href} style={{ textDecoration: "none", display: "block" }}>
          <div style={{ padding: "48px 52px", display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: "40px", background: "rgba(201,168,76,0.02)", cursor: "pointer", transition: "background 0.3s" }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(201,168,76,0.04)"}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(201,168,76,0.02)"}
          >
            <div>
              <div style={{ fontSize: "10px", letterSpacing: "0.24em", textTransform: "uppercase", color: companionColor, marginBottom: "12px", fontFamily: sans, opacity: 0.7 }}>
                {nextAction.phase} · Recommended by {companionName}
              </div>
              <h2 style={{ fontSize: "clamp(22px, 3vw, 36px)", fontWeight: "300", lineHeight: "1.2", marginBottom: "10px" }}>
                {nextAction.label}
              </h2>
              <p style={{ fontSize: "14px", color: "rgba(235,229,220,0.38)", fontFamily: sans, fontWeight: "300", lineHeight: "1.7", maxWidth: "560px", margin: 0 }}>
                {nextAction.desc}
              </p>
            </div>
            <div style={{ width: "52px", height: "52px", border: `0.5px solid ${companionColor}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", color: companionColor, flexShrink: 0 }}>
              →
            </div>
          </div>
        </Link>
      </section>

      {/* ── CAPABILITIES ── */}
      <section style={{ borderBottom: "0.5px solid rgba(201,168,76,0.08)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: "1px", background: "rgba(201,168,76,0.06)" }}>
          {[
            { href: "/dream", label: "Your Dream", desc: hasDream ? profile?.dream || "Set" : "Not set yet", tag: hasDream ? "Set" : "Missing", active: hasDream },
            { href: "/resume", label: "CV Intelligence", desc: "Upload your CV. Let " + companionName + " learn who you are.", tag: hasResume ? "Updated" : "Start here", active: hasResume },
            { href: "/career", label: "Career Assessment", desc: "Answer honestly. " + companionName + " will tell you who you are.", tag: hasCareer ? "Completed" : "Next step", active: hasCareer },
            { href: "/interview", label: "Interview Mode", desc: "Written. Voice. Live simulation. All three levels.", tag: "Practice", active: false },
            { href: "/voice", label: "Talk to " + companionName, desc: "Voice call. Real conversation. " + companionName + " is ready.", tag: "Live", active: true },
          ].map((item, i) => (
            <Link key={i} href={item.href} style={{ textDecoration: "none", display: "block" }}>
              <div style={{ background: bg, padding: "36px 28px", cursor: "pointer", height: "100%", transition: "background 0.25s" }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(201,168,76,0.03)"}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = bg}
              >
                <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: item.active ? companionColor : "rgba(235,229,220,0.2)", fontFamily: sans, marginBottom: "14px" }}>
                  {item.tag}
                </div>
                <div style={{ fontSize: "14px", fontWeight: "300", color: text, marginBottom: "10px", lineHeight: "1.3" }}>{item.label}</div>
                <p style={{ fontSize: "11px", color: "rgba(235,229,220,0.28)", fontFamily: sans, fontWeight: "300", lineHeight: "1.7", margin: "0 0 16px" }}>{item.desc}</p>
                <div style={{ fontSize: "12px", color: companionColor, fontFamily: sans, opacity: 0.5 }}>Enter →</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── DESTINY PROGRESS ── */}
      <section style={{ padding: "56px 52px", borderBottom: "0.5px solid rgba(201,168,76,0.08)" }}>
        <div style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(201,168,76,0.35)", marginBottom: "28px", fontFamily: sans }}>
          Your progress · Dream → Action → Destiny
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1px", background: "rgba(201,168,76,0.06)" }}>
          {[
            {
              phase: "Dream", color: gold, num: "01",
              status: hasDream ? "Set" : "Missing",
              desc: hasDream ? profile?.dream || "Career direction set" : "Tell " + companionName + " why this matters",
              progress: hasDream ? 100 : 0,
              done: hasDream,
              href: "/dream",
            },
            {
              phase: "Action", color: "#6B8CFF", num: "02",
              status: hasResume && hasCareer ? "In progress" : "Not started",
              desc: hasResume ? "CV analysed · " + (hasCareer ? "Direction set" : "Career assessment next") : "Upload your CV to begin",
              progress: (hasResume ? 40 : 0) + (hasCareer ? 40 : 0),
              done: hasResume && hasCareer,
              href: hasResume ? "/career" : "/resume",
            },
            {
              phase: "Destiny", color: "#5B9E7A", num: "03",
              status: "Ahead",
              desc: "The offer. The role. The life. " + companionName + " is walking you there.",
              progress: hasResume && hasCareer ? 15 : 0,
              done: false,
              href: "/dashboard",
            },
          ].map((item, i) => (
            <Link key={i} href={item.href} style={{ textDecoration: "none" }}>
              <div style={{ background: bg, padding: "36px 40px", cursor: "pointer", transition: "background 0.25s" }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(201,168,76,0.02)"}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = bg}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                  <span style={{ fontSize: "10px", color: "rgba(235,229,220,0.18)", fontFamily: sans }}>{item.num}</span>
                  <div style={{ flex: 1, height: "0.5px", background: `${item.color}30` }} />
                  <span style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: item.color, fontFamily: sans }}>{item.phase}</span>
                </div>
                <div style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: item.done ? item.color : "rgba(235,229,220,0.22)", fontFamily: sans, marginBottom: "8px" }}>
                  {item.status}
                </div>
                <p style={{ fontSize: "13px", color: "rgba(235,229,220,0.38)", fontFamily: sans, fontWeight: "300", lineHeight: "1.7", margin: "0 0 16px" }}>
                  {item.desc}
                </p>
                {/* Progress bar */}
                <div style={{ height: "1px", background: "rgba(235,229,220,0.06)", borderRadius: "99px" }}>
                  <div style={{ height: "100%", width: `${item.progress}%`, background: item.color, borderRadius: "99px", transition: "width 1s ease", opacity: 0.7 }} />
                </div>
                <div style={{ fontSize: "10px", color: `${item.color}60`, fontFamily: sans, marginTop: "6px" }}>{item.progress}%</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "24px 52px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "10px", letterSpacing: "0.42em", textTransform: "uppercase", color: gold, fontFamily: sans }}>DAD</div>
        <div style={{ fontSize: "10px", color: "rgba(235,229,220,0.15)", fontFamily: sans, letterSpacing: "0.1em", textTransform: "uppercase" }}>Dreams · Actions · Destiny</div>
        <button onClick={handleSignOut} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "10px", color: "rgba(235,229,220,0.18)", fontFamily: sans, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Sign out
        </button>
      </footer>
    </div>
  );
}
