import * as fs from "node:fs";
import * as path from "node:path";
import { ExtractedPageData } from "./type";

function csvEscape(field: string): string {
  const str = field ?? "";
  // Check if the field contains a comma, quote, or newline
  const needsQuoting = /[",\n]/.test(str);
  // Escape double quotes by doubling them up
  const escaped = str.replace(/"/g, '""');
  // Add surrounding quotes if the field needed quoting
  return needsQuoting ? `"${escaped}"` : escaped;
}

export function writeCSVReport(
  pageData: Record<string, ExtractedPageData>,
  filename = "report.csv",
): void{
    const filePath = path.resolve(process.cwd(), filename);

    const headers = [
    "page_url",
    "h1",
    "first_paragraph",
    "outgoing_link_urls",
    "image_urls",
  ];

  const rows: string[] = [headers.join(",")];
  for (const page of Object.values(pageData)) {
    // Create an array for the current row's data
    const rowData = [
      csvEscape(page.url),
      csvEscape(page.h1),
      csvEscape(page.first_paragraph),
      // Join array with ';' and then escape the *entire* resulting string
      csvEscape(page.outgoing_links.join(";")),
      csvEscape(page.image_urls.join(";")),
    ];
    
    // Join the row's data with commas and add it to the rows array
    rows.push(rowData.join(","));
  }

  // Write the final CSV string to the file
  try {
    // Join all rows with a newline character
    fs.writeFileSync(filePath, rows.join("\n"));
    console.log(`✅ Report successfully written to ${filePath}`);
  } catch (error) {
    console.error(`❌ Error writing report to ${filePath}:`, error);
  }
  
}