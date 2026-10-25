// BlogSection.jsx — "Latest articles" on the home page (id="blog"): the 3 newest published posts
// and a link to the all-articles page (/blog). The list comes from GET /posts (published only,
// without the full text); Portfolio.jsx fetches it and passes `items` / `loading`, because the
// Navbar also needs to know whether there are posts. No posts = no section. As in Services.jsx,
// the content is a separate component so useReveal() sees its elements when it mounts.
import { Link } from "react-router-dom";
import { useSite } from "../context/SiteContext";
import { useReveal } from "../hooks/useReveal";
import PostCard from "./PostCard";

export default function BlogSection({ items, loading }) {
  if (loading || items.length === 0) return null;
  return <BlogSectionContent items={items} />;
}

function BlogSectionContent({ items }) {
  const { t } = useSite();
  const [headerRef, headerVisible] = useReveal();
  const [gridRef, gridVisible] = useReveal();

  return (
    <section id="blog" className="section-surface">
      <div className="container">
        <div ref={headerRef} className={`section-header ${headerVisible ? "visible" : ""}`} data-ao>
          <div className="section-badge">{t.blog.subtitle}</div>
          <h2>{t.blog.title}</h2>
          <div className="section-line"></div>
        </div>
        <div ref={gridRef} className={`posts-grid ${gridVisible ? "visible" : ""}`} data-ao>
          {items.slice(0, 3).map((post) => <PostCard key={post.id} post={post} />)}
        </div>
        {items.length > 3 && (
          <div className="blog-all"><Link to="/blog" className="btn-secondary">{t.blog.all}</Link></div>
        )}
      </div>
    </section>
  );
}
