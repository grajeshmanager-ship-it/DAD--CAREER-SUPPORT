import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text) return NextResponse.json({ emotion: "talking" });

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 10,
      messages: [{
        role: "user",
        content: `Classify the single dominant emotion in this spoken text. Reply with ONLY one word from this exact list: happy, excited, sad, empathetic, proud, thinking, talking, idle

Text: "${text}"

One word only:`,
      }],
    });

    const raw = (message.content[0] as { text: string }).text.trim().toLowerCase().replace(/[^a-z]/g,"");
    const valid = ["happy","excited","sad","empathetic","proud","thinking","talking","idle"];
    const emotion = valid.includes(raw) ? raw : "talking";

    return NextResponse.json({ emotion });
  } catch {
    return NextResponse.json({ emotion: "talking" });
  }
}
