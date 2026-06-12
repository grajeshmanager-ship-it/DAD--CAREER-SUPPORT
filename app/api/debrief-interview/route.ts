import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { getUserIdFromRequest } from "@/lib/rateLimit";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
      .map((q: { question: string; expectedAnswer?: string; keyPoints?: string[]; type?: string }, i: number) =>
        `Q${i + 1} [${q.type || "general"}]: ${q.question}\nEXPECTED CORRECT ANSWER: ${q.expectedAnswer || "Evaluate on merit"}\nKEY POINTS REQUIRED: ${q.keyPoints?.join(" | ") || "n/a"}\nCANDIDATE'S ANSWER: ${answers[i]?.trim() || "(NOT ANSWERED)"}`
      )
      .join("\n\n");

    const behaviorText = behaviorData
      ? `\nLIVE BEHAVIOUR DATA (from camera session):\n- Eye contact score: ${Math.round(behaviorData.eyeContactScore)}%\n- Confidence score: ${Math.round(behaviorData.confidenceScore)}%\n- Speaking pace: ${Math.round(behaviorData.paceScore)}%\n- Filler words: ${behaviorData.fillerCount} (${behaviorData.fillerWords?.join(", ") || "none"})\n`
      : "";

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 6000,
      messages: [
        {
          role: "user",
          content: `You are the senior interviewer who just conducted this interview for: ${roleTitle || "the role"}. Grade it like a real interview panel grades - against the expected correct answers and required key points. Be strict and factual. An answer is "correct" ONLY if it covers most key points accurately. "partially_correct" if some key points present. "wrong" if factually incorrect or misses the point. "not_answered" if blank or "(NOT ANSWERED)".

INTERVIEWER: ${interviewerPersona?.name || "Interviewer"} - ${interviewerPersona?.title || "Hiring Manager"}
TECHNICAL ROLE: ${isTechnical ? "Yes" : "No"}

INTERVIEW WITH EXPECTED ANSWERS:
${qaText}

${behaviorText}

Return ONLY valid JSON, no markdown, no backticks:

{
  "overallScore": number 0-100 (weighted: correctness of answers is 70 percent, communication quality 30 percent),
  "scoreCard": {
    "totalQuestions": number,
    "answered": number,
    "notAnswered": number,
    "correct": number,
    "partiallyCorrect": number,
    "wrong": number
  },
  "verdict": "3-4 honest sentences - what a real panel would say about this candidate",
  "hiringDecision": "strong yes" | "yes" | "maybe" | "no" | "strong no",
  "strengths": string[] (4 - from their actual answers),
  "weaknesses": string[] (4 - from their actual answers),
  "questionBreakdown": [
    {
      "question": string,
      "verdict": "correct" | "partially_correct" | "wrong" | "not_answered",
      "score": number 0-100,
      "whatTheySaid": string (1 sentence summary of their answer),
      "correctAnswer": string (the actual correct answer - specific and factual, from the expected answer),
      "whatWasMissing": string (which key points they missed - or "Nothing, well answered" if correct),
      "howToAnswer": string (1-2 sentences on how to deliver this answer in a real interview)
    }
  ] (one entry per question, in order),
  "top3Improvements": [
    { "area": string, "why": string, "howToImprove": string }
  ],
  "cheatSheet": string[] (5 things to do differently next time),
  "encouragement": "warm 2-3 sentence closing",
  "readinessScore": {
    "technical": number 0-100,
    "communication": number 0-100,
    "confidence": number 0-100,
    "preparation": number 0-100
  },
  ${behaviorData ? `"behaviourAnalysis": {
    "eyeContact": string (1 sentence verdict on their ${Math.round(behaviorData.eyeContactScore)} percent eye contact),
    "confidence": string (1 sentence verdict),
    "pace": string (1 sentence verdict),
    "fillerWords": string (1 sentence verdict on their ${behaviorData.fillerCount} filler words),
    "overallPresence": string (2 sentences - how they come across on camera)
  },` : ""}
  "perceptionVsReality": {
    "message": "2 sentences about how they likely think they did vs actual performance",
    "selfRating": number 0-100,
    "actualRating": number 0-100
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
      console.error("[debrief-interview] JSON parse failed:", responseText.slice(0, 500));
      return NextResponse.json(
        { error: "Debrief failed", message: "Something went wrong generating your debrief. Please try again." },
        { status: 500 }
      );
    }

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
            content: `Interview practice for ${roleTitle || "unknown role"}. Score ${debrief.overallScore}/100. Scorecard: ${debrief.scoreCard?.correct || 0} correct, ${debrief.scoreCard?.partiallyCorrect || 0} partial, ${debrief.scoreCard?.wrong || 0} wrong, ${debrief.scoreCard?.notAnswered || 0} unanswered. Decision: ${debrief.hiringDecision}.`,
            importance: 9,
            metadata: {
              roleTitle,
              overallScore: debrief.overallScore,
              scoreCard: debrief.scoreCard,
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
            memory_type: "journey",
            category: "interview_improvements",
            content: `Weak areas in ${roleTitle || "role"} interview: ${debrief.weaknesses?.slice(0, 2).join(", ") || "none"}. Wrong answers on: ${debrief.questionBreakdown?.filter((q: { verdict: string }) => q.verdict === "wrong").map((q: { question: string }) => q.question.slice(0, 60)).join("; ") || "none"}.`,
            importance: 7,
            metadata: {
              weaknesses: debrief.weaknesses,
              top3Improvements: debrief.top3Improvements,
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
                  content: `Live interview behaviour: Eye contact ${Math.round(behaviorData.eyeContactScore)}%, Confidence ${Math.round(behaviorData.confidenceScore)}%, Pace ${Math.round(behaviorData.paceScore)}%, Filler words ${behaviorData.fillerCount}.`,
                  importance: 7,
                  metadata: { behaviorData, behaviourAnalysis: debrief.behaviourAnalysis },
                  session_date: new Date().toISOString().split("T")[0],
                  created_at: new Date().toISOString(),
                },
              ]
            : []),
        ]),
      ]).catch((err) =>
        console.error("[debrief-interview] Background memory write failed:", err)
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
