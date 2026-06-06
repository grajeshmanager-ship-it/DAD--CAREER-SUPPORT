import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getUserIdFromRequest, rateLimitResponse } from "@/lib/rateLimit";
import { writeMemories, getMemoryContext } from "@/lib/dad-memory";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SITUATION_CONTEXT: Record<string, string> = {
  student: "The person is currently studying. Focus on exploration, discovering interests, early career positioning, internships, and building a foundation.",
  fresh_graduate: "The person recently graduated. Focus on positioning their degree, first role strategy, standing out with no experience, and building momentum quickly.",
  job_seeker: "The person has experience but is struggling to land a role. Be honest about what might be going wrong. Focus on fixing the specific blockers — CV, targeting, interview performance, positioning.",
  employed_looking: "The person is employed but wants more. Focus on strategic career moves, negotiation, promotion paths, or lateral moves that accelerate growth.",
  career_change: "The person wants to move into a completely different field. Identify transferable skills they can't see themselves. Build a credible bridge between where they are and where they want to go.",
  returning: "The person is returning to work after a break. Reframe the gap as an asset. Rebuild confidence. Identify what has changed in their field and how to re-enter strategically.",
  founder: "The person wants to build a company. Do NOT suggest traditional career roles. Focus entirely on the founder journey — validation, business model, funding, team, and execution.",
};

export async function POST(request: NextRequest) {
  try {
    const effectiveUserId = (await getUserIdFromRequest(request)) ?? "anonymous";

    const { allowed, remaining, resetAt } = await checkRateLimit(effectiveUserId, "career-assessment");
    if (!allowed) return rateLimitResponse(remaining, resetAt);

    const body = await request.json();
    const { situation, answers, isVoiceSession, persona } = body;

    if (!situation || !answers) {
      return NextResponse.json(
        { error: "Missing data", message: "Please complete the assessment." },
        { status: 400 }
      );
    }

    const situationContext = SITUATION_CONTEXT[situation] || "";
    const isFounder = situation === "founder";

    // Load existing memory context to make roadmap deeply personal
    let memoryContext = "";
    if (effectiveUserId !== "anonymous") {
      memoryContext = await getMemoryContext(effectiveUserId);
    }

    const contentSummary = isVoiceSession
      ? `This roadmap was generated from a REAL VOICE CONVERSATION between the person and a career counsellor (${persona}). The transcript below captures what the person actually said — their real words, concerns, ambitions, and personality. Use everything in the transcript to generate highly personalised insights.

CONVERSATION TRANSCRIPT:
${answers.transcript || "(No transcript available)"}

${answers.cvSummary ? `CV SUMMARY: ${answers.cvSummary}` : ""}`
      : `The person filled in a career assessment form with the following answers:
${JSON.stringify(answers, null, 2)}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `You are an expert career strategist generating a deeply personalised roadmap.

${memoryContext ? `WHAT DAD ALREADY KNOWS ABOUT THIS PERSON:\n${memoryContext}\n` : ""}

SITUATION: ${situation}
CONTEXT: ${situationContext}

${contentSummary}

Use everything DAD already knows about this person to make the roadmap deeply personal — reference their history, their previous conversations, their dream, their struggles if they have shared them before.

Generate a JSON roadmap with exactly these fields:

{
"careerPath": string (the specific path this person should pursue — precise, not generic),
"headline": string (one powerful sentence about their potential — personal to what they shared),
"whoYouAre": string (3-4 sentences: based on everything shared, here is who I think you are — reference specific things they said, warm but direct),
"strongestTraits": string[] (4-5 genuine character traits identified from the conversation — specific, not generic),
"topRoles": [
{
"title": string,
"salaryMin": number,
"salaryMax": number,
"currency": "GBP",
"fit": number (0-100),
"why": string (specific to this person)
}
] (top 4 roles — for founders, use "Founder", "CEO", "CTO" etc),
"skillsToLearn": [
{
"skill": string,
"priority": "high" | "medium" | "low",
"timeMonths": number,
"why": string
}
] (top 6 skills),
"actionPlan": [
{
"week": string,
"action": string,
"outcome": string
}
] (12-week plan, 6 milestones),
"courses": [
{
"name": string,
"provider": string,
"durationWeeks": number,
"free": boolean,
"why": string
}
] (top 4 courses),
"encouragement": string (warm, personal closing — 2-3 sentences referencing what they shared),
"summary": string (2 sentence summary for profile storage),
"careerRoles": string[] (array of role titles for profile storage)
${isFounder ? `,
"founderPath": {
"idea": string (what they want to build),
"validation": string[] (4 steps to validate before building),
"firstSteps": string[] (4 concrete actions in first 90 days),
"skills": string[] (4 skills critical for this founder),
"resources": string[] (4 specific resources — books, communities, tools)
}` : ""}
}

Return ONLY valid JSON. No explanation, no markdown, no backticks.`,
        },
      ],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    let roadmap;
    try {
      const clean = responseText.replace(/```json|```/g, "").trim();
      roadmap = JSON.parse(clean);
    } catch {
      console.error("[career-assessment] JSON parse failed:", responseText.slice(0, 300));
      return NextResponse.json(
        { error: "Assessment failed", message: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }

    // Save to profile
    if (effectiveUserId !== "anonymous") {
      await supabase
        .from("profiles")
        .update({
          career_path: roadmap.careerPath,
          career_roles: roadmap.careerRoles || roadmap.topRoles?.map((r: { title: string }) => r.title),
          last_analysis_at: new Date().toISOString(),
        })
        .eq("id", effectiveUserId);

      // Write rich memories from this assessment
      const topRoleTitles = roadmap.topRoles?.map((r: { title: string }) => r.title).join(", ") || "";
      const topSkills = roadmap.skillsToLearn?.slice(0, 3).map((s: { skill: string }) => s.skill).join(", ") || "";
      const personaName = persona || "career specialist";

      await writeMemories([
        {
          user_id: effectiveUserId,
          memory_type: "journey",
          category: "career_assessment",
          content: `Completed a career assessment with ${personaName}. Situation: ${situation}. Career path identified: ${roadmap.careerPath}. Top roles: ${topRoleTitles}.`,
          importance: 9,
          metadata: {
            persona,
            situation,
            careerPath: roadmap.careerPath,
            topRoles: roadmap.topRoles,
            isVoiceSession,
          },
        },
        {
          user_id: effectiveUserId,
          memory_type: "identity",
          category: "traits",
          content: `Strongest traits identified in assessment: ${roadmap.strongestTraits?.join(", ") || "not identified"}. ${roadmap.whoYouAre || ""}`,
          importance: 8,
          metadata: { traits: roadmap.strongestTraits },
        },
        {
          user_id: effectiveUserId,
          memory_type: "journey",
          category: "skills_gap",
          content: `Skills to develop identified: ${topSkills}. These are the priority areas for growth.`,
          importance: 7,
          metadata: { skills: roadmap.skillsToLearn },
        },
        {
          user_id: effectiveUserId,
          memory_type: "milestone",
          category: "roadmap_generated",
          content: `Roadmap generated. Headline: "${roadmap.headline}". Encouragement: "${roadmap.encouragement}"`,
          importance: 8,
          metadata: {
            headline: roadmap.headline,
            actionPlan: roadmap.actionPlan,
            courses: roadmap.courses,
          },
        },
        ...(isVoiceSession && answers.transcript ? [{
          user_id: effectiveUserId,
          memory_type: "journey" as const,
          category: "voice_conversation",
          content: `Had a voice career assessment conversation with ${personaName}. Key topics from transcript: ${answers.transcript.slice(0, 300)}...`,
          importance: 8,
          metadata: { persona, transcriptLength: answers.transcript.length },
        }] : []),
        ...(isFounder && roadmap.founderPath ? [{
          user_id: effectiveUserId,
          memory_type: "identity" as const,
          category: "founder_ambition",
          content: `Identified as a founder. Idea: ${roadmap.founderPath.idea}. First steps planned: ${roadmap.founderPath.firstSteps?.slice(0, 2).join(", ")}.`,
          importance: 9,
          metadata: { founderPath: roadmap.founderPath },
        }] : []),
      ]);
    }

    return NextResponse.json({ success: true, roadmap });
  } catch (error) {
    console.error("[career-assessment] Unhandled error:", error);
    return NextResponse.json(
      { error: "Server error", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
