import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      // Section 1: Education and Skills
      education,
      strongestSubjects,
      technicalSkills,
      languages,
      // Section 2: Personality and Interests
      enjoyDoing,
      helpOthersWith,
      workPreference,
      // Section 3: Constraints
      workCountry,
      needIncomeImmediately,
      visaRestrictions,
      // Section 4: Goals
      successIn2Years,
      stoppedBefore,
      holdingBackNow,
    } = body;

    // Validate required fields - minimum 20 characters each
    const fieldValidation = [
      { name: "education", value: education },
      { name: "strongestSubjects", value: strongestSubjects },
      { name: "technicalSkills", value: technicalSkills },
      { name: "languages", value: languages },
      { name: "enjoyDoing", value: enjoyDoing },
      { name: "helpOthersWith", value: helpOthersWith },
      { name: "workPreference", value: workPreference },
      { name: "workCountry", value: workCountry },
      { name: "needIncomeImmediately", value: needIncomeImmediately },
      { name: "visaRestrictions", value: visaRestrictions },
      { name: "successIn2Years", value: successIn2Years },
      { name: "stoppedBefore", value: stoppedBefore },
      { name: "holdingBackNow", value: holdingBackNow },
    ];

    const shortFields = fieldValidation.filter(
      field => !field.value || field.value.trim().length < 20
    );

    if (shortFields.length > 0) {
      return NextResponse.json(
        { error: "Please tell us more so DAD can guide you properly. Each answer needs at least 20 characters." },
        { status: 400 }
      );
    }

    const prompt = `You are DAD, a career advisor with 12 years of UK and US staffing experience. A person without work experience needs your guidance. They have completed a detailed assessment.

SECTION 1 - EDUCATION & SKILLS:
- Education/Qualification: ${education}
- Strongest Subjects: ${strongestSubjects}
- Current Technical Skills: ${technicalSkills}
- Languages Spoken: ${languages}

SECTION 2 - PERSONALITY & INTERESTS:
- What they enjoy doing: ${enjoyDoing}
- What people ask them for help with: ${helpOthersWith}
- Preferred work style: ${workPreference}

SECTION 3 - CONSTRAINTS:
- Country they can work in: ${workCountry}
- Income timeline: ${needIncomeImmediately}
- Visa restrictions: ${visaRestrictions}

SECTION 4 - GOALS:
- What success looks like in 2 years: ${successIn2Years}
- What has stopped them before: ${stoppedBefore}
- What is holding them back now: ${holdingBackNow}

CRITICAL INSTRUCTION - QUALITY CHECK:
Before generating a recommendation, evaluate if the answers provided are detailed enough to give meaningful guidance. If ANY of the following are true:
- Answers are too vague (like "stuff", "things", "idk", "not sure")
- Answers don't provide real insight into who they are
- Multiple answers are just single words or generic phrases
- You cannot confidently recommend a specific career based on what they shared

Then you MUST return this exact JSON instead of a recommendation:
{
  "needsMoreDetail": true,
  "message": "I want to give you the best guidance possible, but I need a bit more from you. Could you please tell me more about: [list specific sections that need more detail]. The more you share, the better I can help you find your path.",
  "sectionsNeedingDetail": ["specific section names that need more information"]
}

If the answers ARE detailed enough, provide ONE specific career recommendation. Return your response as valid JSON in this exact format:
{
  "needsMoreDetail": false,
  "careerRecommendation": {
    "title": "Specific Job Title (e.g., Junior Data Analyst, Digital Marketing Executive)",
    "description": "2-3 sentence description of what this career involves day-to-day",
    "whyYou": "2-3 sentences explaining why this specific career matches their unique profile, referencing their skills, interests, and constraints"
  },
  "salaryRange": {
    "current": {
      "min": 24000,
      "max": 30000,
      "explanation": "What entry-level salary they can expect in the UK right now"
    },
    "twoYear": {
      "min": 35000,
      "max": 45000,
      "explanation": "Realistic salary after 2 years of experience and skill growth"
    }
  },
  "courses": [
    {
      "name": "Exact Course Name",
      "provider": "Platform Name",
      "url": "https://actual-real-url-to-free-course",
      "duration": "X weeks/hours",
      "why": "One sentence explaining why this specific course is perfect for them"
    }
  ],
  "encouragement": "A warm, fatherly 2-3 sentence message acknowledging their specific situation and expressing genuine belief in their potential"
}

IMPORTANT RULES:
- Give ONE specific career path, not multiple options
- Consider their constraints (visa, income timeline, location) seriously
- All 3 course URLs must be real, working, and FREE (use Coursera, edX, freeCodeCamp, Khan Academy, Google Digital Garage, LinkedIn Learning free courses, YouTube playlists, etc.)
- Salary ranges must be realistic for UK market in 2024
- Reference specific things they shared in your recommendations
- Speak warmly like a supportive father who believes in them

Return ONLY valid JSON, no other text.`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2500,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errorData = await claudeResponse.text();
      console.error("Claude error response:", errorData);
      return NextResponse.json(
        { error: `Claude API error: ${claudeResponse.status}` },
        { status: claudeResponse.status }
      );
    }

    const claudeData = await claudeResponse.json();
    const responseText = claudeData.content?.[0]?.text || "";

    let analysisResult;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch {
      console.error("Failed to parse JSON from:", responseText);
      return NextResponse.json(
        { error: "Failed to parse analysis results. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, analysis: analysisResult });
  } catch (error) {
    console.error("Fresher analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze profile" },
      { status: 500 }
    );
  }
}
