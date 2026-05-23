// app/components/ResumeAnalyzer.tsx
//
// Drop this into your DAD app and render it inside your
// "Let's take a look at your resume" section.
//
// Usage:  import ResumeAnalyzer from "@/app/components/ResumeAnalyzer";
//         <ResumeAnalyzer />
//
// Uses Tailwind CSS (which v0/DAD already uses). No extra libraries needed.

"use client";

import { useState } from "react";

type Course = { skill: string; resource: string; where: string };
type PlanItem = { timeframe: string; action: string };

type Result = {
  riskScore: number;
  riskLabel: string;
  summary: string;
  whyRejected: string[];
  missingKeywords: string[];
  freeCourses: Course[];
  cvFixes: string[];
  actionPlan: PlanItem[];
};

export default function ResumeAnalyzer() {
  const [jobDescription, setJobDescription] = useState("");
  const [cv, setCv] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function handleAnalyze() {
    setError("");
    setResult(null);

    if (!jobDescription.trim() || !cv.trim()) {
      setError("DAD needs both the job description and your CV to help.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, cv }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Try again.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Couldn't reach DAD. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const scoreColor =
    result && result.riskScore >= 70
      ? "text-red-600"
      : result && result.riskScore >= 40
      ? "text-amber-600"
      : "text-emerald-600";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Inputs */}
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-800">
            Job Description
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here..."
            className="h-48 w-full resize-none rounded-2xl border border-gray-200 bg-white p-4 text-sm shadow-sm outline-none focus:border-gray-400"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-800">
            Your CV / Resume
          </label>
          <textarea
            value={cv}
            onChange={(e) => setCv(e.target.value)}
            placeholder="Paste your CV text here..."
            className="h-48 w-full resize-none rounded-2xl border border-gray-200 bg-white p-4 text-sm shadow-sm outline-none focus:border-gray-400"
          />
        </div>
      </div>

      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="mt-6 w-full rounded-full bg-gray-900 px-6 py-4 text-base font-semibold text-white transition hover:bg-gray-700 disabled:opacity-60"
      >
        {loading ? "DAD is reading your profile..." : "Show me the truth →"}
      </button>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {/* Results */}
      {result && (
        <div className="mt-10 space-y-8">
          {/* Score */}
          <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
              Rejection Risk Score
            </p>
            <p className={`mt-2 text-6xl font-bold ${scoreColor}`}>
              {result.riskScore}
              <span className="text-2xl text-gray-400">/100</span>
            </p>
            <p className="mt-1 text-lg font-semibold text-gray-800">
              {result.riskLabel}
            </p>
            <p className="mx-auto mt-4 max-w-xl text-gray-600">{result.summary}</p>
          </div>

          <Section title="Why you might get rejected">
            <ul className="space-y-2">
              {result.whyRejected.map((r, i) => (
                <li key={i} className="flex gap-2 text-gray-700">
                  <span className="text-red-500">•</span> {r}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Missing skills & keywords">
            <div className="flex flex-wrap gap-2">
              {result.missingKeywords.map((k, i) => (
                <span
                  key={i}
                  className="rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-800"
                >
                  {k}
                </span>
              ))}
            </div>
          </Section>

          <Section title="Free courses to close the gap">
            <ul className="space-y-3">
              {result.freeCourses.map((c, i) => (
                <li key={i} className="rounded-xl bg-gray-50 p-3">
                  <p className="font-semibold text-gray-800">{c.skill}</p>
                  <p className="text-sm text-gray-600">
                    {c.resource} — <span className="italic">{c.where}</span>
                  </p>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="How to fix your CV">
            <ul className="space-y-2">
              {result.cvFixes.map((f, i) => (
                <li key={i} className="flex gap-2 text-gray-700">
                  <span className="text-emerald-500">✓</span> {f}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Your action plan">
            <ol className="space-y-3">
              {result.actionPlan.map((p, i) => (
                <li key={i} className="flex gap-3">
                  <span className="whitespace-nowrap rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white">
                    {p.timeframe}
                  </span>
                  <span className="text-gray-700">{p.action}</span>
                </li>
              ))}
            </ol>
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-gray-900">{title}</h3>
      {children}
    </div>
  );
}
