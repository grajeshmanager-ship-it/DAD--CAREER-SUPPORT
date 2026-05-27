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

const WHO_FOR = [
  {
    icon: "🎓",
    title: "Students & Fresh Graduates",
    description: "You have the degree. You have the drive. What you don't have is someone who's been inside the system — who can tell you what recruiters actually look for, what salary to ask for, and why you keep getting ghosted.",
  },
  {
    icon: "💼",
    title: "Job Seekers & Professionals",
    description: "You have experience. You know your worth. But the market has changed, the rules have changed, and the support you need to navigate it hasn't caught up. DAD catches up for you.",
  },
  {
    icon: "🌍",
    title: "International & Relocated",
    description: "You moved. You built something new somewhere unfamiliar. Without the local network. Without family who knows how this system works. That gap is real — and DAD fills it.",
  },
  {
    icon: "🔄",
    title: "Career Changers & Returners",
    description: "Starting over takes courage. What it also takes is a guide who has made that transition — who can map the path, close the gaps, and make sure your next chapter actually opens.",
  },
];

export default function HomePage() {
  const [activeCompanion, setActiveCompanion] = useState(0);
  const [truthIndex, setTruthIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [countersStarted, setCountersStarted] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const statsRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

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
      ([entry]) => { if (entry.isIntersecting) setCountersStarted(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  return (
    <div className="min-h-screen bg-[#080808] text-white overflow-x-hidden font-body">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }

        .font-display { font-family: 'Playfair Display', serif; }
        .font-body { font-family: 'DM Sans', sans-serif; }

        /* ── Keyframes ── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(50px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes float {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-14px); }
        }
        @keyframes pulseGold {
          0%,100% { box-shadow: 0 0 30px rgba(212,160,80,.15), 0 0 60px rgba(212,160,80,.05); }
          50%      { box-shadow: 0 0 60px rgba(212,160,80,.35), 0 0 120px rgba(212,160,80,.15); }
        }
        @keyframes truthCycle {
          0%   { opacity: 0; transform: translateY(18px); }
          12%  { opacity: 1; transform: translateY(0); }
          80%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-18px); }
        }
        @keyframes shimmer {
          0%   { background-position: -300% center; }
          100% { background-position: 300% center; }
        }
        @keyframes grain {
          0%,100% { transform: translate(0,0) }
          20%      { transform: translate(-2%,-3%) }
          40%      { transform: translate(3%,2%) }
          60%      { transform: translate(-1%,3%) }
          80%      { transform: translate(2%,-2%) }
        }
        @keyframes orb1 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(40px,-30px) scale(1.1); }
          66%      { transform: translate(-20px,40px) scale(0.95); }
        }
        @keyframes orb2 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(-50px,30px) scale(1.05); }
          66%      { transform: translate(30px,-40px) scale(1.1); }
        }
        @keyframes lineGrow {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes revealUp {
          from { clip-path: inset(100% 0 0 0); transform: translateY(20px); }
          to   { clip-path: inset(0% 0 0 0); transform: translateY(0); }
        }
        @keyframes borderPulse {
          0%,100% { border-color: rgba(212,160,80,.15); }
          50%      { border-color: rgba(212,160,80,.5); }
        }
        @keyframes counterUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scanline {
          0%   { top: -5%; }
          100% { top: 105%; }
        }

        /* ── Utility classes ── */
        .anim-fade-up   { animation: fadeUp .9s cubic-bezier(.22,1,.36,1) both; }
        .anim-fade-in   { animation: fadeIn 1.2s ease both; }
        .anim-float     { animation: float 7s ease-in-out infinite; }
        .anim-gold-glow { animation: pulseGold 3s ease-in-out infinite; }
        .anim-truth     { animation: truthCycle 2.5s ease-in-out both; }
        .anim-line-grow { animation: lineGrow .8s cubic-bezier(.22,1,.36,1) both; transform-origin: left; }

        .d-100 { animation-delay: .1s; }
        .d-200 { animation-delay: .2s; }
        .d-300 { animation-delay: .3s; }
        .d-400 { animation-delay: .4s; }
        .d-500 { animation-delay: .5s; }
        .d-600 { animation-delay: .6s; }
        .d-700 { animation-delay: .7s; }
        .d-800 { animation-delay: .8s; }
        .d-900 { animation-delay: .9s; }

        .gold-shimmer {
          background: linear-gradient(90deg,#b8863c 0%,#d4a050 25%,#f5d48a 50%,#d4a050 75%,#b8863c 100%);
          background-size: 300% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 5s linear infinite;
        }

        .glass {
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(255,255,255,.07);
          backdrop-filter: blur(24px);
        }

        .grain-layer {
          position: fixed; inset: -50%;
          width: 200%; height: 200%;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.05'/%3E%3C/svg%3E");
          pointer-events: none; z-index: 9999; opacity: .35;
          animation: grain .4s steps(1) infinite;
        }

        .cursor-glow {
          position: fixed;
          width: 400px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(212,160,80,.06) 0%, transparent 70%);
          pointer-events: none; z-index: 1;
          transform: translate(-50%,-50%);
          transition: left .15s ease, top .15s ease;
        }

        .stat-enter { animation: counterUp .7s cubic-bezier(.22,1,.36,1) both; }

        .feature-card {
          background: rgba(255,255,255,.018);
          border: 1px solid rgba(255,255,255,.06);
          transition: all .5s cubic-bezier(.22,1,.36,1);
          position: relative; overflow: hidden;
        }
        .feature-card::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(212,160,80,.06) 0%, transparent 60%);
          opacity: 0; transition: opacity .4s ease;
        }
        .feature-card:hover { transform: translateY(-8px); border-color: rgba(212,160,80,.25); }
        .feature-card:hover::before { opacity: 1; }

        .companion-chip {
          transition: all .35s cubic-bezier(.22,1,.36,1);
          border: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.02);
          cursor: pointer;
        }
        .companion-chip:hover,
        .companion-chip.active {
          border-color: rgba(212,160,80,.5);
          background: rgba(212,160,80,.08);
          transform: translateY(-4px) scale(1.05);
        }

        .btn-gold {
          background: linear-gradient(135deg,#d4a050 0%,#b8863c 100%);
          position: relative; overflow: hidden;
          transition: all .35s ease;
        }
        .btn-gold::after {
          content: '';
          position: absolute; top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg,transparent,rgba(255,255,255,.25),transparent);
          transition: left .5s ease;
        }
        .btn-gold:hover::after { left: 100%; }
        .btn-gold:hover { transform: translateY(-3px); box-shadow: 0 24px 64px rgba(212,160,80,.4); }

        .who-card {
          border: 1px solid rgba(255,255,255,.055);
          background: rgba(255,255,255,.018);
          transition: all .4s cubic-bezier(.22,1,.36,1);
        }
        .who-card:hover {
          border-color: rgba(212,160,80,.3);
          background: rgba(212,160,80,.04);
          transform: translateY(-6px);
        }

        .section-label {
          font-family: 'DM Sans', sans-serif;
          font-size: .65rem;
          letter-spacing: .2em;
          text-transform: uppercase;
          color: rgba(212,160,80,.6);
        }

        .truth-stage {
          height: 36px;
          position: relative;
          overflow: hidden;
        }
        .truth-text {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          font-family: 'DM Sans', sans-serif;
          font-size: .9rem;
          color: rgba(212,160,80,.65);
          letter-spacing: .02em;
        }

        /* Scanline effect on hero */
        .scanline {
          position: absolute; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg,transparent,rgba(212,160,80,.08),transparent);
          animation: scanline 8s linear infinite;
          pointer-events: none;
        }

        .divider {
          width: 100%; height: 1px;
          background: linear-gradient(90deg,transparent,rgba(255,255,255,.07),transparent);
        }
      `}</style>

      {/* Grain overlay */}
      <div className="grain-layer" />

      {/* Cursor glow */}
      <div className="cursor-glow" style={{ left: mousePos.x, top: mousePos.y }} />

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 64,
        background: 'rgba(8,8,8,.85)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,.05)',
        display: 'flex', alignItems: 'center',
        padding: '0 40px',
        justifyContent: 'space-between',
      }}>
        <span className="font-display" style={{ fontSize: '1.6rem', fontWeight: 900, color: '#d4a050', letterSpacing: '-.01em' }}>DAD</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link href="/login" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '.85rem', color: 'rgba(255,255,255,.4)', textDecoration: 'none', transition: 'color .2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,.8)') }
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,.4)') }>
            Sign in
          </Link>
          <Link href="/signup" className="btn-gold" style={{
            fontFamily: "'DM Sans',sans-serif", fontSize: '.85rem', fontWeight: 600,
            color: '#0a0a0a', padding: '10px 24px', borderRadius: 999, textDecoration: 'none',
            display: 'inline-block'
          }}>
            Begin your journey
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section ref={heroRef} style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '100px 24px 80px',
        position: 'relative', overflow: 'hidden',
        textAlign: 'center',
      }}>
        {/* Animated orbs */}
        <div style={{
          position: 'absolute', top: '20%', left: '15%',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,160,80,.07) 0%, transparent 70%)',
          animation: 'orb1 18s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', right: '10%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,160,80,.05) 0%, transparent 70%)',
          animation: 'orb2 22s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        <div className="scanline" />

        <div style={{ maxWidth: 900, position: 'relative', zIndex: 2 }}>

          {/* Badge */}
          <div className={`glass anim-fade-up d-100 ${visible ? '' : 'opacity-0'}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 20px', borderRadius: 999, marginBottom: 40 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#d4a050', display: 'inline-block', animation: 'pulseGold 2s ease-in-out infinite' }} />
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '.7rem', color: 'rgba(255,255,255,.4)', letterSpacing: '.18em', textTransform: 'uppercase' }}>
              Your career. Your guide. Your rules.
            </span>
          </div>

          {/* Headline */}
          <h1 className={`font-display anim-fade-up d-200 ${visible ? '' : 'opacity-0'}`}
            style={{ fontSize: 'clamp(3.2rem,10vw,9rem)', fontWeight: 900, lineHeight: 1.02, letterSpacing: '-.025em', marginBottom: 28 }}>
            <span style={{ color: '#fff', display: 'block' }}>You deserved</span>
            <span className="gold-shimmer" style={{ display: 'block' }}>someone who</span>
            <span style={{ color: '#fff', display: 'block' }}>knew the way.</span>
          </h1>

          {/* Sub */}
          <p className={`anim-fade-up d-300 ${visible ? '' : 'opacity-0'}`}
            style={{
              fontFamily: "'DM Sans',sans-serif", fontSize: 'clamp(1rem,2.2vw,1.25rem)',
              color: 'rgba(255,255,255,.4)', lineHeight: 1.75, fontWeight: 300,
              maxWidth: 600, margin: '0 auto 20px',
            }}>
            The support that used to belong only to people with the right connections, the right family, the right network —
            <span style={{ color: 'rgba(255,255,255,.7)', fontWeight: 400 }}> is now yours.</span>
          </p>

          {/* Rotating truth */}
          <div className={`truth-stage anim-fade-up d-400 ${visible ? '' : 'opacity-0'}`} style={{ marginBottom: 48 }}>
            <p key={truthIndex} className="truth-text anim-truth">{TRUTHS[truthIndex]}</p>
          </div>

          {/* CTAs */}
          <div className={`anim-fade-up d-500 ${visible ? '' : 'opacity-0'}`}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 72 }}>
            <Link href="/signup" className="btn-gold"
              style={{
                fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: '1.1rem',
                color: '#0a0a0a', padding: '18px 48px', borderRadius: 999, textDecoration: 'none',
                display: 'inline-block', letterSpacing: '-.01em',
              }}>
              Find your support →
            </Link>
            <Link href="/login"
              style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '.8rem', color: 'rgba(255,255,255,.25)', textDecoration: 'underline', textUnderlineOffset: 4 }}>
              Already have an account
            </Link>
          </div>

          {/* Companion floating widget */}
          <div className={`anim-fade-up d-600 anim-float ${visible ? '' : 'opacity-0'}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 14 }}>
            <div className="anim-gold-glow glass"
              style={{ width: 64, height: 64, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>
              {COMPANIONS[activeCompanion].emoji}
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '.65rem', color: 'rgba(255,255,255,.25)', letterSpacing: '.18em', textTransform: 'uppercase', marginBottom: 3 }}>
                Guiding you as
              </p>
              <p className="font-display" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                {COMPANIONS[activeCompanion].label}
              </p>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="anim-fade-in d-900" style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '.6rem', color: 'rgba(255,255,255,.15)', letterSpacing: '.2em', textTransform: 'uppercase' }}>Scroll</span>
          <div style={{ width: 1, height: 48, background: 'linear-gradient(to bottom, rgba(212,160,80,.4), transparent)' }} />
        </div>
      </section>

      <div className="divider" />

      {/* ── TRUTH / STATS ── */}
      <section style={{ padding: '120px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <p className="section-label anim-line-grow" style={{ marginBottom: 12 }}>The reality no one shows you</p>
        <div style={{ width: 48, height: 2, background: 'linear-gradient(90deg,#d4a050,transparent)', marginBottom: 32 }} className="anim-line-grow" />

        <h2 className="font-display" style={{ fontSize: 'clamp(2rem,5vw,4rem)', fontWeight: 700, lineHeight: 1.15, maxWidth: 720, marginBottom: 80, color: '#fff' }}>
          The system was never designed
          <em style={{ color: '#d4a050' }}> to help you.</em>
          <br />It was designed to filter you.
        </h2>

        <div ref={statsRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 1, background: 'rgba(255,255,255,.04)', borderRadius: 20, overflow: 'hidden' }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ background: '#080808', padding: '48px 40px' }}
              className={countersStarted ? `stat-enter d-${(i + 1) * 100}` : ''}>
              <div className="font-display" style={{ fontSize: 'clamp(3rem,6vw,5rem)', fontWeight: 900, color: '#d4a050', lineHeight: 1, marginBottom: 12 }}>
                {s.number}
              </div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '.9rem', color: 'rgba(255,255,255,.35)', lineHeight: 1.6 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 80, maxWidth: 760, borderLeft: '2px solid rgba(212,160,80,.3)', paddingLeft: 32 }}>
          <p className="font-display" style={{ fontSize: 'clamp(1.2rem,3vw,2rem)', lineHeight: 1.65, color: 'rgba(255,255,255,.75)', fontStyle: 'italic', fontWeight: 400 }}>
            "The gap between those who succeed and those who struggle is not talent. Not intelligence. Not effort.
          </p>
          <p className="font-display" style={{ fontSize: 'clamp(1.2rem,3vw,2rem)', lineHeight: 1.65, color: '#d4a050', fontStyle: 'italic', fontWeight: 700, marginTop: 8 }}>
            It is access."
          </p>
        </div>
      </section>

      <div className="divider" />

      {/* ── COMPANION SECTION ── */}
      <section style={{ padding: '120px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>

          <div>
            <p className="section-label" style={{ marginBottom: 12 }}>The one thing no other tool has</p>
            <div style={{ width: 48, height: 2, background: 'linear-gradient(90deg,#d4a050,transparent)', marginBottom: 32 }} />

            <h2 className="font-display" style={{ fontSize: 'clamp(2rem,4vw,3.5rem)', fontWeight: 700, lineHeight: 1.2, marginBottom: 28, color: '#fff' }}>
              Not everyone had
              <em style={{ color: '#d4a050', display: 'block' }}> someone who knew.</em>
            </h2>

            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '1rem', color: 'rgba(255,255,255,.45)', lineHeight: 1.85, marginBottom: 20 }}>
              Some people had a parent in the industry. A mentor who made the call. A teacher who sat with them and said — here's what they're actually looking for.
            </p>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '1rem', color: 'rgba(255,255,255,.45)', lineHeight: 1.85, marginBottom: 32 }}>
              Most people didn't. Not because they weren't loved — but because the people who loved them didn't know how the system worked either.
            </p>
            <p className="font-display" style={{ fontSize: '1.3rem', color: '#fff', fontStyle: 'italic', fontWeight: 700 }}>
              Tell us who you needed.
              <span style={{ color: '#d4a050' }}> We become them.</span>
            </p>
          </div>

          {/* Companion grid */}
          <div className="glass" style={{ borderRadius: 28, padding: 36 }}>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '.65rem', color: 'rgba(255,255,255,.25)', letterSpacing: '.2em', textTransform: 'uppercase', textAlign: 'center', marginBottom: 28 }}>
              Who will guide you?
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {COMPANIONS.map((c, i) => (
                <div key={i}
                  className={`companion-chip ${activeCompanion === i ? 'active' : ''}`}
                  onMouseEnter={() => setActiveCompanion(i)}
                  style={{ borderRadius: 16, padding: '16px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>{c.emoji}</div>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '.72rem', color: 'rgba(255,255,255,.5)' }}>{c.label}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, padding: '16px 20px', borderRadius: 14, background: 'rgba(212,160,80,.07)', border: '1px solid rgba(212,160,80,.18)', textAlign: 'center' }}>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '.78rem', color: '#d4a050', lineHeight: 1.6 }}>
                No career product in the world does this.
                <span style={{ color: 'rgba(255,255,255,.3)', display: 'block', marginTop: 4 }}>
                  Because none of them understood why it matters.
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* ── FOUR POWERS ── */}
      <section style={{ padding: '120px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <p className="section-label" style={{ marginBottom: 12 }}>What DAD actually does</p>
        <div style={{ width: 48, height: 2, background: 'linear-gradient(90deg,#d4a050,transparent)', marginBottom: 32 }} />
        <h2 className="font-display" style={{ fontSize: 'clamp(2rem,4vw,3.5rem)', fontWeight: 700, lineHeight: 1.2, maxWidth: 600, marginBottom: 72, color: '#fff' }}>
          Not features.
          <em style={{ color: '#d4a050' }}> Outcomes</em> that change what's possible.
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
          {[
            {
              number: "01",
              title: "Resume Review",
              description: "DAD reads your CV the way a recruiter actually does. ATS score, salary range, skill gaps, job matches. Not to flatter you — to prepare you.",
              outcome: "You stop guessing. You start knowing.",
              icon: "📄",
            },
            {
              number: "02",
              title: "Career Assessment",
              description: "No experience? Starting from zero? Answer honestly. DAD maps where you are, where you could go, and exactly what to build next. Your path. Nobody else's.",
              outcome: "You see your future clearly for the first time.",
              icon: "🧭",
            },
            {
              number: "03",
              title: "Mock Interview",
              description: "Paste a job description. DAD becomes the interviewer. Real pressure, real questions, honest scoring, ideal answers, and a prep guide you keep forever.",
              outcome: "You walk in knowing what's coming.",
              icon: "🎯",
            },
            {
              number: "04",
              title: "Voice Guidance",
              description: "A real conversation. Career advice, strategy, or talking through what's on your mind. Some nights you don't need a tool. You need someone to say: you're closer than you think.",
              outcome: "You're never navigating this alone.",
              icon: "🎙️",
            },
          ].map((f, i) => (
            <div key={i} className="feature-card" style={{ borderRadius: 24, padding: 40 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                <span style={{ fontSize: '2rem' }}>{f.icon}</span>
                <span className="font-display" style={{ fontSize: '3rem', fontWeight: 900, color: 'rgba(212,160,80,.15)', lineHeight: 1 }}>{f.number}</span>
              </div>
              <h3 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: 14 }}>{f.title}</h3>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '.88rem', color: 'rgba(255,255,255,.38)', lineHeight: 1.8, marginBottom: 24 }}>{f.description}</p>
              <div style={{ height: 1, background: 'linear-gradient(90deg,rgba(212,160,80,.3),transparent)', marginBottom: 20 }} />
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '.85rem', color: '#d4a050', fontStyle: 'italic' }}>{f.outcome}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* ── WHO IT'S FOR ── */}
      <section style={{ padding: '120px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <p className="section-label" style={{ marginBottom: 12 }}>Who DAD is for</p>
        <div style={{ width: 48, height: 2, background: 'linear-gradient(90deg,#d4a050,transparent)', marginBottom: 32 }} />
        <h2 className="font-display" style={{ fontSize: 'clamp(2rem,4vw,3.5rem)', fontWeight: 700, lineHeight: 1.2, maxWidth: 700, marginBottom: 72, color: '#fff' }}>
          Anyone who has ever had to figure this out
          <em style={{ color: '#d4a050' }}> without the right guide.</em>
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
          {WHO_FOR.map((w, i) => (
            <div key={i} className="who-card" style={{ borderRadius: 24, padding: 36 }}>
              <div style={{ fontSize: '2.2rem', marginBottom: 20 }}>{w.icon}</div>
              <h3 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', marginBottom: 14 }}>{w.title}</h3>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '.88rem', color: 'rgba(255,255,255,.38)', lineHeight: 1.8 }}>{w.description}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* ── PROMISE / LOADING SCREEN ── */}
      <section style={{ padding: '120px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(212,160,80,.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ maxWidth: 700, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div className="anim-float" style={{ fontSize: '3rem', marginBottom: 32 }}>🏃 👨</div>
          <p className="section-label" style={{ marginBottom: 20 }}>Every time you wait for results</p>
          <h2 className="font-display" style={{ fontSize: 'clamp(1.8rem,4vw,3.2rem)', fontWeight: 700, lineHeight: 1.3, color: '#fff', marginBottom: 20 }}>
            "Someone who believes in you
            <em style={{ color: '#d4a050', display: 'block', marginTop: 4 }}>is preparing your results."</em>
          </h2>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '1rem', color: 'rgba(255,255,255,.35)', lineHeight: 1.8, maxWidth: 500, margin: '0 auto' }}>
            Every other tool shows a spinner while you wait.
            DAD shows you something different — because what you're waiting for isn't a process.
            <span style={{ color: 'rgba(255,255,255,.6)', fontWeight: 500 }}> It's someone who's working for you.</span>
          </p>
        </div>
      </section>

      <div className="divider" />

      {/* ── FINAL CTA ── */}
      <section style={{ padding: '160px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(212,160,80,.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div className="font-display anim-float" style={{ fontSize: 'clamp(5rem,15vw,12rem)', fontWeight: 900, color: '#d4a050', lineHeight: 1, marginBottom: 40, opacity: .9 }}>
            DAD
          </div>

          <h2 className="font-display" style={{ fontSize: 'clamp(2rem,5vw,4rem)', fontWeight: 700, lineHeight: 1.2, color: '#fff', marginBottom: 24 }}>
            Millions are doing this alone.
            <em style={{ color: '#d4a050', display: 'block', marginTop: 8 }}>You don't have to.</em>
          </h2>

          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '1.1rem', color: 'rgba(255,255,255,.38)', lineHeight: 1.85, maxWidth: 560, margin: '0 auto 48px' }}>
            The guidance you needed — from whoever that person should have been for you —
            is here. For your career. For your confidence. For the moments when you need someone in your corner.
          </p>

          <Link href="/signup" className="btn-gold"
            style={{
              fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: '1.15rem',
              color: '#0a0a0a', padding: '20px 56px', borderRadius: 999, textDecoration: 'none',
              display: 'inline-block', letterSpacing: '-.01em',
            }}>
            Find your support →
          </Link>

          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '.7rem', color: 'rgba(255,255,255,.15)', letterSpacing: '.18em', textTransform: 'uppercase', marginTop: 40 }}>
            Built for everyone who deserved better guidance — and never got it.
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        padding: '40px', borderTop: '1px solid rgba(255,255,255,.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20,
      }}>
        <span className="font-display" style={{ fontSize: '1.4rem', fontWeight: 900, color: '#d4a050' }}>DAD</span>
        <div style={{ display: 'flex', gap: 32 }}>
          {[['Sign In', '/login'], ['Get Started', '/signup'], ['Mock Interview', '/interview']].map(([label, href]) => (
            <Link key={href} href={href}
              style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '.75rem', color: 'rgba(255,255,255,.25)', textDecoration: 'none', letterSpacing: '.05em' }}>
              {label}
            </Link>
          ))}
        </div>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '.72rem', color: 'rgba(255,255,255,.15)' }}>© 2026 DAD. For everyone.</p>
      </footer>
    </div>
  );
}
