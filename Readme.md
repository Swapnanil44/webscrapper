# TypeScript Web Crawler

This is a robust, command-line web crawler built with TypeScript and Node.js. It's designed to crawl a given website, starting from a base URL, and extract specific data from each page it visits. It handles concurrency safely, sets maximum page limits, and exports the final data to a CSV file for analysis.

-----

## 🚀 Features

  * **Concurrent Crawling:** Safely crawls multiple pages at once. It uses the `p-limit` library to control the number of parallel network requests, preventing server rate-limiting and local resource exhaustion.
  * **Data Extraction:** Scrapes the following data from each page using `jsdom`:
      * Page URL
      * Main `<h1>` tag
      * First `<p>` tag (prioritizing one inside a `<main>` element)
      * All outgoing links
      * All image URLs
  * **Scope Control:** Stays on the same domain as the base URL (e.t., crawling `blog.example.com` will not follow links to `google.com`).
  * **Page Limits:** Can be configured to stop crawling after reaching a maximum number of unique pages.
  * **CSV Reporting:** Generates a `report.csv` file with all the extracted data, properly escaped and formatted for use in spreadsheet software.
  * **URL Normalization:** Cleans up URLs to prevent duplicate crawling of pages (e.g., `example.com/` and `example.com` are treated as the same page).

-----

## 🛠️ Tech Stack

  * [Node.js](https://nodejs.org/): Runtime environment
  * [TypeScript](https://www.typescriptlang.org/): Language
  * [JSDOM](https://github.com/jsdom/jsdom): For parsing HTML and manipulating the DOM in a Node.js environment.
  * [p-limit](https://github.com/sindresorhus/p-limit): For limiting concurrent promises (network requests).

-----

## 📋 Prerequisites

  * Node.js (v18 or later recommended)
  * `npm` (or `yarn`)

-----

## ⚙️ Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/Swapnanil44/webscrapper.git
    cd webscrapper
    ```

2.  Install dependencies:

    ```bash
    npm install
    ```

3.  Compile the TypeScript code (if you have a `build` script in `package.json`):

    ```bash
    npm run build
    ```

    *(If you are using `ts-node` to run directly, you can skip this step).*

-----

## 🏃‍♀️ How to Run

To start the crawler, run the `start` script from your terminal, passing the base URL you want to crawl as an argument.

```bash
npm start -- <baseURL>
```

**Important:** The `--` is necessary\! It separates arguments meant for `npm` from the arguments you want to pass to your script (in this case, the `baseURL`).

### Example

```bash
npm start -- https://blog.boot.dev
```

The crawler will:

1.  Log its progress to the console (e.g., `crawling https://...`).
2.  Stop automatically when it has either visited all discoverable pages on the domain or reached the `maxPages` limit set in the code.

-----

## 📄 Output

Once the crawl is complete, the project will generate a **`report.csv`** file in the root of your project directory.

This file can be opened in any spreadsheet program (like Excel, Google Sheets, or Numbers) for analysis.

### Report Columns

  * `page_url`: The full, absolute URL of the crawled page.
  * `h1`: The text content of the first `<h1>` tag found.
  * `first_paragraph`: The text content of the first `<p>` tag found.
  * `outgoing_link_urls`: A list of all absolute URLs found on the page. Multiple links are separated by a semicolon (`;`).
  * `image_urls`: A list of all absolute image URLs found on the page. Multiple URLs are separated by a semicolon (`;`).

-----

## 📂 Code Overview

  * `index.ts`: The main entry point for the application. It parses command-line arguments and calls the `crawlSiteAsync` function.
  * `crawler.ts`: (Or your main crawler file) Contains the core logic.
      * **`crawlSiteAsync`**: The main public function that initiates the crawl. It creates a new `ConcurrentCrawler` instance and starts it.
      * **`ConcurrentCrawler` (class)**: A class that manages the entire state of the crawl. It handles the request queue (`p-limit`), tracks visited pages (`this.pages`), and enforces the `maxPages` limit using an `AbortController`.
      * **`extractPageData`**: A function that takes raw HTML and a URL, then uses `jsdom` and the helper functions to parse it and return an `ExtractedPageData` object.
      * `getH1FromHTML`, `getFirstParagraphFromHTML`, etc.: Helper functions that perform specific parsing tasks on a `JSDOM` object.
      * **`normalizeURL`**: A utility function that cleans and standardizes URLs to ensure `https://example.com/` and `https://example.com` are treated as identical.
  * `report.ts`: Contains the `writeCSVReport` function. This function takes the final `pages` object from the crawler, formats it into a CSV string (handling quotes and commas), and writes it to disk.

  * `type.ts`: Defines shared TypeScript interfaces, primarily `ExtractedPageData`.
