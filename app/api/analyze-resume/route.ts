import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { extractText } from "unpdf";
import { checkRateLimit, getUserIdFromRequest, rateLimitResponse } from "@/lib/rateLimit";
import { validatePdfUpload } from "@/lib/validateUpload";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
const effectiveUserId = userId ?? "anonymous";

    const { allowed, remaining, resetAt } = await checkRateLimit(effectiveUserId, "analyze-resume");
    if (!allowed) {
      return rateLimitResponse(remaining, resetAt);
    }

    const formData = await request.formData();
    const file = formData.get("resume") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file", message: "Please upload your CV as a PDF." },
        { status: 400 }
      );
    }

    const validation = await validatePdfUpload(file);
    if (!validation.valid) {
      return validation.error!;
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    let resumeText = "";
    try {
      const { text } = await extractText(uint8Array, { mergePages: true });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resumeText = Array.isArray(text)
        ? text.map((t: string) => t).join("\n")
        : String(text);
    } catch (extractError) {
      console.error("[analyze-resume] PDF extraction failed:", extractError);
      return NextResponse.json(
        {
          error: "Could not read PDF",
          message: "We couldn't extract text from your CV. Make sure it's not a scanned image PDF.",
        },
        { status: 422 }
      );
    }

    if (!resumeText || resumeText.trim().length < 100) {
      return NextResponse.json(
        {
          error: "CV too short",
          message: "We couldn't read enough text from your CV. Try a different PDF.",
        },
        { status: 422 }
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are an expert career coach and ATS specialist. Analyse this CV and return a JSON object with exactly these fields:

{
  "atsScore": number (0-100),
  "salaryRange": { "min": number, "max": number, "currency": "GBP" },
  "currentLevel": string,
  "topSkills": string[],
  "missingKeywords": string[],
  "skillGaps": string[],
  "improvements": string[],
  "formattingIssues": string[],
  "jobMatches": [{ "title": string, "match": number, "reason": string }],
  "courses": [{ "name": string, "provider": string, "reason": string }],
  "summary": string
}

Return ONLY valid JSON. No explanation, no markdown, no backticks.

CV TEXT:
${resumeText}`,
        },
      ],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    let analysis;
    try {
      const clean = responseText.replace(/```json|```/g, "").trim();
      analysis = JSON.parse(clean);
    } catch {
      return NextResponse.json(
        { error: "Analysis failed", message: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }

    await supabase
      .from("profiles")
      .update({
        resume_summary: analysis.summary,
        resume_ats_score: analysis.atsScore,
        resume_skills: analysis.topSkills,
        last_analysis_at: new Date().toISOString(),
      })
      .eq("id", userId);

    return NextResponse.json({ success: true, analysis });
  } catch (error) {
    console.error("[analyze-resume] Unhandled error:", error);
    return NextResponse.json(
      { error: "Server error", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
