"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  ArrowRight, ArrowLeft, Brain,
  Target, TrendingUp, BookOpen, Briefcase
} from "lucide-react";
import Link from "next/link";
import { DadLoading } from "@/components/ui/dad-loading";

interface CareerResult {
  recommendedPath: string;
  reasoning: string;
  topRoles: { title: string; description: string; salaryRange: string }[];
  skillsToLearn: string[];
  actionPlan: { step: string; timeframe: string; description: string }[];
  courses: { name: string; provider: string; reason: string }[];
  encouragement: string;
}

const SITUATIONS = [
  {
    id: "student",
    label: "Still Studying",
    emoji: "🎓",
    description: "Currently in university or college"
  },
  {
    id: "fresh_graduate",
    label: "Just Graduated",
    emoji: "🎉",
    description: "Graduated recently, looking for first job"
  },
  {
    id: "job_seeker",
    label: "Looking for Work",
    emoji: "🔍",
    description: "Have experience, actively job hunting"
  },
  {
    id: "career_change",
    label: "Changing Careers",
    emoji: "🔄",
    description: "Want to move into a different field"
  },
  {
    id: "returning",
    label: "Returning to Work",
    emoji: "🌱",
    description: "Coming back after a break"
  },
];

// Situation-specific questions
const SITUATION_QUESTIONS: Record<string, {
  step2Title: string;
  step2Description: string;
  step3Title: string;
  step3Description: string;
  fields: {
    step2: { key: string; label: string; placeholder: string; type: "input" | "textarea" }[];
    step3: { key: string; label: string; placeholder: string; type: "input" | "textarea" }[];
  };
}> = {
  student: {
    step2Title: "About your studies",
    step2Description: "Tell DAD about where you are academically",
    step3Title: "Your direction & ambitions",
    step3Description: "What you're drawn to and where you want to go",
    fields: {
      step2: [
        { key: "education", label: "What are you studying?", placeholder: "e.g. BSc Computer Science, 2nd year...", type: "input" },
        { key: "country", label: "Country you want to work in", placeholder: "e.g. United Kingdom, India, USA...", type: "input" },
        { key: "graduationDate", label: "When do you graduate?", placeholder: "e.g. June 2026, already graduated...", type: "input" },
        { key: "experience", label: "Any internships, part-time work or projects?", placeholder: "e.g. 3-month internship at startup, built an app, worked in retail... or say 'none'", type: "textarea" },
      ],
      step3: [
        { key: "interests", label: "What subjects or topics excite you most?", placeholder: "e.g. data analysis, marketing, finance, coding, psychology...", type: "textarea" },
        { key: "skills", label: "What are you good at? (academic or personal)", placeholder: "e.g. presenting, problem solving, writing, maths, languages...", type: "textarea" },
        { key: "goals", label: "What kind of life do you want your career to give you?", placeholder: "e.g. high salary, creative work, work-life balance, impact, travel, building things...", type: "textarea" },
        { key: "concerns", label: "What worries you most about starting your career?", placeholder: "e.g. no experience, not sure what I want, worried about competition...", type: "textarea" },
      ],
    },
  },
  fresh_graduate: {
    step2Title: "About your degree & background",
    step2Description: "Tell DAD what you've studied and what you've done",
    step3Title: "What you're looking for",
    step3Description: "Be honest — DAD needs the real picture",
    fields: {
      step2: [
        { key: "education", label: "What did you study and where?", placeholder: "e.g. BSc Business Management, University of Manchester, 2:1...", type: "input" },
        { key: "country", label: "Country you want to work in", placeholder: "e.g. United Kingdom, India, USA...", type: "input" },
        { key: "experience", label: "Any experience at all? Internships, placements, part-time jobs, projects?", placeholder: "Be honest — even retail, volunteering, or personal projects count. Say 'none' if nothing.", type: "textarea" },
        { key: "applied", label: "Have you started applying? How's it going?", placeholder: "e.g. applied to 50 jobs, got 2 interviews, no offers... or haven't started yet", type: "textarea" },
      ],
      step3: [
        { key: "interests", label: "What kind of work do you actually want to do?", placeholder: "e.g. working with people, analysing data, creating content, building products...", type: "textarea" },
        { key: "skills", label: "What skills do you have — technical or soft?", placeholder: "e.g. Excel, Python, communication, teamwork, languages, social media...", type: "textarea" },
        { key: "goals", label: "What does success look like in 2 years?", placeholder: "e.g. employed in a role I enjoy, earning £30k+, working in tech, at a good company...", type: "textarea" },
        { key: "concerns", label: "What's your biggest barrier right now?", placeholder: "e.g. no experience, not hearing back, not sure what I qualify for, visa restrictions...", type: "textarea" },
      ],
    },
  },
  job_seeker: {
    step2Title: "Your experience & current search",
    step2Description: "Tell DAD where you are and what's not working",
    step3Title: "What you want next",
    step3Description: "Be specific — vague goals get vague results",
    fields: {
      step2: [
        { key: "education", label: "Your highest qualification", placeholder: "e.g. BSc Engineering, HND Business, A Levels...", type: "input" },
        { key: "country", label: "Country you're job hunting in", placeholder: "e.g. United Kingdom, India, USA...", type: "input" },
        { key: "experience", label: "Describe your work experience", placeholder: "e.g. 3 years as a marketing executive, 2 years in sales, managed a team of 5...", type: "textarea" },
        { key: "applied", label: "How long have you been searching and what's happened?", placeholder: "e.g. 6 months, 200 applications, 10 interviews, 0 offers. Getting rejected at CV stage mostly...", type: "textarea" },
      ],
      step3: [
        { key: "interests", label: "What roles or industries are you targeting?", placeholder: "e.g. product management, data analytics, marketing, software engineering...", type: "textarea" },
        { key: "skills", label: "What are your strongest skills?", placeholder: "e.g. project management, Python, stakeholder management, copywriting, sales...", type: "textarea" },
        { key: "goals", label: "What salary and level are you aiming for?", placeholder: "e.g. £40k-£50k, senior level, remote or hybrid, specific companies or sectors...", type: "textarea" },
        { key: "concerns", label: "What do you think is holding you back?", placeholder: "e.g. my CV, interview performance, wrong roles, gaps, qualifications, location...", type: "textarea" },
      ],
    },
  },
  career_change: {
    step2Title: "Where you are now",
    step2Description: "Tell DAD about your current career and why you want out",
    step3Title: "Where you want to go",
    step3Description: "The more honest, the better DAD can help",
    fields: {
      step2: [
        { key: "education", label: "Your educational background", placeholder: "e.g. BSc Accounting, no degree, professional qualifications...", type: "input" },
        { key: "country", label: "Country you want to work in", placeholder: "e.g. United Kingdom, India, USA...", type: "input" },
        { key: "experience", label: "What have you done in your career so far?", placeholder: "e.g. 5 years as an accountant, 3 years in retail management, 8 years in teaching...", type: "textarea" },
        { key: "whyLeaving", label: "Why do you want to change?", placeholder: "Be honest — burnout, better pay, more meaning, no growth, wrong fit, made a mistake...", type: "textarea" },
      ],
      step3: [
        { key: "interests", label: "What field or type of work are you drawn to?", placeholder: "e.g. tech, product, UX design, data, entrepreneurship, healthcare, content creation...", type: "textarea" },
        { key: "skills", label: "What transferable skills do you have?", placeholder: "e.g. managing people, data analysis, client relationships, problem solving, writing, presenting...", type: "textarea" },
        { key: "goals", label: "What are your constraints and expectations?", placeholder: "e.g. can't take a pay cut below £35k, need to retrain within 6 months, family commitments...", type: "textarea" },
        { key: "concerns", label: "What scares you most about changing?", placeholder: "e.g. starting from zero, salary drop, too old, not qualified, don't know where to start...", type: "textarea" },
      ],
    },
  },
  returning: {
    step2Title: "Your background & break",
    step2Description: "Tell DAD about your career before and during your break",
    step3Title: "Your return plan",
    step3Description: "What you need to get back with confidence",
    fields: {
      step2: [
        { key: "education", label: "Your educational background", placeholder: "e.g. BSc Nursing, MBA, no degree...", type: "input" },
        { key: "country", label: "Country you want to work in", placeholder: "e.g. United Kingdom, India, USA...", type: "input" },
        { key: "experience", label: "What was your career before the break?", placeholder: "e.g. 7 years in HR, project manager in construction, software developer...", type: "textarea" },
        { key: "breakReason", label: "How long was your break and why?", placeholder: "e.g. 2 years for childcare, 1 year health reasons, 3 years travelling, redundancy...", type: "textarea" },
      ],
      step3: [
        { key: "interests", label: "Do you want to return to the same field or try something new?", placeholder: "e.g. return to HR but in a different sector, want to move into something more flexible...", type: "textarea" },
        { key: "skills", label: "What skills did you have before — and have any changed or improved?", placeholder: "e.g. strong in project delivery, learned digital marketing during break, language skills...", type: "textarea" },
        { key: "goals", label: "What does a successful return look like?", placeholder: "e.g. part-time initially, need flexibility for school runs, want to earn £45k within a year...", type: "textarea" },
        { key: "concerns", label: "What are you most worried about?", placeholder: "e.g. explaining the gap, skills being outdated, confidence, age discrimination, where to start...", type: "textarea" },
      ],
    },
  },
};

const SITUATION_PROMPTS: Record<string, string> = {
  student: `This person is currently a student who hasn't graduated yet. They need:
1. Career direction — what path suits them based on their studies and interests
2. What to do RIGHT NOW before they graduate to maximise their chances
3. Internship and experience-building strategy
4. Skills to develop immediately
5. Realistic roles to target upon graduation
Be forward-looking and practical. They have time — use it well.`,

  fresh_graduate: `This person just graduated and is struggling to break into the job market with no/little experience. They need:
1. Honest assessment of which roles they realistically qualify for RIGHT NOW
2. How to position their degree and any experience they have
3. Entry-level pathways that accept fresh graduates
4. What's likely going wrong with their search (if they've been applying)
5. Fast-track actions to get their first role
Be honest about the market reality but give them a clear, actionable path.`,

  job_seeker: `This person has experience but is struggling to find work. They need:
1. Diagnosis of what's likely going wrong in their search
2. Whether they're targeting the right roles for their background
3. How to position their experience more effectively
4. Specific strategies to improve response rates and interviews
5. Whether a pivot or upskill would help
Be direct and diagnostic. Don't just encourage — identify the actual problem.`,

  career_change: `This person wants to change careers entirely. They need:
1. Honest assessment of whether their target field is realistic given their background
2. How to leverage transferable skills from their current career
3. What retraining or qualifications (if any) are actually necessary
4. Realistic timeline and salary expectations for the transition
5. Bridge roles that can help them make the switch gradually
Be realistic about the challenges but give them a genuine roadmap.`,

  returning: `This person is returning to work after a break. They need:
1. How to address and frame their career gap positively
2. What has changed in their industry and what they need to update
3. Returnship programmes or re-entry strategies specific to their field
4. Confidence-building steps before applying
5. Realistic expectations for salary and level when returning
Be encouraging but honest about what re-entry actually looks like.`,
};

export default function CareerPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CareerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({
    situation: "",
    education: "",
    experience: "",
    interests: "",
    skills: "",
    goals: "",
    country: "",
    graduationDate: "",
    applied: "",
    whyLeaving: "",
    breakReason: "",
    concerns: "",
  });

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const selectedSituation = SITUATION_QUESTIONS[form.situation];

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/career-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          situationContext: SITUATION_PROMPTS[form.situation] || "",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to generate assessment");
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const isStep2Valid = () => {
    if (!selectedSituation) return false;
    return selectedSituation.fields.step2.every(f => {
      if (f.key === "graduationDate" || f.key === "applied" || f.key === "whyLeaving" || f.key === "breakReason") return true;
      return form[f.key]?.trim().length > 0;
    });
  };

  const isStep3Valid = () => {
    if (!selectedSituation) return false;
    return selectedSituation.fields.step3
      .filter(f => f.key !== "concerns")
      .every(f => form[f.key]?.trim().length > 0);
  };

  if (loading) return <DadLoading message="DAD is mapping your career path..." />;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container px-4 md:px-6 max-w-4xl mx-auto flex items-center justify-between h-16">
          <Link href="/dashboard" className="text-2xl font-bold text-primary">DAD</Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Brain className="w-4 h-4" />
            <span>Career Assessment</span>
          </div>
        </div>
      </nav>

      <main className="container px-4 md:px-6 max-w-4xl mx-auto py-10">
        {!result ? (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-bold mb-3">Career Assessment</h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Tell DAD where you are. Get a personalised roadmap built specifically for your situation.
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-border rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>

            {/* STEP 1 — Situation selection */}
            {step === 1 && (
              <Card className="p-6 border border-border bg-card/50 space-y-6">
                <div>
                  <h2 className="font-semibold text-xl mb-1">Where are you right now?</h2>
                  <p className="text-sm text-muted-foreground">
                    Be honest. DAD asks different questions for each situation.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SITUATIONS.map(s => (
                    <button
                      key={s.id}
                      onClick={() => update("situation", s.id)}
                      className={`p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                        form.situation === s.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/40 hover:bg-primary/5"
                      }`}
                    >
                      <div className="text-3xl mb-2">{s.emoji}</div>
                      <div className="font-semibold text-sm mb-1">{s.label}</div>
                      <div className="text-xs text-muted-foreground">{s.description}</div>
                    </button>
                  ))}
                </div>

                <Button
                  onClick={() => setStep(2)}
                  className="w-full rounded-full"
                  size="lg"
                  disabled={!form.situation}
                >
                  Continue <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Card>
            )}

            {/* STEP 2 — Situation-specific questions part 1 */}
            {step === 2 && selectedSituation && (
              <Card className="p-6 border border-border bg-card/50 space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">
                      {SITUATIONS.find(s => s.id === form.situation)?.emoji}
                    </span>
                    <h2 className="font-semibold text-xl">{selectedSituation.step2Title}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedSituation.step2Description}</p>
                </div>

                {selectedSituation.fields.step2.map(field => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium mb-2">{field.label}</label>
                    {field.type === "input" ? (
                      <Input
                        placeholder={field.placeholder}
                        value={form[field.key] || ""}
                        onChange={e => update(field.key, e.target.value)}
                        className="bg-background"
                      />
                    ) : (
                      <Textarea
                        placeholder={field.placeholder}
                        value={form[field.key] || ""}
                        onChange={e => update(field.key, e.target.value)}
                        className="bg-background resize-none min-h-[90px]"
                      />
                    )}
                  </div>
                ))}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="rounded-full gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    className="flex-1 rounded-full"
                    size="lg"
                    disabled={!isStep2Valid()}
                  >
                    Continue <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </Card>
            )}

            {/* STEP 3 — Situation-specific questions part 2 */}
            {step === 3 && selectedSituation && (
              <Card className="p-6 border border-border bg-card/50 space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">
                      {SITUATIONS.find(s => s.id === form.situation)?.emoji}
                    </span>
                    <h2 className="font-semibold text-xl">{selectedSituation.step3Title}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedSituation.step3Description}</p>
                </div>

                {selectedSituation.fields.step3.map(field => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium mb-2">{field.label}</label>
                    {field.type === "input" ? (
                      <Input
                        placeholder={field.placeholder}
                        value={form[field.key] || ""}
                        onChange={e => update(field.key, e.target.value)}
                        className="bg-background"
                      />
                    ) : (
                      <Textarea
                        placeholder={field.placeholder}
                        value={form[field.key] || ""}
                        onChange={e => update(field.key, e.target.value)}
                        className="bg-background resize-none min-h-[90px]"
                      />
                    )}
                  </div>
                ))}

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(2)} className="rounded-full gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    className="flex-1 rounded-full"
                    size="lg"
                    disabled={!isStep3Valid()}
                  >
                    Get My Roadmap <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setResult(null); setStep(1); setForm({ situation: "", education: "", experience: "", interests: "", skills: "", goals: "", country: "", graduationDate: "", applied: "", whyLeaving: "", breakReason: "", concerns: "" }); }}
              className="rounded-full gap-2 mb-4"
            >
              <ArrowLeft className="w-4 h-4" /> Start over
            </Button>

            <Card className="p-6 border border-primary/20 bg-primary/5">
              <p className="text-xs text-primary uppercase tracking-wide font-medium mb-2">Your recommended path</p>
              <h2 className="text-2xl font-bold mb-3">{result.recommendedPath}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{result.reasoning}</p>
            </Card>

            {result.topRoles?.length > 0 && (
              <Card className="p-5 border border-border bg-card/50">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" /> Top roles for you
                </h3>
                <div className="space-y-3">
                  {result.topRoles.map((r, i) => (
                    <div key={i} className="p-4 bg-secondary/50 rounded-xl">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-sm">{r.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                        </div>
                        <span className="text-xs text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5 whitespace-nowrap flex-shrink-0">
                          {r.salaryRange}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {result.skillsToLearn?.length > 0 && (
              <Card className="p-5 border border-border bg-card/50">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" /> Skills to build next
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.skillsToLearn.map((s, i) => (
                    <span key={i} className="text-xs bg-secondary text-secondary-foreground rounded-full px-3 py-1">{s}</span>
                  ))}
                </div>
              </Card>
            )}

            {result.actionPlan?.length > 0 && (
              <Card className="p-5 border border-border bg-card/50">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Your action plan
                </h3>
                <div className="space-y-4">
                  {result.actionPlan.map((a, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">{a.step}</p>
                          <span className="text-xs text-muted-foreground bg-secondary rounded-full px-2 py-0.5">{a.timeframe}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{a.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {result.courses?.length > 0 && (
              <Card className="p-5 border border-border bg-card/50">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" /> Recommended courses
                </h3>
                <div className="space-y-3">
                  {result.courses.map((c, i) => (
                    <div key={i} className="p-3 bg-secondary/50 rounded-lg">
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.provider} · {c.reason}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card className="p-5 border border-border bg-card/50 text-center">
              <p className="text-muted-foreground italic">"{result.encouragement}"</p>
              <p className="text-sm text-primary mt-2 font-medium">— DAD</p>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setResult(null); setStep(1); }}
                className="flex-1 rounded-full"
              >
                Start Over
              </Button>
              <Link href="/interview" className="flex-1">
                <Button className="w-full rounded-full">
                  Practice Interview <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
