// Hero.jsx — the landing/intro section shown at the top of the public portfolio
// (id="home"). Renders the greeting, name, a rotating job-title line, tagline, the optional
// USP line, CTA buttons, social links, the avatar image, and the canvas particle background
// (see Particles.jsx).
//
// Props: `settings` — the site-wide profile content from Admin → "Profile & Links" (loaded
// once in pages/Portfolio.jsx via useSiteSettings; never empty, it falls back to defaults).
// Every text has an English and an Arabic version; pick() chooses for the current language.
// A link left empty in the dashboard hides its button.
import { useEffect, useState } from "react";
import { useSite } from "../context/SiteContext";
import { scrollToSection } from "../lib/scrollToSection";
import { useReveal } from "../hooks/useReveal";
import { pick } from "../lib/pick";
import { GithubIcon, LinkedinIcon, YoutubeIcon } from "../lib/socialIcons";
import Particles from "./Particles";

export default function Hero({ settings }) {
  const { t, lang } = useSite();
  const [heroIdx, setHeroIdx] = useState(0);
  const [fading, setFading] = useState(false);
  const [textRef, textVisible] = useReveal();
  const [avatarRef, avatarVisible] = useReveal();

  const titles = settings.titles.map((title) => pick(lang, title.en, title.ar)).filter(Boolean);
  const count = titles.length;

  // Cycles through the job titles every 3.2s: fade out (380ms), swap to the next title, then
  // fade back in (the fade-in itself is just the CSS transition on `opacity` reacting to
  // `fading` flipping back to false below). With 0 or 1 title there is nothing to rotate.
  useEffect(() => {
    if (count < 2) return;
    const cycle = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setHeroIdx((i) => (i + 1) % count);
        setFading(false);
      }, 380);
    }, 3200);
    return () => clearInterval(cycle);
  }, [count]);

  const socials = [
    { url: settings.githubUrl, label: "GitHub", className: "social-btn", Icon: GithubIcon },
    { url: settings.linkedinUrl, label: "LinkedIn", className: "social-btn social-linkedin", Icon: LinkedinIcon },
    { url: settings.youtubeUrl, label: "YouTube", className: "social-btn social-youtube", Icon: YoutubeIcon },
  ].filter((s) => s.url);
  const usp = pick(lang, settings.uspEn, settings.uspAr);
  const name = pick(lang, settings.nameEn, settings.nameAr);

  return (
    <section id="home" className="hero">
      <Particles />
      <div className="hero-bg"></div>
      <div className="hero-container">
        <div ref={textRef} className={`hero-text ${textVisible ? "visible" : ""}`} data-ao>
          <div className="hero-greeting">
            <div className="hero-line"></div>
            <span>{pick(lang, settings.greetingEn, settings.greetingAr)}</span>
          </div>
          <h1>{name}</h1>
          {count > 0 && (
            <div className="hero-subtitle">
              <span className="hero-dash">⎯</span>
              <span id="heroSub" style={{ opacity: fading ? 0 : 1 }}>{titles[heroIdx % count]}</span>
            </div>
          )}
          <p className="hero-tagline">{pick(lang, settings.taglineEn, settings.taglineAr)}</p>
          {usp && <p className="hero-usp">{usp}</p>}
          <div className="hero-ctas">
            <button className="btn-primary" onClick={() => scrollToSection("projects")}>{t.ctaProjects}</button>
            {settings.youtubeUrl && (
              <a href={settings.youtubeUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                <YoutubeIcon size={15} />
                <span>{t.ctaYoutube}</span>
              </a>
            )}
          </div>
          {socials.length > 0 && (
            <div className="hero-socials">
              {socials.map(({ url, label, className, Icon }) => (
                <a key={label} href={url} target="_blank" rel="noopener noreferrer" className={className} aria-label={label}>
                  <Icon size={17} />
                </a>
              ))}
            </div>
          )}
        </div>
        <div ref={avatarRef} className={`hero-avatar ${avatarVisible ? "visible" : ""}`} data-ao="scale">
          <div className="avatar-wrapper">
            <div className="avatar-ring ring-1"></div>
            <div className="avatar-ring ring-2"></div>
            <div className="avatar-dashed"></div>
            <div className="avatar-img">
              <img src={`${import.meta.env.BASE_URL}uploads/imagr.png`} alt={name} />
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
