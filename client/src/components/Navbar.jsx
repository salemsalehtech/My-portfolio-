// Navbar.jsx — the fixed top navigation bar, plus its mobile equivalent.
//
// Props (both come from pages/Portfolio.jsx, which computes them via useScrollTracking()):
//   - scrolled       true once the page has been scrolled down, adds a background/shadow
//   - activeSection  which section id is currently in view, used to highlight its link
//
// This file renders TWO navs that share the same SECTIONS list: the desktop <nav> (hidden
// on small screens by CSS) and a mobile slide-out <div className="mobile-panel"> (shown via
// the hamburger button). They're intentionally both here rather than split into separate
// files — same content, same click handler, just two different layouts for two screen sizes.
import { useState } from "react";
import { useSite } from "../context/SiteContext";
import { scrollToSection } from "../lib/scrollToSection";

const SECTIONS = ["home", "about", "skills", "projects", "youtube", "contact"];

export default function Navbar({ scrolled, activeSection }) {
  const { t, theme, lang, toggleTheme, toggleLang } = useSite();
  const [menuOpen, setMenuOpen] = useState(false);

  // Shared by both the desktop and mobile links: scroll to the section, then close the
  // mobile panel if it was open (a no-op if it wasn't).
  const go = (id) => {
    scrollToSection(id);
    setMenuOpen(false);
  };

  return (
    <>
      <nav id="navbar" className={scrolled ? "scrolled" : ""}>
        <div className="nav-logo" onClick={() => go("home")}>
          <div className="nav-badge">SS</div>
          <span className="nav-name">Salem Saleh</span>
        </div>
        <ul className="nav-links">
          {SECTIONS.map((id) => (
            <li key={id}>
              <a
                href="#"
                className={`nav-link ${activeSection === id ? "active" : ""}`}
                onClick={(e) => { e.preventDefault(); go(id); }}
              >
                {t.nav[id]}
              </a>
            </li>
          ))}
        </ul>
        <div className="nav-actions">
          <button className="btn-lang" onClick={toggleLang}>{lang === "en" ? "AR" : "EN"}</button>
          <button className="btn-theme" onClick={toggleTheme}>{theme === "dark" ? "☀" : "☾"}</button>
        </div>
        <button className="btn-menu" onClick={() => setMenuOpen(true)}>☰</button>
      </nav>

      <div className={`mobile-overlay ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen(false)}></div>
      <div className={`mobile-panel ${menuOpen ? "open" : ""}`}>
        <button className="mobile-close" onClick={() => setMenuOpen(false)}>✕</button>
        <ul className="mobile-links">
          {SECTIONS.map((id) => (
            <li key={id}>
              <a
                href="#"
                className={`mobile-link ${activeSection === id ? "active" : ""}`}
                onClick={(e) => { e.preventDefault(); go(id); }}
              >
                {t.nav[id]}
              </a>
            </li>
          ))}
        </ul>
        <div className="mobile-footer">
          <button className="btn-lang" onClick={toggleLang}>{lang === "en" ? "AR" : "EN"}</button>
          <button className="btn-theme" onClick={toggleTheme}>{theme === "dark" ? "☀" : "☾"}</button>
        </div>
      </div>
    </>
  );
}
