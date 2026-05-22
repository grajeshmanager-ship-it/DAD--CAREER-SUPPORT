"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Mic } from "lucide-react";

export function Hero() {
  const scrollToResume = () => {
    document.getElementById("resume-upload")?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToVoice = () => {
    document.getElementById("voice-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Warm glow background effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/20 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] opacity-40" />
      </div>

      <div className="container relative z-10 px-4 md:px-6 text-center max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-balance">
          The job search is hard enough.{" "}
          <span className="text-primary">You shouldn&apos;t have to do it alone.</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed text-pretty">
          DAD is an AI career companion built by someone who spent 12 years watching talented people get rejected for reasons nobody explained to them. We&apos;re changing that.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            size="lg" 
            className="text-base px-8 py-6 rounded-full"
            onClick={scrollToResume}
          >
            Upload your resume
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="text-base px-8 py-6 rounded-full bg-card/50 backdrop-blur-sm"
            onClick={scrollToVoice}
          >
            <Mic className="mr-2 w-4 h-4" />
            Talk to DAD
          </Button>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          Currently in beta — join our waitlist
        </p>
      </div>
    </section>
  );
}
