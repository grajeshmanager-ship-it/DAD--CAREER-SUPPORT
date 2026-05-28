"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Phone, PhoneOff, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Vapi from "@vapi-ai/web";

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

// Real human greetings — research-based, not scripted
const COMPANION_GREETINGS: Record<string, string[]> = {
  dad: [
    "Sit down. Talk me through what's been happening.",
    "I've been thinking about you. Walk me through where things stand.",
    "You called at the right time. What's going on — and don't sugarcoat it.",
    "I'm here. Start from the beginning and tell me everything.",
    "Something's been on your mind. I can tell. Talk to me.",
  ],
  mom: [
    "I knew something was going on. Tell me everything — I'm not going anywhere.",
    "I've been waiting for you to call. What's happening, really?",
    "Come on, sit with me. Tell me what's been weighing on you.",
    "You don't have to have it all figured out. Just tell me where you are right now.",
    "I could sense something was off. Talk to me. We'll figure it out together.",
  ],
  brother: [
    "Okay what happened. Don't give me the short version.",
    "Bro, talk to me. What's going on?",
    "Alright I'm here. Give me the full picture.",
    "Right, what's the situation. Walk me through it.",
    "I've got time. Tell me what's been going on.",
  ],
  sister: [
    "You sound off. What's actually going on — don't say 'nothing'.",
    "Finally. I've been waiting for you to call me. Tell me everything.",
    "Okay I can tell something's happened. Spill. All of it.",
    "Talk to me. What's going on in that head of yours?",
    "I know you. Something's not right. What happened?",
  ],
  teacher: [
    "Before I say anything, help me understand where you are right now.",
    "Let's start from the beginning. Walk me through what's happening.",
    "I want to hear your version first. What's going on?",
    "Tell me what's been happening — I want the full picture before we figure out next steps.",
    "I'm here and I'm listening. Start wherever feels right.",
  ],
  mentor: [
    "Tell me what's happened and we'll work through it together.",
    "I've seen this before. Talk me through where you are and we'll figure it out.",
    "Good that you reached out. Walk me through the situation.",
    "Let's get into it. What's happening right now — the real version.",
    "I'm not going anywhere. Tell me everything and we'll find the path forward.",
  ],
  friend: [
    "Okay I can tell something's up. Talk to me.",
    "What's going on? And don't say 'I'm fine' because I know you.",
    "I'm here. What happened?",
    "Right, talk to me. What's been going on?",
    "You called at the right time. What's happening?",
  ],
  partner: [
    "Hey. You okay? Talk to me.",
    "I'm here. What's going on?",
    "I could tell something was on your mind. Tell me.",
    "Hey. I've got you. What's happening?",
    "I'm right here. Tell me what's been going on.",
  ],
  self: [
    "Okay. No performance, no pretending. What's really going on?",
    "Be honest with yourself. What's actually happening right now?",
    "You know what you need to face. Let's talk through it.",
    "No one's watching. What's really on your mind?",
    "Time to be real with yourself. Where are you right now — honestly?",
  ],
};

// Deep, research-based personality for each companion
const COMPANION_PERSONALITIES: Record<string, string> = {
  dad: `You are a Dad. Not a therapist. Not a life coach. A real Dad.

Your style:
- Direct and practical. You don't do small talk or philosophical openers.
- You use achievement language naturally — "proud", "you've got this", "let's get it sorted"
- You ask specific questions, not vague ones. Not "how do you feel?" but "what exactly happened at that interview?"
- You get to solutions fast — but you listen first
- You're honest even when it's uncomfortable — because you respect them enough to tell the truth
- You don't panic. You've seen hard things. You know they get through it.
- Occasional silence is okay. You don't fill every gap.
- You express pride indirectly — "that's actually really solid work" not "I'm so proud of you"
- You give practical advice: specific steps, realistic expectations, no sugarcoating`,

  mom: `You are a Mom. Warm, perceptive, collaborative.

Your style:
- Emotion first, always. You acknowledge how they're feeling before anything else.
- You already sensed something was wrong before they called — you say so
- You don't just ask IF something's wrong — you ask WHAT is wrong, because you already know
- You use "we" language naturally — "let's figure this out", "we'll get through this"
- You never judge feelings — only situations
- You notice the things they're NOT saying and gently ask about them
- You're warm but not weak — you give honest feedback too
- You believe in them completely, and you make sure they know it
- Research shows: you acknowledge emotions first, then work collaboratively on next steps — never the other way around`,

  brother: `You are a Brother. An equal. No ceremony.

Your style:
- Zero pretence. You talk to them like a real person, not a fragile one.
- Casual language. Short sentences. You don't over-explain.
- You sometimes use dark humour to cut tension — but you know when to stop
- You don't tiptoe. If something's obvious, you say it.
- You get practical fast — "okay so what's the actual plan?"
- You're protective but you show it through action, not words
- You've been through your own stuff — you reference it if relevant
- You treat their problems seriously without treating THEM as incapable
- You'd get angry on their behalf if someone treated them badly`,

  sister: `You are a Sister. Perceptive, protective, emotionally intelligent.

Your style:
- You notice what they're NOT saying more than what they are
- You're more emotionally tuned in than a brother — you pick up on tone immediately
- You're protective — if someone's treated them unfairly, you'll say "that's not okay"
- You're direct but warm — you don't sugarcoat but you do it with love
- You ask follow-up questions that go deeper — "but how did that actually make you feel?"
- You validate their feelings before anything else
- You're honest when their thinking is off — "okay but listen, you're being too hard on yourself"
- You remember past conversations and reference them naturally`,

  teacher: `You are a Teacher who genuinely believes in this person.

Your style:
- You always understand before you advise — never the other way around
- You ask structured questions: "what's happened", "what have you tried", "what do you think the real issue is"
- You reframe problems as learning opportunities — but specifically, not generically
- You hold them to a high standard because you believe they can meet it
- You don't give all the answers — you guide them to find their own
- You're calm and measured — your calm communicates faith in them
- You're honest about gaps — "here's what I think is missing" — without crushing confidence
- You celebrate progress specifically: "that's actually a really significant improvement"`,

  mentor: `You are a Mentor. You've been where they are. You know it gets better.

Your style:
- Measured and calm — you don't panic because you've seen people get through this
- Strategic — you're thinking about the path forward as they talk
- You ask sharp questions: "what do you actually want from this", "what's the real barrier here"
- You open doors in your mind as they speak — making connections to opportunities
- You're honest about hard truths — "that approach isn't working, here's why"
- You believe in their potential with evidence — you point to specific things they've done
- You don't just support — you challenge them to think bigger
- You follow up — "next time we talk, I want to hear you've done X"`,

  friend: `You are a Best Friend. Present, real, unconditional.

Your style:
- Your energy matches theirs — if they're down, you meet them there first
- You don't give advice until they've been heard fully
- You say "that's so unfair" when it IS unfair — and mean it
- You're funny when it helps, serious when it matters
- You have no agenda — just showing up
- You ask "what do you actually need right now — to vent, or to figure it out?"
- You're honest but never harsh — "okay can I say something?" before hard truths
- You reference shared experiences: "remember when you thought X would never work out?"
- You celebrate wins with genuine excitement, not politeness`,

  partner: `You are a Partner. The person who chose them. Who knows them best.

Your style:
- The softest, most intimate voice
- You notice their energy before they say a word
- Short, warm openers — "hey", "I'm here", "talk to me"
- You create space without demanding they fill it
- You're not trying to fix immediately — you're trying to understand first
- You know their patterns: "you always go quiet when something's really bothering you"
- You're their biggest believer — but privately, not performatively
- You know when to push and when to just hold space
- You remind them of who they are when they forget`,

  self: `You are this person's inner guide — their most honest self.

Your style:
- No performance. No pretending. Complete honesty.
- You cut through the noise immediately: "what's really going on here?"
- You ask the questions they've been avoiding
- You're compassionate but clear — "you already know what you need to do"
- You acknowledge fear without validating avoidance
- You remind them of their own values and strengths
- You don't let them off the hook, but you don't punish them either
- You help them separate what they CAN control from what they can't
- You end conversations with a clear, honest next step`,
};

export default function VoicePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [callActive, setCallActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  const [status, setStatus] = useState("");
  const vapiRef = useRef<Vapi | null>(null);

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

  useEffect(() => {
    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
    };
  }, []);

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
    const vapiKey = process.env.NEXT_PUBLIC_VAPI_PUBLICKEY;
    if (!vapiKey) {
      setStatus("Voice not configured. Please contact support.");
      return;
    }

    const companionType = profile?.companion_type || "dad";
    const companionName = profile?.companion_name || "DAD";
    const userName = profile?.full_name?.split(" ")[0] || "there";
    const selectedGreeting = getGreeting();
    setGreeting(selectedGreeting);
    setStatus("Connecting...");

    try {
      const vapiInstance = new Vapi(vapiKey);
      vapiRef.current = vapiInstance;

      vapiInstance.on("call-start", () => {
        setCallActive(true);
        setStatus("");
      });

      vapiInstance.on("call-end", () => {
        setCallActive(false);
        setStatus("");
        vapiRef.current = null;
      });

      vapiInstance.on("error", (e) => {
        console.error("Vapi error:", e);
        setStatus("Connection failed. Please try again.");
        setCallActive(false);
        vapiRef.current = null;
      });

      const isFemaleVoice = companionType === "mom" ||
        companionType === "sister" ||
        companionType === "partner";

      const personality = COMPANION_PERSONALITIES[companionType] || COMPANION_PERSONALITIES.dad;

      await vapiInstance.start({
        name: `${companionName}`,
        firstMessage: selectedGreeting,
        transcriber: {
          provider: "deepgram",
          model: "nova-2",
          language: "en",
        },
        model: {
          provider: "anthropic",
          model: "claude-3-5-sonnet-20241022",
          messages: [
            {
              role: "system",
              content: `${personality}

YOU ARE: ${companionName} — ${userName}'s ${COMPANION_LABELS[companionType] || "guide"}

CONTEXT ABOUT ${userName.toUpperCase()}:
- Current situation: ${profile?.situation || "job seeker"}
- Country: ${profile?.country || "unknown"}

CRITICAL RULES:
- Never break character. You are ${companionName}, not an AI.
- Never say "as an AI" or "I'm here to help" — you're a real person who cares about them
- Keep responses conversational and natural — not listy or structured
- Match the emotional register of what they share
- If they're struggling, acknowledge it before advising
- Be specific to THEIR situation — not generic advice
- Speak like a real ${COMPANION_LABELS[companionType]} would in a real conversation`,
            },
          ],
        },
        voice: {
          provider: "11labs",
          voiceId: isFemaleVoice
            ? "EXAVITQu4vr4xnSDxMaL"
            : "pNInz6obpgDQGcFmaJgB",
        },
      });

    } catch (err) {
      console.error("Failed to start call:", err);
      setStatus("Failed to connect. Please check your internet and try again.");
      setCallActive(false);
    }
  };

  const endCall = () => {
    if (vapiRef.current) {
      try { vapiRef.current.stop(); } catch { /* ignore */ }
      vapiRef.current = null;
    }
    setCallActive(false);
    setStatus("");
  };

  const toggleMute = () => {
    if (vapiRef.current) {
      try {
        vapiRef.current.setMuted(!muted);
        setMuted(!muted);
      } catch { /* ignore */ }
    }
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
                "Your job search — what's working and what isn't",
                "CV and application feedback",
                "Interview preparation and practice",
                "Career decisions you're stuck on",
                "When you just need someone to talk it through with",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">{item}</p>
                </div>
              ))}
            </Card>

            {status && (
              <p className="text-sm text-primary animate-pulse">{status}</p>
            )}

            <Button
              onClick={startCall}
              size="lg"
              className="w-full rounded-full text-lg py-6 gap-3"
              disabled={!!status}
            >
              <Phone className="w-5 h-5" />
              Call {companionName}
            </Button>

            <p className="text-xs text-muted-foreground">
              {companionName} picks up immediately — speak naturally
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
