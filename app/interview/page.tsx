"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRight, ArrowLeft, Loader2, Mic, MicOff,
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
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  const startVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      setError("Voice input not supported in this browser. Please type your answer.");
      return;
    }
    const SpeechRecognitionAPI =
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;
    const rec = new SpeechRecognitionAPI();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-GB";
    rec.onre
