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
  try{
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const h1 = doc.querySelector('h1');
    return (h1?.textContent ?? "").trim()
  }catch(error){
    return "";
  }
}

export function getFirstParagraphFromHTML(html: string) {
  try{
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const p = doc.querySelector('main')?.querySelector('p') ?? doc.querySelector('p');
    return (p?.textContent ?? "").trim();
  }catch(error){
    return "";
  }
}

export function getURLsFromHTML(html: string, baseURL: string): string[]{
    const urls: string[] = [];
    try{
        const dom = new JSDOM(html);
        const doc = dom.window.document;
        const anchors = doc.querySelectorAll('a');
        
        anchors.forEach((anchor) => {
            const href = anchor.getAttribute('href');
            if(!href) return;

            try{
                const absoluteUrl = new URL(href, baseURL).toString();
                urls.push(absoluteUrl);
            }catch(error){
                console.error(`Invalid href ${href}: ${error}`)
            }
        })
    }catch(error){
        console.error(`Error while parsing html ${error}`)
    }
    return urls;
}

export function getImagesFromHTML(html: string, baseURL: string){
    const imageUrls:  string[] = [];
    try{
        const dom = new JSDOM(html);
        const doc  = dom.window.document;
        const images = doc.querySelectorAll('img');

        images.forEach((img) =>{
            const src = img.getAttribute('src');
            if(!src) return;

            try{
                const absoluteUrl = new URL(src,baseURL).toString();
                imageUrls.push(absoluteUrl);
            }catch{
                console.error(`Invalid src ${src}: ${error}`)
            }
        })
    }catch(error){
        console.error(`Error while parsing html ${error}`)
    }
    return imageUrls;
}

export function extractPageData(html: string, pageURL: string): ExtractedPageData{
    const extractedPageData: ExtractedPageData = {
        url: "",
        h1: "",
        first_paragraph: "",
        outgoing_links: [],
        image_urls: []
    };

    extractedPageData.url = pageURL;
    extractedPageData.h1 = getH1FromHTML(html);
    extractedPageData.first_paragraph = getFirstParagraphFromHTML(html);
    extractedPageData.outgoing_links = getURLsFromHTML(html,pageURL);
    extractedPageData.image_urls = getImagesFromHTML(html,pageURL);

    return extractedPageData;
}