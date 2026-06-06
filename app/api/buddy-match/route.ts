import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { getUserIdFromRequest } from "@/lib/rateLimit";
import { writeMemory, getMemoryContext } from "@/lib/dad-memory";

export const maxDuration = 60;

const getSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Calculate match score between two profiles
function calculateMatchScore(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Tech stack alignment — 40 points
  const aStack = (a.tech_stack as string[]) || [];
  const bStack = (b.tech_stack as string[]) || [];
  const commonTech = aStack.filter(t =>
    bStack.some(bt => bt.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(bt.toLowerCase()))
  );
  const techScore = Math.min(40, commonTech.length * 10);
  score += techScore;
  if (commonTech.length > 0) {
    reasons.push(`Both work with ${commonTech.slice(0, 3).join(", ")}`);
  }

  // Career stage — 25 points (aspirational pairing scores highest)
  const stageOrder = ["searching", "interviewing", "just_landed", "employed"];
  const aStageIdx = stageOrder.indexOf(a.career_stage as string);
  const bStageIdx = stageOrder.indexOf(b.career_stage as string);
  const stageDiff = Math.abs(aStageIdx - bStageIdx);
  if (stageDiff === 1) { score += 25; reasons.push("One step ahead — perfect mentor match"); }
  else if (stageDiff === 0) { score += 18; reasons.push("Same stage — solidarity and shared experience"); }
  else if (stageDiff === 2) { score += 10; reasons.push("Different stages — broad perspective"); }

  // Target roles — 20 points
  const aRoles = (a.target_roles as string[]) || [];
  const bRoles = (b.target_roles as string[]) || [];
  const commonRoles = aRoles.filter(r =>
    bRoles.some(br => br.toLowerCase().includes(r.toLowerCase()) || r.toLowerCase().includes(br.toLowerCase()))
  );
  const roleScore = Math.min(20, commonRoles.length * 7);
  score += roleScore;
  if (commonRoles.length > 0) {
    reasons.push(`Targeting similar roles: ${commonRoles.slice(0, 2).join(", ")}`);
  }

  // Experience proximity — 15 points
  const expDiff = Math.abs((a.experience_years as number || 0) - (b.experience_years as number || 0));
  if (expDiff <= 1) { score += 15; reasons.push("Very similar experience level"); }
  else if (expDiff <= 3) { score += 8; reasons.push("Comparable experience level"); }

  // Industry alignment — bonus 10 points
  const aIndustry = (a.target_industry as string[]) || [];
  const bIndustry = (b.target_industry as string[]) || [];
  const commonIndustry = aIndustry.filter(i =>
    bIndustry.some(bi => bi.toLowerCase() === i.toLowerCase())
  );
  if (commonIndustry.length > 0) {
    score += Math.min(10, commonIndustry.length * 5);
    reasons.push(`Same target industry: ${commonIndustry[0]}`);
  }

  return { score: Math.min(100, score), reasons };
}

// Generate DAD's personalised introduction between two people
async function generateIntroduction(
  userMemory: string,
  matchProfile: Record<string, unknown>,
  matchReasons: string[]
): Promise<string> {
  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `You are DAD — a warm career companion. You are introducing two people to each other because you think they should connect.

What you know about the person you are telling:
${userMemory.slice(0, 500)}

About the match:
- Tech: ${(matchProfile.tech_stack as string[])?.join(", ")}
- Stage: ${matchProfile.career_stage}
- Experience: ${matchProfile.experience_years} years
- Target roles: ${(matchProfile.target_roles as string[])?.join(", ")}
- Why they match: ${matchReasons.join(", ")}

Write ONE warm, specific introduction from DAD to the user. 2-3 sentences max. Tell them why THIS person specifically could help them. Make it feel personal and exciting. Do not be generic. Reference what you know about the user's own journey.`
      }]
    });
    return msg.content[0].type === "text" ? msg.content[0].text : "I think you two should meet.";
  } catch {
    return `I found someone on a very similar path to yours. They are ${matchProfile.career_stage?.toString().replace("_", " ")} and work with ${(matchProfile.tech_stack as string[])?.slice(0, 2).join(" and ")}. I think you could really help each other.`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const effectiveUserId = (await getUserIdFromRequest(request)) ?? "anonymous";
    if (effectiveUserId === "anonymous") {
      return NextResponse.json({ error: "Auth required" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;
    const supabase = getSupabase();

    // ── UPDATE BUDDY PROFILE ──
    if (action === "update_profile") {
      const { profile } = body;

      await supabase.from("buddy_profiles").upsert({
        user_id: effectiveUserId,
        ...profile,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      return NextResponse.json({ success: true });
    }

    // ── GET MY PROFILE ──
    if (action === "get_my_profile") {
      const { data } = await supabase
        .from("buddy_profiles")
        .select("*")
        .eq("user_id", effectiveUserId)
        .single();

      return NextResponse.json({ success: true, profile: data });
    }

    // ── FIND MATCHES ──
    if (action === "find_matches") {
      // Get current user's buddy profile
      const { data: myProfile } = await supabase
        .from("buddy_profiles")
        .select("*")
        .eq("user_id", effectiveUserId)
        .single();

      if (!myProfile) {
        return NextResponse.json({ error: "Create your buddy profile first" }, { status: 400 });
      }

      // Get all visible profiles except mine and existing connections
      const { data: existingConnections } = await supabase
        .from("buddy_connections")
        .select("requester_id, receiver_id")
        .or(`requester_id.eq.${effectiveUserId},receiver_id.eq.${effectiveUserId}`);

      const connectedIds = new Set(
        (existingConnections || []).flatMap(c => [c.requester_id, c.receiver_id])
      );
      connectedIds.add(effectiveUserId);

      const { data: allProfiles } = await supabase
        .from("buddy_profiles")
        .select("*, profiles!inner(full_name, situation, country)")
        .eq("is_visible", true)
        .neq("user_id", effectiveUserId);

      if (!allProfiles?.length) {
        return NextResponse.json({ success: true, matches: [] });
      }

      // Score every profile
      const scored = allProfiles
        .filter(p => !connectedIds.has(p.user_id))
        .map(p => {
          const { score, reasons } = calculateMatchScore(myProfile, p);
          return { profile: p, score, reasons };
        })
        .filter(m => m.score >= 20)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      // Get memory context for personalised introductions
      const memoryContext = await getMemoryContext(effectiveUserId);

      // Generate DAD introductions for top 3 matches
      const matches = await Promise.all(
        scored.slice(0, 5).map(async ({ profile, score, reasons }) => {
          const introduction = score >= 40
            ? await generateIntroduction(memoryContext, profile, reasons)
            : null;

          // Return anonymous profile
          return {
            id: profile.user_id,
            tech_stack: profile.tech_stack,
            career_stage: profile.career_stage,
            target_roles: profile.target_roles,
            target_industry: profile.target_industry,
            experience_years: profile.experience_years,
            location_country: profile.show_location ? profile.location_country : null,
            situation: profile.situation,
            months_searching: profile.months_searching,
            score,
            reasons,
            dad_introduction: introduction,
            // Only show name if they've opted in
            display_name: profile.show_name
              ? (profile.profiles as Record<string, unknown>)?.full_name as string
              : null,
          };
        })
      );

      return NextResponse.json({ success: true, matches });
    }

    // ── SEND CONNECTION REQUEST ──
    if (action === "connect") {
      const { receiverId } = body;
      if (!receiverId) return NextResponse.json({ error: "receiverId required" }, { status: 400 });

      // Get match score
      const { data: myProfile } = await supabase.from("buddy_profiles").select("*").eq("user_id", effectiveUserId).single();
      const { data: theirProfile } = await supabase.from("buddy_profiles").select("*").eq("user_id", receiverId).single();

      let score = 0;
      let reasons: string[] = [];
      let introduction = "";

      if (myProfile && theirProfile) {
        const result = calculateMatchScore(myProfile, theirProfile);
        score = result.score;
        reasons = result.reasons;
        const memoryContext = await getMemoryContext(effectiveUserId);
        introduction = await generateIntroduction(memoryContext, theirProfile, reasons);
      }

      // Create connection
      const { data: connection, error } = await supabase
        .from("buddy_connections")
        .insert({
          requester_id: effectiveUserId,
          receiver_id: receiverId,
          status: "pending",
          match_score: score,
          match_reasons: reasons,
          dad_introduction: introduction,
        })
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Write memory
      await writeMemory({
        user_id: effectiveUserId,
        memory_type: "milestone",
        category: "buddy_connect",
        content: `Sent a buddy connection request. Match score: ${score}/100. Reasons: ${reasons.join(", ")}.`,
        importance: 6,
        metadata: { receiverId, score, reasons },
      });

      // Send nudge to receiver
      await supabase.from("buddy_nudges").insert({
        user_id: receiverId,
        connection_id: connection.id,
        content: `Someone with a ${score}% match to your profile wants to connect. ${reasons[0] || "Similar career path detected."}`,
      });

      return NextResponse.json({ success: true, connection });
    }

    // ── RESPOND TO CONNECTION ──
    if (action === "respond") {
      const { connectionId, accept } = body;

      await supabase
        .from("buddy_connections")
        .update({
          status: accept ? "accepted" : "declined",
          updated_at: new Date().toISOString(),
        })
        .eq("id", connectionId)
        .eq("receiver_id", effectiveUserId);

      if (accept) {
        // Write memory for both
        await writeMemory({
          user_id: effectiveUserId,
          memory_type: "milestone",
          category: "buddy_accepted",
          content: `Accepted a buddy connection. A new career ally joined the journey.`,
          importance: 7,
        });

        // Get requester ID and notify them
        const { data: conn } = await supabase
          .from("buddy_connections")
          .select("requester_id")
          .eq("id", connectionId)
          .single();

        if (conn) {
          await supabase.from("buddy_nudges").insert({
            user_id: conn.requester_id,
            connection_id: connectionId,
            content: `Your connection request was accepted! You now have a career buddy. Say hello.`,
          });

          await writeMemory({
            user_id: conn.requester_id,
            memory_type: "milestone",
            category: "buddy_accepted",
            content: `A buddy connection was accepted. Career network is growing.`,
            importance: 7,
          });
        }
      }

      return NextResponse.json({ success: true });
    }

    // ── SEND MESSAGE ──
    if (action === "send_message") {
      const { connectionId, circleId, content } = body;

      const { data: message } = await supabase
        .from("buddy_messages")
        .insert({
          connection_id: connectionId || null,
          circle_id: circleId || null,
          sender_id: effectiveUserId,
          content,
        })
        .select()
        .single();

      return NextResponse.json({ success: true, message });
    }

    // ── GET MESSAGES ──
    if (action === "get_messages") {
      const { connectionId, circleId } = body;

      let query = supabase
        .from("buddy_messages")
        .select("*, profiles!sender_id(full_name)")
        .order("created_at", { ascending: true });

      if (connectionId) query = query.eq("connection_id", connectionId);
      if (circleId) query = query.eq("circle_id", circleId);

      const { data: messages } = await query.limit(100);
      return NextResponse.json({ success: true, messages });
    }

    // ── GET MY CONNECTIONS ──
    if (action === "get_connections") {
      const { data: connections } = await supabase
        .from("buddy_connections")
        .select(`
          *,
          buddy_profiles!buddy_connections_receiver_id_fkey(tech_stack, career_stage, target_roles, experience_years, location_country, show_name, show_location),
          profiles!buddy_connections_receiver_id_fkey(full_name)
        `)
        .eq("requester_id", effectiveUserId)
        .eq("status", "accepted");

      const { data: received } = await supabase
        .from("buddy_connections")
        .select(`
          *,
          buddy_profiles!buddy_connections_requester_id_fkey(tech_stack, career_stage, target_roles, experience_years, location_country, show_name, show_location),
          profiles!buddy_connections_requester_id_fkey(full_name)
        `)
        .eq("receiver_id", effectiveUserId)
        .eq("status", "accepted");

      const { data: pending } = await supabase
        .from("buddy_connections")
        .select(`
          *,
          buddy_profiles!buddy_connections_requester_id_fkey(tech_stack, career_stage, target_roles, experience_years),
          profiles!buddy_connections_requester_id_fkey(full_name)
        `)
        .eq("receiver_id", effectiveUserId)
        .eq("status", "pending");

      return NextResponse.json({
        success: true,
        connections: connections || [],
        received: received || [],
        pending: pending || [],
      });
    }

    // ── GET NUDGES ──
    if (action === "get_nudges") {
      const { data: nudges } = await supabase
        .from("buddy_nudges")
        .select("*")
        .eq("user_id", effectiveUserId)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(10);

      return NextResponse.json({ success: true, nudges: nudges || [] });
    }

    // ── AUTO BUILD PROFILE FROM MEMORY ──
    if (action === "build_profile_from_memory") {
      // Pull from existing profile data
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", effectiveUserId)
        .single();

      const { data: appData } = await supabase
        .from("job_applications")
        .select("applied_date, status")
        .eq("user_id", effectiveUserId);

      const totalApps = appData?.length || 0;
      const interviews = appData?.filter(a => a.status === "interview" || a.status === "offer").length || 0;

      // Determine career stage
      let career_stage = "searching";
      if (appData?.some(a => a.status === "offer")) career_stage = "just_landed";
      else if (interviews > 0) career_stage = "interviewing";

      // Calculate months searching
      const firstApp = appData?.sort((a, b) =>
        new Date(a.applied_date).getTime() - new Date(b.applied_date).getTime()
      )[0];
      const monthsSearching = firstApp
        ? Math.floor((Date.now() - new Date(firstApp.applied_date).getTime()) / (1000 * 60 * 60 * 24 * 30))
        : 0;

      const buddyProfile = {
        user_id: effectiveUserId,
        tech_stack: userProfile?.resume_skills?.slice(0, 8) || [],
        career_stage,
        target_roles: userProfile?.career_roles?.slice(0, 5) || [],
        experience_years: 0,
        location_country: userProfile?.country || null,
        situation: userProfile?.situation || null,
        months_searching: monthsSearching,
        applications_count: totalApps,
        interviews_count: interviews,
        is_visible: true,
        show_name: false,
        show_location: false,
        updated_at: new Date().toISOString(),
      };

      await supabase.from("buddy_profiles").upsert(buddyProfile, { onConflict: "user_id" });

      return NextResponse.json({ success: true, profile: buddyProfile });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[buddy-match]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const effectiveUserId = (await getUserIdFromRequest(request)) ?? "anonymous";
    if (effectiveUserId === "anonymous") {
      return NextResponse.json({ error: "Auth required" }, { status: 401 });
    }

    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "nudges") {
      const { data } = await supabase
        .from("buddy_nudges")
        .select("*")
        .eq("user_id", effectiveUserId)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(5);
      return NextResponse.json({ success: true, nudges: data || [] });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[buddy-match GET]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
