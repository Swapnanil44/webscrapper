import { crawlSiteAsync } from "./crawl";
import { writeCSVReport } from "./report";
import { ExtractedPageData } from "./type";

async function main() {
  if (process.argv.length < 5) {
    console.log("Usage: npm run start <baseURL> <maxConcurrency> <maxPages>");
    process.exit(1);
  }
  if (process.argv.length > 5) {
    console.log("Usage: npm run start <baseURL> <maxConcurrency> <maxPages>");
    process.exit(1);
  }
  const baseURL = process.argv[2];
  const maxConcurrency = Number(process.argv[3]);
  const maxPages = Number(process.argv[4]);

  if (!Number.isFinite(maxConcurrency) || maxConcurrency <= 0) {
    console.log("invalid maxConcurrency");
    process.exit(1);
  }
  if (!Number.isFinite(maxPages) || maxPages <= 0) {
    console.log("invalid maxPages");
    process.exit(1);
  }


  console.log(
    `starting crawl of: ${baseURL} (concurrency=${maxConcurrency}, maxPages=${maxPages})...`,
  );

  try {
    const pageData: Record<string, ExtractedPageData> = await crawlSiteAsync(
      baseURL,
      maxConcurrency,
      maxPages
    );

    console.log(" crawling complete.");

    writeCSVReport(pageData, "report.csv");

  } catch (error) {
    console.error("Crawl failed:", error);
    process.exit(1);
  }
}

main();