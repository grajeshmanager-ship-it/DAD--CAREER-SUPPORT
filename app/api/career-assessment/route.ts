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
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorised", message: "Please log in to get your career assessment." },
        { status: 401 }
      );
    }

    const { allowed, remaining, resetAt } = await checkRateLimit(userId, "career-assessment");
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
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are an expert career strategist. Based on this person's situation and answers, create a personalised career roadmap.

Return a JSON object with exactly these fields:

{
  "careerPath": string,
  "headline": string,
  "topRoles": [{ "title": string, "salaryMin": number, "salaryMax": number, "currency": "GBP", "fit": number, "why": string }],
  "skillsToLearn": [{ "skill": string, "priority": "high"|"medium"|"low", "timeMonths": number }],
  "actionPlan": [{ "week": string, "action": string, "outcome": string }],
  "courses": [{ "name": string, "provider": string, "durationWeeks": number, "free": boolean }],
  "encouragement": string,
  "summary": string
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
      return NextResponse.json(
        { error: "Assessment failed", message: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }

    await supabase
      .from("profiles")
      .update({
        career_path: roadmap.careerPath,
        career_roles: roadmap.topRoles?.map((r: { title: string }) => r.title),
        last_analysis_at: new Date().toISOString(),
      })
      .eq("id", userId);

    return NextResponse.json({ success: true, roadmap });
  } catch (error) {
    console.error("[career-assessment] Unhandled error:", error);
    return NextResponse.json(
      { error: "Server error", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
