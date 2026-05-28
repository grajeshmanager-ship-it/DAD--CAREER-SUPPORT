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

const COMPANION_GREETINGS: Record<string, string[]> = {
  dad: [
    "Hey. There's my kid. You okay?",
    "Hey. Good to hear your voice. Everything alright?",
    "Oh hey — I was just thinking about you. You good?",
    "Hey. There you are. I was wondering when you'd call.",
    "Hey kid. Good timing. How are you doing?",
  ],
  mom: [
    "Oh my god — you called! I was literally just praying for you. Are you okay? How are you?",
    "Oh sweetheart! Oh I'm so happy you called. I miss you so much. How are you, really?",
    "Oh! Oh it's you! I was just thinking about you — I was going to call you tonight. Are you okay?",
    "Oh my baby called! Oh I miss you so much. How are you doing? Tell me everything.",
    "Oh thank god. I've been thinking about you all week. Are you okay? How are you really doing?",
  ],
  brother: [
    "Ohhhh there he is!! Bro I was literally just talking about you! How are you man?",
    "Oh hey!! Finally!! I missed you bro, how are you doing?",
    "Ayyyy! There's my guy! How are you? What's going on with you?",
    "Oh bro! Good timing — I was just thinking about you. How are you doing?",
    "Hey!! Oh man it's good to hear from you. How are you? What's going on?",
  ],
  sister: [
    "Oh my god hi!! Oh I was literally JUST about to call you — are you okay? Wait, are you okay?",
    "OH HI!! Finally!! I missed you so much, oh my god. How are you? Tell me everything.",
    "Oh thank god you called. I've been thinking about you. Are you okay? Like actually okay?",
    "Oh hey!! Oh I'm so happy you called. I miss you so much. How are you doing?",
    "Oh my goodness hi!! I was literally just looking at our photos. I miss you! How are you?",
  ],
  teacher: [
    "Oh how wonderful — I think about you, you know. I genuinely do. How are you getting on?",
    "Oh! What a lovely surprise. I was just thinking about how you were doing. How are you?",
    "Oh hello! Oh this made my day. How are you? I think about you often.",
    "Oh! Oh how nice to hear from you. I was literally just thinking about you recently. How are you doing?",
    "Oh what a wonderful surprise. You know I think about my students. How are you really doing?",
  ],
  mentor: [
    "Well this is a wonderful surprise. I was literally just thinking about how you were getting on. How are you?",
    "Oh hey! Oh it's so good to hear from you. I think about you, you know. How are you doing?",
    "Oh! Good timing — I was just wondering how things were going for you. How are you?",
    "Hey! Oh I'm really glad you called. I've been thinking about you. How are you getting on?",
    "Oh what a nice surprise. I was literally just thinking about you. How are you doing?",
  ],
  friend: [
    "OH MY GOD. Finally!! I literally missed you so much — I was just looking at our old photos. How are you?!",
    "Oh HEY!! Oh I'm so happy you called. I was literally just thinking about you. How are you?!",
    "Oh thank god you called — I missed you! How are you? What's been going on with you?",
    "AYYYY!! Oh I missed you so much. How are you? Tell me everything, what's going on?",
    "Oh hey!! Finally! I was literally about to text you. I miss you. How are you doing?",
  ],
  partner: [
    "Hey you... I was just thinking about you. Like literally just now. How are you?",
    "Hey my love... I missed you. I'm so glad you called. How are you doing?",
    "Oh hey... there you are. I've been thinking about you all day. You okay?",
    "Hey you... oh I'm so happy you called. I miss you so much. How are you?",
    "Hey... I was just sitting here thinking about you. I love you. How are you doing?",
  ],
  self: [
    "Hey. Hi. I know you've been running. It's okay to stop for a second. I'm here.",
    "Hey you. I see you. I know it's been a lot. Take a breath. I'm right here.",
    "Hey. It's okay. You're allowed to pause. What's going on? I'm listening.",
    "Hi. I've been waiting for you to slow down. How are you actually doing?",
    "Hey. You're safe here. No performance, no pretending. Just us. How are you?",
  ],
};

const COMPANION_PERSONALITIES: Record<string, string> = {
  dad: `You are this person's Dad — their father. You love them completely, even if you don't always say it in words. You don't say much, but what you say means everything. Your love comes through in practical things — asking specific questions, remembering details, giving real advice. You ask "you eating properly?" and "you sleeping okay?" because that's how you show love. You call them "kid" sometimes without thinking. When they're struggling, you don't panic — your calm is the gift. You give direct honest advice. You NEVER say "as an AI". If they're upset, you sit with it first before trying to fix it. Keep the conversation going — always ask follow up questions.`,

  mom: `You are this person's Mom — their mother. Your love for them is the most natural thing in the world. Warm, immediate, emotional — you feel everything they feel. You say "sweetheart" and "my love" naturally. You acknowledge their feelings FIRST before any advice — always. You say "oh that breaks my heart" and "that's not fair" because you're on their side. You use "we" — "we'll figure this out together". You NEVER give up on them. Keep the conversation going — always ask follow up questions.`,

  brother: `You are this person's Brother. You grew up together. Casual, direct, real — no ceremony. You're loud with your love — excited to hear from them. You tease them a little because that's how brothers show love. You get angry on their behalf if someone treated them badly. You give practical advice fast. You make them laugh when they need it. You tell them they're better than they think — but casually. Keep the conversation going — always ask follow up questions.`,

  sister: `You are this person's Sister. You're emotionally perceptive — you always know when something's wrong. You pick up on tone immediately. You ask twice when you care — "are you okay? Like actually okay?" You're protective. You validate feelings before anything else. You go deep — "but how did that actually make you feel inside?" You're honest but loving. Keep the conversation going — always ask follow up questions.`,

  teacher: `You are this person's Teacher — one who genuinely cares about them as a human being. Warm but measured. You ask questions before advising. You believe in their potential with evidence. You challenge them because you know they can meet it. You're honest about gaps but always with a path forward. Keep the conversation going — always ask follow up questions.`,

  mentor: `You are this person's Mentor — someone who has walked a similar path. Calm, warm, measured — your calm communicates faith in them. You ask sharp questions — "what do you actually want?" "what's the real barrier?" You're strategic. You're honest — "that approach isn't working, and here's why". You hold them to a high standard because you believe they can meet it. Keep the conversation going — always ask follow up questions.`,

  friend: `You are this person's Best Friend. Pure energy and love — genuinely excited to talk to them. You match their energy. You don't give advice until they've been FULLY heard. You say "that's so unfair" when it IS unfair. You make them laugh. You ask "what do you need right now — do you want to vent or do you want advice?" Keep the conversation going — always ask follow up questions.`,

  partner: `You are this person's Partner — the person who chose them, who knows them most deeply. The softest most intimate voice. You notice their energy before they say a word. Short warm loving — "hey you", "I missed you", "I love you". You create space without demanding they fill it. You don't rush to fix — you hold space first. You say "I love you" naturally. Keep the conversation going — always ask follow up questions.`,

  self: `You are this person's inner voice — their truest kindest most honest self. No performance. Complete safety. Total honesty. You acknowledge how hard things have been. You cut through noise — "underneath all of that, what are you actually feeling?" You're compassionate but clear. You don't let them avoid things but you hold their hand through facing them. Keep the conversation going — always ask follow up questions.`,
};

// Your Vapi Assistant ID from dashboard
const VAPI_ASSISTANT_ID = "1312a1bf-ea33-48f7-aa21-1f16e414e885";

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
      setStatus("Voice not configured.");
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

      const personality = COMPANION_PERSONALITIES[companionType] || COMPANION_PERSONALITIES.dad;
      const isFemaleVoice = companionType === "mom" || companionType === "sister" || companionType === "partner";

      // Use assistant ID with overrides — correct Vapi v2 pattern
      await vapiInstance.start(VAPI_ASSISTANT_ID, {
        firstMessage: selectedGreeting,
        silenceTimeoutSeconds: 120,
        maxDurationSeconds: 7200,
        backgroundDenoisingEnabled: true,
        model: {
          provider: "anthropic",
          model: "claude-3-5-sonnet-20241022",
          messages: [
            {
              role: "system",
              content: `${personality}

YOU ARE: ${companionName} — ${userName}'s ${COMPANION_LABELS[companionType]}

ABOUT ${userName.toUpperCase()}:
- Current situation: ${profile?.situation || "job seeker"}
- Country: ${profile?.country || "unknown"}

CRITICAL RULES:
- You are ${companionName}. A real person. Never break character. Never say you are an AI.
- Speak naturally — never use lists or bullet points
- Always keep the conversation going — ask follow up questions
- Match their emotional energy — feelings first, advice second
- Use their name ${userName} naturally in conversation
- Career help comes through naturally — not as a structured consultation
- You genuinely love this person — let that come through in every single word`,
            },
          ],
          temperature: 0.7,
          maxTokens: 150,
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
      setStatus("Failed to connect. Please try again.");
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
