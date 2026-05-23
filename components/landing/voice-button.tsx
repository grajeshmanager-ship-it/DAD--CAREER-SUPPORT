"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, Phone, PhoneOff } from "lucide-react";
import Vapi from "@vapi-ai/web";

const ASSISTANT_ID = "1312a1bf-ea33-48f7-aa21-1f16e414e885";

export function VoiceButton() {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [pulseCount] = useState([1, 2, 3, 4]);
  const vapiRef = useRef<Vapi | null>(null);

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    
    console.log("[v0] VoiceButton mounted");
    console.log("[v0] NEXT_PUBLIC_VAPI_PUBLIC_KEY:", publicKey ? `present (${publicKey.substring(0, 8)}...)` : "MISSING");

    if (!publicKey) {
      console.error("[v0] Vapi public key not found in environment");
      setError("Voice service not configured - missing API key");
      return;
    }

    try {
      console.log("[v0] Creating Vapi instance with public key");
      const vapi = new Vapi(publicKey);
      vapiRef.current = vapi;

      vapi.on("call-start", () => {
        console.log("[v0] Vapi event: call-start");
        setIsConnecting(false);
        setIsCallActive(true);
        setError(null);
      });

      vapi.on("call-end", () => {
        console.log("[v0] Vapi event: call-end");
        setIsCallActive(false);
        setIsConnecting(false);
        setIsSpeaking(false);
      });

      vapi.on("speech-start", () => {
        console.log("[v0] Vapi event: speech-start");
        setIsSpeaking(true);
      });

      vapi.on("speech-end", () => {
        console.log("[v0] Vapi event: speech-end");
        setIsSpeaking(false);
      });

      vapi.on("error", (err) => {
        console.error("[v0] Vapi event: error", err);
        const errorMessage = typeof err === 'object' && err !== null && 'message' in err 
          ? String((err as { message: string }).message) 
          : "Voice call failed";
        setError(errorMessage);
        setIsCallActive(false);
        setIsConnecting(false);
      });

      console.log("[v0] Vapi instance created successfully, ready for calls");
      setIsReady(true);

      return () => {
        console.log("[v0] Cleaning up Vapi instance");
        vapi.stop();
      };
    } catch (err) {
      console.error("[v0] Failed to create Vapi instance:", err);
      setError("Failed to initialize voice service");
    }
  }, []);

  const handleCallToggle = async () => {
    console.log("[v0] handleCallToggle called");
    console.log("[v0] Current state - isCallActive:", isCallActive, "isConnecting:", isConnecting, "isReady:", isReady);
    console.log("[v0] vapiRef.current:", vapiRef.current ? "exists" : "null");
    
    if (!vapiRef.current) {
      console.error("[v0] Vapi instance not available");
      setError("Voice service not ready. Please refresh the page.");
      return;
    }

    if (isCallActive || isConnecting) {
      console.log("[v0] Stopping current call");
      vapiRef.current.stop();
      setIsCallActive(false);
      setIsConnecting(false);
    } else {
      console.log("[v0] Starting new call with assistant ID:", ASSISTANT_ID);
      setIsConnecting(true);
      setError(null);
      
      try {
        console.log("[v0] Calling vapi.start()...");
        const resumeText = sessionStorage.getItem('dadResumeText') || '';
const startOptions = resumeText ? { variableValues: { resumeContext: resumeText.substring(0, 1000) } } : undefined;
await vapiRef.current.start(ASSISTANT_ID, startOptions);
        console.log("[v0] vapi.start() completed successfully");
      } catch (err) {
        console.error("[v0] vapi.start() failed:", err);
        const errorMessage = typeof err === 'object' && err !== null && 'message' in err 
          ? String((err as { message: string }).message) 
          : "Failed to start voice call. Please check microphone permissions.";
        setError(errorMessage);
        setIsConnecting(false);
      }
    }
  };

  const isActive = isCallActive || isConnecting;

  return (
    <section id="voice-section" className="py-20 md:py-32 relative overflow-hidden">
      <div className="container px-4 md:px-6 max-w-4xl mx-auto text-center">
        <p className="text-primary font-medium mb-4 tracking-wide uppercase text-sm">
          Voice support
        </p>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-balance">
          Sometimes you just need to talk it out
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12">
          {"Press the button and tell DAD what's on your mind. Whether it's interview anxiety, career confusion, or just needing encouragement — DAD is listening."}
        </p>

        <div className="relative inline-block">
          {isActive && pulseCount.map((_, i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping"
              style={{
                animationDelay: `${i * 0.3}s`,
                animationDuration: "2s",
              }}
            />
          ))}

          <Button
            size="lg"
            onClick={handleCallToggle}
            disabled={isConnecting || !isReady}
            className={`
              relative w-32 h-32 rounded-full transition-all duration-300
              ${isActive 
                ? "bg-primary hover:bg-primary/90 scale-110" 
                : "bg-card hover:bg-card/80 border-2 border-border hover:border-primary/50"
              }
              ${isConnecting ? "animate-pulse" : ""}
              ${!isReady ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            {isActive ? (
              <PhoneOff className="w-10 h-10 text-primary-foreground" />
            ) : (
              <Phone className="w-10 h-10 text-primary" />
            )}
          </Button>
        </div>

        <p className="mt-8 text-muted-foreground">
          {!isReady && !error ? (
            <span className="flex items-center justify-center gap-2">
              Initializing voice service...
            </span>
          ) : error ? (
            <span className="flex items-center justify-center gap-2 text-red-500">
              {error}
            </span>
          ) : isConnecting ? (
            <span className="flex items-center justify-center gap-2">
              <Volume2 className="w-4 h-4 text-primary animate-pulse" />
              Connecting to DAD...
            </span>
          ) : isCallActive ? (
            <span className="flex items-center justify-center gap-2">
              <Volume2 className={`w-4 h-4 text-primary ${isSpeaking ? "animate-pulse" : ""}`} />
              {isSpeaking ? "DAD is speaking..." : "DAD is listening... Tell me what's on your mind."}
            </span>
          ) : (
            "Tap to start talking to DAD"
          )}
        </p>

        <div className="mt-12 grid md:grid-cols-3 gap-4 text-sm">
          {[
            "\"I'm nervous about my interview tomorrow\"",
            "\"Help me figure out my career path\"",
            "\"Review my elevator pitch\"",
          ].map((prompt, i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-card/50 border border-border/50 text-muted-foreground italic"
            >
              {prompt}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
