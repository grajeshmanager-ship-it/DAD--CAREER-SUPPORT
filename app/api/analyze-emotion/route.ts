import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text) return NextResponse.json({ emotion: "idle" });

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 10,
      messages: [{
        role: "user",
        content: `Classify the emotion in this speech into exactly ONE word from: happy, excited, sad, empathetic, proud, serious, concerned, idle.

Speech: "${text}"

Reply with ONLY the single emotion word, nothing else.`,
      }],
    });

    const raw = (message.content[0] as { text: string }).text.trim().toLowerCase();
    const valid = ["happy","excited","sad","empathetic","proud","serious","concerned","idle"];
    const emotion = valid.includes(raw) ? raw : "idle";

    return NextResponse.json({ emotion });
  } catch {
    return NextResponse.json({ emotion: "idle" });
  }
}
