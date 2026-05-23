export const runtime = "nodejs";

// Common stopwords we ignore when pulling keywords from a job description
const STOP = new Set(["the","and","for","with","you","your","our","are","will","that","this","have","has","a","an","to","of","in","on","is","be","as","or","we","at","by","from","it","its","they","their","who","all","can","work","role","job","team","strong","ability","experience","years","good","excellent"]);

function extractKeywords(text: string): string[] {
  const words = text.toLowerCase().replace(/[^a-z0-9+#.\s]/g, " ").split(/\s+/);
  const counts: Record<string, number> = {};
  for (const w of words) {
    if (w.length < 3 || STOP.has(w)) continue;
    counts[w] = (counts[w] || 0) + 1;
  }
  // keep the most frequent meaningful terms
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([w]) => w);
}

export async function POST(req: Request) {
  try {
    const { jobDescription, cv } = await req.json();
    if (!jobDescription?.trim() || !cv?.trim()) {
      return Response.json({ error: "Please provide both a job description and your CV." }, { status: 400 });
    }

    const jdKeywords = extractKeywords(jobDescription);
    const cvText = cv.toLowerCase();

    const matched = jdKeywords.filter((k) => cvText.includes(k));
    const missing = jdKeywords.filter((k) => !cvText.includes(k));

    const matchPct = jdKeywords.length ? Math.round((matched.length / jdKeywords.length) * 100) : 0;
    const riskScore = 100 - matchPct;

    const riskLabel =
      riskScore < 30 ? "Strong Match" :
      riskScore < 55 ? "Worth a Shot" :
      riskScore < 75 ? "Long Shot" : "High Risk";

    const summary =
      riskScore < 30
        ? "Your CV lines up well with this role. A few tweaks and you're in strong shape."
        : riskScore < 55
        ? "You've got a real chance here, but some key things the employer wants aren't showing up clearly in your CV."
        : riskScore < 75
        ? "This one's a stretch right now. Several important requirements are missing from your CV — but they're learnable."
        : "Honestly, this role is a long way from your current CV. Let's build a plan to close the gap.";

    const cvFixes = [
      missing.length ? `Add the terms employers scan for: ${missing.slice(0, 6).join(", ")}.` : "Your keywords are well covered — focus on quantifying results.",
      "Put your most relevant experience in the top third of the page.",
      "Replace duties with achievements (use numbers: %, £, time saved).",
      "Mirror the exact wording from the job description where it's true for you.",
    ];

    const freeCourses = missing.slice(0, 4).map((skill) => ({
      skill,
      resource: `Free "${skill}" tutorials`,
      where: "YouTube, freeCodeCamp, or Coursera (audit for free)",
    }));

    const actionPlan = [
      { timeframe: "This week", action: missing.length ? `Start learning: ${missing.slice(0, 2).join(" and ")}.` : "Polish your CV's top section and quantify results." },
      { timeframe: "Next 2 weeks", action: "Rewrite your CV to include the matched keywords naturally and add measurable wins." },
      { timeframe: "This month", action: "Apply to 3 similar roles using this improved CV and track responses." },
    ];

    return Response.json({
      riskScore,
      riskLabel,
      summary,
      whyRejected: missing.slice(0, 5).map((m) => `The job emphasises "${m}", but it doesn't appear in your CV.`),
      missingKeywords: missing.slice(0, 12),
      freeCourses,
      cvFixes,
      actionPlan,
    });
  } catch (err) {
    console.error("Analyze error:", err);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
