"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const STATUSES = [
  { id: "applied",   label: "Applied",    color: "#7896FF" },
  { id: "viewed",    label: "Viewed",     color: "#C9A84C" },
  { id: "interview", label: "Interview",  color: "#5BAA78" },
  { id: "offer",     label: "Offer",      color: "#5BB4B4" },
  { id: "rejected",  label: "Rejected",   color: "#E07878" },
];

interface Application {
  id: string;
  company: string;
  role: string;
  status: string;
  applied_date: string;
  notes: string;
  source: string;
  salary_min: number | null;
  salary_max: number | null;
  location: string;
  job_url: string;
  created_at: string;
}

export default function ActionPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("there");
  const [showAdd, setShowAdd] = useState(false);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [voiceInput, setVoiceInput] = useState("");
  const [parsing, setParsing] = useState(false);
  const [form, setForm] = useState({
    company: "", role: "", status: "applied",
    location: "", salary_min: "", salary_max: "",
    notes: "", job_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [streak, setStreak] = useState(0);
  const [todayCount, setTodayCount] = useState(0);

  const sans = "'Helvetica Neue', Arial, sans-serif";
  const serif = "'Georgia', 'Times New Roman', serif";
  const gold = "#C9A84C";
  const bg = "#070606";
  const dark = "#030202";
  const text = "#EBE5DC";

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      if (profile?.full_name) setFirstName(profile.full_name.split(" ")[0]);
      const { data } = await supabase.from("job_applications").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (data) {
        setApps(data);
        calcStats(data);
      }
      setLoading(false);
    };
    load();
  }, []);

  const calcStats = (data: Application[]) => {
    const today = new Date().toISOString().split("T")[0];
    const todayApps = data.filter(a => a.applied_date === today);
    setTodayCount(todayApps.length);

    // Calculate streak
    let s = 0;
    const date = new Date();
    while (true) {
      const d = date.toISOString().split("T")[0];
      const hasApp = data.some(a => a.applied_date === d);
      if (!hasApp) break;
      s++;
      date.setDate(date.getDate() - 1);
    }
    setStreak(s);
  };

  const refetch = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("job_applications").select("*").eq("user_id", userId!).order("created_at", { ascending: false });
    if (data) { setApps(data); calcStats(data); }
  };

  const parseVoiceInput = async () => {
    if (!voiceInput.trim()) return;
    setParsing(true);
    try {
      const res = await fetch("/api/parse-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: voiceInput }),
      });
      const data = await res.json();
      if (data.application) {
        setForm({
          company: data.application.company || "",
          role: data.application.role || "",
          status: data.application.status || "applied",
          location: data.application.location || "",
          salary_min: data.application.salary_min || "",
          salary_max: data.application.salary_max || "",
          notes: data.application.notes || "",
          job_url: data.application.job_url || "",
        });
        setVoiceInput("");
        setShowAdd(true);
      }
    } catch { /* ignore */ }
    finally { setParsing(false); }
  };

  const saveApp = async () => {
    if (!form.company.trim() || !userId) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("job_applications").insert({
      user_id: userId,
      company: form.company,
      role: form.role,
      status: form.status,
      location: form.location,
      salary_min: form.salary_min ? parseInt(form.salary_min) : null,
      salary_max: form.salary_max ? parseInt(form.salary_max) : null,
      notes: form.notes,
      job_url: form.job_url,
      applied_date: new Date().toISOString().split("T")[0],
      source: "manual",
    });
    setForm({ company: "", role: "", status: "applied", location: "", salary_min: "", salary_max: "", notes: "", job_url: "" });
    setShowAdd(false);
    setSaving(false);
    await refetch();
  };

  const updateStatus = async (id: string, status: string) => {
    const supabase = createClient();
    await supabase.from("job_applications").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    await refetch();
    if (selectedApp?.id === id) setSelectedApp(prev => prev ? { ...prev, status } : null);
  };

  const deleteApp = async (id: string) => {
    const supabase = createClient();
    await supabase.from("job_applications").delete().eq("id", id);
    setSelectedApp(null);
    await refetch();
  };

  const filtered = activeStatus ? apps.filter(a => a.status === activeStatus) : apps;
  const statusCount = (s: string) => apps.filter(a => a.status === s).length;

  if (loading) return (
    <div style={{ minHeight: "100vh", background: dark, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: "11px", letterSpacing: "0.42em", textTransform: "uppercase", color: gold, fontFamily: sans }}>DAD</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: serif }}>
      {/* Nav */}
      <nav style={{ padding: "18px 52px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "0.5px solid rgba(201,168,76,0.08)", position: "sticky", top: 0, zIndex: 100, background: "rgba(7,6,6,0.97)" }}>
        <Link href="/dashboard" style={{ fontSize: "11px", letterSpacing: "0.42em", textTransform: "uppercase", color: gold, fontFamily: sans, textDecoration: "none" }}>DAD</Link>
        <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(235,229,220,0.25)", fontFamily: sans }}>Application Tracker</div>
        <Link href="/dashboard" style={{ fontSize: "11px", color: "rgba(235,229,220,0.25)", textDecoration: "none", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: sans }}>← Dashboard</Link>
      </nav>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "48px 52px" }}>

        {/* Header + Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "40px", marginBottom: "48px", alignItems: "start" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: "0.26em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "12px", fontFamily: sans }}>Your job search</div>
            <h1 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: "300", lineHeight: "1.1", marginBottom: "8px", letterSpacing: "-0.02em" }}>
              {firstName}'s pipeline
            </h1>
            <p style={{ fontSize: "14px", color: "rgba(235,229,220,0.35)", fontFamily: sans, margin: 0 }}>
              {apps.length} applications total · {todayCount} today
              {streak > 0 && <span style={{ color: gold }}> · {streak} day streak 🔥</span>}
            </p>
          </div>
          <button onClick={() => setShowAdd(!showAdd)}
            style={{ background: gold, color: dark, border: "none", padding: "14px 28px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: sans, whiteSpace: "nowrap" }}>
            + Add Application
          </button>
        </div>

        {/* Voice / text input — detect application from natural language */}
        <div style={{ marginBottom: "40px", padding: "24px 28px", border: "0.5px solid rgba(201,168,76,0.12)", background: "rgba(201,168,76,0.03)" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "12px", fontFamily: sans }}>
            Describe any way — AI will extract the details
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <input
              type="text"
              placeholder='e.g. "Applied to Google for SWE role in London, salary 80k-100k" or "Just got an interview at Stripe"'
              value={voiceInput}
              onChange={e => setVoiceInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && parseVoiceInput()}
              style={{ flex: 1, background: "transparent", border: "0.5px solid rgba(201,168,76,0.15)", color: text, fontSize: "14px", fontFamily: sans, padding: "12px 16px", outline: "none" }}
            />
            <button onClick={parseVoiceInput} disabled={parsing || !voiceInput.trim()}
              style={{ background: parsing ? "rgba(201,168,76,0.3)" : "rgba(201,168,76,0.15)", border: "0.5px solid rgba(201,168,76,0.3)", color: gold, padding: "12px 24px", cursor: parsing ? "not-allowed" : "pointer", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: sans, whiteSpace: "nowrap" }}>
              {parsing ? "Detecting..." : "Detect →"}
            </button>
          </div>
        </div>

        {/* Add form */}
        {showAdd && (
          <div style={{ marginBottom: "40px", padding: "32px 36px", border: "0.5px solid rgba(201,168,76,0.15)", background: "rgba(201,168,76,0.02)" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "24px", fontFamily: sans }}>Add application</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
              {[
                { label: "Company *", key: "company", placeholder: "Google, Stripe, etc." },
                { label: "Role", key: "role", placeholder: "Software Engineer" },
                { label: "Location", key: "location", placeholder: "London, Remote, etc." },
                { label: "Job URL", key: "job_url", placeholder: "https://..." },
              ].map(f => (
                <div key={f.key} style={{ borderBottom: "0.5px solid rgba(201,168,76,0.12)", paddingBottom: "8px" }}>
                  <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.4)", marginBottom: "8px", fontFamily: sans }}>{f.label}</div>
                  <input type="text" placeholder={f.placeholder} value={(form as Record<string, string>)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: "100%", background: "transparent", border: "none", color: text, fontSize: "15px", fontFamily: sans, outline: "none", padding: "4px 0" }} />
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "20px" }}>
              <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.12)", paddingBottom: "8px" }}>
                <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.4)", marginBottom: "8px", fontFamily: sans }}>Status</div>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  style={{ background: "transparent", border: "none", color: text, fontSize: "15px", fontFamily: sans, outline: "none", padding: "4px 0", cursor: "pointer", width: "100%" }}>
                  {STATUSES.map(s => <option key={s.id} value={s.id} style={{ background: dark }}>{s.label}</option>)}
                </select>
              </div>
              <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.12)", paddingBottom: "8px" }}>
                <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.4)", marginBottom: "8px", fontFamily: sans }}>Min Salary</div>
                <input type="number" placeholder="50000" value={form.salary_min} onChange={e => setForm(p => ({ ...p, salary_min: e.target.value }))}
                  style={{ width: "100%", background: "transparent", border: "none", color: text, fontSize: "15px", fontFamily: sans, outline: "none", padding: "4px 0" }} />
              </div>
              <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.12)", paddingBottom: "8px" }}>
                <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.4)", marginBottom: "8px", fontFamily: sans }}>Max Salary</div>
                <input type="number" placeholder="80000" value={form.salary_max} onChange={e => setForm(p => ({ ...p, salary_max: e.target.value }))}
                  style={{ width: "100%", background: "transparent", border: "none", color: text, fontSize: "15px", fontFamily: sans, outline: "none", padding: "4px 0" }} />
              </div>
            </div>
            <div style={{ borderBottom: "0.5px solid rgba(201,168,76,0.12)", paddingBottom: "8px", marginBottom: "24px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.4)", marginBottom: "8px", fontFamily: sans }}>Notes</div>
              <input type="text" placeholder="Any notes about this application..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                style={{ width: "100%", background: "transparent", border: "none", color: text, fontSize: "14px", fontFamily: sans, outline: "none", padding: "4px 0" }} />
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={saveApp} disabled={saving || !form.company.trim()}
                style={{ background: saving ? "rgba(201,168,76,0.4)" : gold, color: dark, border: "none", padding: "14px 32px", cursor: saving ? "not-allowed" : "pointer", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: sans }}>
                {saving ? "Saving..." : "Save →"}
              </button>
              <button onClick={() => setShowAdd(false)}
                style={{ background: "none", border: "0.5px solid rgba(235,229,220,0.1)", color: "rgba(235,229,220,0.35)", padding: "14px 24px", cursor: "pointer", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: sans }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Pipeline status tabs */}
        <div style={{ display: "flex", gap: "1px", marginBottom: "32px", background: "rgba(201,168,76,0.06)" }}>
          <div onClick={() => setActiveStatus(null)}
            style={{ padding: "14px 20px", cursor: "pointer", background: !activeStatus ? "rgba(201,168,76,0.08)" : bg, borderBottom: !activeStatus ? `1px solid ${gold}` : "1px solid transparent", transition: "all 0.2s" }}>
            <div style={{ fontSize: "18px", fontWeight: "300", color: !activeStatus ? gold : "rgba(235,229,220,0.4)", marginBottom: "2px" }}>{apps.length}</div>
            <div style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: !activeStatus ? gold : "rgba(235,229,220,0.25)", fontFamily: sans }}>All</div>
          </div>
          {STATUSES.map(s => (
            <div key={s.id} onClick={() => setActiveStatus(activeStatus === s.id ? null : s.id)}
              style={{ flex: 1, padding: "14px 20px", cursor: "pointer", background: activeStatus === s.id ? `${s.color}10` : bg, borderBottom: activeStatus === s.id ? `1px solid ${s.color}` : "1px solid transparent", transition: "all 0.2s" }}>
              <div style={{ fontSize: "18px", fontWeight: "300", color: activeStatus === s.id ? s.color : "rgba(235,229,220,0.4)", marginBottom: "2px" }}>{statusCount(s.id)}</div>
              <div style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: activeStatus === s.id ? s.color : "rgba(235,229,220,0.25)", fontFamily: sans }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Applications list + detail panel */}
        <div style={{ display: "grid", gridTemplateColumns: selectedApp ? "1fr 380px" : "1fr", gap: "1px", background: "rgba(201,168,76,0.06)" }}>

          {/* List */}
          <div style={{ background: bg }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "60px 40px", textAlign: "center" }}>
                <p style={{ fontSize: "14px", color: "rgba(235,229,220,0.2)", fontFamily: sans, fontStyle: "italic" }}>
                  {apps.length === 0 ? "No applications yet. Add your first one above." : "No applications with this status."}
                </p>
              </div>
            ) : (
              filtered.map((app, i) => {
                const status = STATUSES.find(s => s.id === app.status) || STATUSES[0];
                const isSelected = selectedApp?.id === app.id;
                return (
                  <div key={app.id} onClick={() => setSelectedApp(isSelected ? null : app)}
                    style={{ padding: "20px 28px", borderBottom: "0.5px solid rgba(201,168,76,0.06)", cursor: "pointer", background: isSelected ? `${status.color}06` : "transparent", borderLeft: isSelected ? `2px solid ${status.color}` : "2px solid transparent", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "rgba(235,229,220,0.015)"; }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
                        <div style={{ fontSize: "15px", fontWeight: "300", color: text }}>{app.company}</div>
                        {app.role && <div style={{ fontSize: "12px", color: "rgba(235,229,220,0.35)", fontFamily: sans }}>{app.role}</div>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: status.color, fontFamily: sans }}>{status.label}</div>
                        {app.location && <div style={{ fontSize: "11px", color: "rgba(235,229,220,0.25)", fontFamily: sans }}>{app.location}</div>}
                        <div style={{ fontSize: "11px", color: "rgba(235,229,220,0.2)", fontFamily: sans }}>{new Date(app.applied_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
                      </div>
                    </div>
                    {(app.salary_min || app.salary_max) && (
                      <div style={{ fontSize: "13px", color: gold, fontFamily: sans, flexShrink: 0 }}>
                        £{app.salary_min?.toLocaleString()}{app.salary_max ? `–${app.salary_max?.toLocaleString()}` : "+"}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Detail panel */}
          {selectedApp && (() => {
            const status = STATUSES.find(s => s.id === selectedApp.status) || STATUSES[0];
            return (
              <div style={{ background: dark, padding: "28px", borderLeft: "0.5px solid rgba(201,168,76,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "24px" }}>
                  <div>
                    <div style={{ fontSize: "20px", fontWeight: "300", color: text, marginBottom: "4px" }}>{selectedApp.company}</div>
                    {selectedApp.role && <div style={{ fontSize: "13px", color: "rgba(235,229,220,0.4)", fontFamily: sans }}>{selectedApp.role}</div>}
                  </div>
                  <button onClick={() => setSelectedApp(null)} style={{ background: "none", border: "none", color: "rgba(235,229,220,0.2)", cursor: "pointer", fontSize: "18px", padding: "0" }}>×</button>
                </div>

                {/* Status pipeline */}
                <div style={{ marginBottom: "28px" }}>
                  <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.4)", marginBottom: "12px", fontFamily: sans }}>Update status</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    {STATUSES.map(s => (
                      <div key={s.id} onClick={() => updateStatus(selectedApp.id, s.id)}
                        style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", background: selectedApp.status === s.id ? `${s.color}15` : "transparent", borderLeft: selectedApp.status === s.id ? `2px solid ${s.color}` : "2px solid transparent", transition: "all 0.2s" }}
                        onMouseEnter={e => { if (selectedApp.status !== s.id) (e.currentTarget as HTMLDivElement).style.background = "rgba(235,229,220,0.03)"; }}
                        onMouseLeave={e => { if (selectedApp.status !== s.id) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                      >
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                        <div style={{ fontSize: "13px", color: selectedApp.status === s.id ? s.color : "rgba(235,229,220,0.4)" }}>{s.label}</div>
                        {selectedApp.status === s.id && <div style={{ marginLeft: "auto", fontSize: "10px", color: `${s.color}60`, fontFamily: sans }}>Current</div>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Details */}
                <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "28px" }}>
                  {selectedApp.location && (
                    <div>
                      <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,168,76,0.35)", marginBottom: "4px", fontFamily: sans }}>Location</div>
                      <div style={{ fontSize: "13px", color: "rgba(235,229,220,0.6)", fontFamily: sans }}>{selectedApp.location}</div>
                    </div>
                  )}
                  {(selectedApp.salary_min || selectedApp.salary_max) && (
                    <div>
                      <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,168,76,0.35)", marginBottom: "4px", fontFamily: sans }}>Salary</div>
                      <div style={{ fontSize: "13px", color: gold, fontFamily: sans }}>£{selectedApp.salary_min?.toLocaleString()} – £{selectedApp.salary_max?.toLocaleString()}</div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,168,76,0.35)", marginBottom: "4px", fontFamily: sans }}>Applied</div>
                    <div style={{ fontSize: "13px", color: "rgba(235,229,220,0.6)", fontFamily: sans }}>{new Date(selectedApp.applied_date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
                  </div>
                  {selectedApp.job_url && (
                    <div>
                      <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,168,76,0.35)", marginBottom: "4px", fontFamily: sans }}>Job posting</div>
                      <a href={selectedApp.job_url} target="_blank" rel="noreferrer" style={{ fontSize: "12px", color: gold, fontFamily: sans, opacity: 0.7 }}>View →</a>
                    </div>
                  )}
                  {selectedApp.notes && (
                    <div>
                      <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,168,76,0.35)", marginBottom: "4px", fontFamily: sans }}>Notes</div>
                      <div style={{ fontSize: "13px", color: "rgba(235,229,220,0.5)", fontFamily: sans, lineHeight: "1.6" }}>{selectedApp.notes}</div>
                    </div>
                  )}
                </div>

                <button onClick={() => deleteApp(selectedApp.id)}
                  style={{ background: "none", border: "0.5px solid rgba(224,120,120,0.2)", color: "rgba(224,120,120,0.5)", padding: "10px 20px", cursor: "pointer", fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: sans, width: "100%" }}>
                  Delete application
                </button>
              </div>
            );
          })()}
        </div>

        {/* Daily chart — last 7 days */}
        {apps.length > 0 && (
          <div style={{ marginTop: "48px", padding: "32px 36px", border: "0.5px solid rgba(201,168,76,0.08)" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(201,168,76,0.45)", marginBottom: "24px", fontFamily: sans }}>Applications — last 7 days</div>
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", height: "80px" }}>
              {Array.from({ length: 7 }).map((_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (6 - i));
                const d = date.toISOString().split("T")[0];
                const count = apps.filter(a => a.applied_date === d).length;
                const max = Math.max(...Array.from({ length: 7 }).map((_, j) => {
                  const dd = new Date(); dd.setDate(dd.getDate() - (6 - j));
                  return apps.filter(a => a.applied_date === dd.toISOString().split("T")[0]).length;
                }), 1);
                const height = Math.max(4, (count / max) * 72);
                const isToday = i === 6;
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                    {count > 0 && <div style={{ fontSize: "10px", color: isToday ? gold : "rgba(235,229,220,0.3)", fontFamily: sans }}>{count}</div>}
                    <div style={{ width: "100%", height: `${height}px`, background: isToday ? gold : "rgba(201,168,76,0.2)", transition: "height 0.5s ease" }} />
                    <div style={{ fontSize: "9px", color: "rgba(235,229,220,0.25)", fontFamily: sans }}>{date.toLocaleDateString("en-GB", { weekday: "short" })}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
