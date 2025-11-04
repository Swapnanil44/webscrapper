import { error } from "console";
import { JSDOM } from "jsdom";
import { ExtractedPageData } from "./type";
import pLimit from "p-limit";
type Limiter = ReturnType<typeof pLimit>;
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

  if (baseURLObj.hostname !== currentURLObj.hostname) {
    return pages;
  }

  const normalizedCurrentURL = normalizeURL(currentURL);

  if (pages[normalizedCurrentURL] > 0) {
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

  if (!htmlBody) {
    return pages;
  }

  const urls = getURLsFromHTML(htmlBody, baseURL);

  for (const url of urls) {
    crawlPage(baseURL, url, pages);
  }

  return pages;
}

class ConcurrentCrawler {
  private baseURL: string;
  private pages: Record<string, number>;
  private limit: <T>(fn: () => Promise<T>) => Promise<T>;
  private maxPages: number;
  private shouldStop: boolean = false;
  private allTasks = new Set<Promise<void>>();
  private abortController = new AbortController();

  private visited = new Set<string>();

  constructor(baseURL: string, maxConcurrency: number = 5, maxPages: number = 100) {
    this.baseURL = baseURL;
    this.pages = {};
    this.limit = pLimit(maxConcurrency);
    this.maxPages = Math.max(1, maxPages);
  }

  private addPageVisit(normalizedURL: string): boolean {
    if (this.shouldStop) {
      return false;
    }
    if (this.pages[normalizedURL]) {
      this.pages[normalizedURL]++;
    } else {
      this.pages[normalizedURL] = 1;
    }
    if (this.visited.has(normalizedURL)) {
      return false;
    }

    if (this.visited.size >= this.maxPages) {
      this.shouldStop = true;
      console.log("Reached maximum number of pages to crawl.");
      this.abortController.abort();
      return false;
    }

    this.visited.add(normalizedURL);
    return true;
    
  }

  private async getHTML(currentURL: string): Promise<string> {
    const { signal } = this.abortController;
    return await this.limit(async () => {
      let res: Response;
      try {
        res = await fetch(currentURL, {
          headers: { "User-Agent": "BootCrawler/1.0" },
          signal
        });
      } catch (err: any) {
        if ((err as any)?.name === "AbortError") {
          throw new Error("Fetch aborted");
        }
        throw new Error(`Got Network error: ${(err as Error).message}`);
      }

      if (res.status > 399) {
        throw new Error(`Got HTTP error: ${res.status} ${res.statusText}`);
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("text/html")) {
        throw new Error(`Got non-HTML response: ${contentType}`);
      }

      const htmlBody = await res.text();

      return htmlBody;
    });
  }

  private async crawlPage(currentURL: string): Promise<void> {
    if (this.shouldStop) return;

    const baseURLObj = new URL(this.baseURL);
    const currentURLObj = new URL(currentURL);

    if (baseURLObj.hostname !== currentURLObj.hostname) {
      return;
    }

    const normalizedCurrentURL = normalizeURL(currentURL);
    const isNewPage = this.addPageVisit(normalizedCurrentURL);

    if (!isNewPage) {
      return;
    }

    console.log(`crawling ${currentURL}`);

    let htmlBody = "";
    try {
      htmlBody = await this.getHTML(currentURL);
    } catch (err) {
      console.log(`${(err as Error).message}`);
      return;
    }

    if (this.shouldStop) return;

    const nextURLs = getURLsFromHTML(htmlBody, this.baseURL);

    const crawlPromises: Promise<void>[] = [];
    for (const nextURL of nextURLs) {
      if (this.shouldStop) break;

      const task = this.crawlPage(nextURL);
      this.allTasks.add(task);
      task.finally(() => this.allTasks.delete(task));
      crawlPromises.push(task);
    }

    await Promise.all(crawlPromises);
  }

  public async crawl() {
    const rootTask = this.crawlPage(this.baseURL);
    this.allTasks.add(rootTask);
    try {
      await rootTask;
    } finally {
      this.allTasks.delete(rootTask);
    }
    await Promise.allSettled(Array.from(this.allTasks));
    return this.pages;
    
  }
}

export async function crawlSiteAsync(
  baseURL: string,
  maxConcurrency: number = 5,
  maxPages: number = 100
) {
  const concurrentCrawler = new ConcurrentCrawler(baseURL, maxConcurrency,maxPages);
  return await concurrentCrawler.crawl();
}
