"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"account" | "profile">("account");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    age: "",
    country: "",
    situation: "",
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleAccountStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) return;
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-[120px] opacity-60 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-primary">DAD</Link>
          <p className="text-muted-foreground mt-2 text-sm">Your AI career companion</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-8">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${step === "account" ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"}`}>1</div>
            <div className={`flex-1 h-0.5 transition-all ${step === "profile" ? "bg-primary" : "bg-border"}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${step === "profile" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>2</div>
          </div>

          {step === "account" ? (
            <>
              <h1 className="text-2xl font-bold mb-1">Create your account</h1>
              <p className="text-muted-foreground text-sm mb-6">Step 1 of 2 — Account details</p>

              <form onSubmit={handleAccountStep} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    required
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 6 characters"
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      required
                      className="bg-background pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
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
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-1">Tell DAD about yourself</h1>
              <p className="text-muted-foreground text-sm mb-6">Step 2 of 2 — So DAD can personalise everything for you</p>

              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    placeholder="Your full name"
                    value={form.fullName}
                    onChange={(e) => update("fullName", e.target.value)}
                    required
                    className="bg-background"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      placeholder="e.g. 24"
                      value={form.age}
                      onChange={(e) => update("age", e.target.value)}
                      className="bg-background"
                      min="16"
                      max="80"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      placeholder="e.g. United Kingdom"
                      value={form.country}
                      onChange={(e) => update("country", e.target.value)}
                      required
                      className="bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="situation">Current situation</Label>
                  <select
                    id="situation"
                    value={form.situation}
                    onChange={(e) => update("situation", e.target.value)}
                    required
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
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
                    <>Meet DAD <ArrowRight className="ml-2 w-4 h-4" /></>
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => { setStep("account"); setError(null); }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back
                </button>
              </form>
            </>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
