import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;

// Adzuna country codes
const COUNTRY_CODES: Record<string, { code: string; currency: string; locale: string }> = {
  "United Kingdom": { code: "gb", currency: "GBP", locale: "en-GB" },
  "United States": { code: "us", currency: "USD", locale: "en-US" },
  "India": { code: "in", currency: "INR", locale: "en-IN" },
};

interface AdzunaJob {
  id: string;
  title: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  salary_min?: number;
  salary_max?: number;
  redirect_url: string;
  description: string;
  created: string;
}

interface AdzunaResponse {
  results?: AdzunaJob[];
}

interface NormalisedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  url: string;
  searchedTitle: string;
}

export async function POST(request: NextRequest) {
  try {
    const { jobTitles, country = "United Kingdom", city = "" } = await request.json();

    if (!jobTitles || !Array.isArray(jobTitles) || jobTitles.length === 0) {
      return NextResponse.json({ error: "No job titles provided" }, { status: 400 });
    }

    if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
      return NextResponse.json(
        { error: "Job search is not configured. Missing Adzuna credentials." },
        { status: 500 }
      );
    }

    const countryConfig = COUNTRY_CODES[country] || COUNTRY_CODES["United Kingdom"];

    const formatMoney = (value: number) =>
      new Intl.NumberFormat(countryConfig.locale, {
        style: "currency",
        currency: countryConfig.currency,
        maximumFractionDigits: 0,
      }).format(value);

    const allJobs: NormalisedJob[] = [];

    for (const title of jobTitles.slice(0, 3)) {
      const searchQuery = encodeURIComponent(title);
      let url = `https://api.adzuna.com/v1/api/jobs/${countryConfig.code}/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=5&what=${searchQuery}&content-type=application/json`;

      if (city && city.trim()) {
        url += `&where=${encodeURIComponent(city.trim())}`;
      }

      try {
        const response = await fetch(url);

        if (!response.ok) {
          console.error(`Adzuna API error for "${title}":`, response.status);
          continue;
        }

        const data: AdzunaResponse = await response.json();

        if (data.results && data.results.length > 0) {
          const jobs: NormalisedJob[] = data.results.map((job) => {
            let salary = "Salary not specified";

            if (job.salary_min && job.salary_max) {
              salary = `${formatMoney(job.salary_min)} - ${formatMoney(job.salary_max)}`;
            } else if (job.salary_min) {
              salary = formatMoney(job.salary_min);
            } else if (job.salary_max) {
              salary = formatMoney(job.salary_max);
            }

            return {
              id: String(job.id),
              title: job.title,
              company: job.company?.display_name || "Company not specified",
              location: job.location?.display_name || country,
              salary,
              url: job.redirect_url,
              searchedTitle: title,
            };
          });

          allJobs.push(...jobs);
        }
      } catch (err) {
        console.error(`Error fetching jobs for "${title}":`, err);
      }
    }

    return NextResponse.json({ success: true, jobs: allJobs });
  } catch (error) {
    console.error("Job fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}
