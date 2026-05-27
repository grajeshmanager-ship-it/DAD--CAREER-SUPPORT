"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, ArrowRight, Heart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const COMPANIONS = [
  { id: "dad", emoji: "👨", label: "Dad", prompt: "What's his name?" },
  { id: "mom", emoji: "👩", label: "Mom", prompt: "What's her name?" },
  { id: "brother", emoji: "👦", label: "Brother", prompt: "What's his name?" },
  { id: "sister", emoji: "👧", label: "Sister", prompt: "What's her name?" },
  { id: "teacher", emoji: "🧑‍🏫", label: "Teacher", prompt: "What's their name?" },
  { id: "mentor", emoji: "🧭", label: "Mentor", prompt: "What's their name?" },
  { id: "friend", emoji: "🤝", label: "Friend", prompt: "What's their name?" },
  { id: "partner", emoji: "💑", label: "Partner", prompt: "What's their name?" },
  { id: "self", emoji: "⭐", label: "I guide myself", prompt: "What's your name?" },
];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"account" | "companion" | "profile">("account");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompanion, setSelectedCompanion] = useState<string | null>(null);
  const [companionName, setCompanionName] = useState("");

  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    age: "",
    country: "",
    situation: "",
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const companion = COMPANIONS.find((c) => c.id === selectedCompanion);

  const handleAccountStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) return;
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError(null);
    setStep("companion");
  };

  const handleCompanionStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanion) {
      setError("Please choose who will guide you.");
      return;
    }
    if (!companionName.trim()) {
      setError("Please enter a name.");
      return;
    }
    setError(null);
    setStep("profile");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.country || !form.situation) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName,
            age: form.age,
            country: form.country,
            situation: form.situation,
            companion_type: selectedCompanion,
            companion_name: companionName,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email: form.email,
          full_name: form.fullName,
          age: form.age ? parseInt(form.age) : null,
          country: form.country,
          situation: form.situation,
          companion_type: selectedCompanion,
          companion_name: companionName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const stepNumber = step === "account" ? 1 : step === "companion" ? 2 : 3;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-[120px] opacity-60 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-primary">DAD</Link>
          <p className="text-muted-foreground mt-2 text-sm">
            Whoever stood beside you — we become that support.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all flex-shrink-0 ${
                  stepNumber >= n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>{n}</div>
                {n < 3 && <div className={`flex-1 h-0.5 transition-all ${stepNumber > n ? "bg-primary" : "bg-border"}`} />}
              </div>
            ))}
          </div>

          {/* STEP 1 — Account */}
          {step === "account" && (
            <>
              <h1 className="text-2xl font-bold mb-1">Create your account</h1>
              <p className="text-muted-foreground text-sm mb-6">Step 1 of 3 — Account details</p>
              <form onSubmit={handleAccountStep} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => update("email", e.target.value)} required className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="At least 6 characters" value={form.password} onChange={(e) => update("password", e.target.value)} required className="bg-background pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full rounded-full" size="lg">
                  Continue <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </form>
            </>
          )}

          {/* STEP 2 — Companion */}
          {step === "companion" && (
            <>
              <h1 className="text-2xl font-bold mb-1">Who guides you?</h1>
              <p className="text-muted-foreground text-sm mb-6">
                Step 2 of 3 — Choose who stands beside you in this journey
              </p>
              <form onSubmit={handleCompanionStep} className="space-y-5">
                <div className="grid grid-cols-3 gap-2">
                  {COMPANIONS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setSelectedCompanion(c.id); setCompanionName(""); setError(null); }}
                      className={`p-3 rounded-xl border-2 text-center transition-all duration-150 ${
                        selectedCompanion === c.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/40 hover:bg-primary/5"
                      }`}
                    >
                      <div className="text-2xl mb-1">{c.emoji}</div>
                      <div className="text-xs font-medium leading-tight">{c.label}</div>
                    </button>
                  ))}
                </div>

                {selectedCompanion && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <Label htmlFor="companionName">
                      {companion?.prompt}
                    </Label>
                    <Input
                      id="companionName"
                      placeholder={`Enter ${companion?.id === "self" ? "your" : "their"} name...`}
                      value={companionName}
                      onChange={(e) => setCompanionName(e.target.value)}
                      className="bg-background"
                      autoFocus
                    />
                    {companionName && (
                      <p className="text-xs text-primary flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {companion?.id === "self"
                          ? `You've got this, ${companionName}.`
                          : `${companionName} will be proud of you.`}
                      </p>
                    )}
                  </div>
                )}

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => { setStep("account"); setError(null); }} className="rounded-full">
                    ← Back
                  </Button>
                  <Button type="submit" className="flex-1 rounded-full" size="lg">
                    Continue <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </form>
            </>
          )}

          {/* STEP 3 — Profile */}
          {step === "profile" && (
            <>
              <h1 className="text-2xl font-bold mb-1">
                {companion?.id === "self" ? `Tell us about yourself, ${companionName}` : `Tell ${companionName} about yourself`}
              </h1>
              <p className="text-muted-foreground text-sm mb-6">Step 3 of 3 — So we can personalise everything for you</p>
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Your full name</Label>
                  <Input id="fullName" placeholder="Your full name" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} required className="bg-background" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input id="age" type="number" placeholder="e.g. 24" value={form.age} onChange={(e) => update("age", e.target.value)} className="bg-background" min="16" max="80" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input id="country" placeholder="e.g. United Kingdom" value={form.country} onChange={(e) => update("country", e.target.value)} required className="bg-background" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="situation">Current situation</Label>
                  <select id="situation" value={form.situation} onChange={(e) => update("situation", e.target.value)} required className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Select your situation...</option>
                    <option value="student">Student</option>
                    <option value="fresh_graduate">Fresh Graduate (no experience)</option>
                    <option value="job_seeker">Job Seeker (have some experience)</option>
                    <option value="employed_looking">Employed but looking to switch</option>
                    <option value="career_change">Career changer</option>
                    <option value="returning">Returning to work</option>
                  </select>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full rounded-full" size="lg" disabled={loading}>
                  {loading ? (
                    <><Loader2 className="mr-2 w-4 h-4 animate-spin" />Creating your account...</>
                  ) : (
                    <>Begin your journey <ArrowRight className="ml-2 w-4 h-4" /></>
                  )}
                </Button>
                <button type="button" onClick={() => { setStep("companion"); setError(null); }} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
                  ← Back
                </button>
              </form>
            </>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
