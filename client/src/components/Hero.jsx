// Hero.jsx — the landing/intro section shown at the top of the public portfolio
// (id="home"). Renders the greeting, name, a rotating job-title line, tagline, CTA
// buttons, social links, the avatar image, and the canvas particle background (see
// Particles.jsx). No props — reads theme/language from useSite() and rotates through the
// localized titles in i18n/translations.js#heroTitles.
import { useEffect, useState } from "react";
import { useSite } from "../context/SiteContext";
import { heroTitles } from "../i18n/translations";
import { scrollToSection } from "../lib/scrollToSection";
import { useReveal } from "../hooks/useReveal";
import Particles from "./Particles";

export default function Hero() {
  const { t, lang } = useSite();
  const [heroIdx, setHeroIdx] = useState(0);
  const [fading, setFading] = useState(false);
  const [textRef, textVisible] = useReveal();
  const [avatarRef, avatarVisible] = useReveal();

  // Cycles through the 3 job titles in heroTitles every 3.2s: fade out (380ms), swap to
  // the next title, then fade back in (the fade-in itself is just the CSS transition on
  // `opacity` reacting to `fading` flipping back to false below).
  useEffect(() => {
    const cycle = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setHeroIdx((i) => (i + 1) % 3);
        setFading(false);
      }, 380);
    }, 3200);
    return () => clearInterval(cycle);
  }, []);

  return (
    <section id="home" className="hero">
      <Particles />
      <div className="hero-bg"></div>
      <div className="hero-container">
        <div ref={textRef} className={`hero-text ${textVisible ? "visible" : ""}`} data-ao>
          <div className="hero-greeting">
            <div className="hero-line"></div>
            <span>{t.greeting}</span>
          </div>
          <h1>{t.name}</h1>
          <div className="hero-subtitle">
            <span className="hero-dash">⎯</span>
            <span id="heroSub" style={{ opacity: fading ? 0 : 1 }}>{heroTitles[lang][heroIdx]}</span>
          </div>
          <p className="hero-tagline">{t.tagline}</p>
          <div className="hero-ctas">
            <button className="btn-primary" onClick={() => scrollToSection("projects")}>{t.ctaProjects}</button>
            <a href="https://www.youtube.com/@SalemSaleh1" target="_blank" rel="noopener noreferrer" className="btn-secondary">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 00.5 6.2 31 31 0 000 12a31 31 0 00.5 5.8 3 3 0 002.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 002.1-2.1A31 31 0 0024 12a31 31 0 00-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" /></svg>
              <span>{t.ctaYoutube}</span>
            </a>
          </div>
          <div className="hero-socials">
            <a href="https://github.com/solx4" target="_blank" rel="noopener noreferrer" className="social-btn" aria-label="GitHub">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.79-.26.79-.58v-2.23c-3.34.73-4.03-1.42-4.03-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 016 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.19.7.8.58A12 12 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
            </a>
            <a href="https://www.linkedin.com/in/solx4" target="_blank" rel="noopener noreferrer" className="social-btn social-linkedin" aria-label="LinkedIn">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 110-4.12 2.06 2.06 0 010 4.12zm1.78 13.02H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45C23.2 24 24 23.23 24 22.27V1.73C24 .77 23.2 0 22.22 0z" /></svg>
            </a>
            <a href="https://www.youtube.com/@SalemSaleh1" target="_blank" rel="noopener noreferrer" className="social-btn social-youtube" aria-label="YouTube">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 00.5 6.2 31 31 0 000 12a31 31 0 00.5 5.8 3 3 0 002.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 002.1-2.1A31 31 0 0024 12a31 31 0 00-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" /></svg>
            </a>
          </div>
        </div>
        <div ref={avatarRef} className={`hero-avatar ${avatarVisible ? "visible" : ""}`} data-ao="scale">
          <div className="avatar-wrapper">
            <div className="avatar-ring ring-1"></div>
            <div className="avatar-ring ring-2"></div>
            <div className="avatar-dashed"></div>
            <div className="avatar-img">
              <img src="/uploads/imagr.png" alt="Salem Saleh" />
            </div>
            <div className="avatar-dot dot-1"></div>
            <div className="avatar-dot dot-2"></div>
            <div className="avatar-dot dot-3"></div>
          </div>
        </div>
      </div>
      <div className="scroll-hint" onClick={() => scrollToSection("about")}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
      </div>
    </section>
  );
}
