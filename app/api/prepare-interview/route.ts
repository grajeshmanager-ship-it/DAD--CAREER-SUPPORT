import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { extractText } from "unpdf";
import { checkRateLimit, getUserIdFromRequest, rateLimitResponse } from "@/lib/rateLimit";
import { validatePdfUpload } from "@/lib/validateUpload";

export const maxDuration = 60;

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
        { error: "Job description too short", message: "Please paste the full job description." },
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
        resumeText = Array.isArray(text) ? text.map((t: string) => t).join("\n") : String(text);
      } catch {
        console.warn("[prepare-interview] Resume extraction failed, continuing without it");
      }
    }

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 6000,
      messages: [
        {
          role: "user",
          content: `STEP 1 - Read this job description and identify the EXACT domain, technology stack, industry, and seniority.

STEP 2 - Become the most senior real interviewer for THAT EXACT role:
- Software role: you are a principal engineer in that exact stack who runs technical panels
- Data role: you are a lead data scientist/engineer who tests real modelling and pipeline knowledge
- Nursing/medical role: you are a clinical director who tests real patient scenarios and protocols
- Sales role: you are a sales director who tests live objection handling and pipeline thinking
- Finance/banking role: you are a finance director who tests real accounting/valuation/regulation knowledge
- Marketing role: you are a CMO who tests real campaign, funnel, and metric decisions
- Any other role: you are the most senior practitioner in that exact field

STEP 3 - Write the questions a REAL interview panel for THIS role actually asks. Rules:
- Questions MUST reference the SPECIFIC technologies, tools, regulations, or scenarios named in the job description. NEVER generic.
- Mix: about 5 hard technical/domain-knowledge questions with factually checkable answers, 2 real-world scenario questions from this exact industry, 2 behavioural questions tied to this role's real pressures, 1 motivation question.
- Every question must have a defined correct answer that a strong candidate in this field would give.

Return a JSON object with exactly these fields:

{
  "roleTitle": string,
  "company": string (extract if mentioned, otherwise "the company"),
  "industry": string,
  "seniorityLevel": string,
  "isTechnical": boolean,
  "roleAnalysis": string (what this role really needs - 2-3 sentences),
  "interviewerPersona": {
    "name": string (realistic name),
    "title": string (the real job title of who would interview for this role),
    "style": string
  },
  "whatGetsYouHired": string[] (5 - specific to this exact role),
  "whatGetsYouRejected": string[] (5 - specific to this exact role),
  "keySkills": [{ "skill": string, "importance": "critical" | "important" | "nice-to-have" }] (top 8 from the JD),
  "questions": [
    {
      "id": string,
      "question": string (the real question, referencing the actual tech/scenario from the JD),
      "type": "technical" | "scenario" | "behavioural" | "motivation",
      "difficulty": "easy" | "medium" | "hard",
      "expectedAnswer": string (the model answer a strong candidate gives - specific and factual, 2-4 sentences),
      "keyPoints": string[] (3-4 specific points that MUST appear in a correct answer - these are used to grade the candidate),
      "commonMistakes": string (the typical wrong answer weak candidates give - 1 sentence),
      "why": string (1 sentence - why interviewers ask this)
    }
  ] (exactly 10 questions),
  "cheatSheet": string[] (8 short points to memorise - specific to this role),
  "salaryNegotiationTips": string[] (3 - specific to this role and level)
}

Keep every field concise. Return ONLY valid JSON. No explanation, no markdown, no backticks.

JOB DESCRIPTION:
${jobDescription}

${resumeText ? `CANDIDATE CV (tailor question difficulty and focus to their background):\n${resumeText.slice(0, 3000)}` : ""}`,
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
