import { NextRequest, NextResponse } from "next/server";

const ADZUNA_APP_ID = "e1f4d6c9";
const ADZUNA_APP_KEY = "5e40d460a5a63736cfc1e438fec6e1b6";

// Adzuna country codes
const COUNTRY_CODES: Record<string, { code: string; currency: string; locale: string }> = {
  "United Kingdom": { code: "gb", currency: "GBP", locale: "en-GB" },
  "United States": { code: "us", currency: "USD", locale: "en-US" },
  "India": { code: "in", currency: "INR", locale: "en-IN" },
};

interface AdzunaJob {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  salary_min?: number;
  salary_max?: number;
  redirect_url: string;
  description: string;
  created: string;
}

interface AdzunaResponse {
  results: AdzunaJob[];
}

export async function POST(request: NextRequest) {
  try {
    const { jobTitles, country = "United Kingdom", city = "" } = await request.json();

    if (!jobTitles || !Array.isArray(jobTitles) || jobTitles.length === 0) {
      return NextResponse.json({ error: "No job titles provided" }, { status: 400 });
    }

    const countryConfig = COUNTRY_CODES[country] || COUNTRY_CODES["United Kingdom"];

    // Fetch jobs for each title and combine results
    const allJobs: Array<{
      id: string;
      title: string;
      company: string;
      location: string;
      salary: string;
      url: string;
      searchedTitle: string;
    }> = [];

    for (const title of jobTitles.slice(0, 3)) {
      const searchQuery = encodeURIComponent(title);
      let url = `https://api.adzuna.com/v1/api/jobs/${countryConfig.code}/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=5&what=${searchQuery}&content-type=application/json`;
      
      // Add city/location filter if provided
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
          const jobs = data.results.map((job) => {
            let salary = "Salary not specified";
            let salary = ""; {
              const minSalary = new Intl.NumberFormat(countryConfig.locale, {
                style: "currency",
                currency: countryConfig.currency,
                maximumFractionDigits: 0,
              }).format(job.salary_min);
              const maxSalary = new Intl.NumberFormat(countryConfig.locale, {
                style: "currency",
                currency: countryConfig.currency,
                maximumFractionDigits: 0,
              }).format(job.salary_max);
              salary = `${minSalary} - ${maxSalary}`;
            } else if (job.salary_min) {
              salary = new Intl.NumberFormat(countryConfig.locale, {
                style: "currency",
                currency: countryConfig.currency,
                maximumFractionDigits: 0,
              }).format(job.salary_min);
            }

            return {
              id: job.id,
              title: job.title,
              company: job.company?.display_name || "Company not specified",
              location: job.location?.display_name || "UK",
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
