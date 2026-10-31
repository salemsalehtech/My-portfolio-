// Navbar.jsx — the fixed top bar of the public site.
//
// Props (from pages/Portfolio.jsx):
//   - scrolled       true once the page has scrolled, adds the bar's background + bottom line
//   - activeSection  the section in view, highlighted in the links
//   - sections       the section ids to link to, in page order (optional sections only when
//                    they have content)
//
// Wide screens: name on one side, section links in the middle, language + theme on the other.
// Phones: the name + a menu button; the menu opens as a sheet under the bar with the links (the
// current one marked), the language and theme switches, and a "Contact" button. It closes on a
// link, on Escape, or by tapping outside, and the page behind it doesn't scroll while it's open.
// Link labels come from t.nav[id] in i18n/translations.js.
import { useEffect, useState } from "react";
import { useSite } from "../context/SiteContext";
import { SunIcon, MoonIcon, MenuIcon, XIcon } from "./team/icons";
import { scrollToSection } from "../lib/scrollToSection";

export default function Navbar({ scrolled, activeSection, sections }) {
  const { t, theme, lang, toggleTheme, toggleLang } = useSite();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("menu-open");
    return () => { document.removeEventListener("keydown", onKey); document.body.classList.remove("menu-open"); };
  }, [menuOpen]);

  const go = (id) => {
    setMenuOpen(false);
    scrollToSection(id);
  };
  const ThemeIcon = theme === "dark" ? SunIcon : MoonIcon;

  return (
    <>
      <nav id="navbar" className={`${scrolled || menuOpen ? "scrolled" : ""} ${menuOpen ? "is-open" : ""}`}>
        <a href="#" className="nav-logo" onClick={(e) => { e.preventDefault(); go("home"); }}>
          <span className="nav-badge">SS</span>
          <span className="nav-name">{lang === "ar" ? "سالم صالح" : "Salem Saleh"}</span>
        </a>
        <ul className="nav-links">
          {sections.map((id) => (
            <li key={id}>
              <a href="#" className={`nav-link ${activeSection === id ? "active" : ""}`} aria-current={activeSection === id ? "true" : undefined}
                onClick={(e) => { e.preventDefault(); go(id); }}>
                {t.nav[id]}
              </a>
            </li>
          ))}
        </ul>
        <div className="nav-actions">
          <button className="btn-lang" onClick={toggleLang} lang={lang === "en" ? "ar" : "en"}>{lang === "en" ? "عربي" : "EN"}</button>
          <button className="btn-theme" onClick={toggleTheme} aria-label={t.themeLabel}><ThemeIcon size={17} /></button>
        </div>
        <button className="btn-menu" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="mobile-menu" aria-label={t.menuLabel}>
          {menuOpen ? <XIcon size={20} /> : <MenuIcon size={20} />}
        </button>
      </nav>

      <div className={`mobile-overlay ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <div id="mobile-menu" className={`mobile-sheet ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}>
        <ul className="mobile-links">
          {sections.map((id) => (
            <li key={id}>
              <a href="#" tabIndex={menuOpen ? 0 : -1} className={`mobile-link ${activeSection === id ? "active" : ""}`} aria-current={activeSection === id ? "true" : undefined}
                onClick={(e) => { e.preventDefault(); go(id); }}>
                {t.nav[id]}
              </a>
            </li>
          ))}
        </ul>
        <div className="mobile-tools">
          <div className="mobile-segment" role="group" aria-label={t.languageLabel}>
            <button type="button" tabIndex={menuOpen ? 0 : -1} className={lang === "ar" ? "is-on" : ""} onClick={() => lang !== "ar" && toggleLang()} lang="ar">عربي</button>
            <button type="button" tabIndex={menuOpen ? 0 : -1} className={lang === "en" ? "is-on" : ""} onClick={() => lang !== "en" && toggleLang()} lang="en">English</button>
          </div>
          <button type="button" tabIndex={menuOpen ? 0 : -1} className="mobile-theme" onClick={toggleTheme}>
            <ThemeIcon size={17} /> {theme === "dark" ? t.themeLight : t.themeDark}
          </button>
        </div>
        <button type="button" tabIndex={menuOpen ? 0 : -1} className="btn-primary mobile-cta" onClick={() => go("contact")}>{t.nav.contact}</button>
      </div>
    </>
  );
}
