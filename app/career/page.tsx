"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SITUATIONS = [
  { id: "student", label: "Still Studying", description: "Currently in university or college" },
  { id: "fresh_graduate", label: "Just Graduated", description: "Graduated recently, looking for first role" },
  { id: "job_seeker", label: "Looking for Work", description: "Have experience, actively job hunting" },
  { id: "career_change", label: "Changing Careers", description: "Want to move into a different field" },
  { id: "returning", label: "Returning to Work", description: "Coming back after a break" },
];

const QUESTIONS: Record<string, { key: string; label: string; placeholder: string; type: "input" | "textarea" }[]> = {
  student: [
    { key: "education", label: "What are you studying?", placeholder: "e.g. BSc Computer Science, 2nd year", type: "input" },
    { key: "country", label: "Country you want to work in", placeholder: "e.g. United Kingdom, India, USA", type: "input" },
    { key: "experience", label: "Any internships, part-time work or projects?", placeholder: "e.g. 3-month internship at startup, built an app... or say none", type: "textarea" },
    { key: "interests", label: "What subjects or topics excite you most?", placeholder: "e.g. data analysis, marketing, finance, coding", type: "textarea" },
    { key: "goals", label: "What kind of life do you want your career to give you?", placeholder: "e.g. high salary, creative work, work-life balance, impact", type: "textarea" },
    { key: "concerns", label: "What worries you most about starting your career?", placeholder: "e.g. no experience, not sure what I want, worried about competition", type: "textarea" },
  ],
  fresh_graduate: [
    { key: "education", label: "What did you study and where?", placeholder: "e.g. BSc Business Management, University of Manchester, 2:1", type: "input" },
    { key: "country", label: "Country you want to work in", placeholder: "e.g. United Kingdom, India, USA", type: "input" },
    { key: "experience", label: "Any experience? Internships, placements, part-time, projects?", placeholder: "Be honest — even retail or volunteering counts. Say none if nothing.", type: "textarea" },
    { key: "interests", label: "What kind of work do you actually want to do?", placeholder: "e.g. working with people, analysing data, creating content", type: "textarea" },
    { key: "goals", label: "What does success look like in 2 years?", placeholder: "e.g. employed in a role I enjoy, earning £30k+, working in tech", type: "textarea" },
    { key: "concerns", label: "What is your biggest barrier right now?", placeholder: "e.g. no experience, not hearing back, not sure what I qualify for", type: "textarea" },
  ],
  job_seeker: [
    { key: "education", label: "Your highest qualification", placeholder: "e.g. BSc Engineering, HND Business, A Levels", type: "input" },
    { key: "country", label: "Country you are job hunting in", placeholder: "e.g. United Kingdom, India, USA", type: "input" },
    { key: "experience", label: "Describe your work experience", placeholder: "e.g. 3 years as a marketing executive, 2 years in sales", type: "textarea" },
    { key: "applied", label: "How long have you been searching and what has happened?", placeholder: "e.g. 6 months, 200 applications, 10 interviews, 0 offers", type: "textarea" },
    { key: "goals", label: "What salary and level are you aiming for?", placeholder: "e.g. £40k-£50k, senior level, remote or hybrid", type: "textarea" },
    { key: "concerns", label: "What do you think is holding you back?", placeholder: "e.g. my CV, interview performance, wrong roles, gaps", type: "textarea" },
  ],
  career_change: [
    { key: "education", label: "Your educational background", placeholder: "e.g. BSc Accounting, no degree, professional qualifications", type: "input" },
    { key: "country", label: "Country you want to work in", placeholder: "e.g. United Kingdom, India, USA", type: "input" },
    { key: "experience", label: "What have you done in your career so far?", placeholder: "e.g. 5 years as an accountant, 3 years in retail management", type: "textarea" },
    { key: "whyLeaving", label: "Why do you want to change?", placeholder: "Be honest — burnout, better pay, more meaning, no growth", type: "textarea" },
    { key: "interests", label: "What field or type of work are you drawn to?", placeholder: "e.g. tech, product, UX design, data, entrepreneurship", type: "textarea" },
    { key: "concerns", label: "What scares you most about changing?", placeholder: "e.g. starting from zero, salary drop, not qualified", type: "textarea" },
  ],
  returning: [
    { key: "education", label: "Your educational background", placeholder: "e.g. BSc Nursing, MBA, no degree", type: "input" },
    { key: "country", label: "Country you want to work in", placeholder: "e.g. United Kingdom, India, USA", type: "input" },
    { key: "experience", label: "What was your career before the break?", placeholder: "e.g. 7 years in HR, project manager in construction", type: "textarea" },
    { key: "breakReason", label: "How long was your break and why?", placeholder: "e.g. 2 years for childcare, 1 year health reasons", type: "textarea" },
    { key: "goals", label: "What does a successful return look like?", placeholder: "e.g. part-time initially, want to earn £45k within a year", type: "textarea" },
    { key: "concerns", label: "What are you most worried about?", placeholder: "e.g. explaining the gap, skills being outdated, confidence", type: "textarea" },
  ],
};

interface RoadmapResult {
  careerPath: string;
  headline: string;
  topRoles: { title: string; salaryMin: number; salaryMax: number; currency: string; fit: number; why: string }[];
  skillsToLearn: { skill: string; priority: string; timeMonths: number }[];
  actionPlan: { week: string; action: string; outcome: string }[];
  courses: { name: string; provider: string; durationWeeks: number; free: boolean }[];
  encouragement: string;
}

export default function CareerPage() {
  const [situation, setSituation] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RoadmapResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const hasSpoken = useRef(false);

  const sans = "'Helvetica Neue', Arial, sans-serif";
  const serif = "'Georgia', 'Times New Roman', serif";
  const gold = "#C9A84C";
  const bg = "#070606";
  const text = "#EBE5DC";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthToken(data.session?.access_token ?? null);
    });
  }, []);

  // Voice on load — once per session
  useEffect(() => {
    if (hasSpoken.current || sessionStorage.getItem("dad_career_voiced")) return;
    hasSpoken.current = true;
    sessionStorage.setItem("dad_career_voiced", "1");

    const speak = () => {
      if (!window.speechSynthesis) return;
      const utter = new SpeechSynthesisUtterance(
        "Most people never stop to ask who they actually want to become. You just did. That changes everything."
      );
      utter.rate = 0.80;
      utter.pitch = 0.87;
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
      setTimeout(speak, 800);
    } else {
      window.speechSynthesis.onvoiceschanged = () => setTimeout(speak, 800);
    }
  }, []);

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/career-assessment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ situation, answers: form }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || data.error || "Failed");
      setResult(data.roadmap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const questions = situation ? QUESTIONS[situation] || [] : [];
  const allAnswered = questions.filter(q => !["concerns", "breakReason", "applied", "whyLeaving"].includes(q.key)).every(q => form[q.key]?.trim());

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "24px" }}>
        <div style={{ fontSize: "clamp(60px, 10vw, 120px)", fontWeight: "700", color: "rgba(201,168,76,0.08)", letterSpacing: "-0.04em", fontFamily: serif, userSelect: "none" }}>DAD</div>
        <div style={{ fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", fontFamily: sans }}>Building your roadmap...</div>
        <div style={{ width: "120px", height: "0.5px", background: "rgba(201,168,76,0.15)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: "40%", background: gold, animation: "slide 1.4s ease-in-out infinite" }} />
        </div>
        <style>{`@keyframes slide { 0%{left:-40%} 100%{left:140%} }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: serif }}>

      {/* Nav */}
      <nav style={{ padding: "18px 52px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "0.5px solid rgba(201,168,76,0.08)", position: "sticky", top: 0, zIndex: 100, background: "rgba(7,6,6,0.97)" }}>
        <Link href="/dashboard" style={{ fontSize: "11px", letterSpacing: "0.42em", textTransform: "uppercase", color: gold, fontFamily: sans, textDecoration: "none" }}>DAD</Link>
        <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(235,229,220,0.25)", fontFamily: sans }}>Career Assessment</div>
        <Link href="/dashboard" style={{ fontSize: "11px", color: "rgba(235,229,220,0.25)", textDecoration: "none", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: sans }}>← Dashboard</Link>
      </nav>

      {!result ? (
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "80px 52px" }}>

          <div style={{ marginBottom: "64px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.26em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "18px", fontFamily: sans }}>Career Assessment</div>
            <h1 style={{ fontSize: "clamp(32px, 5vw, 60px)", fontWeight: "300", color: text, lineHeight: "1.1", marginBottom: "20px", letterSpacing: "-0.02em" }}>
              Who do you<br />want to become?
            </h1>
            <p style={{ fontSize: "15px", color: "rgba(235,229,220,0.4)", lineHeight: "1.9", fontFamily: sans, fontWeight: "300", maxWidth: "480px", margin: 0 }}>
              Answer honestly. This is not a questionnaire — it is your companion's first real attempt
              to understand you. The more truthful you are, the more accurate everything that follows will be.
            </p>
          </div>

          {/* Situation selector */}
          {!situation ? (
            <div>
              <div style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(201,168,76,0.35)", marginBottom: "24px", fontFamily: sans }}>Where are you right now?</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: "rgba(201,168,76,0.07)" }}>
                {SITUATIONS.map((s, i) => (
                  <div key={i} onClick={() => setSituation(s.id)} style={{ background: bg, padding: "24px 32px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "background 0.2s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(201,168,76,0.03)"}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = bg}
                  >
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: "300", color: text, marginBottom: "4px" }}>{s.label}</div>
                      <div style={{ fontSize: "12px", color: "rgba(235,229,220,0.3)", fontFamily: sans }}>{s.description}</div>
                    </div>
                    <div style={{ fontSize: "18px", color: "rgba(201,168,76,0.3)", fontFamily: sans }}>→</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <button onClick={() => { setSituation(null); setForm({}); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: "rgba(235,229,220,0.3)", fontFamily: sans, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "40px", padding: 0 }}>
                ← Change situation
              </button>

              <div style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: gold, marginBottom: "32px", fontFamily: sans }}>
                {SITUATIONS.find(s => s.id === situation)?.label}
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                {questions.map((q, i) => (
                  <div key={i} style={{ borderBottom: "0.5px solid rgba(201,168,76,0.08)", paddingBottom: "4px", marginBottom: "36px" }}>
                    <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(201,168,76,0.4)", marginBottom: "10px", fontFamily: sans }}>{q.label}</div>
                    {q.type === "input" ? (
                      <input type="text" placeholder={q.placeholder} value={form[q.key] || ""} onChange={e => update(q.key, e.target.value)} style={{ width: "100%", background: "transparent", border: "none", color: text, fontSize: "15px", fontFamily: sans, fontWeight: "300", padding: "4px 0", outline: "none" }} />
                    ) : (
                      <textarea placeholder={q.placeholder} value={form[q.key] || ""} onChange={e => update(q.key, e.target.value)} rows={3} style={{ width: "100%", background: "transparent", border: "none", color: text, fontSize: "15px", fontFamily: sans, fontWeight: "300", padding: "4px 0", outline: "none", resize: "none", lineHeight: "1.7" }} />
                    )}
                  </div>
                ))}
              </div>

              {error && <p style={{ fontSize: "12px", color: "#B07070", fontFamily: sans, marginBottom: "20px" }}>{error}</p>}

              <button onClick={handleSubmit} disabled={!allAnswered} style={{ width: "100%", background: allAnswered ? gold : "rgba(201,168,76,0.15)", color: allAnswered ? bg : "rgba(235,229,220,0.2)", border: "none", padding: "20px", cursor: allAnswered ? "pointer" : "not-allowed", fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: sans, transition: "all 0.3s" }}>
                Build my roadmap →
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "60px 52px" }}>

          <button onClick={() => { setResult(null); setSituation(null); setForm({}); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: "rgba(235,229,220,0.3)", fontFamily: sans, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "48px", padding: 0 }}>
            ← Start over
          </button>

          {/* Career path */}
          <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.08)", paddingBottom: "48px", marginBottom: "48px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "16px", fontFamily: sans }}>Your recommended path</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 52px)", fontWeight: "300", color: gold, lineHeight: "1.1", marginBottom: "16px" }}>{result.careerPath}</h2>
            <p style={{ fontSize: "16px", color: "rgba(235,229,220,0.55)", lineHeight: "1.8", fontFamily: sans, fontWeight: "300", maxWidth: "600px", margin: 0 }}>{result.headline}</p>
          </div>

          {/* Top roles */}
          {result.topRoles?.length > 0 && (
            <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.08)", paddingBottom: "40px", marginBottom: "40px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "24px", fontFamily: sans }}>Roles where you can succeed</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: "rgba(201,168,76,0.06)" }}>
                {result.topRoles.map((role, i) => (
                  <div key={i} style={{ background: bg, padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: "300", color: text, marginBottom: "4px" }}>{role.title}</div>
                      <div style={{ fontSize: "12px", color: "rgba(235,229,220,0.3)", fontFamily: sans }}>{role.why}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "20px" }}>
                      <div style={{ fontSize: "13px", color: gold, fontFamily: sans }}>
                        {role.currency === "GBP" ? "£" : role.currency === "USD" ? "$" : "₹"}{Number(role.salaryMin).toLocaleString()}–{Number(role.salaryMax).toLocaleString()}
                      </div>
                      <div style={{ fontSize: "11px", color: "rgba(235,229,220,0.25)", fontFamily: sans }}>{role.fit}% match</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills to learn */}
          {result.skillsToLearn?.length > 0 && (
            <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.08)", paddingBottom: "40px", marginBottom: "40px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "20px", fontFamily: sans }}>Skills to build next</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {result.skillsToLearn.map((s, i) => (
                  <span key={i} style={{ fontSize: "11px", color: s.priority === "high" ? gold : "rgba(235,229,220,0.45)", border: `0.5px solid ${s.priority === "high" ? gold + "60" : "rgba(201,168,76,0.15)"}`, padding: "5px 14px", fontFamily: sans }}>
                    {s.skill} · {s.timeMonths}mo
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action plan */}
          {result.actionPlan?.length > 0 && (
            <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.08)", paddingBottom: "40px", marginBottom: "40px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "24px", fontFamily: sans }}>Your action plan</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {result.actionPlan.map((a, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "24px", alignItems: "flex-start" }}>
                    <div style={{ fontSize: "11px", color: "rgba(201,168,76,0.4)", fontFamily: sans, letterSpacing: "0.06em", paddingTop: "2px" }}>{a.week}</div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "300", color: text, marginBottom: "4px" }}>{a.action}</div>
                      <div style={{ fontSize: "12px", color: "rgba(235,229,220,0.3)", fontFamily: sans }}>{a.outcome}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Courses */}
          {result.courses?.length > 0 && (
            <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.08)", paddingBottom: "40px", marginBottom: "40px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "24px", fontFamily: sans }}>Recommended courses</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: "rgba(201,168,76,0.06)" }}>
                {result.courses.map((c, i) => (
                  <div key={i} style={{ background: bg, padding: "18px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "300", color: text, marginBottom: "4px" }}>{c.name}</div>
                      <div style={{ fontSize: "11px", color: "rgba(235,229,220,0.3)", fontFamily: sans }}>{c.provider} · {c.durationWeeks} weeks</div>
                    </div>
                    {c.free && <span style={{ fontSize: "10px", color: "#5B9E7A", border: "0.5px solid #5B9E7A40", padding: "3px 10px", fontFamily: sans, letterSpacing: "0.1em", textTransform: "uppercase", flexShrink: 0 }}>Free</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Encouragement */}
          {result.encouragement && (
            <div style={{ padding: "32px 40px", border: "0.5px solid rgba(201,168,76,0.15)", marginBottom: "40px" }}>
              <p style={{ fontSize: "16px", color: "rgba(235,229,220,0.6)", fontStyle: "italic", lineHeight: "1.8", margin: "0 0 12px", fontFamily: serif }}>"{result.encouragement}"</p>
              <div style={{ fontSize: "11px", color: gold, fontFamily: sans, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.6 }}>— Your companion</div>
            </div>
          )}

          <div style={{ display: "flex", gap: "16px" }}>
            <button onClick={() => { setResult(null); setSituation(null); setForm({}); }} style={{ border: "0.5px solid rgba(235,229,220,0.12)", background: "none", color: "rgba(235,229,220,0.4)", padding: "16px 32px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: sans }}>
              Start over
            </button>
            <Link href="/interview" style={{ display: "inline-flex", alignItems: "center", gap: "12px", background: gold, color: bg, padding: "16px 36px", textDecoration: "none", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: sans }}>
              Practice interview →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
