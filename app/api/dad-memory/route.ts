import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  writeMemory,
  writeMemories,
  readMemories,
  getMemoryContext,
  updateUserPresence,
  updateMemorySummary,
} from "@/lib/dad-memory";

export const maxDuration = 30;

const getSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET — read memories or context for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "30");

    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    if (type === "context") {
      const context = await getMemoryContext(userId);
      return NextResponse.json({ success: true, context });
    }

    const memories = await readMemories(userId, limit);
    return NextResponse.json({ success: true, memories });
  } catch (err) {
    console.error("[dad-memory GET]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST — write memory, update presence, or generate context
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, memory, memories } = body;

    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    switch (action) {

      case "write": {
        if (!memory) return NextResponse.json({ error: "memory required" }, { status: 400 });
        await writeMemory({ ...memory, user_id: userId });
        return NextResponse.json({ success: true });
      }

      case "write_many": {
        if (!memories?.length) return NextResponse.json({ error: "memories required" }, { status: 400 });
        await writeMemories(memories.map((m: Record<string, unknown>) => ({ ...m, user_id: userId })));
        return NextResponse.json({ success: true });
      }

      case "presence": {
        await updateUserPresence(userId);
        return NextResponse.json({ success: true });
      }

      case "update_summary": {
        await updateMemorySummary(userId);
        return NextResponse.json({ success: true });
      }

      case "context": {
        const context = await getMemoryContext(userId);
        return NextResponse.json({ success: true, context });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    console.error("[dad-memory POST]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
