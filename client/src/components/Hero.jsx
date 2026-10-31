// Hero.jsx — the top of the public portfolio (id="home").
//
// One side: who you are — the portrait as a small avatar with the "taking new projects" status
// and Cairo time, then the name in BOTH scripts (the current language large, the other beneath
// it in the accent colour), the roles, the tagline, the optional USP, the calls to action ("Book a
// call" when a booking link is set) and the social links.
// Other side: HeroDemo.jsx — a small booking app the visitor can play with, switching between
// Arabic and English, because that is exactly what the work is.
//
// Props: `settings` — the profile content from Admin → "Profile & Links" (loaded once in
// pages/Portfolio.jsx; never empty, it falls back to defaults). A link left empty hides its button.
import { useEffect, useState } from "react";
import { useSite } from "../context/SiteContext";
import { scrollToSection } from "../lib/scrollToSection";
import { useReveal } from "../hooks/useReveal";
import { pick } from "../lib/pick";
import { GithubIcon, LinkedinIcon, YoutubeIcon } from "../lib/socialIcons";
import { API_BASE } from "../lib/api";
import HeroDemo from "./HeroDemo";

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
  const available = settings.availableForWork !== false;
  const availability = pick(lang, settings.availabilityEn, settings.availabilityAr) || (available ? t.available : t.busy);
  const photo = settings.hasPhoto
    ? `${API_BASE}/settings/photo?v=${encodeURIComponent(settings.updatedAt || "")}`
    : `${import.meta.env.BASE_URL}uploads/portrait.webp`;

  return (
    <section id="home" className="hero">
      <div className="hero-container">
        <div ref={textRef} className={`hero-text ${textVisible ? "visible" : ""}`} data-ao>
          <div className="hero-id">
            <img className="hero-avatar-img" src={photo} alt="" width="56" height="56" />
            <div>
              <p className={`hero-status ${available ? "is-available" : "is-busy"}`}><span aria-hidden="true" />{availability}</p>
              <p className="hero-place">{location} · <span dir="ltr">{time}</span></p>
            </div>
          </div>
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
            {settings.bookingUrl
              ? <a className="btn-secondary" href={settings.bookingUrl} target="_blank" rel="noopener noreferrer">{t.bookCall}</a>
              : <button className="btn-secondary" onClick={() => scrollToSection("contact")}>{t.nav.contact}</button>}
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
        <HeroDemo caption={t.demoCaption} />
      </div>
    </section>
  );
}
