import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getUserIdFromRequest, rateLimitResponse } from "@/lib/rateLimit";
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

    const { allowed, remaining, resetAt } = await checkRateLimit(effectiveUserId, "analyze-resume");
    if (!allowed) return rateLimitResponse(remaining, resetAt);

    const formData = await request.formData();
    const file = formData.get("resume") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file", message: "Please upload a PDF file." },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Invalid file", message: "Only PDF files are accepted." },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large", message: "Please upload a PDF smaller than 5MB." },
        { status: 400 }
      );
    }

    // Load memory context
    let memoryContext = "";
    if (effectiveUserId !== "anonymous") {
      memoryContext = await getMemoryContext(effectiveUserId);
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            {
              type: "text",
              text: `${memoryContext ? `WHAT DAD KNOWS ABOUT THIS PERSON:\n${memoryContext}\n\n` : ""}

You are DAD — a deeply personal career companion who has been with this person since day one. You are not just analysing a CV. You are learning more about someone you already know and care about. Use everything you know about them to make your analysis deeply personal.

Analyse this CV and return ONLY valid JSON with this exact structure:

{
  "atsScore": number (0-100, honest score based on keyword density, formatting, clarity),
  "salaryRange": {
    "min": number,
    "max": number,
    "currency": "GBP"
  },
  "currentLevel": string (e.g. "Junior", "Mid-level", "Senior", "Director"),
  "marketReadiness": number (0-100),
  "interviewReadiness": number (0-100),
  "careerReadiness": number (0-100),
  "topSkills": string[] (top 8 skills found in CV),
  "missingKeywords": string[] (top 8 keywords missing that would improve ATS score),
  "skillGaps": string[] (top 5 skills they should develop),
  "improvements": [
    {
      "title": string,
      "description": string
    }
  ] (top 5 specific improvements needed),
  "formattingIssues": string[] (top 3 formatting problems),
  "jobMatches": [
    {
      "title": string,
      "match": number (0-100),
      "reason": string,
      "averageSalary": string,
      "demandLevel": "High" | "Medium" | "Low"
    }
  ] (top 5 role matches),
  "courses": [
    {
      "name": string,
      "provider": string,
      "reason": string,
      "url": string
    }
  ] (top 4 courses to close skill gaps — use real course names and providers),
  "summary": string (3-4 sentences: what this CV says about this person — personal, warm, reference their dream and career path if you know it from memory),
  "insight": string (one powerful personal insight — something they may not have seen about themselves, referencing their journey with DAD if relevant),
  "resumeSummary": string (2 sentence summary for profile storage),
  "resumeSkills": string[] (top 10 skills for profile storage)
}

Return ONLY valid JSON. No markdown, no backticks, no explanation.`,
            },
          ],
        },
      ],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    let analysis;
    try {
      const clean = responseText.replace(/```json|```/g, "").trim();
      analysis = JSON.parse(clean);
    } catch {
      console.error("[analyze-resume] JSON parse failed:", responseText.slice(0, 300));
      return NextResponse.json(
        { error: "Analysis failed", message: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }

    // Save to profile
    if (effectiveUserId !== "anonymous") {
      await supabase.from("profiles").update({
        resume_summary: analysis.resumeSummary || analysis.summary,
        resume_ats_score: analysis.atsScore,
        resume_skills: analysis.resumeSkills || analysis.topSkills,
        last_analysis_at: new Date().toISOString(),
      }).eq("id", effectiveUserId);

      // Write rich memories from this CV analysis
      await writeMemories([
        {
          user_id: effectiveUserId,
          memory_type: "journey",
          category: "cv_upload",
          content: `Uploaded CV for analysis. ATS Score: ${analysis.atsScore}/100. Level: ${analysis.currentLevel}. Salary range: £${analysis.salaryRange?.min?.toLocaleString()}–£${analysis.salaryRange?.max?.toLocaleString()}.`,
          importance: 8,
          metadata: {
            atsScore: analysis.atsScore,
            currentLevel: analysis.currentLevel,
            salaryRange: analysis.salaryRange,
            marketReadiness: analysis.marketReadiness,
          },
        },
        {
          user_id: effectiveUserId,
          memory_type: "identity",
          category: "skills",
          content: `Skills found in CV: ${analysis.topSkills?.join(", ") || "none identified"}. Skill gaps to close: ${analysis.skillGaps?.slice(0, 3).join(", ") || "none identified"}.`,
          importance: 8,
          metadata: {
            topSkills: analysis.topSkills,
            skillGaps: analysis.skillGaps,
            missingKeywords: analysis.missingKeywords,
          },
        },
        {
          user_id: effectiveUserId,
          memory_type: "identity",
          category: "cv_insight",
          content: `CV insight: ${analysis.insight || analysis.summary}`,
          importance: 7,
          metadata: { summary: analysis.summary, insight: analysis.insight },
        },
        {
          user_id: effectiveUserId,
          memory_type: "journey",
          category: "job_matches",
          content: `Best role matches from CV: ${analysis.jobMatches?.slice(0, 3).map((j: { title: string; match: number }) => `${j.title} (${j.match}% match)`).join(", ") || "none"}.`,
          importance: 7,
          metadata: { jobMatches: analysis.jobMatches },
        },
        ...(analysis.improvements?.length ? [{
          user_id: effectiveUserId,
          memory_type: "journey" as const,
          category: "cv_improvements",
          content: `CV improvements needed: ${analysis.improvements.slice(0, 3).map((i: { title: string }) => i.title).join(", ")}.`,
          importance: 6,
          metadata: { improvements: analysis.improvements, formattingIssues: analysis.formattingIssues },
        }] : []),
      ]);
    }

    return NextResponse.json({ success: true, analysis });
  } catch (error) {
    console.error("[analyze-resume] Unhandled error:", error);
    return NextResponse.json(
      { error: "Server error", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
