import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      situation, education, experience, interests,
      skills, goals, country, situationContext,
      graduationDate, applied, whyLeaving, breakReason, concerns
    } = body;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

    const prompt = `You are DAD — a deeply knowledgeable, honest, and caring career advisor. Analyse this person's situation and give them a genuinely personalised career assessment.

SITUATION TYPE: ${situation}
SPECIAL CONTEXT: ${situationContext}

PERSON'S DETAILS:
- Education: ${education}
- Country: ${country}
- Experience: ${experience || "None"}
- Graduation date: ${graduationDate || "N/A"}
- Application history: ${applied || "N/A"}
- Why leaving: ${whyLeaving || "N/A"}
- Career break: ${breakReason || "N/A"}
- Interests: ${interests}
- Skills: ${skills || "None listed"}
- Goals: ${goals}
- Concerns: ${concerns || "Not specified"}

Return ONLY valid JSON:
{
  "recommendedPath": "Specific career path name",
  "reasoning": "2-3 honest sentences explaining why",
  "topRoles": [
    { "title": "Job title", "description": "Day-to-day reality", "salaryRange": "£28k-£40k" }
  ],
  "skillsToLearn": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "actionPlan": [
    { "step": "Short title", "timeframe": "This week", "description": "Specific action" }
  ],
  "courses": [
    { "name": "Course name", "provider": "Provider", "reason": "Why this course" }
  ],
  "encouragement": "One warm honest sentence from DAD",
  "careerSummary": "One paragraph summary of this person's career situation, goals and recommended path — detailed enough for an AI to reference in conversation"
}

Rules: topRoles 3, skillsToLearn 5-6, actionPlan 5, courses 3-4.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) return NextResponse.json({ error: "Claude API error" }, { status: 500 });

    const claudeData = await response.json();
    const text = claudeData.content?.[0]?.text || "";

    let result;
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON found");
      result = JSON.parse(match[0]);
    } catch {
      return NextResponse.json({ error: "Failed to parse result" }, { status: 500 });
    }

    // Save to Supabase profile
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({
          career_path: result.recommendedPath,
          career_roles: result.topRoles?.map((r: { title: string }) => r.title) || [],
          last_analysis_at: new Date().toISOString(),
        }).eq("id", user.id);
      }
    } catch { /* silent */ }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
