import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getUserIdFromRequest } from "@/lib/rateLimit";
import { writeMemory } from "@/lib/dad-memory";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const effectiveUserId = (await getUserIdFromRequest(request)) ?? "anonymous";
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
  "job_url": string or null,
  "excitement_level": "high" | "medium" | "low" or null,
  "how_they_found_it": string or null
}

Status rules:
- "applied" = applied, submitted, sent
- "viewed" = they viewed, seen my profile
- "interview" = interview, call, assessment, test
- "offer" = offer, got the job, accepted
- "rejected" = rejected, no, turned down, ghosted

Text: "${text}"

Return ONLY the JSON object. No explanation.`
      }]
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";
    const clean = responseText.replace(/```json|```/g, "").trim();
    const application = JSON.parse(clean);

    // Write memory about this application
    if (effectiveUserId !== "anonymous" && application.company) {
      const statusEmoji: Record<string, string> = {
        applied: "📤", viewed: "👀", interview: "🎯", offer: "🎉", rejected: "❌"
      };
      const emoji = statusEmoji[application.status] || "📋";
      const salaryText = application.salary_min
        ? ` Salary range: £${application.salary_min?.toLocaleString()}–£${application.salary_max?.toLocaleString()}.`
        : "";

      await writeMemory({
        user_id: effectiveUserId,
        memory_type: "journey",
        category: "application",
        content: `${emoji} ${application.status === "offer" ? "OFFER RECEIVED from" : application.status === "interview" ? "Got interview at" : application.status === "rejected" ? "Rejected by" : "Applied to"} ${application.company}${application.role ? ` for ${application.role}` : ""}${application.location ? ` in ${application.location}` : ""}.${salaryText}${application.notes ? ` Notes: ${application.notes}` : ""}`,
        importance: application.status === "offer" ? 10 : application.status === "interview" ? 9 : application.status === "rejected" ? 7 : 6,
        metadata: {
          company: application.company,
          role: application.role,
          status: application.status,
          location: application.location,
          salary_min: application.salary_min,
          salary_max: application.salary_max,
          excitement_level: application.excitement_level,
        },
      });
    }

    return NextResponse.json({ success: true, application });
  } catch {
    return NextResponse.json({ error: "Parse failed" }, { status: 500 });
  }
}
