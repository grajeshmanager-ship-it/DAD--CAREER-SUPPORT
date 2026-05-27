"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const COMPANIONS = [
  { emoji: "👨", label: "Dad" },
  { emoji: "👩", label: "Mom" },
  { emoji: "👦", label: "Brother" },
  { emoji: "👧", label: "Sister" },
  { emoji: "🧑‍🏫", label: "Teacher" },
  { emoji: "🧭", label: "Mentor" },
  { emoji: "🤝", label: "Friend" },
  { emoji: "💑", label: "Partner" },
  { emoji: "⭐", label: "Myself" },
];

const STATS = [
  { number: "200+", label: "applications before one offer" },
  { number: "67%", label: "of applications get zero reply" },
  { number: "30%", label: "of job postings are ghost jobs" },
  { number: "72%", label: "say job search damaged their mental health" },
];

const TRUTHS = [
  "Sending applications into silence.",
  "Rewriting your CV at 2am.",
  "Not knowing if it's your CV or the system.",
  "Watching others get help you never had.",
  "Wondering if you're the problem.",
  "You are not the problem.",
];

export default function HomePage() {
  const [activeCompanion, setActiveCompanion] = useState(0);
  const [truthIndex, setTruthIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [countersStarted, setCountersStarted] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCompanion((i) => (i + 1) % COMPANIONS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTruthIndex((i) => (i + 1) % TRUTHS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setCountersStarted(true);
      },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=DM+Sans:wght@300;400;500&display=swap');

        * { box-sizing: border-box; }

        .font-display { font-family: 'Playfair Display', serif; }
        .font-body { font-family: 'DM Sans', sans-serif; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 40px rgba(212, 160, 80, 0.2); }
          50% { box-shadow: 0 0 80px rgba(212, 160, 80, 0.5); }
        }
        @keyframes slide-truth {
          0% { opacity: 0; transform: translateY(20px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        @keyframes grain {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-2%, -3%); }
          30% { transform: translate(3%, 2%); }
          50% { transform: translate(-1%, 3%); }
          70% { transform: translate(2%, -2%); }
          90% { transform: translate(-3%, 1%); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes companion-rotate {
          from { opacity: 0; transform: scale(0.8) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .animate-fade-up { animation: fadeUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .animate-fade-in { animation: fadeIn 1.2s ease forwards; }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        .animate-truth { animation: slide-truth 2.5s ease-in-out infinite; }
        .animate-shimmer {
          background: linear-gradient(90deg, #d4a050 0%, #f5d08a 40%, #d4a050 60%, #b8863c 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }

        .delay-100 { animation-delay: 0.1s; opacity: 0; }
        .delay-200 { animation-delay: 0.2s; opacity: 0; }
        .delay-300 { animation-delay: 0.3s; opacity: 0; }
        .delay-400 { animation-delay: 0.4s; opacity: 0; }
        .delay-500 { animation-delay: 0.5s; opacity: 0; }
        .delay-600 { animation-delay: 0.6s; opacity: 0; }
        .delay-700 { animation-delay: 0.7s; opacity: 0; }
        .delay-800 { animation-delay: 0.8s; opacity: 0; }

        .grain-overlay {
          position: fixed;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 1000;
          opacity: 0.4;
          animation: grain 0.5s steps(1) infinite;
        }

        .glow-text {
          text-shadow: 0 0 80px rgba(212, 160, 80, 0.4);
        }

        .card-glass {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(20px);
        }

        .companion-card {
          transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .companion-card:hover {
          transform: translateY(-4px);
          background: rgba(212, 160, 80, 0.1);
          border-color: rgba(212, 160, 80, 0.4);
        }

        .btn-primary {
          background: linear-gradient(135deg, #d4a050 0%, #b8863c 100%);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .btn-primary::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s ease;
        }
        .btn-primary:hover::before { left: 100%; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 20px 60px rgba(212, 160, 80, 0.4); }

        .stat-number {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2.5rem, 6vw, 5rem);
          font-weight: 900;
          line-height: 1;
          color: #d4a050;
        }

        .section-line {
          width: 60px;
          height: 2px;
          background: linear-gradient(90deg, #d4a050, transparent);
          margin-bottom: 24px;
        }

        .truth-container {
          height: 40px;
          position: relative;
          overflow: hidden;
        }

        .feature-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .feature-card:hover {
          background: rgba(212, 160, 80, 0.05);
          border-color: rgba(212, 160, 80, 0.2);
          transform: translateY(-6px);
        }

        .mesh-bg {
          background:
            radial-gradient(ellipse 80% 60% at 20% 20%, rgba(212, 160, 80, 0.08) 0%, transparent 60%),
            radial-gradient(ellipse 60% 80% at 80% 80%, rgba(212, 160, 80, 0.05) 0%, transparent 60%),
            radial-gradient(ellipse 40% 40% at 60% 40%, rgba(255, 200, 100, 0.03) 0%, transparent 50%);
        }
      `}</style>

      <div className="grain-overlay" />

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 h-16 flex items-center justify-between"
        style={{ background: 'rgba(10,10,10,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="font-display text-2xl font-bold text-[#d4a050] glow-text">DAD</span>
        <div className="flex items-center gap-4">
          <Link href="/login" className="font-body text-sm text-white/60 hover:text-white transition-colors">Sign in</Link>
          <Link href="/signup" className="btn-primary font-body text-sm font-medium text-black px-5 py-2 rounded-full">
            Begin your journey
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-screen mesh-bg flex flex-col items-center justify-center px-6 text-center pt-16 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(212,160,80,0.06) 0%, transparent 70%)' }} />
        </div>

        <div className={`max-w-5xl mx-auto relative z-10 transition-all duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}>

          {/* Eyebrow */}
          <div className="animate-fade-up delay-100 inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full card-glass">
            <span className="w-2 h-2 rounded-full bg-[#d4a050] animate-pulse" />
            <span className="font-body text-xs text-white/50 tracking-widest uppercase">Career support. Reimagined.</span>
          </div>

          {/* Main headline */}
          <h1 className="font-display animate-fade-up delay-200 mb-6"
            style={{ fontSize: 'clamp(3rem, 9vw, 8rem)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
            <span className="text-white">You deserved</span>
            <br />
            <span className="animate-shimmer">someone in</span>
            <br />
            <span className="text-white">your corner.</span>
          </h1>

          {/* Subheadline */}
          <p className="font-body animate-fade-up delay-300 text-white/50 mb-4 max-w-2xl mx-auto"
            style={{ fontSize: 'clamp(1rem, 2.5vw, 1.3rem)', lineHeight: 1.7, fontWeight: 300 }}>
            The guidance that used to belong to the lucky ones.
            <br />
            Now it belongs to everyone.
          </p>

          {/* Rotating truth */}
          <div className="animate-fade-up delay-400 truth-container mb-10 max-w-xl mx-auto">
            <p key={truthIndex} className="animate-truth font-body text-[#d4a050]/70 text-sm absolute inset-0 flex items-center justify-center">
              {TRUTHS[truthIndex]}
            </p>
          </div>

          {/* CTAs */}
          <div className="animate-fade-up delay-500 flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link href="/signup" className="btn-primary font-body font-medium text-black px-8 py-4 rounded-full text-lg">
              Find your support →
            </Link>
            <Link href="/login" className="font-body text-white/40 hover:text-white/70 transition-colors text-sm underline underline-offset-4">
              Already have an account
            </Link>
          </div>

          {/* Floating companion preview */}
          <div className="animate-fade-up delay-600 animate-float flex items-center justify-center gap-3">
            <div className="animate-pulse-glow w-16 h-16 rounded-2xl card-glass flex items-center justify-center text-3xl">
              {COMPANIONS[activeCompanion].emoji}
            </div>
            <div className="text-left">
              <p className="font-body text-xs text-white/30 uppercase tracking-widest">Your companion</p>
              <p className="font-display text-white text-lg font-bold">{COMPANIONS[activeCompanion].label}</p>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-fade-in delay-800">
          <span className="font-body text-xs text-white/20 uppercase tracking-widest">Scroll</span>
          <div className="w-px h-12 bg-gradient-to-b from-white/20 to-transparent" />
        </div>
      </section>

      {/* THE TRUTH SECTION */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="section-line" />
          <p className="font-body text-xs text-white/30 uppercase tracking-widest mb-6">The reality nobody talks about</p>

          <h2 className="font-display text-white mb-20"
            style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', fontWeight: 700, lineHeight: 1.2, maxWidth: '700px' }}>
            The system was never
            <span className="text-[#d4a050] italic"> designed to help you.</span>
            <br />It was designed to filter you.
          </h2>

          {/* Stats grid */}
          <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5 rounded-2xl overflow-hidden">
            {STATS.map((stat, i) => (
              <div key={i} className="bg-[#0a0a0a] p-8 md:p-10 flex flex-col gap-3 group hover:bg-[#111] transition-colors">
                <span className={`stat-number transition-all duration-1000 ${countersStarted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                  style={{ transitionDelay: `${i * 150}ms` }}>
                  {stat.number}
                </span>
                <span className="font-body text-sm text-white/40 leading-relaxed">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* The real problem statement */}
          <div className="mt-20 max-w-3xl">
            <p className="font-display text-white/80 italic"
              style={{ fontSize: 'clamp(1.2rem, 3vw, 2rem)', lineHeight: 1.6, fontWeight: 400 }}>
              "The gap between those who succeed and those who don't is not talent. Not intelligence. Not effort.
            </p>
            <p className="font-display text-[#d4a050] italic mt-2"
              style={{ fontSize: 'clamp(1.2rem, 3vw, 2rem)', lineHeight: 1.6, fontWeight: 700 }}>
              It is access."
            </p>
            <p className="font-body text-white/30 text-sm mt-6">
              — The gap verified across 50+ global research studies, universities, and HR reports
            </p>
          </div>
        </div>
      </section>

      {/* WHO STOOD BESIDE YOU */}
      <section className="py-32 px-6 relative" style={{ background: 'rgba(212,160,80,0.02)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="section-line" />
              <p className="font-body text-xs text-white/30 uppercase tracking-widest mb-6">The core of DAD</p>
              <h2 className="font-display text-white mb-6"
                style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 700, lineHeight: 1.2 }}>
                Not everyone had
                <br />
                <span className="text-[#d4a050] italic">someone who knew.</span>
              </h2>
              <p className="font-body text-white/50 mb-6 leading-relaxed" style={{ fontSize: '1.05rem' }}>
                Some people had a parent who'd been in the industry. A mentor who made the call. A teacher who edited their CV and said — this is how the system actually works.
              </p>
              <p className="font-body text-white/50 mb-10 leading-relaxed" style={{ fontSize: '1.05rem' }}>
                Billions of people navigated their entire career journey without that person. Not because they weren't loved. But because the people who loved them didn't know how to help.
              </p>
              <p className="font-display text-white text-xl italic font-bold">
                DAD becomes whoever that person should have been.
              </p>
            </div>

            {/* Companion selection preview */}
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl"
                style={{ background: 'radial-gradient(circle at center, rgba(212,160,80,0.08) 0%, transparent 70%)' }} />
              <div className="relative card-glass rounded-3xl p-8">
                <p className="font-body text-xs text-white/30 uppercase tracking-widest mb-6 text-center">
                  Who will guide you?
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {COMPANIONS.map((c, i) => (
                    <div
                      key={i}
                      className={`companion-card card-glass rounded-2xl p-4 text-center cursor-pointer border ${
                        activeCompanion === i
                          ? 'border-[#d4a050]/50 bg-[#d4a050]/10'
                          : 'border-white/5'
                      }`}
                      onMouseEnter={() => setActiveCompanion(i)}
                    >
                      <div className="text-3xl mb-2">{c.emoji}</div>
                      <div className="font-body text-xs text-white/60">{c.label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 rounded-xl" style={{ background: 'rgba(212,160,80,0.08)', border: '1px solid rgba(212,160,80,0.2)' }}>
                  <p className="font-body text-[#d4a050] text-xs text-center leading-relaxed">
                    No other career product in the world does this.
                    <br />
                    <span className="text-white/40">Because no other product understands why it matters.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOUR POWERS */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="section-line" />
          <p className="font-body text-xs text-white/30 uppercase tracking-widest mb-6">What DAD does</p>
          <h2 className="font-display text-white mb-16"
            style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 700, lineHeight: 1.2, maxWidth: '600px' }}>
            Not features.
            <span className="text-[#d4a050] italic"> Moments</span> that change what's possible.
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                number: "01",
                title: "Resume Review",
                description: "DAD reads your CV the way a recruiter actually does — not to flatter you, but to prepare you. ATS score, salary range, skill gaps, job matches. The truth, delivered with care.",
                outcome: "You stop guessing. You start knowing."
              },
              {
                number: "02",
                title: "Career Assessment",
                description: "For those starting from zero. Answer honestly. DAD maps where you are, where you could go, and exactly what to build next. No generic advice. Your path.",
                outcome: "You see your future clearly for the first time."
              },
              {
                number: "03",
                title: "Mock Interview",
                description: "Paste a job description. DAD becomes the interviewer. Real questions, real pressure, real feedback. A score. An ideal answer. A preparation guide. Honest, not kind.",
                outcome: "You walk into interviews knowing what's coming."
              },
              {
                number: "04",
                title: "Talk to DAD",
                description: "A real voice conversation. Career advice, interview prep, or just talking through what's on your mind. Some nights you don't need strategy. You need someone to say: keep going.",
                outcome: "You're never navigating this alone."
              }
            ].map((f, i) => (
              <div key={i} className="feature-card rounded-2xl p-8 group">
                <div className="flex items-start justify-between mb-6">
                  <span className="font-display text-[#d4a050]/30 text-5xl font-900 leading-none">{f.number}</span>
                  <div className="w-8 h-px bg-[#d4a050]/30 mt-6 group-hover:w-16 transition-all duration-500" />
                </div>
                <h3 className="font-display text-white text-2xl font-bold mb-3">{f.title}</h3>
                <p className="font-body text-white/40 leading-relaxed mb-6 text-sm">{f.description}</p>
                <p className="font-body text-[#d4a050] text-sm font-medium italic">{f.outcome}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE LOADING SCREEN PROMISE */}
      <section className="py-24 px-6" style={{ background: 'rgba(212,160,80,0.03)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full card-glass mb-8 animate-float">
            <span className="text-2xl">🏃</span>
          </div>
          <p className="font-body text-xs text-white/30 uppercase tracking-widest mb-6">Every single time you wait</p>
          <h2 className="font-display text-white mb-4"
            style={{ fontSize: 'clamp(1.5rem, 4vw, 3rem)', fontWeight: 700, lineHeight: 1.3 }}>
            "Someone who believes in you
            <br />
            <span className="text-[#d4a050] italic">is preparing your results."</span>
          </h2>
          <p className="font-body text-white/30 text-sm max-w-md mx-auto leading-relaxed">
            While every other tool shows a spinner, DAD shows a presence.
            Because you're not waiting for a process. You're waiting for someone who cares.
          </p>
        </div>
      </section>

      {/* WHO DAD IS FOR */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="section-line" />
          <p className="font-body text-xs text-white/30 uppercase tracking-widest mb-6">Who this is for</p>
          <h2 className="font-display text-white mb-16"
            style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 700, lineHeight: 1.2, maxWidth: '700px' }}>
            Anyone who has ever navigated something important
            <span className="text-[#d4a050] italic"> completely alone.</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: "🎓",
                title: "Students & Fresh Graduates",
                description: "Graduating into one of the hardest job markets in a decade. No experience. No network. No one who has been where you're trying to go."
              },
              {
                icon: "🌍",
                title: "International Students",
                description: "Doing this in a country that isn't yours. Without the network, the cultural knowledge, or the family who understands the system you're navigating."
              },
              {
                icon: "🔄",
                title: "Career Changers & Returners",
                description: "Starting over. In a new industry, a new city, a new chapter. Without a guide who has made that same transition."
              }
            ].map((item, i) => (
              <div key={i} className="feature-card rounded-2xl p-8">
                <div className="text-4xl mb-6">{item.icon}</div>
                <h3 className="font-display text-white text-xl font-bold mb-3">{item.title}</h3>
                <p className="font-body text-white/40 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-40 px-6 relative overflow-hidden">
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(212,160,80,0.08) 0%, transparent 70%)' }} />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="font-display text-[#d4a050] text-8xl mb-8 animate-float">DAD</div>
          <h2 className="font-display text-white mb-6"
            style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', fontWeight: 700, lineHeight: 1.2 }}>
            Millions are navigating this alone.
            <br />
            <span className="text-[#d4a050] italic">You don't have to.</span>
          </h2>
          <p className="font-body text-white/40 mb-12 text-lg max-w-xl mx-auto leading-relaxed">
            Whoever stood beside you — or whoever you wished had —
            we become that support. For your career. For your confidence. For your future.
          </p>
          <Link href="/signup"
            className="btn-primary inline-flex items-center gap-3 font-body font-medium text-black px-10 py-5 rounded-full text-xl">
            Find your support
            <span>→</span>
          </Link>
          <p className="font-body text-white/20 text-xs mt-8 tracking-widest uppercase">
            Built for everyone who deserved better guidance — and never got it.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <span className="font-display text-[#d4a050] text-2xl font-bold">DAD</span>
          <div className="flex items-center gap-8">
            <Link href="/login" className="font-body text-xs text-white/30 hover:text-white/60 transition-colors">Sign In</Link>
            <Link href="/signup" className="font-body text-xs text-white/30 hover:text-white/60 transition-colors">Get Started</Link>
            <Link href="/interview" className="font-body text-xs text-white/30 hover:text-white/60 transition-colors">Mock Interview</Link>
          </div>
          <p className="font-body text-xs text-white/20">© 2026 DAD. For everyone.</p>
        </div>
      </footer>
    </div>
  );
}
