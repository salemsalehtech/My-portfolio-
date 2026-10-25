// BlogPost.jsx — one article (route /blog/:slug). Loaded on demand (React.lazy in App.jsx)
// together with the Markdown libraries, so the home page stays light.
//
// It fetches GET /posts/:slug (published posts only), shows the cover, date, reading time and
// tags, and renders the Markdown body as sanitized HTML (lib/markdown.js). The text direction
// follows the language actually shown (an Arabic-only post reads right-to-left even on the
// English site). Each read is counted once per session in the anonymous analytics.
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSite } from "../context/SiteContext";
import { api } from "../lib/api";
import { renderMarkdown, readingMinutes } from "../lib/markdown";
import { postCoverUrl, formatPostDate, postInLang } from "../lib/posts";
import { track } from "../lib/analytics";
import BlogHeader from "../components/BlogHeader";

export default function BlogPost() {
  const { slug } = useParams();
  const { t, lang } = useSite();
  const [post, setPost] = useState(undefined); // undefined = loading, null = not found

  useEffect(() => {
    window.scrollTo(0, 0);
    setPost(undefined);
    api.get(`/posts/${encodeURIComponent(slug)}`)
      .then((data) => { setPost(data); track("post", data.slug); })
      .catch(() => setPost(null));
  }, [slug]);

  const shown = post ? postInLang(post, lang) : null;
  useEffect(() => {
    if (shown) document.title = `${shown.title} | Salem Saleh`;
  }, [shown && shown.title]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="blog-page">
      <BlogHeader />
      <main className="container blog-main">
        {post === undefined && <p className="blog-empty">…</p>}
        {post === null && (
          <div className="blog-empty">
            <p>{t.blog.notFound}</p>
            <Link to="/blog" className="btn-secondary">{t.blog.all}</Link>
          </div>
        )}
        {post && (
          <article className="post-article" dir={shown.isAr ? "rtl" : "ltr"} lang={shown.isAr ? "ar" : "en"}>
            <Link to="/blog" className="post-back">{shown.isAr ? "→" : "←"} {t.blog.all}</Link>
            <h1 className="post-article-title">{shown.title}</h1>
            <div className="post-article-meta">
              <span>{formatPostDate(post.publishedAt, lang)}</span>
              <span>·</span>
              <span>{readingMinutes(shown.body)} {t.blog.minRead}</span>
            </div>
            {post.tags.length > 0 && (
              <div className="post-tags">{post.tags.map((tag) => <span key={tag} className="post-tag">{tag}</span>)}</div>
            )}
            {post.hasCover && <img className="post-article-cover" src={postCoverUrl(post)} alt="" />}
            {/* Safe: renderMarkdown sanitizes the HTML with DOMPurify before it reaches the page. */}
            <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(shown.body) }} />
          </article>
        )}
      </main>
    </div>
  );
}
