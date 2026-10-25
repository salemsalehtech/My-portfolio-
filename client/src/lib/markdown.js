// markdown.js — turns a blog post's Markdown text into safe HTML.
//
// 1. `marked` converts Markdown to HTML (headings, bold, lists, links, code blocks, tables…).
// 2. `DOMPurify` then removes anything dangerous (<script>, onclick=…, javascript: links…), so
//    even a mistake pasted into a post can never run code on the site.
// 3. External links open in a new tab, safely (rel="noopener noreferrer").
//
// This file is only imported by the blog post page and the post editor, which are loaded on
// demand (React.lazy in App.jsx) — so these libraries never slow down the home page.
import { marked } from "marked";
import DOMPurify from "dompurify";

marked.setOptions({ gfm: true, breaks: false });

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A" && /^https?:\/\//i.test(node.getAttribute("href") || "")) {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

export function renderMarkdown(text) {
  return DOMPurify.sanitize(marked.parse(String(text || "")), { ADD_ATTR: ["target"] });
}

// Rough reading time: ~200 words per minute, at least 1 minute.
export function readingMinutes(text) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
