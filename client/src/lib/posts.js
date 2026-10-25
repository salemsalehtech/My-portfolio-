// posts.js — small helpers shared by the blog pages and the home-page blog section.
import { API_BASE } from "./api";

// Address of a post's cover picture; ?v= changes when a new cover is uploaded.
export const postCoverUrl = (post) =>
  `${API_BASE}/posts/${post.slug}/cover?v=${encodeURIComponent(post.updatedAt || "")}`;

// "October 25, 2026" / "25 أكتوبر 2026"
export const formatPostDate = (date, lang) =>
  date ? new Date(date).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" }) : "";

// Which language version of a post to show: the site's language if the post has it,
// otherwise the other one. Returns { title, excerpt, body, isAr }.
export function postInLang(post, lang) {
  const hasAr = Boolean(post.titleAr || post.bodyAr || post.excerptAr);
  const hasEn = Boolean(post.titleEn || post.bodyEn || post.excerptEn);
  const isAr = lang === "ar" ? hasAr : !hasEn;
  return isAr
    ? { isAr, title: post.titleAr || post.titleEn, excerpt: post.excerptAr || post.excerptEn, body: post.bodyAr || post.bodyEn }
    : { isAr, title: post.titleEn || post.titleAr, excerpt: post.excerptEn || post.excerptAr, body: post.bodyEn || post.bodyAr };
}
