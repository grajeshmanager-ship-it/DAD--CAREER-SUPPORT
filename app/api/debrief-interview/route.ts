import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { checkRateLimit, getUserIdFromRequest, rateLimitResponse } from "@/lib/rateLimit";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorised", message: "Please log in to get your interview debrief." },
        { status: 401 }
      );
    }

    const { allowed, remaining, resetAt } = await checkRateLimit(userId, "debrief-interview");
    if (!allowed) {
      return rateLimitResponse(remaining, resetAt);
    }

    const body = await request.json();
    const { questions, answers, roleTitle } = body;

    if (!questions || !answers || questions.length === 0) {
      return NextResponse.json(
        { error: "Missing data", message: "No interview answers to debrief." },
        { status: 400 }
      );
    }

    const qaPairs = questions
      .map((q: { question: string }, i: number) => `Q${i + 1}: ${q.question}\nA${i + 1}: ${answers[i] || "(no answer given)"}`)
      .join("\n\n");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are a senior hiring manager giving honest feedback on a mock interview for: ${roleTitle || "a professional role"}.

Return a JSON object with exactly these fields:

{
  "overallScore": number (0-100),
  "verdict": string,
  "strengths": string[],
  "weaknesses": string[],
  "questionBreakdown": [
    {
      "question": string,
      "score": number,
      "whatTheyDid": string,
      "idealAnswer": string,
      "tip": string
    }
  ],
  "top3Improvements": [
    { "area": string, "why": string, "howToImprove": string }
  ],
  "cheatSheet": string[],
  "encouragement": string
}

Return ONLY valid JSON. No explanation, no markdown, no backticks.

INTERVIEW TRANSCRIPT:
${qaPairs}`,
        },
      ],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    let debrief;
    try {
      const clean = responseText.replace(/```json|```/g, "").trim();
      debrief = JSON.parse(clean);
    } catch {
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
