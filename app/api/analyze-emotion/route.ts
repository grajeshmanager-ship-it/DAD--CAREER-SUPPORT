import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { checkRateLimit, getUserIdFromRequest, rateLimitResponse } from "@/lib/rateLimit";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VALID_EMOTIONS = ["happy", "excited", "sad", "empathetic", "proud", "thinking", "talking", "idle"] as const;
type Emotion = typeof VALID_EMOTIONS[number];

function preClassifyEmotion(text: string): Emotion | null {
  const lower = text.toLowerCase();
  if (/\b(congrat|well done|amazing|proud|you did it|great job|excellent)\b/.test(lower)) return "proud";
  if (/\b(wow|incredible|fantastic|yes!|absolutely|love it)\b/.test(lower)) return "excited";
  if (/\b(sorry|that's hard|i understand|must be difficult|tough time)\b/.test(lower)) return "empathetic";
  if (/\b(hmm|let me think|interesting|good question|consider)\b/.test(lower)) return "thinking";
  if (/\b(great|good|happy|glad|wonderful|nice)\b/.test(lower)) return "happy";
  if (/\b(sad|unfortunate|disappointing|hard to hear|difficult)\b/.test(lower)) return "sad";
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ emotion: "idle" });
    }

    const { allowed } = await checkRateLimit(userId, "analyze-emotion");
    if (!allowed) {
      return rateLimitResponse(0, new Date(Date.now() + 3600000));
    }

    const body = await request.json();
    const { transcript } = body;

    if (!transcript || typeof transcript !== "string" || transcript.trim().length === 0) {
      return NextResponse.json({ emotion: "idle" });
    }

    const preClassified = preClassifyEmotion(transcript);
    if (preClassified) {
      return NextResponse.json({ emotion: preClassified });
    }

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 10,
      messages: [
        {
          role: "user",
          content: `Classify the emotion in this text as exactly one word from this list: happy, excited, sad, empathetic, proud, thinking, talking, idle.

Reply with ONLY the single word. Nothing else.

Text: "${transcript.slice(0, 500)}"`,
        },
      ],
    });

    const rawEmotion = message.content[0].type === "text"
      ? message.content[0].text.trim().toLowerCase()
      : "idle";

    const emotion: Emotion = VALID_EMOTIONS.includes(rawEmotion as Emotion)
      ? (rawEmotion as Emotion)
      : "talking";

    return NextResponse.json({ emotion });
  } catch (error) {
    console.error("[analyze-emotion] Error:", error);
    return NextResponse.json({ emotion: "talking" });
  }
}
