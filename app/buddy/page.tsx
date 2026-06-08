"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Tab = "discover" | "connections" | "pending";
type Stage = "searching" | "interviewing" | "just_landed" | "employed";

const STAGE_LABELS: Record<Stage, string> = {
  searching: "Actively searching",
  interviewing: "Currently interviewing",
  just_landed: "Just landed a role",
  employed: "Employed & growing",
};

const STAGE_COLORS: Record<Stage, string> = {
  searching: "#7896FF",
  interviewing: "#C9A84C",
  just_landed: "#5B9E7A",
  employed: "#5BB4B4",
};

interface Match {
  id: string;
  tech_stack: string[];
  career_stage: Stage;
  target_roles: string[];
  target_industry: string[];
  experience_years: number;
  location_country: string | null;
  situation: string | null;
  months_searching: number;
  score: number;
  reasons: string[];
  dad_introduction: string | null;
  display_name: string | null;
}

interface Connection {
  id: string;
  requester_id: string;
  receiver_id: string;
  match_score: number;
  match_reasons: string[];
  dad_introduction: string;
  created_at: string;
  buddy_profiles: {
    tech_stack: string[];
    career_stage: Stage;
    target_roles: string[];
    experience_years: number;
    location_country: string | null;
    show_name: boolean;
    show_location: boolean;
  };
  profiles: { full_name: string };
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  profiles: { full_name: string };
}

interface Nudge {
  id: string;
  content: string;
  created_at: string;
}

export default function BuddyPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("discover");
  const [matches, setMatches] = useState<Match[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pending, setPending] = useState<Connection[]>([]);
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [connecting, setConnecting] = useState<string | null>(null);
  const [findingMatches, setFindingMatches] = useState(false);
  const [myProfile, setMyProfile] = useState<Record<string, unknown> | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    career_stage: "searching" as Stage,
    experience_years: 0,
    show_name: false,
    show_location: false,
    is_visible: true,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sans = "'Helvetica Neue', Arial, sans-serif";
  const serif = "'Georgia', 'Times New Roman', serif";
  const gold = "#C9A84C";
  const bg = "#070606";
  const dark = "#030202";
  const text = "#EBE5DC";

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      if (profile) setUserName(profile.full_name?.split(" ")[0] || "there");

      try {
        await fetch("/api/buddy-match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "build_profile_from_memory" }),
        });
        const profileRes = await fetch("/api/buddy-match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get_my_profile" }),
        });
        const profileData = await profileRes.json();
        if (profileData.profile) {
          setMyProfile(profileData.profile);
          setProfileForm({
            career_stage: profileData.profile.career_stage || "searching",
            experience_years: profileData.profile.experience_years || 0,
            show_name: profileData.profile.show_name || false,
            show_location: profileData.profile.show_location || false,
            is_visible: profileData.profile.is_visible !== false,
          });
        }
        await loadConnections();
        await loadNudges();
      } catch { /* ignore */ }
      setLoading(false);
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConnections = async () => {
    try {
      const res = await fetch("/api/buddy-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_connections" }),
      });
      const data = await res.json();
      if (data.success) {
        setConnections([...(data.connections || []), ...(data.received || [])]);
        setPending(data.pending || []);
      }
    } catch { /* ignore */ }
  };

  const loadNudges = async () => {
    try {
      const res = await fetch("/api/buddy-match?type=nudges");
      const data = await res.json();
      if (data.success) setNudges(data.nudges || []);
    } catch { /* ignore */ }
  };

  const findMatches = async () => {
    setFindingMatches(true);
    try {
      const res = await fetch("/api/buddy-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "find_matches" }),
      });
      const data = await res.json();
      if (data.success) setMatches(data.matches || []);
    } catch { /* ignore */ }
    setFindingMatches(false);
  };

  const sendConnection = async (receiverId: string) => {
    setConnecting(receiverId);
    try {
      await fetch("/api/buddy-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect", receiverId }),
      });
      setMatches(prev => prev.filter(m => m.id !== receiverId));
      setSelectedMatch(null);
    } catch { /* ignore */ }
    setConnecting(null);
  };

  const respondToConnection = async (connectionId: string, accept: boolean) => {
    try {
      await fetch("/api/buddy-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "respond", connectionId, accept }),
      });
      await loadConnections();
    } catch { /* ignore */ }
  };

  const loadMessages = async (connectionId: string) => {
    try {
      const res = await fetch("/api/buddy-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_messages", connectionId }),
      });
      const data = await res.json();
      if (data.success) setMessages(data.messages || []);
    } catch { /* ignore */ }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConnection) return;
    try {
      await fetch("/api/buddy-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_message",
          connectionId: selectedConnection.id,
          content: newMessage.trim(),
        }),
      });
      setNewMessage("");
      await loadMessages(selectedConnection.id);
    } catch { /* ignore */ }
  };

  const updateProfile = async () => {
    try {
      await fetch("/api/buddy-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_profile", profile: profileForm }),
      });
      setShowEditProfile(false);
    } catch { /* ignore */ }
  };

  const getOtherProfile = (conn: Connection) => conn.buddy_profiles;
  const getOtherName = (conn: Connection) => {
    const profile = getOtherProfile(conn);
    return profile?.show_name ? conn.profiles?.full_name : null;
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: dark, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: "11px", letterSpacing: "0.42em", textTransform: "uppercase", color: gold, fontFamily: sans }}>DAD</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: serif }}>
      <nav style={{ padding: "18px 52px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "0.5px solid rgba(201,168,76,0.08)", position: "sticky", top: 0, zIndex: 100, background: "rgba(7,6,6,0.97)" }}>
        <Link href="/dashboard" style={{ fontSize: "11px", letterSpacing: "0.42em", textTransform: "uppercase", color: gold, fontFamily: sans, textDecoration: "none" }}>DAD</Link>
        <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(235,229,220,0.2)", fontFamily: sans }}>Buddy Connect</div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {nudges.length > 0 && (
            <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: gold, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: dark, fontFamily: sans }}>{nudges.length}</div>
          )}
          <Link href="/dashboard" style={{ fontSize: "11px", color: "rgba(235,229,220,0.25)", textDecoration: "none", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: sans }}>← Dashboard</Link>
        </div>
      </nav>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "48px 52px" }}>

        <div style={{ marginBottom: "48px", display: "grid", gridTemplateColumns: "1fr auto", alignItems: "start", gap: "40px" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: "0.26em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "12px", fontFamily: sans }}>DAD Buddy Connect</div>
            <h1 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: "300", lineHeight: "1.1", marginBottom: "12px", letterSpacing: "-0.02em" }}>Your career circle.</h1>
            <p style={{ fontSize: "14px", color: "rgba(235,229,220,0.35)", fontFamily: sans, lineHeight: "1.8", maxWidth: "560px", margin: 0 }}>
              DAD knows your full story — your skills, your journey, your goals. It finds people on similar paths and connects you. Not randomly. Precisely.
            </p>
          </div>
          <button onClick={() => setShowEditProfile(!showEditProfile)}
            style={{ background: "transparent", border: `0.5px solid ${gold}30`, color: `${gold}60`, padding: "12px 24px", cursor: "pointer", fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: sans, whiteSpace: "nowrap" }}>
            {showEditProfile ? "Close" : "My Profile"}
          </button>
        </div>

        {nudges.length > 0 && (
          <div style={{ marginBottom: "32px" }}>
            {nudges.map((nudge, i) => (
              <div key={i} style={{ padding: "14px 20px", background: `${gold}08`, borderLeft: `2px solid ${gold}40`, marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: "13px", color: "rgba(235,229,220,0.6)", fontFamily: sans, lineHeight: "1.6" }}>{nudge.content}</div>
                <div style={{ fontSize: "10px", color: "rgba(235,229,220,0.2)", fontFamily: sans, flexShrink: 0, marginLeft: "16px" }}>
                  {new Date(nudge.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </div>
              </div>
            ))}
          </div>
        )}

        {showEditProfile && (
          <div style={{ marginBottom: "40px", padding: "32px 36px", border: `0.5px solid ${gold}15`, background: `${gold}03` }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: `${gold}50`, marginBottom: "24px", fontFamily: sans }}>Your matching profile</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px", marginBottom: "24px" }}>
              <div>
                <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.4)", marginBottom: "10px", fontFamily: sans }}>Current stage</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {(Object.entries(STAGE_LABELS) as [Stage, string][]).map(([value, label]) => (
                    <div key={value} onClick={() => setProfileForm(p => ({ ...p, career_stage: value }))}
                      style={{ padding: "10px 14px", cursor: "pointer", border: `0.5px solid ${profileForm.career_stage === value ? STAGE_COLORS[value] : "rgba(235,229,220,0.06)"}`, background: profileForm.career_stage === value ? `${STAGE_COLORS[value]}10` : "transparent", color: profileForm.career_stage === value ? STAGE_COLORS[value] : "rgba(235,229,220,0.35)", fontSize: "12px", fontFamily: sans, transition: "all 0.2s" }}>
                      {label}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ marginBottom: "24px" }}>
                  <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.4)", marginBottom: "8px", fontFamily: sans }}>Years of experience</div>
                  <input type="number" min={0} max={30} value={profileForm.experience_years}
                    onChange={e => setProfileForm(p => ({ ...p, experience_years: parseInt(e.target.value) || 0 }))}
                    style={{ width: "80px", background: "transparent", border: "none", borderBottom: `0.5px solid ${gold}20`, color: text, fontSize: "24px", fontFamily: sans, fontWeight: "300", outline: "none", padding: "4px 0" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {[
                    { key: "show_name", label: "Show my name to matches" },
                    { key: "show_location", label: "Show my location" },
                    { key: "is_visible", label: "Visible for matching" },
                  ].map(item => (
                    <div key={item.key} onClick={() => setProfileForm(p => ({ ...p, [item.key]: !p[item.key as keyof typeof p] }))}
                      style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
                      <div style={{ width: "32px", height: "18px", borderRadius: "9px", background: profileForm[item.key as keyof typeof profileForm] ? gold : "rgba(235,229,220,0.1)", transition: "background 0.2s", position: "relative", flexShrink: 0 }}>
                        <div style={{ position: "absolute", top: "3px", left: profileForm[item.key as keyof typeof profileForm] ? "17px" : "3px", width: "12px", height: "12px", borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                      </div>
                      <div style={{ fontSize: "12px", color: "rgba(235,229,220,0.5)", fontFamily: sans }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {myProfile && (
              <div style={{ marginBottom: "20px", padding: "14px 18px", background: "rgba(235,229,220,0.02)", border: "0.5px solid rgba(235,229,220,0.04)" }}>
                <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(235,229,220,0.2)", marginBottom: "8px", fontFamily: sans }}>DAD auto-detected from your profile</div>
                <div style={{ fontSize: "12px", color: "rgba(235,229,220,0.4)", fontFamily: sans, lineHeight: "1.7" }}>
                  Skills: {((myProfile.tech_stack as string[]) || []).join(", ") || "none yet"}<br />
                  Target roles: {((myProfile.target_roles as string[]) || []).join(", ") || "none yet"}<br />
                  Applications: {myProfile.applications_count as number || 0} · Interviews: {myProfile.interviews_count as number || 0}
                </div>
              </div>
            )}
            <button onClick={updateProfile}
              style={{ background: gold, color: dark, border: "none", padding: "14px 32px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: sans }}>
              Save profile →
            </button>
          </div>
        )}

        <div style={{ display: "flex", gap: "1px", background: "rgba(201,168,76,0.06)", marginBottom: "32px" }}>
          {([
            { id: "discover", label: "Discover", count: matches.length },
            { id: "connections", label: "My Connections", count: connections.length },
            { id: "pending", label: "Pending", count: pending.length },
          ] as { id: Tab; label: string; count: number }[]).map(t => (
            <div key={t.id} onClick={() => setTab(t.id)}
              style={{ flex: 1, padding: "16px 24px", cursor: "pointer", background: tab === t.id ? `${gold}10` : bg, borderBottom: tab === t.id ? `1px solid ${gold}` : "1px solid transparent", transition: "all 0.2s", textAlign: "center" }}>
              <div style={{ fontSize: "22px", fontWeight: "300", color: tab === t.id ? gold : "rgba(235,229,220,0.3)", marginBottom: "2px" }}>{t.count}</div>
              <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: tab === t.id ? gold : "rgba(235,229,220,0.25)", fontFamily: sans }}>{t.label}</div>
            </div>
          ))}
        </div>

        {tab === "discover" && (
          <div>
            {matches.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 40px" }}>
                <div style={{ fontSize: "48px", marginBottom: "24px", opacity: 0.2 }}>◎</div>
                <h2 style={{ fontSize: "24px", fontWeight: "300", color: text, marginBottom: "12px" }}>Find your career circle</h2>
                <p style={{ fontSize: "14px", color: "rgba(235,229,220,0.35)", fontFamily: sans, lineHeight: "1.8", maxWidth: "400px", margin: "0 auto 32px" }}>
                  DAD will scan its network and find people whose skills, stage, and goals align with yours. Not random. Precisely matched.
                </p>
                <button onClick={findMatches} disabled={findingMatches}
                  style={{ background: gold, color: dark, border: "none", padding: "16px 48px", cursor: findingMatches ? "not-allowed" : "pointer", fontSize: "11px", letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: sans, opacity: findingMatches ? 0.6 : 1 }}>
                  {findingMatches ? "DAD is searching..." : "Find my matches →"}
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: selectedMatch ? "1fr 380px" : "1fr 1fr 1fr", gap: "1px", background: "rgba(201,168,76,0.06)" }}>
                <div style={{ background: bg }}>
                  {matches.map((match, i) => {
                    const stageColor = STAGE_COLORS[match.career_stage] || gold;
                    const isSelected = selectedMatch?.id === match.id;
                    return (
                      <div key={i} onClick={() => setSelectedMatch(isSelected ? null : match)}
                        style={{ padding: "24px 28px", borderBottom: "0.5px solid rgba(201,168,76,0.05)", cursor: "pointer", background: isSelected ? `${stageColor}06` : "transparent", borderLeft: isSelected ? `2px solid ${stageColor}` : "2px solid transparent", transition: "all 0.2s" }}
                        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "rgba(235,229,220,0.015)"; }}
                        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: `${stageColor}20`, border: `0.5px solid ${stageColor}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: stageColor, fontFamily: sans }}>
                              {match.display_name ? match.display_name[0].toUpperCase() : "?"}
                            </div>
                            <div>
                              <div style={{ fontSize: "13px", color: text }}>{match.display_name || "Anonymous Developer"}</div>
                              <div style={{ fontSize: "10px", color: stageColor, fontFamily: sans, letterSpacing: "0.08em" }}>{STAGE_LABELS[match.career_stage]}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "20px", fontWeight: "200", color: stageColor }}>{match.score}%</div>
                            <div style={{ fontSize: "9px", color: "rgba(235,229,220,0.2)", fontFamily: sans }}>match</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
                          {match.tech_stack?.slice(0, 4).map((t, j) => (
                            <span key={j} style={{ fontSize: "10px", color: "rgba(235,229,220,0.4)", fontFamily: sans, border: "0.5px solid rgba(235,229,220,0.08)", padding: "2px 8px" }}>{t}</span>
                          ))}
                        </div>
                        <div style={{ fontSize: "11px", color: "rgba(235,229,220,0.25)", fontFamily: sans }}>{match.experience_years}y · {match.location_country || "Location private"}</div>
                      </div>
                    );
                  })}
                  <div style={{ padding: "20px 28px", textAlign: "center" }}>
                    <button onClick={findMatches} disabled={findingMatches}
                      style={{ background: "transparent", border: `0.5px solid ${gold}20`, color: `${gold}40`, padding: "10px 24px", cursor: "pointer", fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: sans }}>
                      {findingMatches ? "Searching..." : "Refresh matches"}
                    </button>
                  </div>
                </div>

                {selectedMatch && (() => {
                  const stageColor = STAGE_COLORS[selectedMatch.career_stage] || gold;
                  return (
                    <div style={{ background: dark, padding: "28px", borderLeft: "0.5px solid rgba(201,168,76,0.08)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "24px" }}>
                        <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: `${stageColor}20`, border: `0.5px solid ${stageColor}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", color: stageColor }}>
                          {selectedMatch.display_name ? selectedMatch.display_name[0].toUpperCase() : "?"}
                        </div>
                        <button onClick={() => setSelectedMatch(null)} style={{ background: "none", border: "none", color: "rgba(235,229,220,0.2)", cursor: "pointer", fontSize: "18px" }}>×</button>
                      </div>
                      <div style={{ marginBottom: "20px" }}>
                        <div style={{ fontSize: "17px", fontWeight: "300", color: text, marginBottom: "4px" }}>{selectedMatch.display_name || "Anonymous Developer"}</div>
                        <div style={{ fontSize: "11px", color: stageColor, fontFamily: sans }}>{STAGE_LABELS[selectedMatch.career_stage]}</div>
                      </div>
                      {selectedMatch.dad_introduction && (
                        <div style={{ padding: "16px 18px", background: `${gold}08`, borderLeft: `2px solid ${gold}30`, marginBottom: "20px" }}>
                          <div style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: `${gold}50`, marginBottom: "6px", fontFamily: sans }}>DAD says</div>
                          <div style={{ fontSize: "12px", color: "rgba(235,229,220,0.6)", fontFamily: sans, lineHeight: "1.7", fontStyle: "italic" }}>"{selectedMatch.dad_introduction}"</div>
                        </div>
                      )}
                      <div style={{ marginBottom: "20px" }}>
                        <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,168,76,0.4)", marginBottom: "10px", fontFamily: sans }}>Why DAD matched you</div>
                        {selectedMatch.reasons.map((r, i) => (
                          <div key={i} style={{ fontSize: "12px", color: "rgba(235,229,220,0.45)", fontFamily: sans, marginBottom: "6px", display: "flex", gap: "8px" }}>
                            <span style={{ color: gold, flexShrink: 0 }}>→</span>{r}
                          </div>
                        ))}
                      </div>
                      <div style={{ marginBottom: "20px" }}>
                        <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,168,76,0.4)", marginBottom: "8px", fontFamily: sans }}>Tech stack</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                          {selectedMatch.tech_stack?.map((t, i) => (
                            <span key={i} style={{ fontSize: "11px", color: "rgba(235,229,220,0.5)", fontFamily: sans, border: "0.5px solid rgba(235,229,220,0.1)", padding: "3px 10px" }}>{t}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", padding: "12px 0", borderTop: "0.5px solid rgba(235,229,220,0.04)" }}>
                        <div style={{ fontSize: "11px", color: "rgba(235,229,220,0.25)", fontFamily: sans }}>{selectedMatch.experience_years}y experience</div>
                        <div style={{ fontSize: "24px", fontWeight: "200", color: stageColor }}>{selectedMatch.score}%</div>
                      </div>
                      <button onClick={() => sendConnection(selectedMatch.id)} disabled={connecting === selectedMatch.id}
                        style={{ width: "100%", background: connecting === selectedMatch.id ? `${gold}40` : gold, color: dark, border: "none", padding: "14px", cursor: connecting === selectedMatch.id ? "not-allowed" : "pointer", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: sans }}>
                        {connecting === selectedMatch.id ? "Sending..." : "Connect →"}
                      </button>
                      <p style={{ fontSize: "10px", color: "rgba(235,229,220,0.15)", fontFamily: sans, textAlign: "center", marginTop: "10px", lineHeight: "1.6" }}>
                        Names revealed only when both accept.
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {tab === "connections" && (
          <div style={{ display: "grid", gridTemplateColumns: selectedConnection ? "1fr 420px" : "1fr", gap: "1px", background: "rgba(201,168,76,0.06)" }}>
            <div style={{ background: bg }}>
              {connections.length === 0 ? (
                <div style={{ padding: "60px 40px", textAlign: "center" }}>
                  <p style={{ fontSize: "14px", color: "rgba(235,229,220,0.2)", fontFamily: sans, fontStyle: "italic" }}>No connections yet. Go to Discover to find your career circle.</p>
                </div>
              ) : (
                connections.map((conn, i) => {
                  const otherProfile = getOtherProfile(conn);
                  const otherName = getOtherName(conn);
                  const stageColor = STAGE_COLORS[otherProfile?.career_stage] || gold;
                  const isSelected = selectedConnection?.id === conn.id;
                  return (
                    <div key={i}
                      onClick={async () => { setSelectedConnection(isSelected ? null : conn); if (!isSelected) await loadMessages(conn.id); }}
                      style={{ padding: "20px 28px", borderBottom: "0.5px solid rgba(201,168,76,0.05)", cursor: "pointer", background: isSelected ? `${stageColor}06` : "transparent", borderLeft: isSelected ? `2px solid ${stageColor}` : "2px solid transparent", transition: "all 0.2s" }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "rgba(235,229,220,0.015)"; }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: `${stageColor}20`, border: `0.5px solid ${stageColor}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: stageColor, flexShrink: 0 }}>
                          {otherName ? otherName[0].toUpperCase() : "?"}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "14px", color: text, marginBottom: "3px" }}>{otherName || "Anonymous Developer"}</div>
                          <div style={{ fontSize: "10px", color: stageColor, fontFamily: sans }}>{STAGE_LABELS[otherProfile?.career_stage] || "Unknown"}</div>
                          <div style={{ fontSize: "11px", color: "rgba(235,229,220,0.2)", fontFamily: sans, marginTop: "2px" }}>{otherProfile?.tech_stack?.slice(0, 3).join(" · ")}</div>
                        </div>
                        <div style={{ fontSize: "20px", fontWeight: "200", color: stageColor }}>{conn.match_score}%</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {selectedConnection && (() => {
              const otherProfile = getOtherProfile(selectedConnection);
              const otherName = getOtherName(selectedConnection);
              const stageColor = STAGE_COLORS[otherProfile?.career_stage] || gold;
              return (
                <div style={{ background: dark, display: "flex", flexDirection: "column", height: "calc(100vh - 300px)", minHeight: "500px", borderLeft: "0.5px solid rgba(201,168,76,0.08)" }}>
                  <div style={{ padding: "16px 20px", borderBottom: `0.5px solid ${stageColor}10`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: "14px", color: text }}>{otherName || "Anonymous Developer"}</div>
                      <div style={{ fontSize: "10px", color: stageColor, fontFamily: sans }}>{STAGE_LABELS[otherProfile?.career_stage]}</div>
                    </div>
                    <button onClick={() => setSelectedConnection(null)} style={{ background: "none", border: "none", color: "rgba(235,229,220,0.2)", cursor: "pointer", fontSize: "18px" }}>×</button>
                  </div>
                  {selectedConnection.dad_introduction && messages.length === 0 && (
                    <div style={{ padding: "16px 20px", background: `${gold}05`, borderBottom: `0.5px solid ${gold}08`, flexShrink: 0 }}>
                      <div style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: `${gold}40`, marginBottom: "4px", fontFamily: sans }}>DAD introduced you</div>
                      <div style={{ fontSize: "12px", color: "rgba(235,229,220,0.45)", fontFamily: sans, lineHeight: "1.6", fontStyle: "italic" }}>"{selectedConnection.dad_introduction}"</div>
                    </div>
                  )}
                  <div style={{ flex: 1, overflow: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    {messages.length === 0 ? (
                      <p style={{ fontSize: "13px", color: "rgba(235,229,220,0.15)", fontFamily: sans, fontStyle: "italic", textAlign: "center", marginTop: "20px" }}>
                        Start the conversation. You have more in common than you think.
                      </p>
                    ) : (
                      messages.map((msg, i) => {
                        const isMe = msg.sender_id === userId;
                        return (
                          <div key={i} style={{ display: "flex", flexDirection: "column", gap: "3px", alignItems: isMe ? "flex-end" : "flex-start" }}>
                            <div style={{ fontSize: "9px", color: "rgba(235,229,220,0.2)", fontFamily: sans, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                              {isMe ? userName : (otherName || "Buddy")}
                            </div>
                            <div style={{ fontSize: "13px", color: isMe ? "rgba(235,229,220,0.7)" : "rgba(235,229,220,0.5)", fontFamily: sans, lineHeight: "1.65", maxWidth: "88%", padding: "10px 14px", background: isMe ? `${stageColor}12` : "rgba(235,229,220,0.03)", border: `0.5px solid ${isMe ? `${stageColor}20` : "rgba(235,229,220,0.05)"}` }}>
                              {msg.content}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  <div style={{ padding: "12px 20px", borderTop: `0.5px solid rgba(235,229,220,0.04)`, flexShrink: 0, display: "flex", gap: "10px" }}>
                    <input value={newMessage} onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                      placeholder="Write a message..."
                      style={{ flex: 1, background: "rgba(235,229,220,0.03)", border: `0.5px solid rgba(235,229,220,0.08)`, color: text, fontSize: "13px", fontFamily: sans, padding: "10px 14px", outline: "none" }} />
                    <button onClick={sendMessage} disabled={!newMessage.trim()}
                      style={{ background: newMessage.trim() ? stageColor : "rgba(235,229,220,0.05)", color: newMessage.trim() ? dark : "rgba(235,229,220,0.2)", border: "none", padding: "10px 18px", cursor: newMessage.trim() ? "pointer" : "not-allowed", fontSize: "10px", letterSpacing: "0.1em", fontFamily: sans, transition: "all 0.2s" }}>
                      Send
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {tab === "pending" && (
          <div style={{ background: bg }}>
            {pending.length === 0 ? (
              <div style={{ padding: "60px 40px", textAlign: "center" }}>
                <p style={{ fontSize: "14px", color: "rgba(235,229,220,0.2)", fontFamily: sans, fontStyle: "italic" }}>No pending requests.</p>
              </div>
            ) : (
              pending.map((conn, i) => {
                const stageColor = STAGE_COLORS[conn.buddy_profiles?.career_stage] || gold;
                return (
                  <div key={i} style={{ padding: "24px 28px", borderBottom: "0.5px solid rgba(201,168,76,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "10px" }}>
                        <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: `${stageColor}20`, border: `0.5px solid ${stageColor}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: stageColor, flexShrink: 0 }}>?</div>
                        <div>
                          <div style={{ fontSize: "14px", color: text, marginBottom: "3px" }}>Anonymous Developer</div>
                          <div style={{ fontSize: "10px", color: stageColor, fontFamily: sans }}>{STAGE_LABELS[conn.buddy_profiles?.career_stage] || "Unknown"}</div>
                        </div>
                        <div style={{ fontSize: "20px", fontWeight: "200", color: stageColor }}>{conn.match_score}%</div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
                        {conn.buddy_profiles?.tech_stack?.slice(0, 5).map((t, j) => (
                          <span key={j} style={{ fontSize: "10px", color: "rgba(235,229,220,0.4)", fontFamily: sans, border: "0.5px solid rgba(235,229,220,0.08)", padding: "2px 8px" }}>{t}</span>
                        ))}
                      </div>
                      {conn.match_reasons?.slice(0, 2).map((r, j) => (
                        <div key={j} style={{ fontSize: "11px", color: "rgba(235,229,220,0.3)", fontFamily: sans, display: "flex", gap: "6px" }}>
                          <span style={{ color: gold }}>→</span>{r}
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
                      <button onClick={() => respondToConnection(conn.id, false)}
                        style={{ background: "transparent", border: "0.5px solid rgba(176,112,112,0.2)", color: "rgba(176,112,112,0.5)", padding: "10px 20px", cursor: "pointer", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: sans }}>
                        Decline
                      </button>
                      <button onClick={() => respondToConnection(conn.id, true)}
                        style={{ background: gold, color: dark, border: "none", padding: "10px 24px", cursor: "pointer", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: sans }}>
                        Accept →
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
