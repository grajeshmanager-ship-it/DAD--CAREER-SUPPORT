"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Upload, FileText, CheckCircle, ArrowRight,
  TrendingUp, Target, BookOpen, Briefcase, ArrowLeft, AlertCircle
} from "lucide-react";
import Link from "next/link";
import { DadLoading } from "@/components/ui/dad-loading";

interface SkillGap {
  skill: string;
  rating: string;
  explanation: string;
}

interface JobMatch {
  title: string;
  demandLevel: string;
  averageSalary: string;
}

interface Course {
  name: string;
  provider: string;
  url: string;
  skillAddressed: string;
}

interface AtsScore {
  score: number;
  missingKeywords: string[];
  formattingIssues: string[];
  improvements: { title: string; description: string }[];
}

interface SalaryRange {
  min: number;
  max: number;
  currency: string;
  explanation: string;
}

interface AnalysisResult {
  summary: string;
  skillGaps: SkillGap[];
  salaryRange: SalaryRange;
  jobMatches: JobMatch[];
  courses: Course[];
  atsScore: AtsScore;
}

export default function ResumePage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("resume", file);
      const res = await fetch("/api/analyze-resume", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to analyse resume");
      setResult(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <DadLoading message="DAD is reading your resume..." />;

  const getScoreColor = (score: number) =>
    score >= 75 ? "text-green-400" : score >= 50 ? "text-yellow-400" : "text-red-400";

  const getScoreBg = (score: number) =>
    score >= 75 ? "bg-green-400" : score >= 50 ? "bg-yellow-400" : "bg-red-400";

  const getRatingColor = (rating: string) => {
    if (rating === "High") return "text-red-400 bg-red-500/10 border-red-500/20";
    if (rating === "Mid") return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
    return "text-green-400 bg-green-500/10 border-green-500/20";
  };

  const getDemandColor = (demand: string) => {
    if (demand === "High") return "text-green-400";
    if (demand === "Medium") return "text-yellow-400";
    return "text-red-400";
  };

  const getCurrencySymbol = (currency: string) => {
    if (currency === "GBP") return "£";
    if (currency === "USD") return "$";
    if (currency === "INR") return "₹";
    return currency + " ";
  };

  const openUrl = (url: string) => {
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container px-4 md:px-6 max-w-4xl mx-auto flex items-center justify-between h-16">
          <Link href="/dashboard" className="text-2xl font-bold text-primary">DAD</Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="w-4 h-4" />
            <span>Resume Review</span>
          </div>
        </div>
      </nav>

      <main className="container px-4 md:px-6 max-w-4xl mx-auto py-10">
        {!result ? (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-bold mb-3">Resume Review</h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Upload your CV and DAD will tell you exactly what recruiters see — ATS score, skill gaps, salary range, and what to fix.
              </p>
            </div>

            <Card className="p-8 border border-border bg-card/50">
              <div
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
                  file
                    ? "border-primary/50 bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-primary/5"
                }`}
                onClick={() => document.getElementById("resume-file")?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dropped = e.dataTransfer.files[0];
                  if (dropped) setFile(dropped);
                }}
              >
                <input
                  id="resume-file"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {file ? (
                  <div className="space-y-3">
                    <CheckCircle className="w-12 h-12 text-primary mx-auto" />
                    <p className="font-semibold text-lg">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(0)} KB · Click to change
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto" />
                    <p className="font-semibold text-lg">Drop your resume here</p>
                    <p className="text-sm text-muted-foreground">PDF only · Click to browse</p>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Button
                onClick={handleUpload}
                className="w-full mt-6 rounded-full"
                size="lg"
                disabled={!file}
              >
                Analyse My Resume
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setResult(null); setFile(null); }}
              className="rounded-full gap-2 mb-4"
            >
              <ArrowLeft className="w-4 h-4" /> Upload another
            </Button>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-6 border border-border bg-card/50">
                <p className="text-sm text-muted-foreground mb-2">ATS Score</p>
                <div className="flex items-end gap-2 mb-3">
                  <span className={`text-5xl font-bold ${getScoreColor(Number(result.atsScore?.score ?? 0))}`}>
                    {Number(result.atsScore?.score ?? 0)}
                  </span>
                  <span className="text-muted-foreground mb-1">/100</span>
                </div>
                <div className="w-full bg-border rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-1000 ${getScoreBg(Number(result.atsScore?.score ?? 0))}`}
                    style={{ width: `${Number(result.atsScore?.score ?? 0)}%` }}
                  />
                </div>
              </Card>

              <Card className="p-6 border border-border bg-card/50">
                <p className="text-sm text-muted-foreground mb-2">Estimated Salary Range</p>
                <p className="text-3xl font-bold text-primary">
                  {getCurrencySymbol(result.salaryRange?.currency || "GBP")}
                  {Number(result.salaryRange?.min ?? 0).toLocaleString()}
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  up to {getCurrencySymbol(result.salaryRange?.currency || "GBP")}
                  {Number(result.salaryRange?.max ?? 0).toLocaleString()} / year
                </p>
                {result.salaryRange?.explanation && (
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {result.salaryRange.explanation}
                  </p>
                )}
              </Card>
            </div>

            {result.summary && (
              <Card className="p-6 border border-primary/20 bg-primary/5">
                <p className="text-sm leading-relaxed">{result.summary}</p>
              </Card>
            )}

            {result.atsScore?.improvements?.length > 0 && (
              <Card className="p-5 border border-border bg-card/50">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" /> What to fix in your CV
                </h3>
                <div className="space-y-3">
                  {result.atsScore.improvements.map((imp, i) => (
                    <div key={i} className="p-3 bg-red-500/5 border border-red-500/15 rounded-lg">
                      <p className="text-sm font-medium text-red-400 mb-1">{imp.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{imp.description}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {result.atsScore?.missingKeywords?.length > 0 && (
              <Card className="p-5 border border-border bg-card/50">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400" /> Missing keywords
                </h3>
                <p className="text-xs text-muted-foreground mb-3">Add these to your CV to pass ATS filters:</p>
                <div className="flex flex-wrap gap-2">
                  {result.atsScore.missingKeywords.map((kw, i) => (
                    <span key={i} className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-full px-3 py-1">
                      {kw}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {result.skillGaps?.length > 0 && (
              <Card className="p-5 border border-border bg-card/50">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Skill gaps to close
                </h3>
                <div className="space-y-3">
                  {result.skillGaps.map((gap, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium">{gap.skill}</p>
                          <span className={`text-xs border rounded-full px-2 py-0.5 ${getRatingColor(gap.rating)}`}>
                            {gap.rating} priority
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{gap.explanation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {result.jobMatches?.length > 0 && (
              <Card className="p-5 border border-border bg-card/50">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" /> Best job matches
                </h3>
                <div className="space-y-3">
                  {result.jobMatches.map((job, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{job.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Avg salary: {job.averageSalary}
                        </p>
                      </div>
                      <span className={`text-xs font-medium ${getDemandColor(job.demandLevel)}`}>
                        {job.demandLevel} demand
                      </span>
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
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {c.provider} · Builds: {c.skillAddressed}
                          </p>
                        </div>
                        {c.url && c.url !== "#" && (
                          <button
                            onClick={() => openUrl(c.url)}
                            className="text-xs text-primary hover:underline flex-shrink-0"
                          >
                            View →
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {result.atsScore?.formattingIssues?.length > 0 && (
              <Card className="p-5 border border-border bg-card/50">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-400" /> Formatting issues
                </h3>
                <ul className="space-y-2">
                  {result.atsScore.formattingIssues.map((issue, i) => (
                    <li key={i} className="text-sm flex gap-2 text-muted-foreground">
                      <span className="text-orange-400 mt-0.5">•</span>{issue}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => { setResult(null); setFile(null); }}
                className="flex-1 rounded-full"
              >
                Analyse Another Resume
              </Button>
              <Link href="/interview" className="flex-1">
                <Button className="w-full rounded-full">
                  Practice Interview Next <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
