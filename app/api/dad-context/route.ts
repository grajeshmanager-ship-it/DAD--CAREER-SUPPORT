import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getUserIdFromRequest } from "@/lib/rateLimit";
import { getMemoryContext, updateUserPresence, updateMemorySummary, readMemories } from "@/lib/dad-memory";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const effectiveUserId = (await getUserIdFromRequest(request)) ?? "anonymous";
    const body = await request.json();
    const { companionType, companionName, page } = body;

    if (effectiveUserId === "anonymous") {
      return NextResponse.json({ success: true, greeting: null, context: null });
    }

    // Update presence
    await updateUserPresence(effectiveUserId);

    // Get full memory context
    const memoryContext = await getMemoryContext(effectiveUserId);

    // Get recent memories for greeting
    const recentMemories = await readMemories(effectiveUserId, 10);

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, last_seen_at, total_sessions, dream")
      .eq("id", effectiveUserId)
      .single();

    const firstName = profile?.full_name?.split(" ")[0] || "there";
    const daysSinceLastSeen = profile?.last_seen_at
      ? Math.floor((Date.now() - new Date(profile.last_seen_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const isFirstSession = (profile?.total_sessions || 0) <= 1;

    // Generate a personalised greeting from DAD based on memory
    const recentMemoryText = recentMemories.slice(0, 5).map(m => `- ${m.content}`).join("\n");

    const greetingPrompt = isFirstSession
      ? `You are ${companionName || "DAD"}, a warm ${companionType || "career companion"}. This is the very first time you are speaking to ${firstName}. Welcome them warmly. Ask them one question to start understanding them. Keep it to 2 sentences maximum. Speak naturally, not robotically.`
      : `You are ${companionName || "DAD"}, a warm ${companionType || "career companion"} who has known ${firstName} for a while. 

Here is what you know about them:
${recentMemoryText}

They were last seen ${daysSinceLastSeen === 0 ? "earlier today" : `${daysSinceLastSeen} days ago`}.
Current page: ${page || "dashboard"}.

Write ONE personalised greeting sentence that references something specific you know about them — their last action, their dream, or how they are progressing. Then ask one relevant follow-up question. Maximum 2 sentences total. Sound like a real person who remembers them, not a robot reading a report.`;

    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 150,
      messages: [{ role: "user", content: greetingPrompt }]
    });

    const greeting = msg.content[0].type === "text" ? msg.content[0].text : null;

    // Update memory summary every 5 sessions
    if ((profile?.total_sessions || 0) % 5 === 0) {
      updateMemorySummary(effectiveUserId).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      greeting,
      context: memoryContext,
      firstName,
      daysSinceLastSeen,
      isFirstSession,
      totalSessions: profile?.total_sessions || 0,
    });
  } catch (error) {
    console.error("[dad-context]", error);
    return NextResponse.json({ success: false, greeting: null }, { status: 500 });
  }
}
