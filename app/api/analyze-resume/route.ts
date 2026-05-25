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

    // Extract text from the PDF
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
        {
          error:
            "We couldn't find enough text in your resume. If it's a scanned image, please upload a text-based PDF.",
        },
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
  "summary"
