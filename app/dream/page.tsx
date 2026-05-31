"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const DREAM_OPTIONS = [
  { id: "family", label: "Support my family", desc: "Give the people I love a better life", color: "#C9A84C" },
  { id: "home", label: "Buy a home", desc: "Build something that is truly mine", color: "#A07898" },
  { id: "abroad", label: "Move abroad", desc: "Build a life in a new country", color: "#6B8CFF" },
  { id: "freedom", label: "Financial freedom", desc: "Never worry about money again", color: "#5B9E7A" },
  { id: "leader", label: "Become a leader", desc: "Lead teams. Make real decisions. Have real impact.", color: "#B07070" },
  { id: "company", label: "Start a company", desc: "Build something from nothing", color: "#5B9898" },
  { id: "stability", label: "Find stability", desc: "A job I can count on. A life I can plan.", color: "#8870A8" },
  { id: "recognition", label: "Be recognised for my work", desc: "Do work that matters and be known for it", color: "#C9A84C" },
];

export default function DreamPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [customDream, setCustomDream] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [companionName, setCompanionName] = useState("DAD");
  const hasSpoken = useRef(false);

  const sans = "'Helvetica Neue', Arial, sans-serif";
  const serif = "'Georgia', 'Times New Roman', serif";
  const gold = "#C9A84C";
  const bg = "#070606";
  const dark = "#030202";
  const text = "#EBE5DC";

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("companion_name").eq("id", user.id).single();
      if (data?.companion_name) setCompanionName(data.companion_name);
    };
    load();
  }, []);

  useEffect(() => {
    if (hasSpoken.current || sessionStorage.getItem("dad_dream_voiced")) return;
    hasSpoken.current = true;
    sessionStorage.setItem("dad_dream_voiced", "1");
    const speak = () => {
      if (!window.speechSynthesis) return;
      const utter = new SpeechSynthesisUtterance(
        "Before we begin — I need to understand something. Not what you can do. Not what you have done. Why. The real reason behind all of this."
      );
      utter.rate = 0.78; utter.pitch = 0.86; utter.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.name.includes("Daniel")) || voices.find(v => v.lang === "en-GB") || voices.find(v => v.lang.startsWith("en")) || voices[0];
      if (preferred) utter.voice = preferred;
      window.speechSynthesis.speak(utter);
    };
    if (window.speechSynthesis.getVoices().length > 0) setTimeout(speak, 1200);
    else window.speechSynthesis.onvoiceschanged = () => setTimeout(speak, 1200);
  }, []);

  const selectedOption = DREAM_OPTIONS.find(d => d.id === selected);
  const accentColor = selectedOption?.color || gold;

  const handleSave = async () => {
    const dreamValue = showCustom ? customDream : selectedOption?.label;
    if (!dreamValue) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({
          dream: dreamValue,
          dream_reason: showCustom ? customDream : selectedOption?.desc,
          dream_set_at: new Date().toISOString(),
        }).eq("id", user.id);
      }
      router.push("/dashboard");
    } catch {
      router.push("/dashboard");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: dark, color: text, fontFamily: serif, position: "relative", overflow: "hidden" }}>

      <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%, -50%)", width: "800px", height: "600px", background: `radial-gradient(ellipse, ${accentColor}0A 0%, transparent 70%)`, transition: "background 1.2s ease", pointerEvents: "none" }} />

      <div style={{ position: "absolute", bottom: "-60px", right: "-40px", fontSize: "clamp(200px, 30vw, 400px)", fontWeight: "700", color: `${accentColor}04`, letterSpacing: "-0.04em", lineHeight: "1", pointerEvents: "none", userSelect: "none", transition: "color 1.2s ease", fontFamily: serif }}>DAD</div>

      <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "45% 55%", minHeight: "100vh" }}>

        {/* Left */}
        <div style={{ padding: "60px 52px", borderRight: `0.5px solid ${accentColor}12`, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: "0.28em", textTransform: "uppercase", color: `${accentColor}70`, marginBottom: "48px", fontFamily: sans }}>
              The dream · {companionName} wants to understand
            </div>
            <h1 style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: "300", lineHeight: "1.1", letterSpacing: "-0.02em", marginBottom: "24px" }}>
              Why does<br />this matter?
            </h1>
            <p style={{ fontSize: "15px", color: "rgba(235,229,220,0.4)", lineHeight: "1.9", fontFamily: sans, fontWeight: "300", maxWidth: "360px", marginBottom: "40px" }}>
              Not what you want to do. Not what you are good at.
              Why. The real reason behind all of this.
              {companionName} will carry this with them through everything.
            </p>

            <div style={{ minHeight: "120px" }}>
              {selectedOption && !showCustom ? (
                <div>
                  <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: accentColor, marginBottom: "12px", fontFamily: sans }}>Your dream</div>
                  <div style={{ fontSize: "clamp(20px, 2.5vw, 28px)", fontWeight: "300", lineHeight: "1.3", marginBottom: "8px" }}>{selectedOption.label}</div>
                  <p style={{ fontSize: "14px", color: "rgba(235,229,220,0.4)", fontFamily: sans, fontWeight: "300", lineHeight: "1.7" }}>{selectedOption.desc}</p>
                </div>
              ) : showCustom ? (
                <div>
                  <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: gold, marginBottom: "12px", fontFamily: sans }}>Your dream</div>
                  <div style={{ borderBottom: `1px solid ${gold}40`, paddingBottom: "4px" }}>
                    <input type="text" placeholder="Write it in your own words..." value={customDream} onChange={e => setCustomDream(e.target.value)} autoFocus style={{ width: "100%", background: "transparent", border: "none", color: text, fontSize: "clamp(18px, 2vw, 24px)", fontFamily: serif, fontWeight: "300", outline: "none", padding: "4px 0" }} />
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: "13px", color: "rgba(235,229,220,0.18)", fontFamily: sans, fontStyle: "italic" }}>Select what resonates most with you →</p>
              )}
            </div>
          </div>

          <div>
            {(selected || (showCustom && customDream.trim())) && (
              <button onClick={handleSave} disabled={saving} style={{ display: "inline-flex", alignItems: "center", gap: "14px", background: saving ? `${accentColor}60` : accentColor, color: dark, padding: "18px 44px", border: "none", cursor: saving ? "not-allowed" : "pointer", fontSize: "11px", letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: sans, transition: "all 0.3s" }}>
                {saving ? "Saving your dream..." : `${companionName} understands. Begin. →`}
              </button>
            )}
            <div style={{ marginTop: "16px" }}>
              <button onClick={() => router.push("/dashboard")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: "rgba(235,229,220,0.18)", fontFamily: sans, letterSpacing: "0.1em", textTransform: "uppercase", padding: 0 }}>
                Skip for now →
              </button>
            </div>
          </div>
        </div>

        {/* Right — options */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {DREAM_OPTIONS.map((dream, i) => (
            <div key={i} onClick={() => { setSelected(dream.id); setShowCustom(false); }}
              style={{ flex: 1, padding: "0 48px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", borderBottom: "0.5px solid rgba(201,168,76,0.05)", borderLeft: selected === dream.id ? `2px solid ${dream.color}` : "2px solid transparent", background: selected === dream.id ? `${dream.color}06` : "transparent", transition: "all 0.25s ease", minHeight: "72px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", border: `0.5px solid ${selected === dream.id ? dream.color : "rgba(201,168,76,0.12)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "border-color 0.3s" }}>
                  {selected === dream.id && <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: dream.color }} />}
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "300", color: selected === dream.id ? dream.color : "rgba(235,229,220,0.55)", marginBottom: "2px", transition: "color 0.3s" }}>{dream.label}</div>
                  <div style={{ fontSize: "11px", color: "rgba(235,229,220,0.25)", fontFamily: sans, fontWeight: "300" }}>{dream.desc}</div>
                </div>
              </div>
              <div style={{ fontSize: "16px", color: selected === dream.id ? dream.color : "rgba(235,229,220,0.08)", transition: "color 0.3s" }}>→</div>
            </div>
          ))}

          {/* Something else */}
          <div onClick={() => { setShowCustom(true); setSelected(null); }}
            style={{ flex: 1, padding: "0 48px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", borderLeft: showCustom ? `2px solid ${gold}` : "2px solid transparent", background: showCustom ? `${gold}06` : "transparent", transition: "all 0.25s ease", minHeight: "72px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", border: `0.5px solid ${showCustom ? gold : "rgba(201,168,76,0.12)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {showCustom && <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: gold }} />}
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "300", color: showCustom ? gold : "rgba(235,229,220,0.35)", marginBottom: "2px" }}>Something else</div>
                <div style={{ fontSize: "11px", color: "rgba(235,229,220,0.2)", fontFamily: sans, fontWeight: "300" }}>Write your dream in your own words</div>
              </div>
            </div>
            <div style={{ fontSize: "16px", color: showCustom ? gold : "rgba(235,229,220,0.08)" }}>→</div>
          </div>
        </div>
      </div>
    </div>
  );
}
