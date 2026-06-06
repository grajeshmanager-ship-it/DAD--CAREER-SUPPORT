import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { getUserIdFromRequest } from "@/lib/rateLimit";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const effectiveUserId = (await getUserIdFromRequest(request)) ?? "anonymous";

    const body = await request.json();
    const { questions, answers, roleTitle, interviewerPersona, isTechnical, behaviorData } = body;

    if (!questions || !answers) {
      return NextResponse.json(
        { error: "Missing data", message: "Questions and answers are required." },
        { status: 400 }
      );
    }

    const qaText = questions
      .map((q: { question: string }, i: number) =>
        `Q${i + 1}: ${q.question}\nA${i + 1}: ${answers[i] || "(no answer given)"}`
      )
      .join("\n\n");

    const behaviorText = behaviorData
      ? `
BEHAVIOR ANALYSIS (live camera session):
- Eye contact score: ${Math.round(behaviorData.eyeContactScore)}%
- Confidence score: ${Math.round(behaviorData.confidenceScore)}%
- Speaking pace: ${Math.round(behaviorData.paceScore)}%
- Filler words detected: ${behaviorData.fillerCount} (${behaviorData.fillerWords?.join(", ") || "none"})
`
      : "";

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `You are an expert interview coach. Evaluate this candidate's interview performance honestly and constructively.

ROLE BEING INTERVIEWED FOR: ${roleTitle || "Not specified"}
INTERVIEWER: ${interviewerPersona?.name || "Professional Interviewer"} — ${interviewerPersona?.title || "Hiring Manager"}
TECHNICAL ROLE: ${isTechnical ? "Yes" : "No"}

INTERVIEW Q&A:
${qaText}

${behaviorText}

Evaluate this interview. Return ONLY valid JSON with NO markdown, NO backticks, NO explanation — just the raw JSON object:

{
  "overallScore": number between 0 and 100,
  "verdict": "3-4 honest sentences about their overall performance",
  "hiringDecision": "strong yes" or "yes" or "maybe" or "no" or "strong no",
  "strengths": ["strength 1 specific to their answers", "strength 2", "strength 3", "strength 4"],
  "weaknesses": ["weakness 1 specific to their answers", "weakness 2", "weakness 3", "weakness 4"],
  "questionBreakdown": [
    {
      "question": "the question text",
      "score": number 0-100,
      "whatTheyDid": "what they actually did well or poorly",
      "idealAnswer": "what a great answer would have looked like",
      "tip": "one actionable tip for this question type"
    }
  ],
  "top3Improvements": [
    {
      "area": "improvement area name",
      "why": "why this matters specific to their performance",
      "howToImprove": "concrete actionable steps"
    },
    {
      "area": "improvement area name",
      "why": "why this matters",
      "howToImprove": "concrete actionable steps"
    },
    {
      "area": "improvement area name",
      "why": "why this matters",
      "howToImprove": "concrete actionable steps"
    }
  ],
  "cheatSheet": ["thing 1 to do differently", "thing 2", "thing 3", "thing 4", "thing 5"],
  "encouragement": "warm 2-3 sentence closing message for the candidate",
  "readinessScore": {
    "technical": number 0-100,
    "communication": number 0-100,
    "confidence": number 0-100,
    "preparation": number 0-100
  },
  "perceptionVsReality": {
    "message": "2 sentences about how candidates typically underestimate themselves and what this person likely did vs what they think",
    "selfRating": number 0-100 estimate of how they feel they did,
    "actualRating": number 0-100 their actual score
  }
}`,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    let debrief;
    try {
      const clean = responseText.replace(/```json|```/g, "").trim();
      debrief = JSON.parse(clean);
    } catch {
      console.error(
        "[debrief-interview] JSON parse failed:",
        responseText.slice(0, 500)
      );
      return NextResponse.json(
        {
          error: "Debrief failed",
          message:
            "Something went wrong generating your debrief. Please try again.",
        },
        { status: 500 }
      );
    }

    // Write memories in background — never blocks the response
    if (effectiveUserId !== "anonymous") {
      Promise.all([
        supabase
          .from("profiles")
          .update({ last_analysis_at: new Date().toISOString() })
          .eq("id", effectiveUserId),

        supabase.from("dad_memory").insert([
          {
            user_id: effectiveUserId,
            memory_type: "journey",
            category: "interview_practice",
            content: `Completed interview practice for ${roleTitle || "unknown role"}. Score: ${debrief.overallScore}/100. Hiring decision: ${debrief.hiringDecision}. Key strengths: ${debrief.strengths?.slice(0, 2).join(", ") || "none"}.`,
            importance: 9,
            metadata: {
              roleTitle,
              overallScore: debrief.overallScore,
              hiringDecision: debrief.hiringDecision,
              readinessScore: debrief.readinessScore,
              isTechnical,
              hasBehaviorData: !!behaviorData,
            },
            session_date: new Date().toISOString().split("T")[0],
            created_at: new Date().toISOString(),
          },
          {
            user_id: effectiveUserId,
            memory_type: "emotional",
            category: "interview_confidence",
            content: `Interview confidence gap: Self-rated ${debrief.perceptionVsReality?.selfRating}/100, actual score ${debrief.overallScore}/100. ${debrief.perceptionVsReality?.message || ""}`,
            importance: 7,
            metadata: {
              selfRating: debrief.perceptionVsReality?.selfRating,
              actualRating: debrief.overallScore,
              verdict: debrief.verdict,
            },
            session_date: new Date().toISOString().split("T")[0],
            created_at: new Date().toISOString(),
          },
          {
            user_id: effectiveUserId,
            memory_type: "journey",
            category: "interview_improvements",
            content: `Top improvements needed: ${debrief.top3Improvements?.map((i: { area: string }) => i.area).join(", ") || "none"}. Weaknesses: ${debrief.weaknesses?.slice(0, 2).join(", ") || "none"}.`,
            importance: 7,
            metadata: {
              weaknesses: debrief.weaknesses,
              top3Improvements: debrief.top3Improvements,
              cheatSheet: debrief.cheatSheet,
            },
            session_date: new Date().toISOString().split("T")[0],
            created_at: new Date().toISOString(),
          },
          ...(behaviorData
            ? [
                {
                  user_id: effectiveUserId,
                  memory_type: "emotional",
                  category: "behavior_analysis",
                  content: `Live interview behavior analysis: Eye contact ${Math.round(behaviorData.eyeContactScore)}%, Confidence ${Math.round(behaviorData.confidenceScore)}%, Pace ${Math.round(behaviorData.paceScore)}%. Filler words used: ${behaviorData.fillerCount} (${behaviorData.fillerWords?.join(", ") || "none"}).`,
                  importance: 7,
                  metadata: { behaviorData },
                  session_date: new Date().toISOString().split("T")[0],
                  created_at: new Date().toISOString(),
                },
              ]
            : []),
          {
            user_id: effectiveUserId,
            memory_type: "milestone",
            category: "interview_encouragement",
            content: `DAD's encouragement after this interview session: "${debrief.encouragement}"`,
            importance: 6,
            metadata: {
              encouragement: debrief.encouragement,
              overallScore: debrief.overallScore,
            },
            session_date: new Date().toISOString().split("T")[0],
            created_at: new Date().toISOString(),
          },
        ]),
      ]).catch((err) =>
        console.error("[debrief-interview] Background memory write failed:", err)
      );
    }

    return NextResponse.json({ success: true, debrief });
  } catch (error) {
    console.error("[debrief-interview] Unhandled error:", error);
    return NextResponse.json(
      {
        error: "Server error",
        message: "Something went wrong. Please try again.",
      },
      { status: 500 }
    );
  }
}
