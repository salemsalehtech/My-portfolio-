// PostCard.jsx — one blog post as a card (cover, date, title, excerpt, tags). Used by the
// home-page blog section (BlogSection.jsx) and the all-articles page (pages/BlogList.jsx).
// The whole card is a link to /blog/<slug>.
import { Link } from "react-router-dom";
import { useSite } from "../context/SiteContext";
import { postCoverUrl, formatPostDate, postInLang } from "../lib/posts";

export default function PostCard({ post }) {
  const { t, lang } = useSite();
  const { title, excerpt, isAr } = postInLang(post, lang);
  return (
    <Link to={`/blog/${post.slug}`} className="post-card">
      {post.hasCover ? (
        <div className="post-cover"><img src={postCoverUrl(post)} alt="" loading="lazy" /></div>
      ) : (
        <div className="post-cover post-cover-empty" aria-hidden="true">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
        </div>
      )}
      <div className="post-card-body">
        <div className="post-date">{formatPostDate(post.publishedAt, lang)}</div>
        {/* Direction follows the post language; the rest of the card follows the site language. */}
        <h3 className="post-title" dir={isAr ? "rtl" : "ltr"}>{title}</h3>
        {excerpt && <p className="post-excerpt" dir={isAr ? "rtl" : "ltr"}>{excerpt}</p>}
        {post.tags.length > 0 && (
          <div className="post-tags">{post.tags.map((tag) => <span key={tag} className="post-tag">{tag}</span>)}</div>
        )}
        <span className="post-read">{t.blog.readMore}</span>
      </div>
    </Link>
  );
}
