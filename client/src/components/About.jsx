import { useSite } from "../context/SiteContext";
import { useReveal } from "../hooks/useReveal";

export default function About() {
  const { t, lang } = useSite();
  const [headerRef, headerVisible] = useReveal();
  const [statsRef, statsVisible] = useReveal();
  const [textRef, textVisible] = useReveal();
  const [cardRef, cardVisible] = useReveal();

  const stats = [
    { n: "10+", label: t.about.statProjects },
    { n: "8+", label: t.about.statSkills },
    { n: "20+", label: t.about.statVideos },
  ];

  return (
    <section id="about" className="section-surface">
      <div className="section-bg-circle" style={{ top: "-80px", right: "-80px" }}></div>
      <div className="container">
        <div ref={headerRef} className={`section-header ${headerVisible ? "visible" : ""}`} data-ao>
          <div className="section-badge">{t.about.subtitle}</div>
          <h2>{t.about.title}</h2>
          <div className="section-line"></div>
        </div>

        <div ref={statsRef} className={`stats-grid ${statsVisible ? "visible" : ""}`} data-ao>
          {stats.map((s) => (
            <div className="stat-card" key={s.label}>
              <div className="stat-num">{s.n}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="about-grid">
          <div ref={textRef} className={textVisible ? "visible" : ""} data-ao>
            <p className="about-p">{t.about.p1}</p>
            <p className="about-p" style={{ marginBottom: 0 }}>{t.about.p2}</p>
            <div className="about-info">
              <div className="about-info-item">
                <div className="info-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                </div>
                <span>{t.about.edu}</span>
              </div>
              <div className="about-info-item">
                <div className="info-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                </div>
                <span>{t.about.location}</span>
              </div>
              <div className="about-info-item">
                <div className="info-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>
                </div>
                <span>English (Fluent)</span>
              </div>
            </div>
          </div>

          <div ref={cardRef} className={`about-card ${cardVisible ? "visible" : ""}`} data-ao="right">
            <p className="about-card-title">{t.about.interestsTitle}</p>
            <div className="interests">
              {t.interests.map((i) => (
                <span className="interest-tag" key={i}>{i}</span>
              ))}
            </div>
            <a href="/uploads/Salem-Saleh-CV.pdf" download className="btn-download">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>
              {t.about.downloadCV}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
