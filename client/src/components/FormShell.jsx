// FormShell.jsx — the page frame shared by the standalone form pages (PublicForm.jsx for the
// Form Builder, FeedbackForm.jsx for client reviews).
//
// On wide screens it is two columns: a profile panel (photo, name, role, tagline, location,
// email, social links and a "Visit my website" button — all from Admin → Profile & Links) and
// the form itself. On phones the panel shrinks to a slim bar with the photo, name and a website
// link, so the form starts right away.
//
// Props: lang ("en" | "ar"), `switchLink` (optional { to, label } for the language switch),
// children (the form or the thank-you message).
import { Link } from "react-router-dom";
import { useSiteSettings } from "../hooks/useSiteSettings";
import { pick } from "../lib/pick";
import { GithubIcon, LinkedinIcon, YoutubeIcon, MailIcon, PinIcon } from "../lib/socialIcons";

const COPY = {
  en: { visit: "Visit my website", rights: "All rights reserved." },
  ar: { visit: "زيارة موقعي", rights: "جميع الحقوق محفوظة." },
};

export const ArrowIcon = ({ rtl }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={rtl ? { transform: "scaleX(-1)" } : undefined}>
    <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
  </svg>
);

export default function FormShell({ lang, switchLink, children }) {
  const s = useSiteSettings();
  const c = COPY[lang];
  const isAr = lang === "ar";
  const name = pick(lang, s.nameEn, s.nameAr);
  const role = pick(lang, s.roleEn, s.roleAr);
  const tagline = pick(lang, s.taglineEn, s.taglineAr);
  const location = pick(lang, s.locationEn, s.locationAr);
  const photo = `${import.meta.env.BASE_URL}uploads/imagr.png`;
  const socials = [
    s.githubUrl && { href: s.githubUrl, label: "GitHub", icon: <GithubIcon size={16} /> },
    s.linkedinUrl && { href: s.linkedinUrl, label: "LinkedIn", icon: <LinkedinIcon size={16} /> },
    s.youtubeUrl && { href: s.youtubeUrl, label: "YouTube", icon: <YoutubeIcon size={16} /> },
  ].filter(Boolean);

  return (
    <div className="fp" dir={isAr ? "rtl" : "ltr"} lang={lang}>
      <aside className="fp-aside">
        <div className="fp-aside-inner">
          <Link to="/" className="fp-person">
            <img className="fp-photo" src={photo} alt="" />
            <span>
              <span className="fp-name">{name}</span>
              <span className="fp-role">{role}</span>
            </span>
          </Link>

          <div className="fp-bio">
            {tagline && <p className="fp-tagline">{tagline}</p>}
            <ul className="fp-meta">
              {location && <li><PinIcon size={15} /><span>{location}</span></li>}
              {s.email && <li><MailIcon size={15} /><a href={`mailto:${s.email}`} dir="ltr">{s.email}</a></li>}
            </ul>
            {socials.length > 0 && (
              <div className="fp-socials">
                {socials.map((x) => (
                  <a key={x.label} href={x.href} target="_blank" rel="noopener noreferrer" aria-label={x.label} title={x.label}>{x.icon}</a>
                ))}
              </div>
            )}
          </div>

          <Link to="/" className="fp-visit">
            <span>{c.visit}</span>
            <ArrowIcon rtl={isAr} />
          </Link>
          <p className="fp-copy">© {new Date().getFullYear()} {name}. {c.rights}</p>
        </div>
      </aside>

      <main className="fp-main">
        {switchLink && (
          <div className="fp-topbar">
            <Link className="fp-lang" to={switchLink.to} lang={isAr ? "en" : "ar"}>{switchLink.label}</Link>
          </div>
        )}
        <div className="fp-content">{children}</div>
      </main>
    </div>
  );
}

// The thank-you / closed / not-found panel, with the way back to the website.
export function FormMessage({ lang, tone = "done", title, body }) {
  const isAr = lang === "ar";
  return (
    <div className="fp-message">
      <div className={`fp-message-icon is-${tone}`} aria-hidden="true">
        {tone === "done" ? (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 8v5" /><path d="M12 16.5v.01" /><circle cx="12" cy="12" r="9" /></svg>
        )}
      </div>
      <h1 className="fp-title">{title}</h1>
      {body && <p className="fp-lead">{body}</p>}
      <Link to="/" className="fp-btn fp-btn-ghost">
        <span>{COPY[lang].visit}</span>
        <ArrowIcon rtl={isAr} />
      </Link>
    </div>
  );
}
