import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Problem } from "@/components/landing/problem";
import { Features } from "@/components/landing/features";
import { ResumeUpload } from "@/components/landing/resume-upload";
import { FresherJourney } from "@/components/landing/fresher-journey";
import { VoiceButton } from "@/components/landing/voice-button";
import { EarlyAccess } from "@/components/landing/early-access";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="pt-16">
        <Hero />
        <Problem />
        <Features />
        <ResumeUpload />
        <FresherJourney />
        <VoiceButton />
        <EarlyAccess />
        <Footer />
      </div>
    </main>
  );
}
