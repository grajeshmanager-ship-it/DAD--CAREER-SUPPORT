import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { checkRateLimit, getUserIdFromRequest, rateLimitResponse } from "@/lib/rateLimit";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const effectiveUserId = (await getUserIdFromRequest(request)) ?? "anonymous";

    const { allowed, remaining, resetAt } = await checkRateLimit(effectiveUserId, "debrief-interview");
    if (!allowed) {
      return rateLimitResponse(remaining, resetAt);
    }

    const body = await request.json();
    const { questions, answers, roleTitle, interviewerPersona, isTechnical, behaviorData } = body;

    if (!questions || !answers) {
      return NextResponse.json(
        { error: "Missing data", message: "Questions and answers are required." },
        { status: 400 }
      );
    }

    const qaSection = questions
      .map((q: { question: string }, i: number) => `Q${i + 1}: ${q.question}\nA${i + 1}: ${answers[i] || "(no answer given)"}`)
      .join("\n\n");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `You are ${interviewerPersona?.name || "a senior interviewer"}, ${interviewerPersona?.title || "a hiring manager"}. You just finished interviewing a candidate for a ${roleTitle || "role"} position. Your style: ${interviewerPersona?.style || "direct and professional"}.

Evaluate their performance honestly and generate a detailed debrief.

INTERVIEW TRANSCRIPT:
${qaSection}

${behaviorData ? `BEHAVIOUR ANALYSIS (from camera):
- Eye contact score: ${Math.round(behaviorData.eyeContactScore)}%
- Confidence score: ${Math.round(behaviorData.confidenceScore)}%
- Speaking pace score: ${Math.round(behaviorData.paceScore)}%
- Filler words detected: ${behaviorData.fillerCount} (${behaviorData.fillerWords?.join(", ") || "none"})
- Engagement score: ${Math.round(behaviorData.engagementScore)}%` : ""}

Return a JSON object with exactly these fields:

{
  "overallScore": number (0-100, be honest — average answers get 50-65, good answers 70-80, exceptional 85+),
  "verdict": string (2-3 sentences on overall performance — specific, not generic),
  "hiringDecision": "strong yes" | "yes" | "maybe" | "no" | "strong no",
  "strengths": string[] (3-4 specific strengths from their actual answers),
  "weaknesses": string[] (3-4 specific weaknesses from their actual answers),
  "questionBreakdown": [
    {
      "question": string,
      "score": number (0-100),
      "whatTheyDid": string (what was good or bad about their answer),
      "idealAnswer": string (what the perfect answer would have looked like),
      "tip": string (one specific thing to do differently)
    }
  ] (for every question),
  "top3Improvements": [
    {
      "area": string,
      "why": string,
      "howToImprove": string (specific actionable advice)
    }
  ],
  "cheatSheet": string[] (5 things to do differently in the real interview),
  "encouragement": string (warm but honest closing — 2 sentences — from ${interviewerPersona?.name || "the interviewer"} personally),
  "readinessScore": {
    "technical": number (0-100),
    "communication": number (0-100),
    "confidence": number (0-100),
    "preparation": number (0-100)
  }
}

Return ONLY valid JSON. No explanation, no markdown, no backticks.`,
        },
      ],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    let debrief;
    try {
      const clean = responseText.replace(/```json|```/g, "").trim();
      debrief = JSON.parse(clean);
    } catch {
      console.error("[debrief-interview] JSON parse failed:", responseText.slice(0, 300));
      return NextResponse.json(
        { error: "Debrief failed", message: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, debrief });
  } catch (error) {
    console.error("[debrief-interview] Unhandled error:", error);
    return NextResponse.json(
      { error: "Server error", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
