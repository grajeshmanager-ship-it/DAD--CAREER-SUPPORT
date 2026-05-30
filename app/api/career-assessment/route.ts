import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getUserIdFromRequest, rateLimitResponse } from "@/lib/rateLimit";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const effectiveUserId = (await getUserIdFromRequest(request)) ?? "anonymous";

    const { allowed, remaining, resetAt } = await checkRateLimit(effectiveUserId, "career-assessment");
    if (!allowed) {
      return rateLimitResponse(remaining, resetAt);
    }

    const body = await request.json();
    const { situation, answers } = body;

    if (!situation || !answers) {
      return NextResponse.json(
        { error: "Missing data", message: "Please complete all assessment questions." },
        { status: 400 }
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `You are an expert career strategist and human behaviour expert. Based on this person's situation and answers, create a deeply personalised career roadmap.

The output should feel like a companion who truly understands them — not a generic assessment tool.

Return a JSON object with exactly these fields:

{
  "careerPath": string (e.g. "Software Engineering", "Product Management"),
  "headline": string (one powerful sentence about their potential — personal, not generic),
  "whoYouAre": string (2-3 sentences: "Based on everything you have told me, here is who I think you are..." — warm, insightful, personal),
  "strongestTraits": string[] (3-4 genuine character traits identified from their answers),
  "topRoles": [
    {
      "title": string,
      "salaryMin": number,
      "salaryMax": number,
      "currency": "GBP",
      "fit": number (0-100),
      "why": string (why this role suits THIS person specifically)
    }
  ] (top 4 roles),
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
      "week": string (e.g. "Week 1-2"),
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
  "encouragement": string (warm, honest, personal closing message — 2-3 sentences from a companion who believes in them),
  "summary": string (2 sentence summary in third person for context storage),
  "careerRoles": string[] (array of role titles for profile storage)
}

Return ONLY valid JSON. No explanation, no markdown, no backticks.

SITUATION: ${situation}

ANSWERS:
${JSON.stringify(answers, null, 2)}`,
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

    if (effectiveUserId !== "anonymous") {
      await supabase
        .from("profiles")
        .update({
          career_path: roadmap.careerPath,
          career_roles: roadmap.careerRoles || roadmap.topRoles?.map((r: { title: string }) => r.title),
          last_analysis_at: new Date().toISOString(),
        })
        .eq("id", effectiveUserId);
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
