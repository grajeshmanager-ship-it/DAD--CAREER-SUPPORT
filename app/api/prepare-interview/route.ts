import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { extractText } from "unpdf";
import { checkRateLimit, getUserIdFromRequest, rateLimitResponse } from "@/lib/rateLimit";
import { validatePdfUpload } from "@/lib/validateUpload";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const effectiveUserId = (await getUserIdFromRequest(request)) ?? "anonymous";

    const { allowed, remaining, resetAt } = await checkRateLimit(effectiveUserId, "prepare-interview");
    if (!allowed) {
      return rateLimitResponse(remaining, resetAt);
    }

    const formData = await request.formData();
    const jobDescription = formData.get("jobDescription") as string | null;
    const resumeFile = formData.get("resume") as File | null;

    if (!jobDescription || jobDescription.trim().length < 20) {
      return NextResponse.json(
        {
          error: "Job description too short",
          message: "Please paste the full job description.",
        },
        { status: 400 }
      );
    }

    let resumeText = "";
    if (resumeFile && resumeFile.size > 0) {
      const validation = await validatePdfUpload(resumeFile);
      if (!validation.valid) {
        return validation.error!;
      }
      try {
        const arrayBuffer = await resumeFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const { text } = await extractText(uint8Array, { mergePages: true });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resumeText = Array.isArray(text)
          ? text.map((t: string) => t).join("\n")
          : String(text);
      } catch {
        console.warn("[prepare-interview] Resume extraction failed, continuing without it");
      }
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `You are a senior hiring manager who has interviewed hundreds of candidates. Analyse this job description${resumeText ? " and the candidate's CV" : ""} and prepare a complete interview intelligence report.

Return a JSON object with exactly these fields:

{
  "roleTitle": string,
  "company": string (extract if mentioned, otherwise "the company"),
  "industry": string,
  "seniorityLevel": string (e.g. "Junior", "Mid-level", "Senior", "Lead"),
  "isTechnical": boolean,
  "roleAnalysis": string (what this role really needs — 2-3 sentences),
  "interviewerPersona": {
    "name": string (realistic interviewer name),
    "title": string (e.g. "Engineering Manager", "HR Director"),
    "style": string (e.g. "Direct and technical", "Warm but probing")
  },
  "whatGetsYouHired": string[] (top 5 things that will impress them),
  "whatGetsYouRejected": string[] (top 5 red flags),
  "keySkills": [{ "skill": string, "importance": "critical" | "important" | "nice-to-have" }] (top 8),
  "questions": [
    {
      "id": string,
      "question": string,
      "type": "behavioural" | "technical" | "situational" | "motivation",
      "difficulty": "easy" | "medium" | "hard",
      "why": string (why they ask this),
      "tips": string (how to answer well),
      "idealAnswerFramework": string (STAR or specific framework to use)
    }
  ] (exactly 10 questions — mix of types appropriate for the role),
  "cheatSheet": string[] (8 bullet points to memorise before walking in),
  "salaryNegotiationTips": string[] (3 tips specific to this role and level)
}

Return ONLY valid JSON. No explanation, no markdown, no backticks.

JOB DESCRIPTION:
${jobDescription}

${resumeText ? `CANDIDATE CV:\n${resumeText}` : ""}`,
        },
      ],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    let prep;
    try {
      const clean = responseText.replace(/```json|```/g, "").trim();
      prep = JSON.parse(clean);
    } catch {
      console.error("[prepare-interview] JSON parse failed:", responseText.slice(0, 300));
      return NextResponse.json(
        { error: "Preparation failed", message: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, prep });
  } catch (error) {
    console.error("[prepare-interview] Unhandled error:", error);
    return NextResponse.json(
      { error: "Server error", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
