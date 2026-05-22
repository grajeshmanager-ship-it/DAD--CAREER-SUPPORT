import { NextRequest, NextResponse } from "next/server";
import { extractText } from "unpdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  console.log("[v0] API: analyze-resume called");
  try {
    const formData = await request.formData();
    const file = formData.get("resume") as File;

    console.log("[v0] API: File received:", file?.name, "Size:", file?.size);

    if (!file) {
      console.log("[v0] API: No file provided");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Extract text from PDF using unpdf
    const arrayBuffer = await file.arrayBuffer();
    console.log("[v0] API: ArrayBuffer size:", arrayBuffer.byteLength);
    
    let resumeText = "";
    
    try {
      console.log("[v0] API: Extracting text with unpdf...");
      const { text } = await extractText(arrayBuffer, { mergePages: true });
      resumeText = text;
      console.log("[v0] API: Text extracted, length:", resumeText?.length);
    } catch (pdfError) {
      console.error("[v0] API: PDF parsing error:", pdfError);
      return NextResponse.json(
        { error: "Failed to read PDF file. Please ensure it's a valid PDF document with readable text (not scanned images)." },
        { status: 400 }
      );
    }

    if (!resumeText || resumeText.trim().length < 50) {
      console.log("[v0] API: Insufficient text extracted:", resumeText?.length);
      return NextResponse.json(
        { error: "Could not extract sufficient text from PDF. Please ensure the PDF contains readable text (not scanned images)." },
        { status: 400 }
      );
    }

    const prompt = `You are a senior UK recruitment specialist with 15 years experience. Analyse this resume carefully. Return exactly:

1. Top 5 specific skill gaps this person has compared to current UK job market demands — rate each as High Medium Low or Normal priority.
2. Realistic UK salary range for this specific profile right now.
3. Predicted salary range in 2 years if they close the top skill gaps.
4. Top 3 specific UK job titles this person can realistically apply for today.
5. Top 3 free courses with real links to close the most critical skill gap.
6. ATS Compatibility Score out of 100 — evaluate how well this resume will perform with Applicant Tracking Systems. Include missing keywords, formatting issues, and specific improvements.

Be specific and accurate. Base everything on real current UK market data.

Resume:
${resumeText}

Return your response as valid JSON in this exact format:
{
  "skillGaps": [
    { "skill": "specific skill name", "rating": "High|Medium|Low|Normal", "explanation": "why this gap matters in UK market" }
  ],
  "salaryRange": {
    "current": {
      "min": 35000,
      "max": 55000,
      "explanation": "why this range applies to their current profile"
    },
    "twoYear": {
      "min": 45000,
      "max": 70000,
      "explanation": "projected range after closing top skill gaps"
    },
    "currency": "GBP"
  },
  "jobMatches": [
    { "title": "Specific UK Job Title", "demandLevel": "High|Medium|Low", "averageSalary": "£XX,XXX", "whyGoodFit": "brief explanation" }
  ],
  "courses": [
    { "name": "Exact Course Name", "provider": "Provider Name", "url": "https://real-course-url", "skillAddressed": "skill name", "duration": "X weeks/hours" }
  ],
  "atsScore": {
    "score": 72,
    "missingKeywords": ["keyword1", "keyword2", "keyword3"],
    "formattingIssues": ["issue 1", "issue 2"],
    "improvements": [
      { "title": "Improvement title", "description": "Specific actionable advice" },
      { "title": "Improvement title", "description": "Specific actionable advice" },
      { "title": "Improvement title", "description": "Specific actionable advice" }
    ]
  },
  "summary": "2-3 sentence summary of the candidate's profile and main recommendation"
}

Only return valid JSON, no other text.`;

    // Call Claude API directly
    console.log("[v0] API: Calling Claude API directly...");
    
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("[v0] API: ANTHROPIC_API_KEY not set");
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    console.log("[v0] API: Claude response status:", claudeResponse.status);

    if (!claudeResponse.ok) {
      const errorData = await claudeResponse.text();
      console.error("[v0] API: Claude error response:", errorData);
      return NextResponse.json(
        { error: `Claude API error: ${claudeResponse.status} - ${errorData}` },
        { status: claudeResponse.status }
      );
    }

    const claudeData = await claudeResponse.json();
    console.log("[v0] API: Claude data received");

    const responseText = claudeData.content?.[0]?.text || "";
    console.log("[v0] API: Response text length:", responseText?.length);
    
    // Parse the JSON response
    let analysisResult;
    try {
      // Try to extract JSON from the response (in case there's any surrounding text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch {
      console.error("[v0] API: Failed to parse JSON from:", responseText);
      return NextResponse.json(
        { error: "Failed to parse analysis results. Please try again." },
        { status: 500 }
      );
    }

    console.log("[v0] API: Analysis successful");
    return NextResponse.json({ success: true, analysis: analysisResult });
  } catch (error) {
    console.error("[v0] API: Resume analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze resume" },
      { status: 500 }
    );
  }
}
