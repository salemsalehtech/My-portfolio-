// Hero.jsx — the top of the public portfolio (id="home").
//
// The name is set in BOTH scripts — the current language large, the other one beneath it in the
// accent colour — because building bilingual (Arabic / English) software is the point of the
// work. Then the roles as one line, the tagline, the optional USP, the two calls to action and the
// social links. The portrait sits in a plain frame with a caption: the location and the local time
// in Cairo (so a visitor abroad sees when they'd get an answer).
//
// Props: `settings` — the profile content from Admin → "Profile & Links" (loaded once in
// pages/Portfolio.jsx; never empty, it falls back to defaults). A link left empty hides its button.
import { useEffect, useState } from "react";
import { useSite } from "../context/SiteContext";
import { scrollToSection } from "../lib/scrollToSection";
import { useReveal } from "../hooks/useReveal";
import { pick } from "../lib/pick";
import { GithubIcon, LinkedinIcon, YoutubeIcon } from "../lib/socialIcons";

const cairoTime = (lang) =>
  new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Cairo" }).format(new Date());

export default function Hero({ settings }) {
  const { t, lang } = useSite();
  const [textRef, textVisible] = useReveal();
  const [time, setTime] = useState(() => cairoTime(lang));
  useEffect(() => {
    setTime(cairoTime(lang));
    const timer = setInterval(() => setTime(cairoTime(lang)), 30 * 1000);
    return () => clearInterval(timer);
  }, [lang]);

  const roles = settings.titles.map((title) => pick(lang, title.en, title.ar)).filter(Boolean);
  const socials = [
    { url: settings.githubUrl, label: "GitHub", Icon: GithubIcon },
    { url: settings.linkedinUrl, label: "LinkedIn", Icon: LinkedinIcon },
    { url: settings.youtubeUrl, label: "YouTube", Icon: YoutubeIcon },
  ].filter((s) => s.url);
  const usp = pick(lang, settings.uspEn, settings.uspAr);
  const name = pick(lang, settings.nameEn, settings.nameAr);
  const otherName = lang === "ar" ? settings.nameEn : settings.nameAr;
  const location = pick(lang, settings.locationEn, settings.locationAr);

  return (
    <section id="home" className="hero">
      <div className="hero-container">
        <div ref={textRef} className={`hero-text ${textVisible ? "visible" : ""}`} data-ao>
          <p className="hero-greeting">{pick(lang, settings.greetingEn, settings.greetingAr)}</p>
          <h1 className="hero-name">
            <span>{name}</span>
            {otherName && otherName !== name && <span className="hero-name-alt" lang={lang === "ar" ? "en" : "ar"} dir={lang === "ar" ? "ltr" : "rtl"}>{otherName}</span>}
          </h1>
          {roles.length > 0 && <p className="hero-roles">{roles.join(" · ")}</p>}
          <p className="hero-tagline">{pick(lang, settings.taglineEn, settings.taglineAr)}</p>
          {usp && <p className="hero-usp">{usp}</p>}
          <div className="hero-ctas">
            <button className="btn-primary" onClick={() => scrollToSection("projects")}>{t.ctaProjects}</button>
            <button className="btn-secondary" onClick={() => scrollToSection("contact")}>{t.nav.contact}</button>
          </div>
          {socials.length > 0 && (
            <div className="hero-socials">
              {socials.map(({ url, label, Icon }) => (
                <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="social-btn" aria-label={label}>
                  <Icon size={17} />
                </a>
              ))}
            </div>
          )}
        </div>
        <figure className="hero-portrait">
          <img src={`${import.meta.env.BASE_URL}uploads/imagr.png`} alt={name} />
          <figcaption>
            <span>{location}</span>
            <span dir="ltr">{time} <abbr title="Cairo time">EET</abbr></span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
