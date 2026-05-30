import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { checkRateLimit, getUserIdFromRequest, rateLimitResponse } from "@/lib/rateLimit";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const effectiveUserId = (await getUserIdFromRequest(request)) ?? "anonymous";

    const { allowed, remaining, resetAt } = await checkRateLimit(effectiveUserId, "debrief-interview");
    if (!allowed) {
      return rateLimitResponse(remaining, resetAt);
    }

    const body = await request.json();
    const { questions, answers, roleTitle, interviewerPersona, isTechnical } = body;

    if (!questions || !answers || questions.length === 0) {
      return NextResponse.json(
        { error: "Missing data", message: "No interview answers to debrief." },
        { status: 400 }
      );
    }

    const qaPairs = questions
      .map((q: { question: string; type: string }, i: number) =>
        `Q${i + 1} [${q.type}]: ${q.question}\nA${i + 1}: ${answers[i] || "(no answer given)"}`
      )
      .join("\n\n");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `You are ${interviewerPersona?.name || "a senior hiring manager"}, ${interviewerPersona?.title || "interviewer"}, giving honest and constructive feedback on a mock interview for: ${roleTitle || "a professional role"}.

Be direct, honest, specific and genuinely helpful. This person wants real feedback, not generic encouragement.

Return a JSON object with exactly these fields:

{
  "overallScore": number (0-100),
  "verdict": string (one honest sentence — e.g. "Strong candidate who needs to work on technical depth and conciseness"),
  "hiringDecision": "strong yes" | "yes" | "maybe" | "no" | "strong no",
  "strengths": string[] (top 3 genuine strengths shown in the interview),
  "weaknesses": string[] (top 3 areas that genuinely need work),
  "questionBreakdown": [
    {
      "question": string,
      "score": number (0-100),
      "whatTheyDid": string (specific observation about their answer),
      "idealAnswer": string (what a great answer would include),
      "tip": string (one actionable improvement)
    }
  ],
  "top3Improvements": [
    {
      "area": string,
      "why": string (why this matters for THIS role),
      "howToImprove": string (specific, actionable steps)
    }
  ],
  "cheatSheet": string[] (6 things to do differently in the real interview),
  "encouragement": string (honest, warm closing — acknowledge what was good and what the path forward looks like — 2-3 sentences),
  "readinessScore": {
    "technical": number (0-100),
    "communication": number (0-100),
    "confidence": number (0-100),
    "preparation": number (0-100)
  }
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
      console.error("[debrief-interview] JSON parse failed:", responseText.slice(0, 300));
      return NextResponse.json(
        { error: "Debrief failed", message: "Something went wrong generating your debrief. Please try again." },
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
