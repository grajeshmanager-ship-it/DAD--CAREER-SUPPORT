import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { getUserIdFromRequest } from "@/lib/rateLimit";
import { writeMemories, getMemoryContext } from "@/lib/dad-memory";

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

    // Load memory context
    let memoryContext = "";
    if (effectiveUserId !== "anonymous") {
      memoryContext = await getMemoryContext(effectiveUserId);
    }

    const qaText = questions.map((q: { question: string }, i: number) => (
      `Q${i + 1}: ${q.question}\nA${i + 1}: ${answers[i] || "(no answer given)"}`
    )).join("\n\n");

    const behaviorText = behaviorData ? `
BEHAVIOR ANALYSIS (live camera session):
- Eye contact score: ${Math.round(behaviorData.eyeContactScore)}%
- Confidence score: ${Math.round(behaviorData.confidenceScore)}%
- Speaking pace: ${Math.round(behaviorData.paceScore)}%
- Filler words detected: ${behaviorData.fillerCount} (${behaviorData.fillerWords?.join(", ") || "none"})
` : "";

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `You are DAD — a deeply personal career companion who has been with this person since they joined. You are not just evaluating an interview. You are evaluating someone you know and care about. Be honest but warm. Be specific. Reference their journey and what you know about them.

${memoryContext ? `WHAT DAD KNOWS ABOUT THIS PERSON:\n${memoryContext}\n` : ""}

ROLE BEING INTERVIEWED FOR: ${roleTitle || "Not specified"}
INTERVIEWER PERSONA: ${interviewerPersona?.name || "Professional Interviewer"} — ${interviewerPersona?.title || "Hiring Manager"}
TECHNICAL ROLE: ${isTechnical ? "Yes" : "No"}

INTERVIEW Q&A:
${qaText}

${behaviorText}

Evaluate this interview and return ONLY valid JSON:

{
  "overallScore": number (0-100, honest score),
  "verdict": string (3-4 sentences: honest assessment of how they did — personal, referencing their journey with DAD if relevant, warm but truthful),
  "hiringDecision": "strong yes" | "yes" | "maybe" | "no" | "strong no",
  "strengths": string[] (4 specific strengths shown in THIS interview — quote their actual answers),
  "weaknesses": string[] (4 specific weaknesses — be honest, this is how they improve),
  "questionBreakdown": [
    {
      "question": string,
      "score": number (0-100),
      "whatTheyDid": string (specific to their actual answer),
      "idealAnswer": string (what a great answer would have looked like),
      "tip": string (one actionable tip for this type of question)
    }
  ] (breakdown for every question),
  "top3Improvements": [
    {
      "area": string,
      "why": string (specific to what they showed in this interview),
      "howToImprove": string (concrete, actionable)
    }
  ],
  "cheatSheet": string[] (5 things to do differently in the real interview — specific to this role and their answers),
  "encouragement": string (warm, personal closing — 2-3 sentences referencing their dream and journey if you know it, honest about where they are but optimistic about where they are going),
  "readinessScore": {
    "technical": number (0-100),
    "communication": number (0-100),
    "confidence": number (0-100),
    "preparation": number (0-100)
  },
  "perceptionVsReality": {
    "message": string (2 sentences: research shows most candidates underestimate their performance — tell them honestly whether they likely did better or worse than they think, and why),
    "selfRating": number (estimate of how they would rate themselves 0-100),
    "actualRating": number (the real score 0-100)
  }
}

Return ONLY valid JSON. No markdown, no backticks, no explanation.`,
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

    // Write rich memories from this interview
    if (effectiveUserId !== "anonymous") {
      const topStrengths = debrief.strengths?.slice(0, 2).join(", ") || "";
      const topWeaknesses = debrief.weaknesses?.slice(0, 2).join(", ") || "";
      const topImprovements = debrief.top3Improvements?.slice(0, 2).map((i: { area: string }) => i.area).join(", ") || "";

      await writeMemories([
        {
          user_id: effectiveUserId,
          memory_type: "journey",
          category: "interview_practice",
          content: `Completed interview practice for ${roleTitle || "unknown role"}. Score: ${debrief.overallScore}/100. Hiring decision: ${debrief.hiringDecision}. Strengths shown: ${topStrengths}.`,
          importance: 9,
          metadata: {
            roleTitle,
            overallScore: debrief.overallScore,
            hiringDecision: debrief.hiringDecision,
            readinessScore: debrief.readinessScore,
            isTechnical,
            hasBehaviorData: !!behaviorData,
          },
        },
        {
          user_id: effectiveUserId,
          memory_type: "emotional",
          category: "interview_confidence",
          content: `Interview perception vs reality: estimated self-rating ${debrief.perceptionVsReality?.selfRating || "unknown"}/100, actual score ${debrief.overallScore}/100. ${debrief.perceptionVsReality?.message || ""}`,
          importance: 8,
          metadata: {
            selfRating: debrief.perceptionVsReality?.selfRating,
            actualRating: debrief.overallScore,
            verdict: debrief.verdict,
          },
        },
        {
          user_id: effectiveUserId,
          memory_type: "journey",
          category: "interview_weaknesses",
          content: `Areas to improve from interview practice: ${topWeaknesses}. Top improvements needed: ${topImprovements}.`,
          importance: 7,
          metadata: {
            weaknesses: debrief.weaknesses,
            top3Improvements: debrief.top3Improvements,
            cheatSheet: debrief.cheatSheet,
          },
        },
        ...(behaviorData ? [{
          user_id: effectiveUserId,
          memory_type: "emotional" as const,
          category: "behavior_analysis",
          content: `Live interview behavior: Eye contact ${Math.round(behaviorData.eyeContactScore)}%, Confidence ${Math.round(behaviorData.confidenceScore)}%, Pace ${Math.round(behaviorData.paceScore)}%. Filler words: ${behaviorData.fillerCount} (${behaviorData.fillerWords?.join(", ") || "none"}).`,
          importance: 7,
          metadata: { behaviorData },
        }] : []),
        {
          user_id: effectiveUserId,
          memory_type: "milestone",
          category: "interview_encouragement",
          content: `DAD's encouragement after interview: "${debrief.encouragement}"`,
          importance: 6,
          metadata: { encouragement: debrief.encouragement },
        },
      ]);

      // Update last analysis timestamp
      await supabase.from("profiles").update({
        last_analysis_at: new Date().toISOString(),
      }).eq("id", effectiveUserId);
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
