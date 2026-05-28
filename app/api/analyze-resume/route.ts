import { NextRequest, NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLAUDE_MODEL = "claude-sonnet-4-6";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("resume");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Please upload your resume as a PDF file." },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Please upload a PDF file." },
        { status: 400 }
      );
    }

    let resumeText = "";
    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      const pdf = await getDocumentProxy(buffer);
      const { text } = await extractText(pdf, { mergePages: true });
      resumeText = (text || "").trim();
    } catch (err) {
      console.error("[v0] PDF parse error:", err);
      return NextResponse.json(
        { error: "We couldn't read that PDF. Try exporting it again or use a text-based PDF." },
        { status: 400 }
      );
    }

    if (resumeText.length < 50) {
      return NextResponse.json(
        { error: "We couldn't find enough text in your resume. If it's a scanned image, please upload a text-based PDF." },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const prompt = `You are DAD, a warm but honest UK career advisor with 15 years of recruitment experience. Analyse this resume and give practical, encouraging feedback.

RESUME TEXT:
${resumeText}

Return ONLY valid JSON in this EXACT shape (no markdown, no extra text):
{
  "summary": "2-3 warm, honest sentences summarising where this person stands and their biggest opportunity.",
  "skillGaps": [
    { "skill": "Specific skill name", "rating": "High", "explanation": "Why this skill matters." }
  ],
  "salaryRange": {
    "min": 28000,
    "max": 38000,
    "currency": "GBP",
    "explanation": "What they can realistically earn now in the UK market."
  },
  "jobMatches": [
    { "title": "Specific Job Title", "demandLevel": "High", "averageSalary": "30000 - 40000" }
  ],
  "courses": [
    { "name": "Exact course name", "provider": "Platform", "url": "https://real-free-course-url", "skillAddressed": "skill name" }
  ],
  "atsScore": {
    "score": 72,
    "missingKeywords": ["keyword1", "keyword2"],
    "formattingIssues": ["issue1"],
    "improvements": [
      { "title": "Short actionable title", "description": "Specific advice." }
    ]
  }
}

RULES:
- rating must be exactly one of: High, Mid, Low, Normal
- demandLevel must be exactly one of: High, Medium, Low
- Provide 3-5 skillGaps, 3-4 jobMatches, 3 courses, and 3 ATS improvements
- Course URLs must be REAL FREE working resources
- Salary numbers must be realistic for the current UK market
- Be specific to THIS resume
Return ONLY the JSON object.`;

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeResponse.ok) {
      const errorData = await claudeResponse.text();
      console.error("[v0] Claude error response:", errorData);
      return NextResponse.json(
        { error: `Claude API error: ${claudeResponse.status}` },
        { status: claudeResponse.status }
      );
    }

    const claudeData = await claudeResponse.json();
    const responseText = claudeData.content?.[0]?.text || "";

    let analysis;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      analysis = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("[v0] Failed to parse JSON from:", responseText);
      return NextResponse.json(
        { error: "Failed to parse analysis results. Please try again." },
        { status: 500 }
      );
    }

// Flatten atsScore to prevent React rendering object error
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
    };

    return NextResponse.json({ success: true, analysis: flatAnalysis });
  } catch (error) {
    console.error("[v0] Resume analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyse resume" },
      { status: 500 }
    );
  }
}
