"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  ExternalLink,
  PoundSterling,
  GraduationCap,
  Sparkles,
  MapPin,
  Building2,
  Loader2,
  Search,
  Globe,
  FileCheck,
  AlertTriangle,
  Lightbulb,
  XCircle,
} from "lucide-react";

type SkillRating = "High" | "Mid" | "Low" | "Normal";

interface SkillGap {
  skill: string;
  rating: SkillRating;
  explanation: string;
}

interface SalaryRange {
  min: number;
  max: number;
  currency: string;
  explanation: string;
}

interface JobMatch {
  title: string;
  demandLevel: "High" | "Medium" | "Low";
  averageSalary: string;
}

interface Course {
  name: string;
  provider: string;
  url: string;
  skillAddressed: string;
}

interface ATSImprovement {
  title: string;
  description: string;
}

interface ATSScore {
  score: number;
  missingKeywords: string[];
  formattingIssues: string[];
  improvements: ATSImprovement[];
}

interface LiveJob {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  url: string;
  searchedTitle: string;
}

export interface AnalysisResult {
  skillGaps: SkillGap[];
  salaryRange: SalaryRange;
  jobMatches: JobMatch[];
  courses: Course[];
  atsScore?: ATSScore;
  summary: string;
}

interface SkillGapAnalysisProps {
  result: AnalysisResult;
  onBack: () => void;
}

function getRatingConfig(rating: SkillRating) {
  switch (rating) {
    case "High":
      return {
        label: "High",
        color: "text-emerald-400",
        bg: "bg-emerald-400/20",
        border: "border-emerald-400/30",
        icon: TrendingUp,
      };
    case "Mid":
      return {
        label: "Mid",
        color: "text-amber-400",
        bg: "bg-amber-400/20",
        border: "border-amber-400/30",
        icon: Minus,
      };
    case "Low":
      return {
        label: "Low",
        color: "text-red-400",
        bg: "bg-red-400/20",
        border: "border-red-400/30",
        icon: TrendingDown,
      };
    case "Normal":
      return {
        label: "Normal",
        color: "text-blue-400",
        bg: "bg-blue-400/20",
        border: "border-blue-400/30",
        icon: CheckCircle2,
      };
    default:
      return {
        label: "Normal",
        color: "text-blue-400",
        bg: "bg-blue-400/20",
        border: "border-blue-400/30",
        icon: CheckCircle2,
      };
  }
}

function SkillCard({ skill }: { skill: SkillGap }) {
  const config = getRatingConfig(skill.rating);
  const Icon = config.icon;

  return (
    <Card className={`p-4 border ${config.border} bg-card/50`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h4 className="font-semibold text-foreground">{skill.skill}</h4>
          <p className="text-sm text-muted-foreground mt-1">{skill.explanation}</p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${config.bg} shrink-0`}>
          <Icon className={`w-4 h-4 ${config.color}`} />
          <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
        </div>
      </div>
    </Card>
  );
}

function LiveJobCard({ job }: { job: LiveJob }) {
  return (
    <Card className="p-5 bg-card/50 border-border hover:border-primary/50 transition-colors">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h4 className="font-semibold text-foreground leading-tight">{job.title}</h4>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Building2 className="w-4 h-4 shrink-0" />
              <span>{job.company}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>{job.location}</span>
            </div>
          </div>
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" className="rounded-full shrink-0">
              <ExternalLink className="w-4 h-4 mr-1.5" />
              Apply
            </Button>
          </a>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <p className="text-primary font-semibold">{job.salary}</p>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            Matched: {job.searchedTitle}
          </span>
        </div>
      </div>
    </Card>
  );
}

function CourseCard({ course }: { course: Course }) {
  return (
    <Card className="p-5 bg-card/50 border-border hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h4 className="font-semibold text-foreground">{course.name}</h4>
          <p className="text-sm text-muted-foreground mt-1">{course.provider}</p>
          <p className="text-xs text-primary/80 mt-2">
            Addresses: {course.skillAddressed}
          </p>
        </div>
        <a
          href={course.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" size="sm" className="rounded-full shrink-0">
            <ExternalLink className="w-4 h-4 mr-1.5" />
            View
          </Button>
        </a>
      </div>
    </Card>
  );
}

export function SkillGapAnalysis({ result, onBack }: SkillGapAnalysisProps) {
  const [liveJobs, setLiveJobs] = useState<LiveJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("United Kingdom");
  const [isSearching, setIsSearching] = useState(false);

  const countries = ["United Kingdom", "United States", "India"];

  const highSkills = result.skillGaps.filter((s) => s.rating === "High" || s.rating === "Normal").length;
  const lowSkills = result.skillGaps.filter((s) => s.rating === "Low").length;

  const formatSalary = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: result.salaryRange.currency || "GBP",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Fetch live jobs from Adzuna when component mounts or country changes
  useEffect(() => {
    async function fetchLiveJobs() {
      setLoadingJobs(true);
      setJobsError(null);

      try {
        // Get the top job title from Claude's analysis
        const topJobTitle = result.jobMatches.length > 0 ? result.jobMatches[0].title : null;
        
        if (!topJobTitle) {
          setLoadingJobs(false);
          return;
        }

        const response = await fetch("/api/fetch-jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            jobTitles: [topJobTitle],
            country: selectedCountry,
            city: searchCity
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch jobs");
        }

        setLiveJobs(data.jobs || []);
      } catch (err) {
        setJobsError(err instanceof Error ? err.message : "Failed to fetch live jobs");
      } finally {
        setLoadingJobs(false);
      }
    }

    if (result.jobMatches && result.jobMatches.length > 0) {
      fetchLiveJobs();
    } else {
      setLoadingJobs(false);
    }
  }, [result.jobMatches, selectedCountry, searchCity]);

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchKeyword.trim()) return;

    setIsSearching(true);
    setJobsError(null);

    try {
      const response = await fetch("/api/fetch-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          jobTitles: [searchKeyword.trim()],
          country: selectedCountry,
          city: searchCity
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch jobs");
      }

      setLiveJobs(data.jobs || []);
    } catch (err) {
      setJobsError(err instanceof Error ? err.message : "Failed to search jobs");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <section className="py-20 md:py-32 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />

      <div className="container px-4 md:px-6 max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-10">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-6 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Upload Different Resume
          </Button>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div>
              <p className="text-primary font-medium mb-2 tracking-wide uppercase text-sm">
                Analysis Complete
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-balance">
                {"Here's what DAD found"}
              </h2>
            </div>

            <div className="flex gap-3">
              <div className="px-4 py-3 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-center">
                <p className="text-2xl font-bold text-emerald-400">{highSkills}</p>
                <p className="text-xs text-emerald-400/80">Strong Areas</p>
              </div>
              <div className="px-4 py-3 rounded-xl bg-red-400/10 border border-red-400/20 text-center">
                <p className="text-2xl font-bold text-red-400">{lowSkills}</p>
                <p className="text-xs text-red-400/80">Need Work</p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        {result.summary && (
          <Card className="p-6 mb-10 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">DAD&apos;s Take</h3>
                <p className="text-muted-foreground">{result.summary}</p>
              </div>
            </div>
          </Card>
        )}

        {/* ATS Score */}
        {result.atsScore && (
          <Card className="p-6 mb-10 bg-card/50 border-border">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-full bg-blue-400/20 flex items-center justify-center shrink-0">
                <FileCheck className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">ATS Compatibility Score</h3>
                <p className="text-sm text-muted-foreground">How well your resume performs with Applicant Tracking Systems</p>
              </div>
              <div className={`text-4xl font-bold ${
                result.atsScore.score >= 80 ? "text-emerald-400" :
                result.atsScore.score >= 60 ? "text-amber-400" :
                "text-red-400"
              }`}>
                {result.atsScore.score}<span className="text-lg text-muted-foreground">/100</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-3 bg-muted rounded-full mb-6 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  result.atsScore.score >= 80 ? "bg-emerald-400" :
                  result.atsScore.score >= 60 ? "bg-amber-400" :
                  "bg-red-400"
                }`}
                style={{ width: `${result.atsScore.score}%` }}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Missing Keywords */}
              {result.atsScore.missingKeywords && result.atsScore.missingKeywords.length > 0 && (
                <div>
                  <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400" />
                    Missing Keywords
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.atsScore.missingKeywords.map((keyword, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 text-sm bg-red-400/10 text-red-400 border border-red-400/20 rounded-full"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Formatting Issues */}
              {result.atsScore.formattingIssues && result.atsScore.formattingIssues.length > 0 && (
                <div>
                  <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Formatting Issues
                  </h4>
                  <ul className="space-y-2">
                    {result.atsScore.formattingIssues.map((issue, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-amber-400 mt-1">•</span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Improvements */}
            {result.atsScore.improvements && result.atsScore.improvements.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  3 Ways to Improve Your ATS Score
                </h4>
                <div className="grid gap-3">
                  {result.atsScore.improvements.map((improvement, index) => (
                    <div key={index} className="p-4 bg-primary/5 border border-primary/10 rounded-lg">
                      <p className="font-medium text-foreground mb-1">{index + 1}. {improvement.title}</p>
                      <p className="text-sm text-muted-foreground">{improvement.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Salary Range */}
        <Card className="p-6 mb-10 bg-card/50 border-border">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-400/20 flex items-center justify-center shrink-0">
              <PoundSterling className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Realistic UK Salary Range</h3>
              <p className="text-2xl font-bold text-primary mb-2">
                {formatSalary(result.salaryRange.min)} – {formatSalary(result.salaryRange.max)}
              </p>
              <p className="text-sm text-muted-foreground">{result.salaryRange.explanation}</p>
            </div>
          </div>
        </Card>

        {/* Skill Gap Analysis */}
        <div className="mb-10">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Skill Gap Analysis
          </h3>
          <div className="grid gap-3">
            {result.skillGaps.map((skill, index) => (
              <SkillCard key={`${skill.skill}-${index}`} skill={skill} />
            ))}
          </div>
        </div>

        {/* Live Job Listings from Adzuna */}
        <div className="mb-10">
          <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            Live UK Jobs For You
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Real-time listings from Adzuna matching your profile
          </p>

          {/* Job Search Bar */}
          <form onSubmit={handleManualSearch} className="mb-6">
            <Card className="p-4 bg-card/50 border-border">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Job title or keyword..."
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="sm:w-40 relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="City (optional)"
                      value={searchCity}
                      onChange={(e) => setSearchCity(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="sm:w-44">
                    <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                      <SelectTrigger>
                        <Globe className="w-4 h-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" disabled={isSearching || !searchKeyword.trim()} className="sm:w-auto">
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Searching
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Search Jobs
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </form>

          {loadingJobs ? (
            <Card className="p-8 bg-card/50 border-border">
              <div className="flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-muted-foreground">Finding live jobs in the UK market...</p>
              </div>
            </Card>
          ) : jobsError ? (
            <Card className="p-6 bg-red-400/10 border-red-400/20">
              <p className="text-red-400 text-center">{jobsError}</p>
            </Card>
          ) : liveJobs.length === 0 ? (
            <Card className="p-6 bg-card/50 border-border">
              <p className="text-muted-foreground text-center">
                No jobs found{searchCity ? ` in ${searchCity}` : ""} ({selectedCountry}). Try another city or search for a different job title.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {liveJobs.map((job) => (
                <LiveJobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </div>

        {/* Free Courses */}
        <div className="mb-10">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Free Courses to Close Your Skill Gaps
          </h3>
          <div className="grid gap-4">
            {result.courses.map((course, index) => (
              <CourseCard key={`${course.name}-${index}`} course={course} />
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-8 border-t border-border">
          <p className="text-muted-foreground mb-4">
            Want personalized advice on improving your resume?
          </p>
          <Button size="lg" className="rounded-full" asChild>
            <a href="#voice-section">Talk to DAD About This</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
