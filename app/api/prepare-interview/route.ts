import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { jobDescription, resumeText } = await request.json();

    if (!jobDescription || jobDescription.trim().length < 20) {
      return NextResponse.json({ error: "Please provide a job description." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const prompt = `You are a senior recruiter with 20 years of experience. Analyse this job description and candidate resume to prepare a realistic interview plan.

JOB DESCRIPTION:
${jobDescription}

${resumeText ? `CANDIDATE RESUME:\n${resumeText.substring(0, 2000)}` : "No resume provided."}

Return ONLY valid JSON in this exact shape:
{
  "roleTitle": "Exact job title from JD",
  "company": "Company name if mentioned, otherwise infer from context",
  "seniorityLevel": "Junior / Mid-level / Senior / Lead / Executive",
  "interviewStyle": "Competency-based / Technical / Case-based / Mixed",
  "numberOfQuestions": 8,
  "keySkillsRequired": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "topThingsToGetHired": [
    "Specific thing 1 that will get them hired for THIS role",
    "Specific thing 2",
    "Specific thing 3"
  ],
  "topThingsToGetRejected": [
    "Specific thing 1 that will get them rejected",
    "Specific thing 2",
    "Specific thing 3"
  ],
  "interviewQuestions": [
    {
      "id": 1,
      "type": "Behavioural / Technical / Situational / Curveball",
      "question": "Full interview question exactly as an interviewer would ask it",
      "whatTheyAreTesting": "What this question is really measuring",
      "idealAnswerPoints": ["Point 1 a strong answer would cover", "Point 2", "Point 3"]
    }
  ],
  "intelSummary": "2-3 sentences: what kind of company/team this is, what they really care about, and how candidates should position themselves"
}

RULES:
- numberOfQuestions must be between 6 and 12 based on seniority (junior=6-8, senior=10-12)
- Include a mix: 30% behavioural, 30% technical/role-specific, 20% situational, 20% curveball
- Questions must be SPECIFIC to this job, not generic
- If resume provided, tailor questions to probe gaps or verify claims in their CV
- The curveball questions should feel unexpected but fair
- Return ONLY the JSON, no other text`;

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeResponse.ok) {
      return NextResponse.json({ error: `Claude API error: ${claudeResponse.status}` }, { status: claudeResponse.status });
    }

    const claudeData = await claudeResponse.json();
    const responseText = claudeData.content?.[0]?.text || "";

    let plan;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      plan = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({ error: "Failed to parse interview plan. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to prepare interview" },
      { status: 500 }
    );
  }
}
