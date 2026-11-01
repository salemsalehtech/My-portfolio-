// Hero.jsx — the top of the public portfolio (id="home").
//
// One side: the name in BOTH scripts (the current language large, the other beneath
// it in the accent colour), the roles, the tagline, the optional USP, the calls to action ("Book a
// call" when a booking link is set) and the social links.
// Other side: HeroPortrait.jsx — the photo framed like a drawing plate, carrying the
// "taking new projects" status, the city and Cairo time.
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
import HeroPortrait from "./HeroPortrait";

// Shown on the portrait plate, whose labels are always Latin.
const cairoTime = () =>
  new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Cairo" }).format(new Date());

export default function Hero({ settings }) {
  const { t, lang } = useSite();
  const [textRef, textVisible] = useReveal();
  const [time, setTime] = useState(cairoTime);
  useEffect(() => {
    const timer = setInterval(() => setTime(cairoTime()), 30 * 1000);
    return () => clearInterval(timer);
  }, []);

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
        <HeroPortrait src={photo} name={settings.nameEn || name} roles={settings.titles.map((title) => title.en).filter(Boolean).slice(0, 2).join(" · ")}
          place={settings.locationEn || location} time={time} status={availability} available={available} />
      </div>
    </section>
  );
}
