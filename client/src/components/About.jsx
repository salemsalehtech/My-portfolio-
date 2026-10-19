// About.jsx — the "About Me" section of the public portfolio (id="about").
// Renders a header, an animated stats grid, two bio paragraphs, a list of info rows
// (education / location / language …), and a card with the interest tags plus the CV
// download button. No props.
//
// ALL of the text comes from the dashboard: it is fetched from the public GET /about
// endpoint (edited in pages/admin/AdminAbout.jsx). If nothing has been saved yet — or the
// request fails — it falls back to the built-in content in lib/aboutDefaults.js, so the
// section never shows up empty. Each text has an English and an Arabic version; `pick()`
// chooses the one for the current language. A block whose list is empty is simply hidden.
// Each block fades in on scroll via useReveal().
import { useEffect, useState } from "react";
import { useSite } from "../context/SiteContext";
import { useReveal } from "../hooks/useReveal";
import { api, API_BASE } from "../lib/api";
import { aboutDefaults } from "../lib/aboutDefaults";

// Little icon next to each info row, chosen by the row's `icon` field.
const svgProps = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "var(--gold)", strokeWidth: 2 };
const ICONS = {
  education: <svg {...svgProps}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
  location: <svg {...svgProps}><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  language: <svg {...svgProps}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>,
  other: <svg {...svgProps}><circle cx="12" cy="12" r="3" /></svg>,
};

// Fetches the content, then hands it to <AboutContent>. The two are separate components on
// purpose: useReveal() (the fade-in on scroll) only starts watching the elements that exist
// when its component first mounts. AboutContent is mounted AFTER the data has arrived, so all
// of its blocks already exist and get watched. (Keeping the hooks in the same component that
// waits for data would leave them watching nothing — the blocks would stay invisible.)
export default function About() {
  // undefined = still loading; otherwise the content to show (saved or default).
  const [content, setContent] = useState(undefined);
  // The CV is uploaded from the admin dashboard (AdminCV.jsx). Ask the server whether one
  // exists and only show the download button if so.
  const [cv, setCv] = useState(undefined); // undefined = still loading, null = none/failed
  useEffect(() => {
    api.get("/about")
      .then((data) => setContent(data && data.exists ? data : aboutDefaults()))
      .catch(() => setContent(aboutDefaults()));
    api.get("/cv/info").then(setCv).catch(() => setCv(null));
  }, []);

  // Waiting for BOTH answers (the server can take a moment to wake up): render the empty
  // section rather than flashing the default text and swapping it, or adding blocks later.
  if (!content || cv === undefined) return <section id="about" className="section-surface"></section>;
  return <AboutContent content={content} cv={cv} />;
}

function AboutContent({ content, cv }) {
  const { t, lang } = useSite();

  // One useReveal() per block below, so each fades in independently as the user scrolls
  // to it rather than all at once.
  const [headerRef, headerVisible] = useReveal();
  const [statsRef, statsVisible] = useReveal();
  const [textRef, textVisible] = useReveal();
  const [cardRef, cardVisible] = useReveal();

  const pick = (en, ar) => (lang === "ar" && ar ? ar : en);
  const showCv = cv && cv.available;

  return (
    <section id="about" className="section-surface">
      <div className="section-bg-circle" style={{ top: "-80px", right: "-80px" }}></div>
      <div className="container">
        <div ref={headerRef} className={`section-header ${headerVisible ? "visible" : ""}`} data-ao>
          <div className="section-badge">{pick(content.badgeEn, content.badgeAr)}</div>
          <h2>{pick(content.titleEn, content.titleAr)}</h2>
          <div className="section-line"></div>
        </div>

        {content.stats.length > 0 && (
          <div ref={statsRef} className={`stats-grid ${statsVisible ? "visible" : ""}`} data-ao>
            {content.stats.map((s, i) => (
              <div className="stat-card" key={i}>
                <div className="stat-num">{s.number}</div>
                <div className="stat-label">{pick(s.labelEn, s.labelAr)}</div>
              </div>
            ))}
          </div>
        )}

        <div className="about-grid">
          <div ref={textRef} className={textVisible ? "visible" : ""} data-ao>
            <p className="about-p">{pick(content.p1En, content.p1Ar)}</p>
            <p className="about-p" style={{ marginBottom: 0 }}>{pick(content.p2En, content.p2Ar)}</p>
            {content.infoItems.length > 0 && (
              <div className="about-info">
                {content.infoItems.map((item, i) => (
                  <div className="about-info-item" key={i}>
                    <div className="info-icon">{ICONS[item.icon] || ICONS.other}</div>
                    <span>{pick(item.textEn, item.textAr)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(content.interests.length > 0 || showCv) && (
            <div ref={cardRef} className={`about-card ${cardVisible ? "visible" : ""}`} data-ao="right">
              {content.interests.length > 0 && (
                <>
                  <p className="about-card-title">{pick(content.interestsTitleEn, content.interestsTitleAr)}</p>
                  <div className="interests">
                    {content.interests.map((item, i) => (
                      <span className="interest-tag" key={i}>{pick(item.en, item.ar)}</span>
                    ))}
                  </div>
                </>
              )}
              {showCv && (
                <a href={`${API_BASE}/cv`} download className="btn-download">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>
                  {t.about.downloadCV}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
