// MarkdownView.jsx — shows Markdown text (a task description, a project's docs) as safe HTML,
// with the blog's article styles (.prose). lib/markdown.js sanitizes everything with DOMPurify.
// Only the team pages import this, and they are loaded on demand, so the Markdown libraries
// still never load on the public site.
import { renderMarkdown } from "../../lib/markdown";

export default function MarkdownView({ text, empty }) {
  if (!String(text || "").trim()) return <p className="tm-muted">{empty}</p>;
  return <div className="prose tm-prose" dir="auto" dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />;
}
