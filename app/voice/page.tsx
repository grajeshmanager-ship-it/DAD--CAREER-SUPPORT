"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Phone, PhoneOff, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  full_name: string;
  situation: string;
  country: string;
  companion_type: string;
  companion_name: string;
}

const COMPANION_LABELS: Record<string, string> = {
  dad: "Dad", mom: "Mom", brother: "Brother", sister: "Sister",
  teacher: "Teacher", mentor: "Mentor", friend: "Friend",
  partner: "Partner", self: "Yourself",
};

const COMPANION_EMOJIS: Record<string, string> = {
  dad: "👨", mom: "👩", brother: "👦", sister: "👧",
  teacher: "🧑‍🏫", mentor: "🧭", friend: "🤝",
  partner: "💑", self: "⭐",
};

const COMPANION_GREETINGS: Record<string, string[]> = {
  dad: [
    "Hey, I'm glad you called. Tell me what's going on with the job search.",
    "Come on, sit down. What's been happening? Walk me through it.",
    "I've been thinking about you. How's everything going?",
  ],
  mom: [
    "Oh sweetheart, I'm so glad you called. How are you really doing?",
    "Tell me everything. Don't leave anything out.",
    "I've been waiting to hear from you. What's on your mind?",
  ],
  brother: [
    "Hey! What's up? What do you need?",
    "Yo, talk to me. What's going on?",
    "Alright, I'm here. What's the situation?",
  ],
  sister: [
    "Hey you! Finally! Tell me what's happening.",
    "Okay I'm all ears. What's going on with you?",
    "I was wondering when you'd call. What's up?",
  ],
  teacher: [
    "Good to hear from you. What are you working through?",
    "Let's talk. What challenges are you facing right now?",
    "I'm here. Walk me through where you are.",
  ],
  mentor: [
    "Good timing. What do you need to work through?",
    "Let's get into it. What's the situation?",
    "I've got time. Tell me what's going on.",
  ],
  friend: [
    "Hey! What's happening? Talk to me.",
    "Okay okay, I'm here. What's going on?",
    "Perfect timing. I was thinking about you. What's up?",
  ],
  partner: [
    "Hey you. I'm here. What's on your mind?",
    "Tell me everything. I'm listening.",
    "I've got you. What's going on?",
  ],
  self: [
    "You've got this. Let's think through it together.",
    "Okay, let's be honest with ourselves. What's really going on?",
    "Time to check in. What do you need right now?",
  ],
};

export default function VoicePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [callActive, setCallActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [vapi, setVapi] = useState<any>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data);
    };
    loadProfile();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callActive) {
      interval = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callActive]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const getGreeting = () => {
    const type = profile?.companion_type || "dad";
    const greetings = COMPANION_GREETINGS[type] || COMPANION_GREETINGS.dad;
    return greetings[Math.floor(Math.random() * greetings.length)];
  };

  const startCall = async () => {
    const companionType = profile?.companion_type || "dad";
    const companionName = profile?.companion_name || "DAD";
    const userName = profile?.full_name?.split(" ")[0] || "there";
    const selectedGreeting = getGreeting();
    setGreeting(selectedGreeting);

    const vapiKey = process.env.NEXT_PUBLIC_VAPI_KEY;

    if (!vapiKey) {
      setCallActive(true);
      return;
    }

    try {
      // Use dynamic import to avoid SSR issues and CDN problems
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const VapiModule = await import("@vapi-ai/web" as any);
      const VapiClass = VapiModule.default || VapiModule.Vapi || VapiModule;
      const vapiInstance = new VapiClass(vapiKey);

      vapiInstance.on("call-start", () => setCallActive(true));
      vapiInstance.on("call-end", () => {
        setCallActive(false);
        setVapi(null);
      });
      vapiInstance.on("error", (e: unknown) => {
        console.error("Vapi error:", e);
        setCallActive(false);
      });

      const systemPrompt = `You are ${companionName}, acting as ${userName}'s ${COMPANION_LABELS[companionType] || "guide"} in their career journey.

Your personality: warm, honest, genuinely caring, direct when needed. You remember this person and care about their success.

Context about ${userName}:
- Situation: ${profile?.situation || "job seeker"}
- Country: ${profile?.country || "unknown"}

Your role:
- Give real, honest career advice — not generic platitudes
- Ask questions to understand their specific situation
- Be encouraging but truthful
- Help with: CV advice, interview prep, job search strategy, career decisions, emotional support
- Speak naturally, like a real ${COMPANION_LABELS[companionType]} would

Start with: "${selectedGreeting}"`;

      const isFemaleVoice = companionType === "mom" ||
        companionType === "sister" ||
        companionType === "partner";

      await vapiInstance.start({
        model: {
          provider: "anthropic",
          model: "claude-3-5-sonnet-20241022",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
          ],
        },
        voice: {
          provider: "11labs",
          voiceId: isFemaleVoice
            ? "EXAVITQu4vr4xnSDxMaL"
            : "pNInz6obpgDQGcFmaJgB",
        },
        firstMessage: selectedGreeting,
      });

      setVapi(vapiInstance);
    } catch (err) {
      console.error("Failed to start Vapi call:", err);
      // Still show active UI so user knows something happened
      setCallActive(true);
    }
  };

  const endCall = () => {
    if (vapi) {
      try { vapi.stop(); } catch { /* ignore */ }
    }
    setCallActive(false);
    setVapi(null);
  };

  const toggleMute = () => {
    if (vapi) {
      try { vapi.setMuted(!muted); } catch { /* ignore */ }
    }
    setMuted(!muted);
  };

  const companionType = profile?.companion_type || "dad";
  const companionName = profile?.companion_name || "DAD";
  const companionLabel = COMPANION_LABELS[companionType] || "Guide";

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container px-4 md:px-6 max-w-4xl mx-auto flex items-center justify-between h-16">
          <Link href="/dashboard" className="text-2xl font-bold text-primary">DAD</Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mic className="w-4 h-4" />
            <span>Talk to {companionName}</span>
          </div>
        </div>
      </nav>

      <main className="container px-4 md:px-6 max-w-md mx-auto py-16">
        {!callActive ? (
          <div className="text-center space-y-8">
            <div className="relative inline-block">
              <div className="w-32 h-32 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mx-auto text-6xl">
                {COMPANION_EMOJIS[companionType]}
              </div>
              <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-green-400 border-2 border-background" />
            </div>

            <div>
              <h1 className="text-3xl font-bold mb-2">{companionName}</h1>
              <p className="text-muted-foreground">Your {companionLabel} · Ready to talk</p>
            </div>

            <Card className="p-6 border border-border bg-card/50 text-left space-y-3">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                What you can talk about
              </p>
              {[
                "Your job search strategy",
                "CV and application feedback",
                "Interview preparation",
                "Career decisions and direction",
                "When you just need to talk it through",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">{item}</p>
                </div>
              ))}
            </Card>

            <Button
              onClick={startCall}
              size="lg"
              className="w-full rounded-full text-lg py-6 gap-3"
            >
              <Phone className="w-5 h-5" />
              Call {companionName}
            </Button>

            <p className="text-xs text-muted-foreground">
              {companionName} will answer immediately and remember your context
            </p>
          </div>
        ) : (
          <div className="text-center space-y-8">
            <div className="relative inline-block">
              <div className="w-36 h-36 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center mx-auto text-6xl animate-pulse">
                {COMPANION_EMOJIS[companionType]}
              </div>
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="absolute inset-0 rounded-full border border-primary/20 animate-ping"
                  style={{ animationDelay: `${i * 0.3}s`, animationDuration: "2s" }}
                />
              ))}
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-1">{companionName}</h2>
              <p className="text-primary text-sm font-medium">
                ● On call · {formatDuration(callDuration)}
              </p>
            </div>

            {greeting && (
              <Card className="p-5 border border-primary/20 bg-primary/5">
                <p className="text-sm italic text-muted-foreground">"{greeting}"</p>
                <p className="text-xs text-primary mt-2">— {companionName}</p>
              </Card>
            )}

            <div className="flex gap-4 justify-center">
              <Button
                variant="outline"
                size="lg"
                onClick={toggleMute}
                className={`rounded-full w-16 h-16 p-0 ${muted ? "border-red-500 text-red-500" : ""}`}
              >
                {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </Button>
              <Button
                size="lg"
                onClick={endCall}
                className="rounded-full w-16 h-16 p-0 bg-red-500 hover:bg-red-600"
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              {muted ? "You are muted" : `Speak naturally — ${companionName} is listening`}
            </p>
          </div>
        )}

        <div className="mt-12 text-center">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
