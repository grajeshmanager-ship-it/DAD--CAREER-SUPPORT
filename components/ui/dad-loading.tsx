"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  full_name: string;
  companion_type: string;
  companion_name: string;
}

const STAGES = [
  { title: "Discovery", sub: "& Dreams", icon: "✦" },
  { title: "Learning", sub: "& Growing", icon: "◈" },
  { title: "Challenges", sub: "& Struggles", icon: "△" },
  { title: "Building", sub: "The Future", icon: "⬡" },
  { title: "Opportunities", sub: "& Interviews", icon: "◎" },
  { title: "New", sub: "Beginnings", icon: "◌" },
  { title: "Achieving", sub: "Destiny", icon: "★" },
];

const COMPANIONS: Record<string, {
  label: string;
  message: string;
  glowColor: string;
  shadowColor: string;
  accentColor: string;
}> = {
  dad:     { label: "Father",    message: "is walking beside you, every step of the way.",      glowColor: "#d4a050", shadowColor: "rgba(212,160,80,",  accentColor: "#FFD700" },
  mom:     { label: "Mother",    message: "is right here with you, always.",                    glowColor: "#c878c8", shadowColor: "rgba(200,120,200,",  accentColor: "#DA70D6" },
  brother: { label: "Brother",   message: "has your back, no matter what.",                    glowColor: "#5090e0", shadowColor: "rgba(80,144,224,",   accentColor: "#4FC3F7" },
  sister:  { label: "Sister",    message: "believes in you more than you know.",               glowColor: "#e05080", shadowColor: "rgba(224,80,128,",   accentColor: "#F48FB1" },
  mentor:  { label: "Mentor",    message: "is lighting the path ahead of you.",                glowColor: "#50c878", shadowColor: "rgba(80,200,120,",   accentColor: "#69F0AE" },
  friend:  { label: "Friend",    message: "is cheering you on every single day.",              glowColor: "#e0a030", shadowColor: "rgba(224,160,48,",   accentColor: "#FFD54F" },
  partner: { label: "Partner",   message: "walks this journey with you, hand in hand.",        glowColor: "#e05050", shadowColor: "rgba(224,80,80,",    accentColor: "#EF9A9A" },
  teacher: { label: "Teacher",   message: "sees the potential in you that you can't yet see.", glowColor: "#50b0d0", shadowColor: "rgba(80,176,208,",   accentColor: "#80DEEA" },
  self:    { label: "Inner Self","message": "You are stronger than you believe. Trust yourself.", glowColor: "#9060e0", shadowColor: "rgba(144,96,224,", accentColor: "#CE93D8" },
};

const LOADING_MESSAGES = [
  "Gathering your opportunities...",
  "Mapping your career path...",
  "Connecting with your guide...",
  "Preparing your journey...",
  "Almost there...",
  "Ready to begin...",
];

export default function DadLoading({ onComplete }: { onComplete?: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [progress, setProgress] = useState(0);
  const [activeStage, setActiveStage] = useState(-1);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; size: number; delay: number; duration: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneT = useRef(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) setProfile(data);
    };
    loadProfile();
  }, []);

  // Generate particles once on mount
  useEffect(() => {
    setParticles(
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        delay: Math.random() * 6,
        duration: Math.random() * 4 + 3,
      }))
    );
  }, []);

  // Progress animation
  useEffect(() => {
    let pct = 0;
    const interval = setInterval(() => {
      pct += 0.4;
      if (pct >= 100) {
        pct = 100;
        clearInterval(interval);
        setTimeout(() => onComplete?.(), 600);
      }
      setProgress(pct);
      const stageIdx = Math.min(Math.floor((pct / 100) * 7), 6);
      setActiveStage(stageIdx);
      const msgIdx = Math.min(Math.floor(pct / 17), LOADING_MESSAGES.length - 1);
      setLoadingMsg(LOADING_MESSAGES[msgIdx]);
    }, 40);
    return () => clearInterval(interval);
  }, [onComplete]);

  // Canvas — cinematic silhouette scene
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    function drawSilhouette(
      cx: number, baseY: number, scale: number,
      fillColor: string, glowColor: string, glowAlpha: number, blur: number
    ) {
      ctx.save();
      if (blur > 0) ctx.filter = `blur(${blur}px)`;
      ctx.fillStyle = fillColor;
      ctx.translate(cx, baseY);
      ctx.scale(scale, scale);

      // HEAD
      ctx.beginPath();
      ctx.arc(0, -108, 18, 0, Math.PI * 2);
      ctx.fill();

      // NECK
      ctx.beginPath();
      ctx.roundRect(-7, -90, 14, 15, 2);
      ctx.fill();

      // TORSO
      ctx.beginPath();
      ctx.moveTo(-32, -78);
      ctx.bezierCurveTo(-36, -70, -34, -50, -18, 0);
      ctx.lineTo(18, 0);
      ctx.bezierCurveTo(34, -50, 36, -70, 32, -78);
      ctx.bezierCurveTo(24, -88, -24, -88, -32, -78);
      ctx.closePath();
      ctx.fill();

      // LEFT ARM
      ctx.save(); ctx.translate(-32, -75); ctx.rotate(0.15);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-8, 15, -10, 35, -6, 58);
      ctx.bezierCurveTo(-4, 64, 4, 64, 6, 58);
      ctx.bezierCurveTo(10, 35, 8, 15, 0, 0);
      ctx.closePath(); ctx.fill(); ctx.restore();

      // RIGHT ARM
      ctx.save(); ctx.translate(32, -75); ctx.rotate(-0.15);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(8, 15, 10, 35, 6, 58);
      ctx.bezierCurveTo(4, 64, -4, 64, -6, 58);
      ctx.bezierCurveTo(-10, 35, -8, 15, 0, 0);
      ctx.closePath(); ctx.fill(); ctx.restore();

      // LEFT LEG
      ctx.save(); ctx.translate(-12, 0);
      ctx.beginPath();
      ctx.moveTo(-10, 0); ctx.bezierCurveTo(-14, 30, -12, 60, -10, 88);
      ctx.bezierCurveTo(-8, 95, 2, 95, 4, 88);
      ctx.bezierCurveTo(6, 60, 4, 30, 0, 0);
      ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-4, 91, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      // RIGHT LEG
      ctx.save(); ctx.translate(12, 0);
      ctx.beginPath();
      ctx.moveTo(10, 0); ctx.bezierCurveTo(14, 30, 12, 60, 10, 88);
      ctx.bezierCurveTo(8, 95, -2, 95, -4, 88);
      ctx.bezierCurveTo(-6, 60, -4, 30, 0, 0);
      ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.ellipse(4, 91, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      ctx.filter = "none";
      ctx.restore();

      // Glow aura around silhouette
      if (glowAlpha > 0) {
        ctx.save();
        const aura = ctx.createRadialGradient(cx, baseY - 50, 10, cx, baseY - 50, 100);
        aura.addColorStop(0, glowColor.replace("rgba(", "rgba(").replace(/,[^,]+\)$/, `,${glowAlpha})`));
        aura.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = aura;
        ctx.fillRect(cx - 120, baseY - 150, 240, 200);
        ctx.restore();
      }
    }

    function drawScene() {
     if (!canvas) return;
const W = canvas.offsetWidth;
const H = canvas.offsetHeight;
      sceneT.current++;
      const t = sceneT.current;

      ctx.clearRect(0, 0, W, H);

      const companion = profile?.companion_type || "dad";
      const c = COMPANIONS[companion] || COMPANIONS.dad;
      const [sr, sg, sb] = c.shadowColor.replace("rgba(", "").replace(",", "").split(",").map(Number);

      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#060410");
      sky.addColorStop(0.6, "#0d0d20");
      sky.addColorStop(1, "#000");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

      // Horizon glow
      const hx = W * 0.5, hy = H * 0.72;
      const hglow = ctx.createRadialGradient(hx, hy, 0, hx, hy, W * 0.5);
      hglow.addColorStop(0, `rgba(${sr},${sg},${sb},0.35)`);
      hglow.addColorStop(0.4, `rgba(${sr},${sg},${sb},0.08)`);
      hglow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = hglow; ctx.fillRect(0, 0, W, H);

      // Ground
      const grd = ctx.createLinearGradient(0, H * 0.7, 0, H);
      grd.addColorStop(0, `rgba(${sr},${sg},${sb},0.12)`);
      grd.addColorStop(1, "rgba(0,0,0,1)");
      ctx.fillStyle = grd; ctx.fillRect(0, H * 0.7, W, H * 0.3);

      // Ground line
      ctx.strokeStyle = `rgba(${sr},${sg},${sb},0.25)`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, H * 0.72); ctx.lineTo(W, H * 0.72); ctx.stroke();

      // Path glow on ground
      const path = ctx.createLinearGradient(0, 0, W, 0);
      path.addColorStop(0, "rgba(0,0,0,0)");
      path.addColorStop(0.5, `rgba(${sr},${sg},${sb},0.08)`);
      path.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = path; ctx.fillRect(0, H * 0.68, W, H * 0.06);

      const bob = Math.sin(t * 0.04) * 2;
      const groundY = H * 0.72;

      // Companion shadow silhouette
      drawSilhouette(
        W * 0.56, groundY + bob * 0.6, 0.88,
        `rgba(${sr},${sg},${sb},0.65)`,
        c.shadowColor, 0.3, 5
      );

      // Main person — dark silhouette
      drawSilhouette(
        W * 0.44, groundY + bob, 1.0,
        "rgba(12,8,6,0.98)",
        "rgba(255,200,100,", 0.05, 0
      );

      // Subtle connection between them
      const bondA = 0.1 + 0.05 * Math.sin(t * 0.04);
      ctx.strokeStyle = `rgba(${sr},${sg},${sb},${bondA})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 12]);
      ctx.beginPath();
      ctx.moveTo(W * 0.44 + 35, groundY - 60);
      ctx.lineTo(W * 0.56 - 30, groundY - 58);
      ctx.stroke();
      ctx.setLineDash([]);

      // Ground shadow under feet
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath(); ctx.ellipse(W * 0.44, groundY + 4, 20, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(W * 0.56, groundY + 5, 18, 4, 0, 0, Math.PI * 2); ctx.fill();

      frameRef.current = requestAnimationFrame(drawScene);
    }

    frameRef.current = requestAnimationFrame(drawScene);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [profile]);

  const companion = profile?.companion_type || "dad";
  const companionData = COMPANIONS[companion] || COMPANIONS.dad;
  const companionName = profile?.companion_name || companionData.label;

  return (
    <div className="min-h-screen bg-[#050816] overflow-hidden text-white relative flex flex-col items-center justify-center px-4 py-8">

      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d1830] via-[#0a1020] to-black" />

      {/* Top glow */}
      <motion.div
        className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${companionData.glowColor}18, transparent 70%)` }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Bottom glow */}
      <div
        className="absolute bottom-[-200px] left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${companionData.glowColor}10, transparent 70%)` }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              left: `${p.x}%`,
              top: `${p.y}%`,
              background: companionData.accentColor,
            }}
            animate={{ opacity: [0, 0.4, 0], y: [0, -40, -80], scale: [0, 1, 0] }}
            transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* HEADER */}
      <motion.div
        className="relative z-10 text-center mb-8"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-light leading-tight text-white/90">
          Every great journey has
        </h1>
        <motion.h2
          className="text-3xl md:text-5xl lg:text-6xl font-bold mt-1"
          style={{ color: companionData.accentColor }}
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          someone walking beside you.
        </motion.h2>
        <p className="mt-4 text-sm text-gray-400 tracking-widest uppercase">
          Your journey · Our guidance · Your destiny
        </p>
      </motion.div>

      {/* CINEMATIC SCENE */}
      <motion.div
        className="relative z-10 w-full max-w-2xl mb-6"
        style={{ height: 220 }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.3 }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ borderRadius: 16 }}
        />
      </motion.div>

      {/* COMPANION MESSAGE */}
      <motion.div
        className="relative z-10 text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.6 }}
      >
        <p className="text-xs tracking-[0.4em] uppercase mb-2" style={{ color: `${companionData.accentColor}80` }}>
          {companionData.label}
        </p>
        <AnimatePresence mode="wait">
          <motion.p
            key={companion}
            className="text-lg md:text-2xl font-light text-white/85 leading-relaxed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
          >
            {companion === "self" ? (
              <span style={{ color: companionData.accentColor }} className="font-semibold">You</span>
            ) : (
              <>
                Your{" "}
                <span style={{ color: companionData.accentColor }} className="font-semibold">
                  {companionName}
                </span>
              </>
            )}{" "}
            {companionData.message}
          </motion.p>
        </AnimatePresence>
      </motion.div>

      {/* JOURNEY STAGES TIMELINE */}
      <motion.div
        className="relative z-10 w-full max-w-5xl mb-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.8 }}
      >
        {/* Timeline line */}
        <div className="relative mb-4">
          <div className="absolute top-[14px] left-[3%] right-[3%] h-[1px] bg-white/5" />
          <motion.div
            className="absolute top-[14px] left-[3%] h-[1px]"
            style={{ background: `linear-gradient(90deg, ${companionData.accentColor}, ${companionData.glowColor})` }}
            animate={{ width: `${(progress / 100) * 94}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>

        <div className="grid grid-cols-7 gap-2 px-2">
          {STAGES.map((stage, i) => (
            <motion.div
              key={i}
              className="relative rounded-2xl overflow-hidden border"
              style={{
                height: 140,
                borderColor: i <= activeStage
                  ? `${companionData.accentColor}50`
                  : "rgba(255,255,255,0.06)",
                background: i <= activeStage
                  ? `linear-gradient(160deg, ${companionData.accentColor}12, rgba(0,0,0,0.8))`
                  : "rgba(255,255,255,0.02)",
              }}
              animate={{
                y: i === activeStage ? -8 : 0,
                scale: i === activeStage ? 1.04 : 1,
                boxShadow: i === activeStage
                  ? `0 12px 30px ${companionData.accentColor}20`
                  : "0 0 0 rgba(0,0,0,0)",
              }}
              transition={{ duration: 0.5, type: "spring", bounce: 0.3 }}
            >
              {/* Background number */}
              <div className="absolute inset-0 flex items-center justify-center text-[60px] font-black"
                style={{ color: i <= activeStage ? `${companionData.accentColor}08` : "rgba(255,255,255,0.02)" }}>
                {i + 1}
              </div>

              {/* Shimmer on active */}
              {i === activeStage && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `linear-gradient(105deg, transparent 30%, ${companionData.accentColor}15 50%, transparent 70%)`,
                  }}
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                />
              )}

              {/* Top dot */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-10">
                <span className="text-base" style={{ color: i <= activeStage ? companionData.accentColor : "rgba(255,255,255,0.15)" }}>
                  {stage.icon}
                </span>
                <motion.div
                  className="w-2 h-2 rounded-full"
                  style={{ background: i <= activeStage ? companionData.accentColor : "rgba(255,255,255,0.1)" }}
                  animate={i === activeStage ? {
                    boxShadow: [
                      `0 0 4px ${companionData.accentColor}`,
                      `0 0 16px ${companionData.accentColor}`,
                      `0 0 4px ${companionData.accentColor}`,
                    ]
                  } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </div>

              {/* Label */}
              <div className="absolute bottom-3 left-0 right-0 text-center px-1 z-10">
                <p className="text-[7px] uppercase tracking-[0.1em] leading-tight"
                  style={{ color: i <= activeStage ? `${companionData.accentColor}dd` : "rgba(255,255,255,0.2)" }}>
                  {stage.title}<br />{stage.sub}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* PROGRESS BAR */}
      <motion.div
        className="relative z-10 w-full max-w-2xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
      >
        <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden mb-3">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${companionData.accentColor}, ${companionData.glowColor})` }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.08 }}
          />
        </div>
        <div className="flex justify-between items-center">
          <motion.p
            key={loadingMsg}
            className="text-xs tracking-widest uppercase"
            style={{ color: `${companionData.accentColor}80` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {loadingMsg}
          </motion.p>
          <p className="text-xs font-mono" style={{ color: `${companionData.accentColor}60` }}>
            {Math.round(progress)}%
          </p>
        </div>
      </motion.div>

    </div>
  );
}
