import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { questions, answers, roleTitle, jobDescription } = await request.json();

    if (!questions || !answers || questions.length === 0) {
      return NextResponse.json({ error: "No interview data provided." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const qaText = questions.map((q: { question: string; idealAnswerPoints: string[] }, i: number) => `
Q${i + 1}: ${q.question}
Ideal answer points: ${q.idealAnswerPoints.join(", ")}
Candidate's answer: ${answers[i] || "[No answer given]"}
`).join("\n");

    const prompt = `You are a senior hiring manager debriefing a mock interview. Be honest, direct, and genuinely helpful — like a mentor, not a cheerleader. Do NOT sugarcoat weak answers.

ROLE: ${roleTitle}
JOB DESCRIPTION SUMMARY: ${jobDescription.substring(0, 500)}

INTERVIEW Q&A:
${qaText}

Return ONLY valid JSON in this exact shape:
{
  "overallScore": 72,
  "verdict": "Strong candidate / Borderline candidate / Would not progress / Strong reject",
  "verdictExplanation": "2-3 honest sentences explaining the overall verdict",
  "strengths": [
    "Specific strength observed in the interview",
    "Another genuine strength"
  ],
  "weaknesses": [
    "Specific weakness that would hurt their chances",
    "Another weakness"
  ],
  "questionBreakdown": [
    {
      "questionNumber": 1,
      "question": "The question asked",
      "candidateAnswer": "Brief summary of what they said",
      "score": 75,
      "whatWasWrong": "Specific, honest critique of what was missing or weak",
      "idealAnswer": "What a strong answer would have included — specific, detailed, practical",
      "tip": "One actionable tip to improve this specific answer"
    }
  ],
  "top3ImprovementAreas": [
    {
      "area": "Specific area to improve",
      "why": "Why this matters for this specific role",
      "howToImprove": "Concrete, actionable advice"
    }
  ],
  "cheatSheet": {
    "title": "Your 30-min prep guide for ${roleTitle}",
    "keyMessages": [
      "Core message 1 to communicate in the real interview",
      "Core message 2",
      "Core message 3"
    ],
    "questionsToAskInterviewer": [
      "Thoughtful question 1 to ask the interviewer",
      "Thoughtful question 2",
      "Thoughtful question 3"
    ],
    "lastMinuteTips": [
      "Specific tip 1 for this role/company",
      "Specific tip 2",
      "Specific tip 3"
    ]
  },
  "encouragement": "1-2 warm but honest sentences from DAD"
}

SCORING GUIDE:
- 90-100: Exceptional, would almost certainly progress
- 75-89: Strong, likely to progress
- 60-74: Borderline, might progress
- 45-59: Weak, unlikely to progress
- Below 45: Would not progress

Be HONEST. If an answer was weak, say so clearly.
Return ONLY the JSON.`;

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 5000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeResponse.ok) {
      return NextResponse.json({ error: `Claude API error: ${claudeResponse.status}` }, { status: claudeResponse.status });
    }

    const claudeData = await claudeResponse.json();
    const responseText = claudeData.content?.[0]?.text || "";

    let debrief;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      debrief = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({ error: "Failed to parse debrief. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true, debrief });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate debrief" },
      { status: 500 }
    );
  }
}
