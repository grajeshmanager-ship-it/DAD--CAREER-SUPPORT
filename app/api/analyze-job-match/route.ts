import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { resumeText, jobTitle, jobCompany, jobLocation } = await request.json();

    if (!resumeText || !jobTitle) {
      return NextResponse.json({ error: "Missing resume or job details" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const prompt = `You are a senior UK recruitment specialist with 15 years experience.

A candidate wants to apply for this specific job:
Job Title: ${jobTitle}
Company: ${jobCompany}
Location: ${jobLocation}

Here is their resume:
${resumeText}

Compare their resume specifically against this job role. Return valid JSON only:

{
  "atsScore": {
    "score": 72,
    "missingKeywords": ["keyword1", "keyword2"],
    "formattingIssues": ["issue1"],
    "improvements": [
      { "title": "Add specific keyword", "description": "Why this matters for this role" },
      { "title": "Highlight relevant experience", "description": "What to emphasise" },
      { "title": "Quantify achievements", "description": "How to improve impact" }
    ]
  },
  "skillGaps": [
    { "skill": "specific skill name", "rating": "High", "explanation": "Why this matters for this specific job" }
  ],
  "courses": [
    { "name": "Course Name", "provider": "Provider", "url": "https://real-free-course-url", "skillAddressed": "skill name" }
  ]
}

Be specific to THIS job. Only return JSON.`;

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
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

    if (!claudeResponse.ok) {
      const errorData = await claudeResponse.text();
      return NextResponse.json({ error: `Claude API error: ${claudeResponse.status} - ${errorData}` }, { status: claudeResponse.status });
    }

    const claudeData = await claudeResponse.json();
    const responseText = claudeData.content?.[0]?.text || "";

    let analysis;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      return NextResponse.json({ error: "Failed to parse results. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true, analysis });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to analyse job match" }, { status: 500 });
  }
}
