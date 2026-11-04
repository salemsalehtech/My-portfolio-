// CtaBand.jsx — the "Have a project in mind?" band: an ink panel cut at 45° with the availability,
// one line of copy and two ways to start — the project brief (the Contact section) or a WhatsApp
// chat (only when a number is set in Admin → "Profile & Links"). Shown on the home page after the
// reviews, at the end of every case-study page and at the end of every article.
//
// Props: `settings` — the site settings (useSiteSettings); `title` — replaces the default
// heading; `prefill` — a first line put in the visitor's brief (e.g. "something like <project>"),
// unless they already wrote one; `whatsappText` — the first WhatsApp message.
import { useLocation, useNavigate } from "react-router-dom";
import { useSite } from "../context/SiteContext";
import { useReveal } from "../hooks/useReveal";
import { pick } from "../lib/pick";
import { whatsappLink } from "../lib/whatsapp";
import { prefillMessage } from "../lib/contactBrief";
import { scrollToSection } from "../lib/scrollToSection";
import { WhatsappIcon } from "../lib/socialIcons";
import { track } from "../lib/analytics";
import { ArrowIcon } from "./ArrowIcon";

export default function CtaBand({ settings, title, prefill, whatsappText }) {
  const { t, lang } = useSite();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [ref, visible] = useReveal();
  const busy = settings.availableForWork === false;
  const status = pick(lang, settings.availabilityEn, settings.availabilityAr) || (busy ? t.busy : t.available);

  // On the home page the brief is right below; elsewhere go home and land on it.
  const openBrief = () => {
    if (prefill) prefillMessage(prefill);
    if (pathname === "/") scrollToSection("contact");
    else navigate("/", { state: { scrollTo: "contact" } });
  };

  return (
    <section className="cta-wrap" aria-labelledby="cta-band-title">
      <div className="container">
        <div ref={ref} className={`cta-band ${visible ? "visible" : ""}`} data-ao>
          <div className="cta-copy">
            <p className={`cta-status ${busy ? "is-busy" : ""}`}><span aria-hidden="true" />{status}</p>
            <h2 id="cta-band-title">{title || t.cta.title}</h2>
            <p className="cta-text">{t.cta.text}</p>
          </div>
          <div className="cta-actions">
            <button type="button" className="btn-primary cta-brief" onClick={openBrief}>
              {t.cta.brief} <ArrowIcon size={16} />
            </button>
            {settings.whatsapp && (
              <a className="btn-secondary cta-wa" href={whatsappLink(settings.whatsapp, whatsappText || t.whatsapp.hello)}
                target="_blank" rel="noopener noreferrer" onClick={() => track("whatsapp")}>
                <WhatsappIcon size={18} /> {t.whatsapp.label}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
