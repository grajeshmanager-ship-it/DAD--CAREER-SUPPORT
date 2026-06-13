import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { extractText } from "unpdf";
import { checkRateLimit, getUserIdFromRequest, rateLimitResponse } from "@/lib/rateLimit";
import { validatePdfUpload } from "@/lib/validateUpload";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
    try {
          const effectiveUserId = (await getUserIdFromRequest(request)) ?? "anonymous";

      const { allowed, remaining, resetAt } = await checkRateLimit(effectiveUserId, "prepare-interview");
          if (!allowed) {
                  return rateLimitResponse(remaining, resetAt);
          }

      const formData = await request.formData();
          const jobDescription = formData.get("jobDescription") as string | null;
          const resumeFile = formData.get("resume") as File | null;

      if (!jobDescription || jobDescription.trim().length < 20) {
              return NextResponse.json(
                { error: "Job description too short", message: "Please paste the full job description." },
                { status: 400 }
                      );
      }

      let resumeText = "";
          if (resumeFile && resumeFile.size > 0) {
                  const validation = await validatePdfUpload(resumeFile);
                  if (!validation.valid) {
                            return validation.error!;
                  }
                  try {
                            const arrayBuffer = await resumeFile.arrayBuffer();
                            const uint8Array = new Uint8Array(arrayBuffer);
                            const { text } = await extractText(uint8Array, { mergePages: true });
                            resumeText = Array.isArray(text) ? text.map((t: string) => t).join("\n") : String(text);
                  } catch {
                            console.warn("[prepare-interview] Resume extraction failed, continuing without it");
                  }
          }

      // ── STEP 1: FAST role analysis (small payload, returns quickly) ──
      const analysisMessage = await anthropic.messages.create({
              model: "claude-haiku-4-5",
              max_tokens: 1500,
              messages: [
                {
                            role: "user",
                            content: `Read this job description and identify the EXACT domain, technology stack, industry, title, and seniority. Then become the most senior real interviewer for THAT EXACT role (e.g. principal engineer for software roles, clinical director for nursing, sales director for sales, finance director for finance/banking, CMO for marketing, or the most senior practitioner in that exact field for anything else).

                            Return a JSON object with exactly these fields:

                            {
                              "roleTitle": string,
                                "company": string (extract if mentioned, otherwise "the company"),
                                  "industry": string,
                                    "seniorityLevel": string,
                                      "isTechnical": boolean,
                                        "roleAnalysis": string (what this role really needs - 2-3 sentences),
                                          "interviewerPersona": {
                                              "name": string (realistic name),
                                                  "title": string (the real job title of who would interview for this role),
                                                      "style": string
                                                        },
                                                          "whatGetsYouHired": string[] (4, specific to this exact role),
                                                            "whatGetsYouRejected": string[] (4, specific to this exact role),
                                                              "keySkills": [{ "skill": string, "importance": "critical" | "important" | "nice-to-have" }] (top 6 from the JD),
                                                                "cheatSheet": string[] (6 short points to memorise, specific to this role),
                                                                  "salaryNegotiationTips": string[] (2, specific to this role and level)
                                                                  }

                                                                  Keep every field concise. Return ONLY valid JSON. No explanation, no markdown, no backticks.

                                                                  JOB DESCRIPTION:
                                                                  ${jobDescription}

                                                                  ${resumeText ? `CANDIDATE CV (for context):\n${resumeText.slice(0, 1500)}` : ""}`,
                },
                      ],
      });

      const analysisText = analysisMessage.content[0].type === "text" ? analysisMessage.content[0].text : "";

      let analysis;
          try {
                  const clean = analysisText.replace(/```json|```/g, "").trim();
                  analysis = JSON.parse(clean);
          } catch {
                  console.error("[prepare-interview] Analysis JSON parse failed:", analysisText.slice(0, 300));
                  return NextResponse.json(
                    { error: "Preparation failed", message: "Something went wrong. Please try again." },
                    { status: 500 }
                          );
          }

      // ── STEP 2: Real interview questions, built from THIS exact role ──
      const questionsMessage = await anthropic.messages.create({
              model: "claude-haiku-4-5",
              max_tokens: 4000,
              messages: [
                {
                            role: "user",
                            content: `You are ${analysis.interviewerPersona?.name}, ${analysis.interviewerPersona?.title}, interviewing a candidate for this role:

                            ROLE: ${analysis.roleTitle} at ${analysis.company}
                            INDUSTRY: ${analysis.industry}
                            SENIORITY: ${analysis.seniorityLevel}
                            ROLE FOCUS: ${analysis.roleAnalysis}

                            Write the questions a REAL interview panel for THIS exact role actually asks. Rules:
                            - Questions MUST reference the SPECIFIC technologies, tools, regulations, or scenarios named in the job description below. NEVER generic.
                            - Mix: 4 hard technical/domain-knowledge questions with factually checkable answers, 2 real-world scenario questions from this exact industry, 2 behavioural questions tied to this role's real pressures, 1 motivation question.
                            - Every question must have a defined correct answer that a strong candidate in this field would give.

                            Return a JSON object with exactly this field:

                            {
                              "questions": [
                                  {
                                        "id": string,
                                              "question": string (the real question, referencing the actual tech/scenario from the JD),
                                                    "type": "technical" | "scenario" | "behavioural" | "motivation",
                                                          "difficulty": "easy" | "medium" | "hard",
                                                                "expectedAnswer": string (the model answer a strong candidate gives - specific and factual, 2-3 sentences),
                                                                      "keyPoints": string[] (3 specific points that MUST appear in a correct answer - used to grade the candidate),
                                                                            "tips": string (1 short sentence of advice for the candidate before answering),
                                                                                  "why": string (1 sentence - why interviewers ask this)
                                                                                      }
                                                                                        ] (exactly 9 questions)
                                                                                        }

                                                                                        Return ONLY valid JSON. No explanation, no markdown, no backticks.

                                                                                        JOB DESCRIPTION:
                                                                                        ${jobDescription}

                                                                                        ${resumeText ? `CANDIDATE CV (tailor question difficulty and focus to their background):\n${resumeText.slice(0, 1500)}` : ""}`,
                },
                      ],
      });

      const questionsText = questionsMessage.content[0].type === "text" ? questionsMessage.content[0].text : "";

      let questionsData;
          try {
                  const clean = questionsText.replace(/```json|```/g, "").trim();
                  questionsData = JSON.parse(clean);
          } catch {
                  console.error("[prepare-interview] Questions JSON parse failed:", questionsText.slice(0, 300));
                  return NextResponse.json(
                    { error: "Preparation failed", message: "Something went wrong. Please try again." },
                    { status: 500 }
                          );
          }

      const prep = { ...analysis, questions: questionsData.questions || [] };

      return NextResponse.json({ success: true, prep });
    } catch (error) {
          console.error("[prepare-interview] Unhandled error:", error);
          return NextResponse.json(
            { error: "Server error", message: "Something went wrong. Please try again." },
            { status: 500 }
                );
    }
}
