"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, PhoneOff, ArrowLeft, Phone } from "lucide-react";
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

type Emotion = "idle" | "talking" | "happy" | "excited" | "sad" | "empathetic" | "proud" | "thinking";

const COMPANION_GREETINGS: Record<string, string[]> = {
  dad:     ["Hey. There's my kid. You okay?", "Hey. Good to hear your voice. Everything alright?", "Oh hey — I was just thinking about you. You good?"],
  mom:     ["Oh my god — you called! Are you okay? How are you?", "Oh sweetheart! I'm so happy you called. How are you, really?", "Oh thank god. I've been thinking about you. How are you?"],
  brother: ["Ohhhh there he is!! Bro I was literally just talking about you!", "Ayyyy! There's my guy! How are you? What's going on?", "Hey!! Oh man it's good to hear from you. What's going on?"],
  sister:  ["Oh my god hi!! Are you okay? Wait, are you okay?", "OH HI!! I missed you so much. How are you? Tell me everything.", "Oh thank god you called. Are you okay? Like actually okay?"],
  teacher: ["Oh how wonderful. I think about you, you know. How are you getting on?", "Oh! What a lovely surprise. How are you?", "Oh hello! This made my day. How are you?"],
  mentor:  ["Well this is a wonderful surprise. How are you getting on?", "Oh hey! It's so good to hear from you. How are you doing?", "Oh! Good timing. How are you?"],
  friend:  ["OH MY GOD. Finally!! I missed you so much. How are you?!", "Oh HEY!! I'm so happy you called. How are you?!", "Oh thank god you called — I missed you! How are you?"],
  partner: ["Hey you... I was just thinking about you. How are you?", "Hey my love... I missed you. How are you doing?", "Oh hey... there you are. I've been thinking about you. You okay?"],
  self:    ["Hey. Hi. I know you've been running. It's okay to stop. I'm here.", "Hey you. I see you. I know it's been a lot. Take a breath.", "Hey. You're safe here. No performance. Just us. How are you?"],
};

const COMPANION_LABELS: Record<string, string> = {
  dad: "Dad", mom: "Mom", brother: "Brother", sister: "Sister",
  teacher: "Teacher", mentor: "Mentor", friend: "Friend", partner: "Partner", self: "Yourself",
};

const EMOTION_LABELS: Record<Emotion, string> = {
  idle: "Here with you...",
  talking: "Speaking...",
  happy: "So happy for you!",
  excited: "Let's go!!",
  sad: "Feeling your pain...",
  empathetic: "I hear you...",
  proud: "So proud of you!",
  thinking: "Let me think...",
};

const SHIRT_COLORS: Record<Emotion, string> = {
  idle: "#d4a050",
  talking: "#d4a050",
  happy: "#FFD700",
  excited: "#FF6B35",
  sad: "#4a7ab5",
  empathetic: "#9b59b6",
  proud: "#27ae60",
  thinking: "#888888",
};

const VAPI_ASSISTANT_ID = "1312a1bf-ea33-48f7-aa21-1f16e414e885";

interface Particle { x:number; y:number; vx:number; vy:number; size:number; life:number; decay:number; color:string; }
interface FloatingItem { x:number; y:number; vx:number; vy:number; life:number; decay:number; size:number; color:string; type:"star"|"heart"|"dot"; angle?:number; spin?:number; }

export default function VoicePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [emotion, setEmotion] = useState<Emotion>("idle");
  const [transcript, setTranscript] = useState("");
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState("");
  const [connecting, setConnecting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vapiRef = useRef<Vapi | null>(null);
  const emotionRef = useRef<Emotion>("idle");
  const particlesRef = useRef<Particle[]>([]);
  const floatingRef = useRef<FloatingItem[]>([]);
  const frameRef = useRef<number>(0);
  const tRef = useRef(0);
  const analyzeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(false);

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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) interval = setInterval(() => setDuration(d => d + 1), 1000);
    else setDuration(0);
    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => { emotionRef.current = emotion; }, [emotion]);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

  const spawnEffects = useCallback((emo: Emotion, cx: number, cy: number) => {
    if (emo === "happy") {
      for (let i = 0; i < 25; i++) {
        const colors = ["#FFD700","#FF8C00","#fff","#FFA500"];
        particlesRef.current.push({
          x: cx+(Math.random()-0.5)*80, y: cy-180,
          vx: (Math.random()-0.5)*5, vy: -(Math.random()*6+3),
          size: Math.random()*4+2, life: 1, decay: 0.013,
          color: colors[Math.floor(Math.random()*colors.length)],
        });
      }
    }
    if (emo === "excited") {
      for (let i = 0; i < 40; i++) {
        const colors = ["#FF6B35","#FFD700","#fff","#FF3D00","#FFC300"];
        particlesRef.current.push({
          x: cx+(Math.random()-0.5)*100, y: cy-160,
          vx: (Math.random()-0.5)*8, vy: -(Math.random()*9+4),
          size: Math.random()*5+2, life: 1, decay: 0.011,
          color: colors[Math.floor(Math.random()*colors.length)],
        });
      }
    }
    if (emo === "proud") {
      for (let i = 0; i < 15; i++) {
        floatingRef.current.push({
          x: cx+(Math.random()-0.5)*120, y: cy-220+(Math.random()-0.5)*60,
          vx: (Math.random()-0.5)*0.5, vy: -(Math.random()*1+0.3),
          life: 1, decay: 0.008, size: Math.random()*14+8,
          color: "#FFD700", type: "star",
          angle: Math.random()*Math.PI*2, spin: (Math.random()-0.5)*0.1,
        });
      }
    }
    if (emo === "empathetic" || emo === "sad") {
      for (let i = 0; i < 8; i++) {
        floatingRef.current.push({
          x: cx+(Math.random()-0.5)*60, y: cy-220,
          vx: (Math.random()-0.5)*0.8, vy: -(Math.random()*1.5+0.5),
          life: 1, decay: 0.007, size: Math.random()*12+8,
          color: emo === "empathetic" ? "#c39bd3" : "#4a7ab5",
          type: "heart",
        });
      }
    }
  }, []);

  const analyzeEmotion = useCallback(async (text: string) => {
    if (!text || text.length < 8) return;
    try {
      const res = await fetch("/api/analyze-emotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return;
      const { emotion: detected } = await res.json();
      if (detected && detected !== emotionRef.current) {
        emotionRef.current = detected as Emotion;
        setEmotion(detected as Emotion);
        const canvas = canvasRef.current;
        if (canvas) spawnEffects(detected as Emotion, canvas.width/2, canvas.height*0.55);
      }
    } catch { /* silent */ }
  }, [spawnEffects]);

  // Canvas draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function drawStar(x: number, y: number, r: number, color: string, alpha: number) {
      ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
      ctx.translate(x, y); ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = i*Math.PI*2/5-Math.PI/2;
        const a2 = a+Math.PI/5;
        if (i===0) ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r);
        else ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
        ctx.lineTo(Math.cos(a2)*(r*0.4), Math.sin(a2)*(r*0.4));
      }
      ctx.closePath(); ctx.fill(); ctx.restore();
    }

    function drawHeart(x: number, y: number, size: number, color: string, alpha: number) {
      ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
      ctx.translate(x, y); ctx.beginPath();
      ctx.moveTo(0, size*0.3);
      ctx.bezierCurveTo(0,-size*0.3,-size,-size*0.3,-size,size*0.1);
      ctx.bezierCurveTo(-size,size*0.6,0,size,0,size);
      ctx.bezierCurveTo(0,size,size,size*0.6,size,size*0.1);
      ctx.bezierCurveTo(size,-size*0.3,0,-size*0.3,0,size*0.3);
      ctx.closePath(); ctx.fill(); ctx.restore();
    }

    function drawCharacter(cx: number, groundY: number, t: number, emo: Emotion, blink: boolean) {
      const s = Math.sin(t*0.02);
      const s2 = Math.sin(t*0.04);
      const s3 = Math.sin(t*0.06);

      // Pose per emotion
      let bodyBob=s*3, bodyTilt=s*0.01;
      let leftArm=0.15+s*0.03, rightArm=-0.15+s*0.03;
      let leftLeg=0, rightLeg=0;
      let headBob=s*2, headTilt=s*0.02;
      let mouthType:"neutral"|"smile"|"bigsmile"|"sad"|"talking"|"o" = "neutral";
      let lBrow=0, rBrow=0;
      let rightHandObj="";
      let leftHandObj="paper";
      const shirtColor = SHIRT_COLORS[emo];

      if (emo==="idle") {
        bodyBob=s*3; leftArm=0.15+s*0.03; rightArm=-0.15+s*0.03;
        headTilt=s*0.02; mouthType="neutral"; leftHandObj="paper";
      } else if (emo==="talking") {
        bodyBob=s*4; bodyTilt=s*0.02;
        leftArm=-0.3+s2*0.15; rightArm=-0.8+s3*0.3;
        headBob=s2*3; headTilt=s*0.05;
        mouthType="talking"; lBrow=-0.1; rBrow=0.1;
        rightHandObj="point"; leftHandObj="";
      } else if (emo==="happy") {
        const jump=Math.abs(s)*-10;
        bodyBob=jump; bodyTilt=s*0.03;
        leftArm=-0.8+s*0.2; rightArm=-0.8+s*0.2;
        leftLeg=s*0.12; rightLeg=-s*0.12;
        headBob=jump*0.5; headTilt=s*0.08;
        mouthType="bigsmile"; lBrow=-0.2; rBrow=-0.2; leftHandObj="";
      } else if (emo==="excited") {
        const bounce=Math.abs(Math.sin(t*0.07))*-22;
        bodyBob=bounce; bodyTilt=s3*0.06;
        leftArm=-1.3+s3*0.3; rightArm=-1.3+s2*0.3;
        leftLeg=s2*0.18; rightLeg=-s2*0.18;
        headBob=bounce*0.4; headTilt=s3*0.14;
        mouthType="o"; lBrow=-0.3; rBrow=-0.3;
        rightHandObj="thumbup"; leftHandObj="";
      } else if (emo==="sad") {
        bodyBob=10+s*2; bodyTilt=-0.08+s*0.01;
        leftArm=0.45; rightArm=-0.45;
        headBob=12+s*1; headTilt=-0.18+s*0.02;
        mouthType="sad"; lBrow=0.25; rBrow=-0.25; leftHandObj="";
      } else if (emo==="empathetic") {
        bodyBob=6+s*2; bodyTilt=s*0.015;
        leftArm=-0.55+s*0.05; rightArm=-0.65+s*0.05;
        headBob=5+s*2; headTilt=0.14+s*0.02;
        mouthType="sad"; lBrow=0.15; rBrow=-0.15; leftHandObj="";
      } else if (emo==="proud") {
        bodyBob=s*3; bodyTilt=s*0.01;
        leftArm=0.1; rightArm=-1.05+s*0.05;
        leftLeg=0.05; rightLeg=-0.05;
        headBob=s*2; headTilt=-0.05;
        mouthType="smile"; lBrow=-0.15; rBrow=-0.15;
        rightHandObj="thumbup"; leftHandObj="";
      } else if (emo==="thinking") {
        bodyBob=s*2; bodyTilt=-0.04;
        leftArm=0.1; rightArm=-1.15;
        headBob=2+s*2; headTilt=0.12+s*0.03;
        mouthType="neutral"; lBrow=0.12; rBrow=-0.22; leftHandObj="";
      }

      const skin="#e8c49a", hair="#2d1f0e", pants="#3d4a5c", shoe="#222";

      ctx.save();
      ctx.translate(cx, groundY);

      // Shadow
      ctx.save();
      ctx.scale(1.1, 0.15);
      const sg = ctx.createRadialGradient(0,0,0,0,0,55);
      sg.addColorStop(0,"rgba(0,0,0,0.35)");
      sg.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(0,0,55,0,Math.PI*2); ctx.fill();
      ctx.restore();

      ctx.rotate(bodyTilt);

      // LEFT LEG
      ctx.save(); ctx.translate(-18, 60+bodyBob); ctx.rotate(leftLeg);
      ctx.fillStyle=pants; ctx.beginPath(); ctx.roundRect(-9,0,18,55,4); ctx.fill();
      ctx.fillStyle=shoe; ctx.beginPath(); ctx.ellipse(0,57,13,7,0,0,Math.PI*2); ctx.fill();
      ctx.restore();

      // RIGHT LEG
      ctx.save(); ctx.translate(18, 60+bodyBob); ctx.rotate(rightLeg);
      ctx.fillStyle=pants; ctx.beginPath(); ctx.roundRect(-9,0,18,55,4); ctx.fill();
      ctx.fillStyle=shoe; ctx.beginPath(); ctx.ellipse(0,57,13,7,0,0,Math.PI*2); ctx.fill();
      ctx.restore();

      // TORSO
      ctx.fillStyle=shirtColor;
      ctx.beginPath(); ctx.roundRect(-33,-20+bodyBob,66,80,8); ctx.fill();

      // LEFT ARM
      ctx.save(); ctx.translate(-33,-10+bodyBob); ctx.rotate(leftArm);
      ctx.fillStyle=shirtColor; ctx.beginPath(); ctx.roundRect(-10,0,18,58,6); ctx.fill();
      ctx.fillStyle=skin; ctx.beginPath(); ctx.arc(-1,61,10,0,Math.PI*2); ctx.fill();
      if (leftHandObj==="paper") {
        ctx.fillStyle="#f5f0e8"; ctx.save(); ctx.translate(-1,61); ctx.rotate(-0.3);
        ctx.beginPath(); ctx.roundRect(-8,-12,16,24,2); ctx.fill();
        ctx.strokeStyle="#ddd"; ctx.lineWidth=0.5;
        for (let i=-6;i<6;i+=4) { ctx.beginPath(); ctx.moveTo(-6,i); ctx.lineTo(6,i); ctx.stroke(); }
        ctx.restore();
      }
      ctx.restore();

      // RIGHT ARM
      ctx.save(); ctx.translate(33,-10+bodyBob); ctx.rotate(rightArm);
      ctx.fillStyle=shirtColor; ctx.beginPath(); ctx.roundRect(-8,0,18,58,6); ctx.fill();
      ctx.fillStyle=skin; ctx.beginPath(); ctx.arc(1,61,10,0,Math.PI*2); ctx.fill();
      if (rightHandObj==="point") {
        ctx.fillStyle=skin; ctx.save(); ctx.translate(1,61);
        ctx.beginPath(); ctx.roundRect(-4,-4,28,8,4); ctx.fill();
        ctx.restore();
      }
      if (rightHandObj==="thumbup") {
        ctx.fillStyle=skin; ctx.save(); ctx.translate(1,61); ctx.rotate(-0.3);
        ctx.beginPath(); ctx.roundRect(-5,-5,10,22,4); ctx.fill();
        ctx.beginPath(); ctx.roundRect(-5,-18,24,12,4); ctx.fill();
        ctx.restore();
      }
      ctx.restore();

      // NECK
      ctx.fillStyle=skin; ctx.beginPath(); ctx.roundRect(-10,-28+bodyBob,20,16,3); ctx.fill();

      // HEAD
      ctx.save(); ctx.translate(0,-62+bodyBob+headBob); ctx.rotate(headTilt);

      ctx.fillStyle=skin; ctx.beginPath(); ctx.ellipse(0,0,33,37,0,0,Math.PI*2); ctx.fill();

      // Hair
      ctx.fillStyle=hair;
      ctx.beginPath(); ctx.ellipse(0,-22,33,19,0,Math.PI,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-29,-8,9,15,-0.5,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(29,-8,9,15,0.5,0,Math.PI*2); ctx.fill();

      // Ears
      ctx.fillStyle=skin;
      ctx.beginPath(); ctx.ellipse(-34,2,7,10,0,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(34,2,7,10,0,0,Math.PI*2); ctx.fill();

      // Eyes
      const blinkH = blink ? 1 : 8;
      ctx.fillStyle="#fff";
      ctx.beginPath(); ctx.ellipse(-12,-4,7,blinkH,0,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(12,-4,7,blinkH,0,0,Math.PI*2); ctx.fill();
      if (!blink) {
        ctx.fillStyle="#3d2b1a";
        ctx.beginPath(); ctx.arc(-12,-4,4,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(12,-4,4,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="#fff";
        ctx.beginPath(); ctx.arc(-10,-5,1.5,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(14,-5,1.5,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle=hair; ctx.lineWidth=2.5; ctx.lineCap="round";
        ctx.save(); ctx.translate(-12,-14); ctx.rotate(lBrow);
        ctx.beginPath(); ctx.moveTo(-8,0); ctx.lineTo(8,0); ctx.stroke(); ctx.restore();
        ctx.save(); ctx.translate(12,-14); ctx.rotate(rBrow);
        ctx.beginPath(); ctx.moveTo(-8,0); ctx.lineTo(8,0); ctx.stroke(); ctx.restore();
      }

      // Nose
      ctx.strokeStyle="#c4956a"; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(0,-2); ctx.lineTo(-4,6); ctx.moveTo(4,6); ctx.lineTo(-4,6); ctx.stroke();

      // Mouth
      ctx.strokeStyle="#8b5e3c"; ctx.lineWidth=2.5; ctx.lineCap="round";
      if (mouthType==="smile") { ctx.beginPath(); ctx.arc(0,8,12,0.2,Math.PI-0.2); ctx.stroke(); }
      else if (mouthType==="bigsmile") {
        ctx.fillStyle="#8b5e3c"; ctx.beginPath(); ctx.arc(0,8,14,0.1,Math.PI-0.1); ctx.fill();
        ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(0,10,10,0.2,Math.PI-0.2); ctx.fill();
      }
      else if (mouthType==="sad") { ctx.beginPath(); ctx.arc(0,18,12,Math.PI+0.2,-0.2); ctx.stroke(); }
      else if (mouthType==="talking") {
        const mo=Math.sin(tRef.current*0.3)*5;
        ctx.fillStyle="#6b3c2a"; ctx.beginPath(); ctx.ellipse(0,10,8,4+mo,0,0,Math.PI*2); ctx.fill();
      }
      else if (mouthType==="o") {
        ctx.fillStyle="#6b3c2a"; ctx.beginPath(); ctx.arc(0,10,9,0,Math.PI*2); ctx.fill();
      }
      else { ctx.beginPath(); ctx.moveTo(-8,10); ctx.lineTo(8,10); ctx.stroke(); }

      // Thought bubble (thinking)
      if (emo==="thinking") {
        const alpha=0.6+Math.sin(tRef.current*0.04)*0.3;
        ctx.save(); ctx.globalAlpha=alpha;
        ctx.fillStyle="rgba(180,180,180,0.18)"; ctx.strokeStyle="rgba(200,200,200,0.35)"; ctx.lineWidth=1.5;
        const bx=50, by=-60;
        [5,8,12].forEach((r,i) => {
          ctx.beginPath(); ctx.arc(bx-25+i*18,by+28-i*10,r,0,Math.PI*2); ctx.fill(); ctx.stroke();
        });
        ctx.beginPath(); ctx.roundRect(bx+5,by-28,70,44,10); ctx.fill(); ctx.stroke();
        ctx.globalAlpha=alpha*0.7; ctx.fillStyle="#ccc"; ctx.font="bold 20px sans-serif"; ctx.textAlign="center";
        ctx.fillText("...", bx+40, by-2);
        ctx.restore();
      }

      ctx.restore(); // head
      ctx.restore(); // body
    }

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      const cx = W/2;
      const groundY = H*0.76;
      const t = tRef.current++;
      const emo = emotionRef.current;
      const blink = (t % 160) < 4;

      // Background
      const bgColors: Record<Emotion, [string,string]> = {
        idle:       ["#0f0c08","#000"],
        talking:    ["#0a0a14","#000"],
        happy:      ["#141000","#000"],
        excited:    ["#160800","#000"],
        sad:        ["#05080f","#000"],
        empathetic: ["#0a0514","#000"],
        proud:      ["#031006","#000"],
        thinking:   ["#0a0a0a","#000"],
      };
      const [c1,c2] = bgColors[emo];
      const bg = ctx.createLinearGradient(0,0,0,H);
      bg.addColorStop(0,c1); bg.addColorStop(1,c2);
      ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

      // Ground line
      const gColors: Record<Emotion, string> = {
        idle:"#1a1208",talking:"#12121a",happy:"#1a1600",excited:"#180c00",
        sad:"#08101a",empathetic:"#100818",proud:"#041408",thinking:"#111"
      };
      const gg = ctx.createLinearGradient(0,groundY,0,H);
      gg.addColorStop(0,gColors[emo]); gg.addColorStop(1,"#000");
      ctx.fillStyle=gg; ctx.fillRect(0,groundY,W,H-groundY);

      // Ambient light glow behind character
      const glowColors: Record<Emotion, string> = {
        idle:"rgba(212,160,80,0.06)",talking:"rgba(212,160,80,0.08)",
        happy:"rgba(255,215,0,0.12)",excited:"rgba(255,107,53,0.15)",
        sad:"rgba(74,122,181,0.08)",empathetic:"rgba(155,89,182,0.1)",
        proud:"rgba(39,174,96,0.1)",thinking:"rgba(140,140,140,0.06)",
      };
      const glow = ctx.createRadialGradient(cx,groundY-100,20,cx,groundY-100,220);
      glow.addColorStop(0,glowColors[emo]); glow.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=glow; ctx.fillRect(0,0,W,H);

      drawCharacter(cx, groundY, t, emo, blink);

      // Particles
      particlesRef.current = particlesRef.current.filter(p => {
        p.life -= p.decay; if (p.life<=0) return false;
        p.vy += 0.15; p.vx *= 0.99;
        p.x += p.vx; p.y += p.vy;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
        return true;
      });

      // Floating items (stars, hearts)
      floatingRef.current = floatingRef.current.filter(fi => {
        fi.life -= fi.decay; if (fi.life<=0) return false;
        fi.x += fi.vx; fi.y += fi.vy;
        if (fi.type==="star" && fi.angle!==undefined && fi.spin!==undefined) {
          fi.angle += fi.spin;
          drawStar(fi.x,fi.y,fi.size,fi.color,fi.life*0.9);
        } else if (fi.type==="heart") {
          drawHeart(fi.x,fi.y,fi.size,fi.color,fi.life*0.8);
        }
        return true;
      });

      // Ambient rising particles
      const shirtC = SHIRT_COLORS[emo];
      if (Math.random() < 0.25) {
        particlesRef.current.push({
          x: cx+(Math.random()-0.5)*(W*0.4), y: groundY+10,
          vx: (Math.random()-0.5)*0.4, vy: -(Math.random()*0.8+0.3),
          size: Math.random()*1.5+0.3, life: 1, decay: Math.random()*0.006+0.003,
          color: shirtC,
        });
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    // Auto spawn effects
    const effectInterval = setInterval(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const emo = emotionRef.current;
      if (["happy","excited","proud","empathetic","sad"].includes(emo)) {
        spawnEffects(emo, canvas.width/2, canvas.height*0.55);
      }
    }, 900);

    return () => {
      cancelAnimationFrame(frameRef.current);
      clearInterval(effectInterval);
      ro.disconnect();
    };
  }, [spawnEffects]);

  const startCall = async () => {
    const vapiKey = process.env.NEXT_PUBLIC_VAPI_PUBLICKEY;
    if (!vapiKey || connecting) return;
    const type = profile?.companion_type || "dad";
    const greetings = COMPANION_GREETINGS[type] || COMPANION_GREETINGS.dad;
    const selectedGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    setConnecting(true);
    setStatus("Connecting...");
    try {
      const vapiInstance = new Vapi(vapiKey);
      vapiRef.current = vapiInstance;

      vapiInstance.on("call-start", () => {
        setIsActive(true); setConnecting(false); setStatus("");
        setEmotion("talking"); emotionRef.current = "talking";
      });
      vapiInstance.on("call-end", () => {
        setIsActive(false); setConnecting(false); setStatus("");
        setEmotion("idle"); emotionRef.current = "idle";
        vapiRef.current = null;
      });
      vapiInstance.on("error", () => {
        setIsActive(false); setConnecting(false);
        setStatus("Connection failed. Try again.");
        vapiRef.current = null;
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vapiInstance.on("message", (msg: any) => {
        if (msg?.type==="transcript" && msg?.role==="assistant" && msg?.transcriptType==="final") {
          const text = msg.transcript;
          setTranscript(text);
          if (analyzeTimeoutRef.current) clearTimeout(analyzeTimeoutRef.current);
          analyzeTimeoutRef.current = setTimeout(() => analyzeEmotion(text), 400);
        }
        if (msg?.type==="speech-start" && msg?.role==="assistant") {
          if (emotionRef.current === "idle" || emotionRef.current === "thinking") {
            setEmotion("talking"); emotionRef.current = "talking";
          }
        }
        if (msg?.type==="speech-end" && msg?.role==="assistant") {
          setTimeout(() => {
            if (emotionRef.current === "talking") {
              setEmotion("thinking"); emotionRef.current = "thinking";
            }
          }, 500);
        }
      });

      await vapiInstance.start(VAPI_ASSISTANT_ID, { firstMessage: selectedGreeting });
    } catch {
      setConnecting(false);
      setStatus("Failed to connect. Please try again.");
    }
  };

  const endCall = () => {
    if (vapiRef.current) { try { vapiRef.current.stop(); } catch { /* ignore */ } vapiRef.current = null; }
    setIsActive(false); setConnecting(false); setStatus("");
    setEmotion("idle"); emotionRef.current = "idle";
  };

  const toggleMute = () => {
    if (vapiRef.current) { try { vapiRef.current.setMuted(!muted); setMuted(!muted); } catch { /* ignore */ } }
  };

  const formatDuration = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,"0")}`;
  const companionType = profile?.companion_type || "dad";
  const companionName = profile?.companion_name || "DAD";

  return (
    <div style={{ position:"fixed", inset:0, background:"#000", overflow:"hidden", fontFamily:"sans-serif", display:"flex", flexDirection:"column" }}>
      {/* Canvas fills everything */}
      <canvas ref={canvasRef} style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} />

      {/* Back */}
      <Link href="/dashboard" style={{
        position:"absolute", top:20, left:20, zIndex:20,
        color:"rgba(255,255,255,0.3)", display:"flex", alignItems:"center",
        gap:6, fontSize:11, textDecoration:"none", letterSpacing:"0.3em", textTransform:"uppercase",
      }}>
        <ArrowLeft size={13} /> Back
      </Link>

      {/* Duration */}
      {isActive && (
        <div style={{
          position:"absolute", top:24, right:20, zIndex:20,
          color:"rgba(255,255,255,0.4)", fontSize:12,
          fontFamily:"monospace", letterSpacing:"0.15em",
        }}>
          {formatDuration(duration)}
        </div>
      )}

      {/* Companion name — top center */}
      <div style={{
        position:"absolute", top:20, left:"50%", transform:"translateX(-50%)",
        zIndex:20, textAlign:"center",
      }}>
        <p style={{ fontSize:9, color:"rgba(255,255,255,0.2)", letterSpacing:"0.4em", textTransform:"uppercase", margin:0 }}>
          {COMPANION_LABELS[companionType]}
        </p>
        <p style={{ fontSize:18, fontWeight:200, color:"rgba(255,255,255,0.7)", letterSpacing:"0.2em", margin:0 }}>
          {companionName}
        </p>
      </div>

      {/* Emotion label — just above bottom UI */}
      <div style={{
        position:"absolute", bottom:160, left:"50%", transform:"translateX(-50%)",
        zIndex:20, textAlign:"center",
      }}>
        <p style={{
          fontSize:11, color:"rgba(255,255,255,0.25)",
          letterSpacing:"0.3em", textTransform:"uppercase", margin:0,
          transition:"all 0.8s ease",
        }}>
          {isActive ? EMOTION_LABELS[emotion] : "Tap to connect"}
        </p>
        {isActive && transcript && (
          <p style={{
            fontSize:13, color:"rgba(255,255,255,0.5)",
            fontStyle:"italic", maxWidth:300, margin:"8px auto 0",
            lineHeight:1.5,
          }}>
            "{transcript.slice(0,80)}{transcript.length>80?"...":""}"
          </p>
        )}
        {status && <p style={{ fontSize:11, color:"rgba(255,80,80,0.7)", margin:"8px 0 0" }}>{status}</p>}
      </div>

      {/* Controls — bottom */}
      <div style={{
        position:"absolute", bottom:40, left:"50%", transform:"translateX(-50%)",
        zIndex:20, display:"flex", gap:16, alignItems:"center",
      }}>
        {!isActive ? (
          <button onClick={startCall} disabled={connecting} style={{
            width:68, height:68, borderRadius:"50%", border:"none",
            background:"linear-gradient(135deg,#d4a050,#a07030)",
            cursor:connecting?"not-allowed":"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 0 40px rgba(212,160,80,0.5)",
            opacity:connecting?0.5:1, transition:"all 0.3s ease",
          }}>
            <Phone size={26} color="#000" />
          </button>
        ) : (
          <>
            <button onClick={toggleMute} style={{
              width:52, height:52, borderRadius:"50%",
              border:`1px solid ${muted?"rgba(220,60,60,0.5)":"rgba(255,255,255,0.12)"}`,
              background:muted?"rgba(220,60,60,0.15)":"rgba(255,255,255,0.05)",
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
              transition:"all 0.3s ease",
            }}>
              {muted ? <MicOff size={20} color="rgba(220,100,100,0.9)" /> : <Mic size={20} color="rgba(255,255,255,0.6)" />}
            </button>
            <button onClick={endCall} style={{
              width:68, height:68, borderRadius:"50%",
              border:"1px solid rgba(220,60,60,0.4)",
              background:"rgba(220,60,60,0.2)",
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:"0 0 20px rgba(220,60,60,0.2)",
              transition:"all 0.3s ease",
            }}>
              <PhoneOff size={26} color="rgba(220,100,100,0.9)" />
            </button>
          </>
        )}
      </div>

      <p style={{
        position:"absolute", bottom:14, left:"50%", transform:"translateX(-50%)",
        fontSize:9, color:"rgba(255,255,255,0.08)",
        letterSpacing:"0.3em", textTransform:"uppercase", zIndex:20, whiteSpace:"nowrap",
      }}>
        DAD · Dreams. Actions. Destiny.
      </p>
    </div>
  );
}
