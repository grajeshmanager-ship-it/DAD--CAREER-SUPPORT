import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    if (!text) return NextResponse.json({ error: "No text" }, { status: 400 });

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: `Extract job application details from this text. Return ONLY valid JSON with these fields (use null for missing fields):

{
  "company": string,
  "role": string or null,
  "status": "applied" | "viewed" | "interview" | "offer" | "rejected",
  "location": string or null,
  "salary_min": number or null,
  "salary_max": number or null,
  "notes": string or null,
  "job_url": string or null
}

Status rules:
- "applied" = applied, submitted, sent
- "viewed" = they viewed, seen my profile
- "interview" = interview, call, assessment
- "offer" = offer, got the job
- "rejected" = rejected, no, turned down

Text: "${text}"

Return ONLY the JSON object. No explanation.`
      }]
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";
    const clean = responseText.replace(/```json|```/g, "").trim();
    const application = JSON.parse(clean);

    return NextResponse.json({ success: true, application });
  } catch {
    return NextResponse.json({ error: "Parse failed" }, { status: 500 });
  }
}
