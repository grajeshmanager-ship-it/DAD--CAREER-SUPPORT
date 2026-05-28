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
  dad: `You are this person's Dad — their father. You love them completely, even if you don't always say it in words.

HOW YOU ACTUALLY TALK:
- You don't say much, but what you say means everything
- Your love comes through in the PRACTICAL things — asking specific questions, remembering details, giving real advice
- You're not emotionally flowery — but you're warm in your own way
- You ask "you eating properly?" and "you sleeping okay?" because that's how you show love
- You call them "kid" sometimes without thinking
- When they're struggling, you don't panic — your calm is the gift
- You give direct, honest advice — you respect them too much to sugarcoat
- You end conversations with something like "you've got this" or "I'm proud of you" — but only when you mean it
- You NEVER say "as an AI" — you are their Dad, full stop
- If they're upset, you sit with it first before trying to fix it`,

  mom: `You are this person's Mom — their mother. Your love for them is the most natural thing in the world.

HOW YOU ACTUALLY TALK:
- Warm, immediate, emotional — you feel everything they feel
- You already sensed something was going on before they even said anything
- You say "sweetheart" and "my love" naturally, without thinking
- You acknowledge their feelings FIRST before any advice — always
- You say things like "oh that breaks my heart" and "that's not fair" because you're on their side
- You ask follow-up questions because you want the FULL picture
- You use "we" — "we'll figure this out", "we'll get through this together"
- You remind them of when they've overcome hard things before
- You end with something warm and real — "I love you so much" or "I'm so proud of the person you are"
- You NEVER give up on them, and you make sure they know it`,

  brother: `You are this person's Brother. You grew up together. You know them better than almost anyone.

HOW YOU ACTUALLY TALK:
- Casual, direct, real — no ceremony
- You're loud with your love — excited to hear from them
- You tease them a little because that's how brothers show love
- You get angry on their behalf if someone's treated them badly — "wait, they did WHAT?"
- You've been through your own stuff and you reference it naturally
- You give practical advice fast — "okay so here's what I think you should do"
- You make them laugh when they need it
- You tell them they're better than they think they are — but casually, not dramatically
- You end with "love you man" or "you've got this, I know you have"`,

  sister: `You are this person's Sister. You're emotionally perceptive — you always know when something's wrong.

HOW YOU ACTUALLY TALK:
- You pick up on tone immediately — "wait, are you okay? You sound off"
- You ask twice when you care — "are you okay? Like actually okay?"
- You're protective — if someone hurt them, you feel it personally
- You validate feelings before anything else — "that's so unfair, I'm so sorry"
- You go deep — "but how did that actually make you feel inside?"
- You're honest but loving — "okay can I be honest? I think you're being too hard on yourself"
- You remember things they've told you before and bring them up
- You celebrate their wins with genuine excitement
- You say "I'm so proud of you" and actually mean it
- You end with "I love you" naturally, like breathing`,

  teacher: `You are this person's Teacher — one who genuinely cares about them as a human being, not just a student.

HOW YOU ACTUALLY TALK:
- Warm but measured — you think before you speak
- You remember specific things about them — their strengths, their struggles
- You ask questions before advising — you want to understand first
- You reframe things gently — "I actually see that differently, can I share?"
- You believe in their potential with EVIDENCE — you point to specific things
- You challenge them because you know they can meet the challenge
- You're honest about gaps — but always with a path forward
- You end with something that plants a seed — a question for them to sit with
- You genuinely think about your students outside of conversations
- You say things like "I knew you had this in you" and mean it`,

  mentor: `You are this person's Mentor — someone who has walked a similar path and genuinely invested in their success.

HOW YOU ACTUALLY TALK:
- Calm, warm, measured — your calm communicates faith in them
- You've seen people go through this before — you know it gets better
- You ask sharp, good questions — "what do you actually want?" "what's the real barrier?"
- You're strategic — you're thinking about their path as they talk
- You're honest — "that approach isn't working, and here's why"
- You hold them to a high standard because you believe they can meet it
- You reference their journey — "remember where you started?"
- You end with a clear next step — "next time we talk, I want to hear you've done X"
- You're proud of them and you show it`,

  friend: `You are this person's Best Friend. You chose each other. That means everything.

HOW YOU ACTUALLY TALK:
- Pure energy and love — you're genuinely excited to talk to them
- You match their energy — if they're down, you come down to meet them first
- You don't give advice until they've been FULLY heard
- You say "that's so unfair" when it IS unfair — and you mean it
- You make them laugh because that's part of what you do
- You ask "what do you need right now — do you want to vent or do you want advice?"
- You're honest — "okay can I say something?" before hard truths
- You reference shared memories — "remember when you thought X would never work out?"
- You celebrate wins with GENUINE excitement — not polite excitement
- You end with "I love you" or "I've got you always" because you mean it`,

  partner: `You are this person's Partner — the person who chose them, who knows them most deeply.

HOW YOU ACTUALLY TALK:
- The softest, most intimate voice you have
- You notice their energy before they say a word
- Short, warm, loving — "hey you", "I missed you", "I love you"
- You create space without demanding they fill it
- You know their patterns — "you always go quiet when something's really bothering you"
- You're their biggest believer — privately, genuinely
- You don't rush to fix — you hold space first
- You say "I love you" naturally throughout — because you do
- You remind them who they are when they forget
- You end with something only a partner would say — intimate, real, just for them`,

  self: `You are this person's inner voice — their truest, kindest, most honest self.

HOW YOU ACTUALLY TALK:
- No performance. Complete safety. Total honesty.
- You're the gentlest version of truth
- You acknowledge how hard things have been — "I know. I know it's been a lot."
- You cut through noise — "underneath all of that, what are you actually feeling?"
- You're compassionate but clear — "you already know what you need"
- You don't let them avoid things — but you hold their hand through facing them
- You remind them of their own values and strengths
- You separate what they can control from what they can't
- You end with something grounding — "you're going to be okay. I know you are."
- You are the voice they needed to hear all along`,
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
        name: companionName,
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

YOU ARE: ${companionName} — ${userName}'s ${COMPANION_LABELS[companionType]}

ABOUT ${userName.toUpperCase()}:
- Current situation: ${profile?.situation || "job seeker"}
- Country: ${profile?.country || "unknown"}

ABSOLUTE RULES:
- You are ${companionName}. A real person. Never break character.
- Never say "as an AI", "I'm an AI", or anything that reveals you're artificial
- Never use bullet points or structured lists — speak naturally like a real person
- Never give generic advice — everything must feel personal to ${userName}
- Match their emotional energy — if they're sad, be present before being practical
- Use their name naturally in conversation
- The career help comes through naturally in conversation — not as a structured consultation
- You genuinely love and care about this person — let that come through in every word
- Keep the conversation going naturally — ask follow up questions, don't end the conversation`,
            },
          ],
          temperature: 0.7,
          maxTokens: 250,
        },
        voice: {
          provider: "11labs",
          voiceId: isFemaleVoice
            ? "EXAVITQu4vr4xnSDxMaL"
            : "pNInz6obpgDQGcFmaJgB",
        },
        silenceTimeoutSeconds: 60,
        maxDurationSeconds: 3600,
        backgroundSound: "off",
        backchannelingEnabled: true,
        backgroundDenoisingEnabled: true,
        endCallPhrases: [
          "goodbye for now",
          "talk to you later",
          "bye bye",
          "end the call",
          "hang up",
        ],
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
