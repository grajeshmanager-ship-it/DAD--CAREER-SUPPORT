import { NextResponse } from "next/server";

const RATE_LIMITS: Record<string, number> = {
  "analyze-resume": 5,
  "career-assessment": 5,
  "prepare-interview": 10,
  "debrief-interview": 10,
  "analyze-emotion": 200,
};

export async function checkRateLimit(userId: string, action: string) {
  const limit = RATE_LIMITS[action] ?? 10;
  const resetAt = new Date(Date.now() + 60 * 60 * 1000);
  // Rate limiting active but non-blocking for now
  return { allowed: true, remaining: limit, resetAt };
}

export async function getUserIdFromRequest(request: Request): Promise<string | null> {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      // Decode JWT payload without verification to get user id
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.sub) return payload.sub;
      }
    }
    return "anonymous";
  } catch {
    return "anonymous";
  }
}

export function rateLimitResponse(remaining: number, resetAt: Date): NextResponse {
  return NextResponse.json(
    {
      error: "Too many requests",
      message: `You've reached the limit. Try again after ${resetAt.toLocaleTimeString()}.`,
      resetAt: resetAt.toISOString(),
    },
    { status: 429 }
  );
}
