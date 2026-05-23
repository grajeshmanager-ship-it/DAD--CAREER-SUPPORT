"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle2, Sparkles, Loader2, AlertCircle, Check } from "lucide-react";
import { SkillGapAnalysis, type AnalysisResult } from "./skill-gap-analysis";

type UploadState = "idle" | "selected" | "analyzing" | "complete" | "error";

export function ResumeUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisStep, setAnalysisStep] = useState(0);

  const analysisSteps = [
    "Reading your resume",
    "Analysing your skills",
    "Checking UK job market",
    "Building your results"
  ];

  // Progress through steps while analyzing
  useEffect(() => {
    if (uploadState === "analyzing") {
      setAnalysisStep(0);
      const interval = setInterval(() => {
        setAnalysisStep((prev) => {
          if (prev < analysisSteps.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [uploadState]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const startAnalysis = async (fileToAnalyze: File) => {
    console.log("[v0] Starting analysis for file:", fileToAnalyze.name);
    setUploadState("analyzing");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("resume", fileToAnalyze);

      console.log("[v0] Sending request to /api/analyze-resume");
      const response = await fetch("/api/analyze-resume", {
        method: "POST",
        body: formData,
      });

      console.log("[v0] Response status:", response.status);
      const data = await response.json();
      console.log("[v0] Response data:", data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze resume");
      }

      setAnalysisResult(data.analysis);if (data.analysis?.resumeText) { sessionStorage.setItem('dadResumeText', data.analysis.resumeText); }
      setUploadState("complete");
      console.log("[v0] Analysis complete");

      // Save to Supabase (fire and forget - don't block the UI)
      try {
        const skillPath = data.analysis.skillGaps
          ?.map((s: { skill: string }) => s.skill)
          ?.join(", ") || "";
        
        await fetch("/api/save-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            journey_type: "resume_upload",
            skill_path: skillPath,
            analysis_result: data.analysis,
          }),
        });
        console.log("[v0] User data saved to Supabase");
      } catch (saveErr) {
        console.error("[v0] Failed to save user data:", saveErr);
      }
    } catch (err) {
      console.error("[v0] Analysis error:", err);
      setError(err instanceof Error ? err.message : "Failed to analyze resume. Please try again.");
      setUploadState("error");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    console.log("[v0] File dropped");
    const droppedFile = e.dataTransfer.files[0];
    console.log("[v0] Dropped file:", droppedFile?.name, droppedFile?.type);
    
    if (droppedFile && droppedFile.type === "application/pdf") {
      setFile(droppedFile);
      startAnalysis(droppedFile);
    } else {
      setError("Please upload a PDF file");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("[v0] File input changed");
    setError(null);
    const selectedFile = e.target.files?.[0];
    console.log("[v0] Selected file:", selectedFile?.name, selectedFile?.type);
    
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      startAnalysis(selectedFile);
    } else if (selectedFile) {
      console.log("[v0] Invalid file type:", selectedFile.type);
      setError("Please upload a PDF file");
    }
  };

  const handleReset = () => {
    setFile(null);
    setUploadState("idle");
    setError(null);
    setAnalysisResult(null);
  };

  const openFilePicker = () => {
    console.log("[v0] Opening file picker");
    const input = document.getElementById("resume-upload-input") as HTMLInputElement;
    if (input) {
      input.click();
    } else {
      console.error("[v0] File input not found");
    }
  };

  if (uploadState === "complete" && analysisResult) {
    return <SkillGapAnalysis result={analysisResult} onBack={handleReset} />;
  }

  return (
    <section id="resume-upload" className="py-20 md:py-32 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      
      <div className="container px-4 md:px-6 max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <p className="text-primary font-medium mb-4 tracking-wide uppercase text-sm">
            Get started
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-balance">
            {"Let's take a look at your resume"}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {"Upload your resume and DAD will give you honest, constructive feedback — the kind that actually helps."}
          </p>
        </div>

        {/* Hidden file input */}
        <input
          id="resume-upload-input"
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative rounded-2xl border-2 border-dashed transition-all duration-300
            ${isDragging ? "border-primary bg-primary/10 scale-[1.02]" : "border-border bg-card/50"}
            ${file ? "border-primary/50" : ""}
            ${error ? "border-destructive/50" : ""}
          `}
        >
          <div className="p-8 md:p-16 text-center">
            {uploadState === "analyzing" ? (
              <div className="space-y-8">
                <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center relative">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
                
                <div>
                  <p className="font-semibold text-xl text-foreground">DAD is reviewing your resume</p>
                </div>

                {/* Progress Steps */}
                <div className="max-w-sm mx-auto space-y-3">
                  {analysisSteps.map((step, index) => (
                    <div
                      key={step}
                      className={`flex items-center gap-3 transition-all duration-300 ${
                        index <= analysisStep ? "opacity-100" : "opacity-40"
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                        index < analysisStep 
                          ? "bg-primary text-primary-foreground" 
                          : index === analysisStep 
                            ? "bg-primary/20 border-2 border-primary" 
                            : "bg-muted border border-border"
                      }`}>
                        {index < analysisStep ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : index === analysisStep ? (
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        ) : (
                          <span className="text-xs text-muted-foreground">{index + 1}</span>
                        )}
                      </div>
                      <span className={`text-sm ${
                        index <= analysisStep ? "text-foreground" : "text-muted-foreground"
                      }`}>
                        Step {index + 1}: {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-secondary flex items-center justify-center">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-lg">
                    Drag and drop your resume here
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    or click to browse (PDF only)
                  </p>
                </div>
                <div className="pt-4">
                  <Button
                    variant="outline"
                    className="rounded-full cursor-pointer"
                    onClick={openFilePicker}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Select File
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={handleReset}
              >
                Try Again
              </Button>
            </div>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground mt-6">
          Your resume is private and secure. We never share your data with anyone.
        </p>
      </div>
    </section>
  );
}
