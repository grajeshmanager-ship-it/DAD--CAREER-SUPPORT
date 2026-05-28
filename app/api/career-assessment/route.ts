import { NextRequest, NextResponse } from "next/server";

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

    const prompt = `You are DAD — a deeply knowledgeable, honest, and caring career advisor. A person has shared their full situation with you. Give them a genuinely personalised, honest career assessment.

SITUATION TYPE: ${situation}
SPECIAL CONTEXT FOR THIS SITUATION:
${situationContext}

PERSON'S FULL DETAILS:
- Education: ${education}
- Country they want to work in: ${country}
- Work experience: ${experience || "None"}
- Graduation date: ${graduationDate || "N/A"}
- Application history: ${applied || "N/A"}
- Why leaving current career: ${whyLeaving || "N/A"}
- Career break reason/duration: ${breakReason || "N/A"}
- Interests: ${interests}
- Skills: ${skills || "None listed"}
- Career goals/constraints: ${goals}
- Biggest concerns: ${concerns || "Not specified"}

CRITICAL INSTRUCTIONS:
- Use the situation context above to shape your entire response
- Be specific to THIS person's exact background — no generic advice
- Be honest. If something is unrealistic, say so with a better alternative
- Salary ranges must reflect the country they want to work in
- The action plan must be tailored to their specific situation type

Return ONLY valid JSON:
{
  "recommendedPath": "Specific career path name",
  "reasoning": "2-3 honest sentences explaining exactly why this path suits them based on their specific background and situation",
  "topRoles": [
    {
      "title": "Job title",
      "description": "One sentence on day-to-day reality of this role",
      "salaryRange": "Realistic range for their country e.g. £28k-£40k"
    }
  ],
  "skillsToLearn": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "actionPlan": [
    {
      "step": "Short step title",
      "timeframe": "Specific timeframe e.g. This week, Month 1-2, Within 3 months",
      "description": "Specific, actionable, tailored to their situation"
    }
  ],
  "courses": [
    {
      "name": "Specific course name",
      "provider": "Coursera / Udemy / LinkedIn Learning / FutureLearn etc",
      "reason": "Why THIS course for THIS person specifically"
    }
  ],
  "encouragement": "One warm but honest sentence from DAD — specific to their situation, not generic"
}

Rules:
- topRoles: exactly 3
- skillsToLearn: exactly 5-6
- actionPlan: exactly 5 steps, situation-appropriate
- courses: exactly 3-4
- Return ONLY the JSON`;

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

    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
