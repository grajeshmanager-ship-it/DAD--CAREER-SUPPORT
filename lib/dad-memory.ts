import { createClient } from "@supabase/supabase-js";

const getSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface DadMemory {
  id?: string;
  user_id: string;
  memory_type: "identity" | "journey" | "emotional" | "outcome" | "milestone";
  category: string;
  content: string;
  metadata?: Record<string, unknown>;
  importance?: number;
  session_date?: string;
  created_at?: string;
}

// Write a single memory
export async function writeMemory(memory: DadMemory): Promise<void> {
  const supabase = getSupabase();
  try {
    await supabase.from("dad_memory").insert({
      ...memory,
      session_date: new Date().toISOString().split("T")[0],
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[dad-memory] write failed:", err);
  }
}

// Write multiple memories at once
export async function writeMemories(memories: DadMemory[]): Promise<void> {
  const supabase = getSupabase();
  try {
    const dated = memories.map(m => ({
      ...m,
      session_date: new Date().toISOString().split("T")[0],
      created_at: new Date().toISOString(),
    }));
    await supabase.from("dad_memory").insert(dated);
  } catch (err) {
    console.error("[dad-memory] batch write failed:", err);
  }
}

// Read last N memories for a user
export async function readMemories(userId: string, limit = 30): Promise<DadMemory[]> {
  const supabase = getSupabase();
  try {
    const { data } = await supabase
      .from("dad_memory")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data || []) as DadMemory[];
  } catch {
    return [];
  }
}

// Read memories by type
export async function readMemoriesByType(
  userId: string,
  type: DadMemory["memory_type"],
  limit = 20
): Promise<DadMemory[]> {
  const supabase = getSupabase();
  try {
    const { data } = await supabase
      .from("dad_memory")
      .select("*")
      .eq("user_id", userId)
      .eq("memory_type", type)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data || []) as DadMemory[];
  } catch {
    return [];
  }
}

// Read memories by category
export async function readMemoriesByCategory(
  userId: string,
  category: string,
  limit = 20
): Promise<DadMemory[]> {
  const supabase = getSupabase();
  try {
    const { data } = await supabase
      .from("dad_memory")
      .select("*")
      .eq("user_id", userId)
      .eq("category", category)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data || []) as DadMemory[];
  } catch {
    return [];
  }
}

// Get the full memory context string for AI prompts
export async function getMemoryContext(userId: string): Promise<string> {
  const supabase = getSupabase();
  try {
    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, dream, dream_reason, career_path, resume_summary, resume_ats_score, situation, country, created_at, last_seen_at, total_sessions, dad_memory_summary")
      .eq("id", userId)
      .single();

    // Get last 40 memories ordered by importance then date
    const { data: memories } = await supabase
      .from("dad_memory")
      .select("*")
      .eq("user_id", userId)
      .order("importance", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(40);

    if (!profile && !memories?.length) return "";

    const daysSinceJoined = profile?.created_at
      ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const daysSinceLastSeen = profile?.last_seen_at
      ? Math.floor((Date.now() - new Date(profile.last_seen_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    let context = `=== DAD MEMORY CONTEXT FOR ${profile?.full_name || "this person"} ===\n\n`;

    if (profile) {
      context += `IDENTITY:\n`;
      context += `- Name: ${profile.full_name}\n`;
      context += `- Has been with DAD for ${daysSinceJoined} days\n`;
      context += `- Sessions total: ${profile.total_sessions || 0}\n`;
      context += `- Last seen: ${daysSinceLastSeen === 0 ? "today" : `${daysSinceLastSeen} days ago`}\n`;
      if (profile.dream) context += `- Dream: ${profile.dream}\n`;
      if (profile.dream_reason) context += `- Why this dream matters: ${profile.dream_reason}\n`;
      if (profile.career_path) context += `- Career direction: ${profile.career_path}\n`;
      if (profile.situation) context += `- Situation when joined: ${profile.situation}\n`;
      if (profile.country) context += `- Location: ${profile.country}\n`;
      if (profile.resume_ats_score) context += `- CV ATS Score: ${profile.resume_ats_score}/100\n`;
      if (profile.dad_memory_summary) context += `- Summary: ${profile.dad_memory_summary}\n`;
    }

    if (memories?.length) {
      context += `\nMEMORIES (most important first):\n`;
      memories.forEach((m, i) => {
        const date = new Date(m.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
        context += `${i + 1}. [${date}] [${m.memory_type.toUpperCase()}/${m.category}] ${m.content}\n`;
      });
    }

    context += `\n=== END MEMORY CONTEXT ===\n`;
    return context;
  } catch (err) {
    console.error("[dad-memory] context build failed:", err);
    return "";
  }
}

// Update last seen and session count
export async function updateUserPresence(userId: string): Promise<void> {
  const supabase = getSupabase();
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("last_seen_at, total_sessions")
      .eq("id", userId)
      .single();

    const lastSeen = profile?.last_seen_at ? new Date(profile.last_seen_at) : null;
    const now = new Date();
    const isNewSession = !lastSeen || (now.getTime() - lastSeen.getTime()) > 1000 * 60 * 30; // 30 min gap = new session

    await supabase.from("profiles").update({
      last_seen_at: now.toISOString(),
      total_sessions: isNewSession ? (profile?.total_sessions || 0) + 1 : (profile?.total_sessions || 0),
    }).eq("id", userId);

    // If user was away for more than 7 days, write an emotional memory
    if (lastSeen) {
      const daysSince = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince >= 7) {
        await writeMemory({
          user_id: userId,
          memory_type: "emotional",
          category: "absence",
          content: `User returned after ${daysSince} days away. Last seen ${lastSeen.toLocaleDateString("en-GB")}. Something may have happened during this period.`,
          importance: 7,
          metadata: { days_away: daysSince, last_seen: lastSeen.toISOString() },
        });
      }
    }
  } catch (err) {
    console.error("[dad-memory] presence update failed:", err);
  }
}

// Generate and update AI memory summary for profile
export async function updateMemorySummary(userId: string): Promise<void> {
  const supabase = getSupabase();
  try {
    const { data: memories } = await supabase
      .from("dad_memory")
      .select("content, memory_type, category, created_at")
      .eq("user_id", userId)
      .order("importance", { ascending: false })
      .limit(20);

    if (!memories?.length) return;

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const memorySummary = memories.map(m =>
      `[${m.memory_type}/${m.category}] ${m.content}`
    ).join("\n");

    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `Summarise this person's career journey in 2-3 sentences based on these memories. Be specific. Focus on where they are in their journey and what matters to them.\n\nMemories:\n${memorySummary}\n\nReturn ONLY the summary. No labels. No preamble.`
      }]
    });

    const summary = msg.content[0].type === "text" ? msg.content[0].text : "";
    if (summary) {
      await supabase.from("profiles").update({ dad_memory_summary: summary }).eq("id", userId);
    }
  } catch (err) {
    console.error("[dad-memory] summary update failed:", err);
  }
}
