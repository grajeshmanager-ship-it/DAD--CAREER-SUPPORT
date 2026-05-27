"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRight, ArrowLeft, Mic, MicOff,
  CheckCircle, XCircle, AlertCircle, ChevronDown,
  ChevronUp, RotateCcw, FileText, Brain, Target,
  TrendingUp, BookOpen, Star
} from "lucide-react";
import Link from "next/link";

type Stage = "setup" | "intel" | "interview" | "debrief";

interface InterviewPlan {
  roleTitle: string;
  company: string;
  seniorityLevel: string;
  interviewStyle: string;
  numberOfQuestions: number;
  keySkillsRequired: string[];
  topThingsToGetHired: string[];
  topThingsToGetRejected: string[];
  interviewQuestions: {
    id: number;
    type: string;
    question: string;
    whatTheyAreTesting: string;
    idealAnswerPoints: string[];
  }[];
  intelSummary: string;
}

interface Debrief {
  overallScore: number;
  verdict: string;
  verdictExplanation: string;
  strengths: string[];
  weaknesses: string[];
  questionBreakdown: {
    questionNumber: number;
    question: string;
    candidateAnswer: string;
    score: number;
    whatWasWrong: string;
    idealAnswer: string;
    tip: string;
  }[];
  top3ImprovementAreas: {
    area: string;
    why: string;
    howToImprove: string;
  }[];
  cheatSheet: {
    title: string;
    keyMessages: string[];
    questionsToAskInterviewer: string[];
    lastMinuteTips: string[];
  };
  encouragement: string;
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? "text-green-400" : score >= 60 ? "text-yellow-400" : "text-red-400";
  const bgColor = score >= 75 ? "bg-green-400/10" : score >= 60 ? "bg-yellow-400/10" : "bg-red-400/10";
  const borderColor = score >= 75 ? "border-green-400" : score >= 60 ? "border-yellow-400" : "border-red-400";
  return (
    <div className={`w-32 h-32 rounded-full ${bgColor} border-4 ${borderColor} flex items-center justify-center flex-col mx-auto`}>
      <span className={`text-4xl font-bold ${color}`}>{score}</span>
      <span className="text-xs text-muted-foreground">/ 100</span>
    </div>
  );
}

export default function InterviewPage() {
  const [stage, setStage] = useState<Stage>("setup");
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [plan, setPlan] = useState<InterviewPlan | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [debrief, setDebrief] = useState<Debrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [recognition, setRecognition] = useState<any>(null);

  const startVoiceInput = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognitionAPI = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setError("Voice input not supported in this browser. Please type your answer.");
      return;
    }
    const rec = new SpeechRecognitionAPI();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-GB";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setCurrentAnswer(transcript);
    };
    rec.onerror = () => setIsRecording(false);
    rec.onend = () => setIsRecording(false);
    rec.start();
    setRecognition(rec);
    setIsRecording(true);
  };

  const stopVoiceInput = () => {
    if (recognition) recognition.stop();
    setIsRecording(false);
  };

  const handlePrepare = async () => {
    if (jobDescription.trim().length < 20) {
      setError("Please paste a proper job description.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/prepare-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, resumeText }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to prepare interview");
      setPlan(data.plan);
      setAnswers(new Array(data.plan.interviewQuestions.length).fill(""));
      setStage("intel");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleNextQuestion = () => {
    if (!currentAnswer.trim()) {
      setError("Please answer the question before continuing.");
      return;
    }
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = currentAnswer;
    setAnswers(newAnswers);
    setCurrentAnswer("");
    setError(null);
    if (currentQuestion < (plan?.interviewQuestions.length || 0) - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleDebrief(newAnswers);
    }
  };

  const handleDebrief = async (finalAnswers: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/debrief-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: plan?.interviewQuestions,
          answers: finalAnswers,
          roleTitle: plan?.roleTitle,
          jobDescription,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to generate debrief");
      setDebrief(data.debrief);
      setStage("debrief");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStage("setup");
    setJobDescription("");
    setResumeText("");
    setPlan(null);
    setAnswers([]);
    setCurrentQuestion(0);
    setCurrentAnswer("");
    setDebrief(null);
    setError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto animate-pulse">
            <Brain className="w-8 h-8 text-primary" />
          </div>
          <p className="text-lg font-medium">
            {stage === "setup" ? "DAD is analysing the job description..." : "DAD is reviewing your answers..."}
          </p>
          <p className="text-muted-foreground text-sm">This takes about 15 seconds</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container px-4 md:px-6 max-w-4xl mx-auto flex items-center justify-between h-16">
          <Link href="/dashboard" className="text-2xl font-bold text-primary">DAD</Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Brain className="w-4 h-4" />
            <span>Mock Interview</span>
          </div>
        </div>
      </nav>

      <main className="container px-4 md:px-6 max-w-4xl mx-auto py-10">

        {/* SETUP */}
        {stage === "setup" && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-bold mb-3">Mock Interview with DAD</h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Paste the job description. DAD will analyse it, ask you real interview questions, then give you honest feedback and a preparation guide.
              </p>
            </div>
            <Card className="p-6 border border-border bg-card/50">
              <label className="block text-sm font-medium mb-2">
                Job Description <span className="text-primary">*</span>
              </label>
              <Textarea
                placeholder="Paste the full job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="min-h-[200px] bg-background resize-none mb-4"
              />
              <label className="block text-sm font-medium mb-2">
                Your Resume <span className="text-muted-foreground text-xs">(optional but recommended)</span>
              </label>
              <Textarea
                placeholder="Paste your resume text here so DAD can personalise the questions..."
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                className="min-h-[120px] bg-background resize-none"
              />
              {error && <p className="text-sm text-destructive mt-3">{error}</p>}
              <Button
                onClick={handlePrepare}
                className="w-full mt-4 rounded-full"
                size="lg"
                disabled={jobDescription.trim().length < 20}
              >
                Analyse & Prepare My Interview
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Card>
          </div>
        )}

        {/* INTEL */}
        {stage === "intel" && plan && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <p className="text-primary font-medium text-sm uppercase tracking-wide mb-2">Intel Report</p>
              <h1 className="text-3xl font-bold mb-2">{plan.roleTitle}</h1>
              <p className="text-muted-foreground">{plan.company} · {plan.seniorityLevel} · {plan.interviewStyle}</p>
            </div>
            <Card className="p-5 border border-primary/20 bg-primary/5">
              <p className="text-sm leading-relaxed">{plan.intelSummary}</p>
            </Card>
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-5 border border-green-500/20 bg-green-500/5">
                <h3 className="font-semibold text-green-400 flex items-center gap-2 mb-3">
                  <CheckCircle className="w-4 h-4" /> What will get you hired
                </h3>
                <ul className="space-y-2">
                  {plan.topThingsToGetHired.map((t, i) => (
                    <li key={i} className="text-sm flex gap-2"><span className="text-green-400 mt-0.5">•</span>{t}</li>
                  ))}
                </ul>
              </Card>
              <Card className="p-5 border border-red-500/20 bg-red-500/5">
                <h3 className="font-semibold text-red-400 flex items-center gap-2 mb-3">
                  <XCircle className="w-4 h-4" /> What will get you rejected
                </h3>
                <ul className="space-y-2">
                  {plan.topThingsToGetRejected.map((t, i) => (
                    <li key={i} className="text-sm flex gap-2"><span className="text-red-400 mt-0.5">•</span>{t}</li>
                  ))}
                </ul>
              </Card>
            </div>
            <Card className="p-5 border border-border bg-card/50">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /> Key skills being assessed
              </h3>
              <div className="flex flex-wrap gap-2">
                {plan.keySkillsRequired.map((s, i) => (
                  <span key={i} className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1">{s}</span>
                ))}
              </div>
            </Card>
            <Card className="p-5 border border-border bg-card/50">
              <h3 className="font-semibold mb-1">Ready for your interview?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                DAD has prepared {plan.numberOfQuestions} questions. Answer honestly — the more real your answers, the more useful the feedback.
              </p>
              <Button onClick={() => { setStage("interview"); setCurrentQuestion(0); }} className="w-full rounded-full" size="lg">
                Start Interview <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Card>
          </div>
        )}

        {/* INTERVIEW */}
        {stage === "interview" && plan && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Question {currentQuestion + 1} of {plan.interviewQuestions.length}</span>
              <span className="text-sm text-muted-foreground">{plan.roleTitle}</span>
            </div>
            <div className="w-full bg-border rounded-full h-1.5 mb-6">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${((currentQuestion) / plan.interviewQuestions.length) * 100}%` }}
              />
            </div>
            <Card className="p-6 border border-border bg-card">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs bg-secondary text-secondary-foreground rounded-full px-3 py-1">
                  {plan.interviewQuestions[currentQuestion].type}
                </span>
              </div>
              <h2 className="text-xl font-semibold leading-relaxed mb-2">
                {plan.interviewQuestions[currentQuestion].question}
              </h2>
              <p className="text-xs text-muted-foreground italic">
                Testing: {plan.interviewQuestions[currentQuestion].whatTheyAreTesting}
              </p>
            </Card>
            <Card className="p-6 border border-border bg-card/50">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">Your answer</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={isRecording ? stopVoiceInput : startVoiceInput}
                  className={isRecording ? "text-red-400 hover:text-red-300" : "text-muted-foreground"}
                >
                  {isRecording ? <><MicOff className="w-4 h-4 mr-1" />Stop</> : <><Mic className="w-4 h-4 mr-1" />Speak</>}
                </Button>
              </div>
              <Textarea
                placeholder="Type your answer or click Speak to use your microphone..."
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                className="min-h-[160px] bg-background resize-none"
              />
              {isRecording && (
                <p className="text-xs text-red-400 mt-2 animate-pulse">🔴 Recording... speak your answer</p>
              )}
            </Card>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-3">
              {currentQuestion > 0 && (
                <Button variant="outline" onClick={() => { setCurrentQuestion(currentQuestion - 1); setCurrentAnswer(answers[currentQuestion - 1] || ""); }} className="rounded-full">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              )}
              <Button onClick={handleNextQuestion} className="flex-1 rounded-full" size="lg">
                {currentQuestion === plan.interviewQuestions.length - 1 ? "Finish & Get Feedback" : "Next Question"}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* DEBRIEF */}
        {stage === "debrief" && debrief && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-primary font-medium text-sm uppercase tracking-wide mb-4">Interview Complete</p>
              <ScoreRing score={debrief.overallScore} />
              <h2 className="text-2xl font-bold mt-4 mb-2">{debrief.verdict}</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">{debrief.verdictExplanation}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-5 border border-green-500/20 bg-green-500/5">
                <h3 className="font-semibold text-green-400 flex items-center gap-2 mb-3">
                  <CheckCircle className="w-4 h-4" /> Your strengths
                </h3>
                <ul className="space-y-2">
                  {debrief.strengths.map((s, i) => (
                    <li key={i} className="text-sm flex gap-2"><span className="text-green-400">•</span>{s}</li>
                  ))}
                </ul>
              </Card>
              <Card className="p-5 border border-red-500/20 bg-red-500/5">
                <h3 className="font-semibold text-red-400 flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4" /> Areas that hurt you
                </h3>
                <ul className="space-y-2">
                  {debrief.weaknesses.map((w, i) => (
                    <li key={i} className="text-sm flex gap-2"><span className="text-red-400">•</span>{w}</li>
                  ))}
                </ul>
              </Card>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Question by Question
              </h3>
              <div className="space-y-3">
                {debrief.questionBreakdown.map((q, i) => (
                  <Card key={i} className="border border-border bg-card/50 overflow-hidden">
                    <button
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-card transition-colors"
                      onClick={() => setExpandedQuestion(expandedQuestion === i ? null : i)}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          q.score >= 75 ? "bg-green-500/20 text-green-400" :
                          q.score >= 60 ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-red-500/20 text-red-400"
                        }`}>{q.score}</span>
                        <span className="text-sm font-medium line-clamp-1">{q.question}</span>
                      </div>
                      {expandedQuestion === i ? <ChevronUp className="w-4 h-4 flex-shrink-0 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 flex-shrink-0 text-muted-foreground" />}
                    </button>
                    {expandedQuestion === i && (
                      <div className="px-4 pb-4 space-y-3 border-t border-border pt-4">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">YOUR ANSWER</p>
                          <p className="text-sm bg-secondary/50 rounded-lg p-3">{answers[i] || "No answer given"}</p>
                        </div>
                        {q.whatWasWrong && (
                          <div>
                            <p className="text-xs font-medium text-red-400 mb-1">WHAT WAS WEAK</p>
                            <p className="text-sm text-red-300/80">{q.whatWasWrong}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-medium text-green-400 mb-1">IDEAL ANSWER</p>
                          <p className="text-sm text-green-300/80">{q.idealAnswer}</p>
                        </div>
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                          <p className="text-xs font-medium text-primary mb-1">DAD'S TIP</p>
                          <p className="text-sm">{q.tip}</p>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" /> Top 3 things to work on
              </h3>
              <div className="space-y-3">
                {debrief.top3ImprovementAreas.map((area, i) => (
                  <Card key={i} className="p-5 border border-border bg-card/50">
                    <div className="flex gap-3">
                      <span className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">{i + 1}</span>
                      <div>
                        <h4 className="font-semibold mb-1">{area.area}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{area.why}</p>
                        <p className="text-sm bg-secondary/50 rounded-lg p-2">{area.howToImprove}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
            <Card className="p-6 border border-primary/30 bg-primary/5">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" /> {debrief.cheatSheet.title}
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-primary uppercase tracking-wide mb-2">Key messages to land</p>
                  <ul className="space-y-1">
                    {debrief.cheatSheet.keyMessages.map((m, i) => (
                      <li key={i} className="text-sm flex gap-2"><Star className="w-3 h-3 text-primary mt-1 flex-shrink-0" />{m}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium text-primary uppercase tracking-wide mb-2">Questions to ask the interviewer</p>
                  <ul className="space-y-1">
                    {debrief.cheatSheet.questionsToAskInterviewer.map((q, i) => (
                      <li key={i} className="text-sm flex gap-2"><span className="text-primary">→</span>{q}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium text-primary uppercase tracking-wide mb-2">Last minute tips</p>
                  <ul className="space-y-1">
                    {debrief.cheatSheet.lastMinuteTips.map((t, i) => (
                      <li key={i} className="text-sm flex gap-2"><CheckCircle className="w-3 h-3 text-green-400 mt-1 flex-shrink-0" />{t}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
            <Card className="p-5 border border-border bg-card/50 text-center">
              <p className="text-muted-foreground italic">"{debrief.encouragement}"</p>
              <p className="text-sm text-primary mt-2 font-medium">— DAD</p>
            </Card>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleReset} className="flex-1 rounded-full gap-2">
                <RotateCcw className="w-4 h-4" /> Try Another Interview
              </Button>
              <Link href="/dashboard" className="flex-1">
                <Button className="w-full rounded-full">Back to Dashboard</Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
