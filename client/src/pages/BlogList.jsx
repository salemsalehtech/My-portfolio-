// BlogList.jsx — the all-articles page (route /blog): every published post, newest first, with
// buttons to filter by tag (built from the posts' own tags, like the project filter).
import { useEffect, useState } from "react";
import { useSite } from "../context/SiteContext";
import { useCollection } from "../hooks/useCollection";
import BlogHeader from "../components/BlogHeader";
import PostCard from "../components/PostCard";

export default function BlogList() {
  const { t } = useSite();
  const { data: posts, loading } = useCollection("/posts");
  const [tag, setTag] = useState("all");

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { document.title = `${t.blog.title} | Salem Saleh`; }, [t.blog.title]);

  const tags = [...new Set(posts.flatMap((p) => p.tags))];
  const shown = tag === "all" ? posts : posts.filter((p) => p.tags.includes(tag));

  return (
    <div className="blog-page">
      <BlogHeader />
      <main className="container blog-main">
        <div className="section-header">
          <div className="section-badge">{t.blog.subtitle}</div>
          <h1 className="blog-page-title">{t.blog.title}</h1>
          <div className="section-line"></div>
        </div>
        {tags.length > 1 && (
          <div className="filter-btns">
            <button className={`filter-btn ${tag === "all" ? "active" : ""}`} onClick={() => setTag("all")}>{t.projects.filterAll}</button>
            {tags.map((name) => (
              <button key={name} className={`filter-btn ${tag === name ? "active" : ""}`} onClick={() => setTag(name)}>{name}</button>
            ))}
          </div>
        )}
        {loading && posts.length === 0 && <p className="blog-empty">…</p>}
        {!loading && posts.length === 0 && <p className="blog-empty">{t.blog.empty}</p>}
        <div className="posts-grid">
          {shown.map((post) => <PostCard key={post.id} post={post} />)}
        </div>
      </main>
    </div>
  );
}
