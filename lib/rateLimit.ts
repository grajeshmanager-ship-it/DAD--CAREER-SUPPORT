import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const RATE_LIMITS: Record<string, number> = {
  "analyze-resume": 5,
  "career-assessment": 5,
  "prepare-interview": 10,
  "debrief-interview": 10,
  "analyze-emotion": 200,
};

export async function checkRateLimit(userId: string, action: string) {
  const limit = RATE_LIMITS[action] ?? 10;
  const windowStart = new Date(Date.now() - 60 * 60 * 1000);
  const resetAt = new Date(Date.now() + 60 * 60 * 1000);

  try {
    const { count, error } = await supabase
      .from("usage_metrics")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("action", action)
      .gte("created_at", windowStart.toISOString());

    if (error) {
      console.error("[rateLimit] Supabase error:", error.message);
      return { allowed: true, remaining: limit, resetAt };
    }

    const used = count ?? 0;
    const remaining = Math.max(0, limit - used);
    const allowed = used < limit;

    if (allowed) {
      supabase
        .from("usage_metrics")
        .insert({ user_id: userId, action, created_at: new Date().toISOString() })
        .then(({ error: insertError }) => {
          if (insertError) console.error("[rateLimit] Failed to log usage:", insertError.message);
        });
    }

    return { allowed, remaining, resetAt };
  } catch {
    return { allowed: true, remaining: limit, resetAt };
  }
}

export async function getUserIdFromRequest(request: Request): Promise<string | null> {
  try {
    // Try Authorization header first
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");

      // Create a client with the user's token
      const userClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      );

      const { data, error } = await userClient.auth.getUser();
      if (!error && data.user) {
        return data.user.id;
      }
    }

    // Fallback: try cookie-based session (for server-side rendering)
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) {
      return data.user.id;
    }

    return null;
  } catch (err) {
    console.error("[getUserIdFromRequest] Error:", err);
    return null;
  }
}

export function rateLimitResponse(remaining: number, resetAt: Date): NextResponse {
  return NextResponse.json(
    {
      error: "Too many requests",
      message: `You've reached the limit for this feature. Try again after ${resetAt.toLocaleTimeString()}.`,
      resetAt: resetAt.toISOString(),
    },
    {
      status: 429,
      headers: {
        "X-RateLimit-Remaining": String(remaining),
        "X-RateLimit-Reset": resetAt.toISOString(),
        "Retry-After": String(Math.ceil((resetAt.getTime() - Date.now()) / 1000)),
      },
    }
  );
}
