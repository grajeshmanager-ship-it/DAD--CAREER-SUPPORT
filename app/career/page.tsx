"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  ArrowRight, ArrowLeft, Brain,
  CheckCircle, Target, TrendingUp, BookOpen, Briefcase
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
  { id: "student", label: "Still studying" },
  { id: "fresh_graduate", label: "Just graduated" },
  { id: "job_seeker", label: "Looking for work" },
  { id: "career_change", label: "Changing careers" },
  { id: "returning", label: "Returning to work" },
];

export default function CareerPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CareerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    situation: "",
    education: "",
    experience: "",
    interests: "",
    skills: "",
    goals: "",
    country: "",
  });

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/career-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
                Tell DAD about yourself. Get a personalised career roadmap, top job matches, and an action plan built specifically for you.
              </p>
            </div>

            <div className="w-full bg-border rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${(step / 2) * 100}%` }}
              />
            </div>

            {step === 1 && (
              <Card className="p-6 border border-border bg-card/50 space-y-5">
                <h2 className="font-semibold text-lg">Step 1 — About you</h2>

                <div>
                  <label className="block text-sm font-medium mb-2">Your current situation</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SITUATIONS.map(s => (
                      <button
                        key={s.id}
                        onClick={() => update("situation", s.id)}
                        className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                          form.situation === s.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/40 text-muted-foreground"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Education background</label>
                  <Input
                    placeholder="e.g. BSc Computer Science, MBA, High School..."
                    value={form.education}
                    onChange={e => update("education", e.target.value)}
                    className="bg-background"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Country you want to work in</label>
                  <Input
                    placeholder="e.g. United Kingdom, India, USA..."
                    value={form.country}
                    onChange={e => update("country", e.target.value)}
                    className="bg-background"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Work experience (if any)</label>
                  <Textarea
                    placeholder="Any jobs, internships, freelance work, projects... or just say 'none'"
                    value={form.experience}
                    onChange={e => update("experience", e.target.value)}
                    className="bg-background resize-none min-h-[80px]"
                  />
                </div>

                <Button
                  onClick={() => setStep(2)}
                  className="w-full rounded-full"
                  size="lg"
                  disabled={!form.situation || !form.education || !form.country}
                >
                  Continue <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Card>
            )}

            {step === 2 && (
              <Card className="p-6 border border-border bg-card/50 space-y-5">
                <h2 className="font-semibold text-lg">Step 2 — Your interests & goals</h2>

                <div>
                  <label className="block text-sm font-medium mb-2">What are you interested in?</label>
                  <Textarea
                    placeholder="e.g. technology, people, creativity, numbers, helping others, building things..."
                    value={form.interests}
                    onChange={e => update("interests", e.target.value)}
                    className="bg-background resize-none min-h-[80px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">What skills do you have?</label>
                  <Textarea
                    placeholder="e.g. Python, communication, design, Excel, languages you speak..."
                    value={form.skills}
                    onChange={e => update("skills", e.target.value)}
                    className="bg-background resize-none min-h-[80px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">What do you want from your career?</label>
                  <Textarea
                    placeholder="e.g. good salary, work-life balance, creative freedom, helping people, travel..."
                    value={form.goals}
                    onChange={e => update("goals", e.target.value)}
                    className="bg-background resize-none min-h-[80px]"
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="rounded-full gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    className="flex-1 rounded-full"
                    size="lg"
                    disabled={!form.interests || !form.goals}
                  >
                    Get My Career Roadmap <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <Button variant="outline" size="sm" onClick={() => { setResult(null); setStep(1); }} className="rounded-full gap-2 mb-4">
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
              <Button variant="outline" onClick={() => { setResult(null); setStep(1); }} className="flex-1 rounded-full">
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
