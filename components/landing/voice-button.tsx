"use client";

import { useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, Phone } from "lucide-react";

const ASSISTANT_ID = "1312a1bf-ea33-48f7-aa21-1f16e414e885";

export function VoiceButton() {
  const vapiRef = useRef<Vapi | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;

    if (!publicKey) {
      console.warn("[v0] Vapi public key not set — voice button disabled.");
      return;
    }

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    vapi.on("call-start", () => {
      setIsCallActive(true);
      setIsConnecting(false);
    });

    vapi.on("call-end", () => {
      setIsCallActive(false);
      setIsConnecting(false);
      setIsSpeaking(false);
    });

    vapi.on("speech-start", () => setIsSpeaking(true));
    vapi.on("speech-end", () => setIsSpeaking(false));

    vapi.on("error", (err) => {
      console.error("[v0] Vapi error:", err);
      setError("Voice call failed. Please try again.");
      setIsCallActive(false);
      setIsConnecting(false);
    });

    return () => { vapi.stop(); };
  }, []);

  const handleCallToggle = async () => {
    if (!vapiRef.current) {
      setError("Voice service not ready. Please refresh the page.");
      return;
    }

    if (isCallActive || isConnecting) {
      vapiRef.current.stop();
      setIsCallActive(false);
      setIsConnecting(false);
    } else {
      setIsConnecting(true);
      setError(null);

      try {
        const resumeText = sessionStorage.getItem("dadResumeText") || "";

        if (resumeText) {
          await vapiRef.current.start(ASSISTANT_ID, {
            firstMessage:
              "Hey, good to hear from you. I had a look at your resume — you've got some good things going on. Where are you at with your job search right now?",
            model: {
              provider: "anthropic",
              model: "claude-sonnet-4-5-20250929",
              messages: [
                {
                  role: "system",
                  content: `You are DAD — a warm, honest career advisor who speaks like a supportive father. You have just read this person's resume. Here are the key details: ${resumeText.substring(0, 2000)}. Use this naturally in conversation — reference their actual skills and experience when relevant, but don't make it feel like a formal review. Ask questions. Listen. Give honest, practical advice. Never sound like a bot or a recruiter. Speak like someone who genuinely wants to see them succeed.`,
                },
              ],
            },
          });
        } else {
          await vapiRef.current.start(ASSISTANT_ID, {
            firstMessage:
              "Hey, I'm DAD. I'm here to help you figure out your next career move — whether that's landing your first job, switching careers, or just getting unstuck. What's going on for you right now?",
            model: {
              provider: "anthropic",
              model: "claude-sonnet-4-5-20250929",
              messages: [
                {
                  role: "system",
                  content: `You are DAD — a warm, honest career advisor who speaks like a supportive father. You help people with their careers — job searching, resume advice, interview prep, career changes, figuring out what they want to do. Ask questions to understand their situation before giving advice. Be direct but kind. Never sound like a corporate HR bot. Speak like someone who genuinely cares and has seen it all before.`,
                },
              ],
            },
          });
        }
      } catch (err) {
        const errorMessage =
          typeof err === "object" && err !== null && "message" in err
            ? String((err as { message: unknown }).message)
            : "Failed to start voice call";
        setError(errorMessage);
        setIsConnecting(false);
      }
    }
  };

  return (
    <section id="voice-section" className="py-20 md:py-32">
      <div className="container px-4 md:px-6 max-w-3xl mx-auto text-center">
        <p className="text-primary font-medium mb-4 tracking-wide uppercase text-sm">
          Talk to DAD
        </p>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-balance">
          Sometimes you just need to talk it out
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
          DAD is here to listen. Tell him where you're stuck and he'll help you
          figure out the next move — just like a real conversation.
        </p>

        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            {isSpeaking && (
              <>
                <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <span className="absolute inset-[-8px] rounded-full bg-primary/10 animate-ping [animation-delay:150ms]" />
              </>
            )}

            <Button
              onClick={handleCallToggle}
              size="lg"
              variant={isCallActive ? "destructive" : "default"}
              className="relative w-20 h-20 rounded-full text-lg shadow-lg transition-all duration-200"
              disabled={isConnecting}
            >
              {isConnecting ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : isCallActive ? (
                <Phone className="w-8 h-8" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            {isConnecting
              ? "Connecting to DAD…"
              : isCallActive
              ? isSpeaking
                ? "DAD is speaking…"
                : "DAD is listening…"
              : "Tap to start a voice conversation"}
          </p>

          {isCallActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCallToggle}
              className="text-muted-foreground hover:text-destructive"
            >
              <MicOff className="w-4 h-4 mr-2" />
              End call
            </Button>
          )}

          {error && (
            <p className="text-sm text-destructive max-w-sm">{error}</p>
          )}
        </div>
      </div>
    </section>
  );
}
