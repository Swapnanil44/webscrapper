import { error } from "console";
import { JSDOM } from "jsdom";
import { ExtractedPageData } from "./type";
export function normalizeURL(urlString: string) {
  let urlObj: URL;

  try {
    urlObj = new URL(urlString);
  } catch (error) {
    throw new Error("Invalid URL");
  }

  let fullPath = `${urlObj.hostname}${urlObj.pathname}`;

  if (fullPath.length > 0 && fullPath.slice(-1) == "/") {
    fullPath = fullPath.slice(0, -1);
  }
  return fullPath;
}

export function getH1FromHTML(html: string) {
  try {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const h1 = doc.querySelector("h1");
    return (h1?.textContent ?? "").trim();
  } catch (error) {
    return "";
  }
}

export function getFirstParagraphFromHTML(html: string) {
  try {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const p =
      doc.querySelector("main")?.querySelector("p") ?? doc.querySelector("p");
    return (p?.textContent ?? "").trim();
  } catch (error) {
    return "";
  }
}

export function getURLsFromHTML(html: string, baseURL: string): string[] {
  const urls: string[] = [];
  try {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const anchors = doc.querySelectorAll("a");

    anchors.forEach((anchor) => {
      const href = anchor.getAttribute("href");
      if (!href) return;

      try {
        const absoluteUrl = new URL(href, baseURL).toString();
        urls.push(absoluteUrl);
      } catch (error) {
        console.error(`Invalid href ${href}: ${error}`);
      }
    });
  } catch (error) {
    console.error(`Error while parsing html ${error}`);
  }
  return urls;
}

export function getImagesFromHTML(html: string, baseURL: string) {
  const imageUrls: string[] = [];
  try {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const images = doc.querySelectorAll("img");

    images.forEach((img) => {
      const src = img.getAttribute("src");
      if (!src) return;

      try {
        const absoluteUrl = new URL(src, baseURL).toString();
        imageUrls.push(absoluteUrl);
      } catch {
        console.error(`Invalid src ${src}: ${error}`);
      }
    });
  } catch (error) {
    console.error(`Error while parsing html ${error}`);
  }
  return imageUrls;
}

export function extractPageData(
  html: string,
  pageURL: string
): ExtractedPageData {
  const extractedPageData: ExtractedPageData = {
    url: "",
    h1: "",
    first_paragraph: "",
    outgoing_links: [],
    image_urls: [],
  };

  extractedPageData.url = pageURL;
  extractedPageData.h1 = getH1FromHTML(html);
  extractedPageData.first_paragraph = getFirstParagraphFromHTML(html);
  extractedPageData.outgoing_links = getURLsFromHTML(html, pageURL);
  extractedPageData.image_urls = getImagesFromHTML(html, pageURL);

  return extractedPageData;
}

export async function getHTML(url: string) {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "BootCrawler/1.0",
      },
    });

    if (response.status >= 400) {
      console.error(
        `Error: HTTP status ${response.status} ${response.statusText} for ${url}`
      );
      return;
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("text/html")) {
      console.error(
        `Error: Invalid content-type. Expected 'text/html', got '${contentType}' for ${url}`
      );
      return;
    }

    const htmlBody = await response.text();

    return htmlBody;
  } catch (err: any) {
    console.error(`Error fetching ${url}: ${err.message}`);
    return; // Return undefined
  }
}

export async function crawlPage(
  baseURL: string,
  currentURL: string = baseURL, // Added default parameters as suggested
  pages: Record<string, number> = {} // Added default parameters as suggested
): Promise<Record<string, number>> {
  const baseURLObj = new URL(baseURL);
  const currentURLObj = new URL(currentURL);

  if(baseURLObj.hostname !== currentURLObj.hostname){
    return pages;
  }

  const normalizedCurrentURL = normalizeURL(currentURL);

  if(pages[normalizedCurrentURL] > 0){
    pages[normalizedCurrentURL]++;
    return pages;
  }

  pages[normalizedCurrentURL] = 1;

  console.log(`crawling ${currentURL}`);
  let htmlBody: string | undefined;
  try {
    htmlBody = await getHTML(currentURL);
  } catch (error) {
    console.log(`Error while fetching ${currentURL}`);
    return pages;
  }

  if(!htmlBody){
    return pages;
  }

  const urls = getURLsFromHTML(htmlBody,baseURL);

  for(const url of urls){
    crawlPage(baseURL,url,pages);
  }

  return pages;
}
