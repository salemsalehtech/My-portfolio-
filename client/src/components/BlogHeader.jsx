// BlogHeader.jsx — the slim top bar on the blog pages (/blog and /blog/:slug): brand (back to the
// home page), a link to all articles, and the language / theme switches. The home page has its
// own Navbar with section links; on the blog pages there are no sections to scroll to.
import { Link } from "react-router-dom";
import { useSite } from "../context/SiteContext";

export default function BlogHeader() {
  const { t, theme, lang, toggleTheme, toggleLang } = useSite();
  return (
    <header className="blog-header">
      <Link to="/" className="nav-logo">
        <div className="nav-badge">SS</div>
        <span className="nav-name">Salem Saleh</span>
      </Link>
      <nav className="blog-header-links">
        <Link to="/" className="nav-link">{t.nav.home}</Link>
        <Link to="/blog" className="nav-link">{t.nav.blog}</Link>
      </nav>
      <div className="blog-header-actions">
        <button className="btn-lang" onClick={toggleLang}>{lang === "en" ? "AR" : "EN"}</button>
        <button className="btn-theme" onClick={toggleTheme}>{theme === "dark" ? "☀" : "☾"}</button>
      </div>
    </header>
  );
}
