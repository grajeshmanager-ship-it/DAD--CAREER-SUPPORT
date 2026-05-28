import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { situation, education, experience, interests, skills, goals, country } = await request.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

    const prompt = `You are DAD — a deeply knowledgeable, honest, and caring career advisor. A person has shared their background with you. Give them a genuinely personalised, honest career assessment.

PERSON'S DETAILS:
- Situation: ${situation}
- Education: ${education}
- Experience: ${experience || "None"}
- Interests: ${interests}
- Skills: ${skills || "None listed"}
- Career goals: ${goals}
- Country: ${country}

Return ONLY valid JSON in this exact shape:
{
  "recommendedPath": "Clear career path name e.g. 'Product Management' or 'Data Analytics'",
  "reasoning": "2-3 honest sentences explaining exactly why this path suits them based on their specific background",
  "topRoles": [
    {
      "title": "Job title",
      "description": "One sentence on what this role involves day to day",
      "salaryRange": "e.g. £35k-£55k or $50k-$80k based on their country"
    }
  ],
  "skillsToLearn": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "actionPlan": [
    {
      "step": "Short step title",
      "timeframe": "e.g. Week 1-2",
      "description": "Specific, actionable description of what to do"
    }
  ],
  "courses": [
    {
      "name": "Course name",
      "provider": "Coursera / Udemy / LinkedIn Learning etc",
      "reason": "Why this specific course for this person"
    }
  ],
  "encouragement": "One warm, honest sentence from DAD — not generic, specific to their situation"
}

Rules:
- Be honest. If their background doesn't match their goals, say so kindly but clearly.
- Be specific. Use their actual details, not generic advice.
- topRoles: exactly 3 roles
- skillsToLearn: exactly 5-6 skills
- actionPlan: exactly 5 steps with realistic timeframes
- courses: exactly 3-4 courses
- Salary ranges should reflect the country they want to work in
- Return ONLY the JSON, no other text`;

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
