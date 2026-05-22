"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  GraduationCap, 
  Heart, 
  MapPin, 
  Target, 
  ArrowRight, 
  ArrowLeft,
  Mic,
  Briefcase,
  TrendingUp,
  ExternalLink,
  Sparkles,
  Loader2,
  CheckCircle2
} from "lucide-react";

interface FresherResult {
  needsMoreDetail?: boolean;
  message?: string;
  sectionsNeedingDetail?: string[];
  careerRecommendation: {
    title: string;
    description: string;
    whyYou: string;
  };
  salaryRange: {
    current: {
      min: number;
      max: number;
      explanation: string;
    };
    twoYear: {
      min: number;
      max: number;
      explanation: string;
    };
  };
  courses: Array<{
    name: string;
    provider: string;
    url: string;
    duration: string;
    why: string;
  }>;
  encouragement: string;
}

interface FormData {
  // Section 1: Education and Skills
  education: string;
  strongestSubjects: string;
  technicalSkills: string;
  languages: string;
  // Section 2: Personality and Interests
  enjoyDoing: string;
  helpOthersWith: string;
  workPreference: string;
  // Section 3: Constraints
  workCountry: string;
  needIncomeImmediately: string;
  visaRestrictions: string;
  // Section 4: Goals
  successIn2Years: string;
  stoppedBefore: string;
  holdingBackNow: string;
}

const initialFormData: FormData = {
  education: "",
  strongestSubjects: "",
  technicalSkills: "",
  languages: "",
  enjoyDoing: "",
  helpOthersWith: "",
  workPreference: "",
  workCountry: "",
  needIncomeImmediately: "",
  visaRestrictions: "",
  successIn2Years: "",
  stoppedBefore: "",
  holdingBackNow: "",
};

const sections = [
  {
    id: 1,
    title: "Education & Skills",
    icon: GraduationCap,
    description: "Tell us about your background",
    fields: [
      { key: "education", label: "What did you study or what is your highest qualification?", placeholder: "e.g., BSc Computer Science, A-Levels in Maths and Physics, GCSE...", type: "input" },
      { key: "strongestSubjects", label: "What subjects were you strongest in?", placeholder: "e.g., Mathematics, English, Sciences, Art...", type: "input" },
      { key: "technicalSkills", label: "What technical skills do you have today?", placeholder: "e.g., Excel, coding, video editing, social media, none yet...", type: "input" },
      { key: "languages", label: "What languages do you speak?", placeholder: "e.g., English (native), Spanish (conversational), Hindi (fluent)...", type: "input" },
    ],
  },
  {
    id: 2,
    title: "Personality & Interests",
    icon: Heart,
    description: "Help us understand who you are",
    fields: [
      { key: "enjoyDoing", label: "What do you genuinely enjoy doing?", placeholder: "e.g., Solving puzzles, helping friends, creating content, building things...", type: "textarea" },
      { key: "helpOthersWith", label: "What do people usually come to you for help with?", placeholder: "e.g., Tech problems, advice, organizing things, explaining concepts...", type: "textarea" },
      { key: "workPreference", label: "How do you prefer to work?", placeholder: "e.g., Alone with headphones on, in a team, talking to people, behind the scenes...", type: "textarea" },
    ],
  },
  {
    id: 3,
    title: "Constraints",
    icon: MapPin,
    description: "What are your real-world limitations?",
    fields: [
      { key: "workCountry", label: "What country can you legally work in?", placeholder: "e.g., UK, USA, India, any EU country...", type: "input" },
      { key: "needIncomeImmediately", label: "Do you need income immediately or can you invest time in learning?", placeholder: "e.g., I need money now, I can study for 3 months, I have 1 year...", type: "input" },
      { key: "visaRestrictions", label: "Do you have any visa or work permit restrictions?", placeholder: "e.g., No restrictions, need sponsorship, student visa, work permit required...", type: "input" },
    ],
  },
  {
    id: 4,
    title: "Goals",
    icon: Target,
    description: "Where do you want to be?",
    fields: [
      { key: "successIn2Years", label: "What does success look like for you in 2 years?", placeholder: "e.g., Earning £40k, working remotely, running my own business, helping others...", type: "textarea" },
      { key: "stoppedBefore", label: "What has stopped you from getting started before?", placeholder: "e.g., Didn't know where to start, no guidance, fear of failure, lack of money...", type: "textarea" },
      { key: "holdingBackNow", label: "What is holding you back right now?", placeholder: "e.g., Confusion about which path to take, imposter syndrome, no connections...", type: "textarea" },
    ],
  },
];

export function FresherJourney() {
  const [mode, setMode] = useState<"choice" | "form" | "analyzing" | "results">("choice");
  const [currentSection, setCurrentSection] = useState(0);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [result, setResult] = useState<FresherResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const MIN_CHAR_LENGTH = 20;

  // Check if text contains meaningful content (not just repeated chars or random letters)
  const containsMeaningfulContent = (text: string): boolean => {
    const trimmed = text.trim();
    
    // Check minimum length
    if (trimmed.length < MIN_CHAR_LENGTH) return false;
    
    // Check for repeated characters (like "aaaaa" or "ccccc")
    const repeatedCharPattern = /(.)\1{4,}/;
    if (repeatedCharPattern.test(trimmed.toLowerCase())) return false;
    
    // Check for keyboard mashing patterns (like "asdfgh" or "qwerty")
    const keyboardPatterns = ['asdf', 'qwer', 'zxcv', 'hjkl', 'uiop', 'jkl;', 'fghj', 'sdfg', 'dfgh'];
    if (keyboardPatterns.some(pattern => trimmed.toLowerCase().includes(pattern))) return false;
    
    // Check for random consonant clusters (no vowels in long stretches)
    const noVowelStretch = /[^aeiouAEIOU\s]{7,}/;
    if (noVowelStretch.test(trimmed)) return false;
    
    // Check that it contains at least 3 real words (3+ letters separated by spaces)
    const words = trimmed.split(/\s+/).filter(word => word.length >= 3);
    if (words.length < 3) return false;
    
    // Check for all same character
    const uniqueChars = new Set(trimmed.toLowerCase().replace(/\s/g, ''));
    if (uniqueChars.size < 5) return false;
    
    return true;
  };

  const getValidationMessage = (value: string): string | null => {
    const trimmed = value.trim();
    
    if (trimmed.length === 0) return null;
    
    if (trimmed.length < MIN_CHAR_LENGTH) {
      return `${MIN_CHAR_LENGTH - trimmed.length} more characters needed`;
    }
    
    const repeatedCharPattern = /(.)\1{4,}/;
    if (repeatedCharPattern.test(trimmed.toLowerCase())) {
      return "Your answers need to be genuine for DAD to guide you properly";
    }
    
    const keyboardPatterns = ['asdf', 'qwer', 'zxcv', 'hjkl', 'uiop', 'jkl;', 'fghj', 'sdfg', 'dfgh'];
    if (keyboardPatterns.some(pattern => trimmed.toLowerCase().includes(pattern))) {
      return "Your answers need to be genuine for DAD to guide you properly";
    }
    
    const noVowelStretch = /[^aeiouAEIOU\s]{7,}/;
    if (noVowelStretch.test(trimmed)) {
      return "Your answers need to be genuine for DAD to guide you properly";
    }
    
    const words = trimmed.split(/\s+/).filter(word => word.length >= 3);
    if (words.length < 3) {
      return "Please use complete sentences with real words";
    }
    
    const uniqueChars = new Set(trimmed.toLowerCase().replace(/\s/g, ''));
    if (uniqueChars.size < 5) {
      return "Your answers need to be genuine for DAD to guide you properly";
    }
    
    return null;
  };

  const handleInputChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setValidationError(null);
  };

  const isFieldValid = (value: string) => containsMeaningfulContent(value);

  const isFieldInvalid = (value: string) => {
    const trimmed = value.trim();
    return trimmed.length > 0 && !containsMeaningfulContent(value);
  };

  const isSectionComplete = (sectionIndex: number) => {
    const section = sections[sectionIndex];
    return section.fields.every((field) => isFieldValid(formData[field.key as keyof FormData]));
  };

  const isCurrentSectionComplete = () => isSectionComplete(currentSection);

  const getInvalidFieldsInSection = (sectionIndex: number) => {
    const section = sections[sectionIndex];
    return section.fields.filter((field) => !isFieldValid(formData[field.key as keyof FormData]));
  };

  const handleNext = () => {
    const invalidFields = getInvalidFieldsInSection(currentSection);
    if (invalidFields.length > 0) {
      setValidationError("Your answers need to be genuine for DAD to guide you properly. Please provide real, meaningful responses.");
      return;
    }
    
    if (currentSection < sections.length - 1) {
      setCurrentSection((prev) => prev + 1);
      setValidationError(null);
    } else {
      analyzeProfile();
    }
  };

  const handleBack = () => {
    if (currentSection > 0) {
      setCurrentSection((prev) => prev - 1);
    }
  };

  const analyzeProfile = async () => {
    setMode("analyzing");
    setError(null);

    try {
      const response = await fetch("/api/analyze-fresher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze profile");
      }

      setResult(data.analysis);
      
      // Check if Claude asked for more details
      if (data.analysis.needsMoreDetail) {
        setError(data.analysis.message || "Please provide more detailed answers so DAD can guide you properly.");
        setMode("form");
        return;
      }
      
      setMode("results");

      // Save to Supabase
      try {
        await fetch("/api/save-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            education: formData.education,
            skill_path: data.analysis.careerRecommendation?.title,
            journey_type: "fresher_assessment",
            analysis_result: data.analysis,
          }),
        });
      } catch (saveErr) {
        console.error("Failed to save fresher data:", saveErr);
      }
    } catch (err) {
      console.error("Fresher analysis error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setMode("form");
    }
  };

  const startOver = () => {
    setMode("choice");
    setCurrentSection(0);
    setFormData(initialFormData);
    setResult(null);
    setError(null);
    setValidationError(null);
  };

  const scrollToVoice = () => {
    const voiceSection = document.getElementById("voice-section");
    if (voiceSection) {
      voiceSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Choice screen
  if (mode === "choice") {
    return (
      <section id="fresher-section" className="py-24 px-4 bg-card/30">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
            <GraduationCap className="w-4 h-4" />
            <span className="text-sm font-medium">No resume? No problem.</span>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">
            Just starting out? DAD&apos;s got you.
          </h2>
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
            You don&apos;t need experience to have a future. Tell DAD about yourself, 
            and he&apos;ll show you exactly where to start.
          </p>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <Card 
              className="p-8 cursor-pointer transition-all hover:border-primary/50 hover:bg-card/80 group"
              onClick={scrollToVoice}
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <Mic className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Talk to DAD</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Have a real conversation. DAD will ask the right questions and guide you step by step.
              </p>
              <span className="text-primary text-sm font-medium">Best for: Those who prefer speaking</span>
            </Card>

            <Card 
              className="p-8 cursor-pointer transition-all hover:border-primary/50 hover:bg-card/80 group"
              onClick={() => setMode("form")}
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Complete Assessment</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Answer detailed questions about your education, interests, constraints, and goals.
              </p>
              <span className="text-primary text-sm font-medium">Best for: Those who prefer typing</span>
            </Card>
          </div>
        </div>
      </section>
    );
  }

  // Form screen
  if (mode === "form") {
    const section = sections[currentSection];
    const Icon = section.icon;

    return (
      <section id="fresher-section" className="py-24 px-4 bg-card/30">
        <div className="max-w-3xl mx-auto">
          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-muted-foreground">
                Section {currentSection + 1} of {sections.length}
              </span>
              <button 
                onClick={startOver}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Start over
              </button>
            </div>
            
            {/* Section tabs */}
            <div className="flex gap-2 mb-6">
              {sections.map((s, index) => {
                const SectionIcon = s.icon;
                const isComplete = isSectionComplete(index);
                const isCurrent = index === currentSection;
                
                return (
                  <button
                    key={s.id}
                    onClick={() => setCurrentSection(index)}
                    className={`flex-1 p-3 rounded-lg border transition-all ${
                      isCurrent 
                        ? "border-primary bg-primary/10" 
                        : isComplete 
                          ? "border-green-500/50 bg-green-500/10"
                          : "border-border bg-card/50 hover:bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {isComplete && !isCurrent ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <SectionIcon className={`w-4 h-4 ${isCurrent ? "text-primary" : "text-muted-foreground"}`} />
                      )}
                      <span className={`text-xs font-medium hidden sm:inline ${
                        isCurrent ? "text-primary" : isComplete ? "text-green-500" : "text-muted-foreground"
                      }`}>
                        {s.title}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          {validationError && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-600 dark:text-amber-400 text-sm">
              {validationError}
            </div>
          )}

          <Card className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">{section.title}</h3>
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </div>
            </div>

            <div className="space-y-6">
              {section.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium mb-2">
                    {field.label}
                  </label>
{field.type === "textarea" ? (
                                    <Textarea
                                      value={formData[field.key as keyof FormData]}
                                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                                      placeholder={field.placeholder}
                                      className={`min-h-24 ${
                                        isFieldInvalid(formData[field.key as keyof FormData])
                                          ? "border-amber-500/50" 
                                          : ""
                                      }`}
                                    />
                                  ) : (
                                    <Input
                                      value={formData[field.key as keyof FormData]}
                                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                                      placeholder={field.placeholder}
                                      className={`${
                                        isFieldInvalid(formData[field.key as keyof FormData])
                                          ? "border-amber-500/50" 
                                          : ""
                                      }`}
                                    />
                                  )}
                                  {getValidationMessage(formData[field.key as keyof FormData]) && (
                                    <p className="text-xs text-amber-500 mt-1">
                                      {getValidationMessage(formData[field.key as keyof FormData])}
                                    </p>
                                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-4 mt-8">
              {currentSection > 0 && (
                <Button variant="outline" onClick={handleBack} className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              )}
              <Button 
                onClick={handleNext} 
                disabled={!isCurrentSectionComplete()}
                className="gap-2 flex-1"
              >
                {currentSection < sections.length - 1 ? (
                  <>
                    Next Section
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Get My Career Path
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </section>
    );
  }

  // Analyzing screen
  if (mode === "analyzing") {
    return (
      <section id="fresher-section" className="py-24 px-4 bg-card/30">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
          <h3 className="text-xl font-semibold mb-2">DAD is thinking about your future...</h3>
          <p className="text-muted-foreground">
            Analyzing everything you shared to find the perfect career path for you.
          </p>
        </div>
      </section>
    );
  }

  // Results screen
  if (mode === "results" && result) {
    return (
      <section id="fresher-section" className="py-24 px-4 bg-card/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-500 mb-4">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">Analysis Complete</span>
            </div>
            <h2 className="text-3xl font-bold mb-4">Your Career Path</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {result.encouragement}
            </p>
          </div>

          {/* Career Recommendation */}
          <Card className="p-8 mb-6 border-primary/30 bg-primary/5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Target className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-sm text-primary font-medium mb-1">Your Recommended Career</p>
                <h3 className="text-2xl font-bold mb-3">{result.careerRecommendation.title}</h3>
                <p className="text-foreground mb-3">{result.careerRecommendation.description}</p>
                <p className="text-muted-foreground text-sm">{result.careerRecommendation.whyYou}</p>
              </div>
            </div>
          </Card>

          {/* Salary Ranges */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current UK Salary</p>
                  <p className="text-2xl font-bold">
                    £{result.salaryRange.current.min.toLocaleString()} - £{result.salaryRange.current.max.toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{result.salaryRange.current.explanation}</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">In 2 Years</p>
                  <p className="text-2xl font-bold">
                    £{result.salaryRange.twoYear.min.toLocaleString()} - £{result.salaryRange.twoYear.max.toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{result.salaryRange.twoYear.explanation}</p>
            </Card>
          </div>

          {/* Free Courses */}
          <Card className="p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              Top 3 Free Courses to Get Started
            </h3>
            <div className="space-y-4">
              {result.courses.map((course, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-medium">{course.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {course.provider} • {course.duration}
                        </p>
                      </div>
                      <a
                        href={course.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary text-sm hover:underline flex-shrink-0"
                      >
                        Start Free
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{course.why}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Start Over */}
          <div className="text-center">
            <Button variant="outline" onClick={startOver} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Take Assessment Again
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return null;
}
