// Footer.jsx — site footer shown at the bottom of the public portfolio: brand badge/name,
// role, copyright text, and social links (GitHub/LinkedIn/YouTube).
//
// Props: `settings` — the site-wide profile content from Admin → "Profile & Links" (loaded in
// pages/Portfolio.jsx). The role and the links come from there; an empty link hides its icon.
// Only the copyright text comes from translations (t.footer.rights).
import { useSite } from "../context/SiteContext";
import { pick } from "../lib/pick";
import { GithubIcon, LinkedinIcon, YoutubeIcon } from "../lib/socialIcons";

export default function Footer({ settings }) {
  const { t, lang } = useSite();
  const socials = [
    { url: settings.githubUrl, label: "GitHub", Icon: GithubIcon },
    { url: settings.linkedinUrl, label: "LinkedIn", Icon: LinkedinIcon },
    { url: settings.youtubeUrl, label: "YouTube", Icon: YoutubeIcon },
  ].filter((s) => s.url);

  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-badge">SS</div>
          <div>
            <div className="footer-name">{pick(lang, settings.nameEn, settings.nameAr)}</div>
            <div className="footer-role">{pick(lang, settings.roleEn, settings.roleAr)}</div>
          </div>
        </div>
        <div className="footer-copy">{t.footer.rights}</div>
        <div className="footer-socials">
          {socials.map(({ url, label, Icon }) => (
            <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="footer-social" aria-label={label}>
              <Icon size={14} />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
