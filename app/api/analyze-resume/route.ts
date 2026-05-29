import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("resume") as File;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

    let resumeText = "";
    if (file.type === "application/pdf") {
      const { getDocumentProxy } = await import("unpdf");
      const buffer = await file.arrayBuffer();
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const pages = await Promise.all(
        Array.from({ length: pdf.numPages }, async (_, i) => {
          const page = await pdf.getPage(i + 1);
          const content = await page.getTextContent();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any return content.items.map((item: any) => item.str || "").join(" ");
        })
      );
      resumeText = pages.join("\n");
    } else {
      resumeText = await file.text();
    }

    const prompt = `You are DAD — an expert career advisor and CV specialist. Analyse this resume and return a detailed assessment.

RESUME TEXT:
${resumeText}

Return ONLY valid JSON:
{
  "summary": "2-3 honest sentences about the overall quality and positioning of this CV",
  "skillGaps": [
    { "skill": "skill name", "rating": "High|Mid|Low", "explanation": "why this matters" }
  ],
  "salaryRange": {
    "min": 30000,
    "max": 45000,
    "currency": "GBP",
    "explanation": "brief explanation of range"
  },
  "jobMatches": [
    { "title": "Job Title", "demandLevel": "High|Medium|Low", "averageSalary": "£35k-£45k" }
  ],
  "courses": [
    { "name": "Course name", "provider": "Coursera/Udemy/etc", "url": "#", "skillAddressed": "skill" }
  ],
  "atsScore": {
    "score": 72,
    "missingKeywords": ["keyword1", "keyword2"],
    "formattingIssues": ["issue1"],
    "improvements": [
      { "title": "improvement title", "description": "what to do" }
    ]
  },
  "resumeSummary": "One paragraph summary of this person's background, skills and experience level for DAD to reference",
  "topSkills": ["skill1", "skill2", "skill3", "skill4", "skill5"]
}

Rules: skillGaps 3-5, jobMatches 3-4, courses 3, improvements 3-4, resumeSummary must be detailed enough for an AI to understand this person's full background.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) return NextResponse.json({ error: "Claude API error" }, { status: 500 });

    const claudeData = await response.json();
    const text = claudeData.content?.[0]?.text || "";

    let analysis;
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON found");
      analysis = JSON.parse(match[0]);
    } catch {
      return NextResponse.json({ error: "Failed to parse result" }, { status: 500 });
    }

    const flatAnalysis = {
      summary: analysis.summary || "",
      skillGaps: analysis.skillGaps || [],
      salaryRange: analysis.salaryRange || { min: 0, max: 0, currency: "GBP", explanation: "" },
      jobMatches: analysis.jobMatches || [],
      courses: analysis.courses || [],
      atsScore: {
        score: Number(analysis.atsScore?.score ?? 0),
        missingKeywords: analysis.atsScore?.missingKeywords || [],
        formattingIssues: analysis.atsScore?.formattingIssues || [],
        improvements: analysis.atsScore?.improvements || [],
      },
      resumeText,
      resumeSummary: analysis.resumeSummary || "",
      topSkills: analysis.topSkills || [],
    };

    // Save to Supabase profile
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({
          resume_summary: flatAnalysis.resumeSummary,
          resume_ats_score: flatAnalysis.atsScore.score,
          resume_skills: flatAnalysis.topSkills,
          last_analysis_at: new Date().toISOString(),
        }).eq("id", user.id);
      }
    } catch { /* silent — don't fail the request */ }

    return NextResponse.json({ success: true, analysis: flatAnalysis });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
