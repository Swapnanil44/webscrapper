import { getImagesFromHTML } from "./crawl";

const inputURL = "https://blog.boot.dev";
const inputBody = `<html><body><img src="/logo.png" alt="Logo"></body></html>`;

const actual = getImagesFromHTML(inputBody, inputURL);
console.log(actual);
