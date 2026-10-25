// Contact.jsx — the "Get In Touch" section (id="contact"): a contact form on the left,
// contact links and location on the right. Submitting the form calls the public
// POST /contact endpoint (see server/src/routes/contact.js) via lib/api.js — there is no
// admin auth involved here, anyone can send a message.
//
// Props: `settings` — the site-wide profile content from Admin → "Profile & Links" (loaded in
// pages/Portfolio.jsx): email, GitHub / LinkedIn / YouTube links and the location. An empty
// value in the dashboard hides that row.
import { useState } from "react";
import { useSite } from "../context/SiteContext";
import { useReveal } from "../hooks/useReveal";
import { api } from "../lib/api";
import { pick, linkLabel, youtubeHandle } from "../lib/pick";
import { GithubIcon, LinkedinIcon, YoutubeIcon, MailIcon, PinIcon } from "../lib/socialIcons";

export default function Contact({ settings }) {
  const { t, lang } = useSite();
  const location = pick(lang, settings.locationEn, settings.locationAr);
  const [headerRef, headerVisible] = useReveal();
  const [formRef, formVisible] = useReveal();
  const [infoRef, infoVisible] = useReveal();
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState({});
  // The form has 4 states: idle (nothing submitted yet), sending (request in flight),
  // success (server accepted it), error (request failed) — the JSX below picks what to
  // render based on this.
  const [status, setStatus] = useState("idle"); // idle | sending | success | error

  const update = (key) => (e) => setFormData((f) => ({ ...f, [key]: e.target.value }));

  const submit = async () => {
    // Basic client-side validation before hitting the server — just checks required
    // fields are filled in and the email looks roughly valid.
    const errs = {};
    if (!formData.name.trim()) errs.name = true;
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) errs.email = true;
    if (!formData.message.trim()) errs.message = true;
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setErrors({});
    setStatus("sending");
    try {
      await api.post("/contact", formData);
      setStatus("success");
      setFormData({ name: "", email: "", message: "" });
      // Reset back to the empty form after showing the success message for 5 seconds.
      setTimeout(() => setStatus("idle"), 5000);
    } catch {
      setStatus("error");
    }
  };

  return (
    <section id="contact" className="section-surface">
      <div className="section-bg-circle" style={{ top: "-80px", left: "-80px" }}></div>
      <div className="container">
        <div ref={headerRef} className={`section-header ${headerVisible ? "visible" : ""}`} data-ao>
          <div className="section-badge">{t.contact.subtitle}</div>
          <h2>{t.contact.title}</h2>
          <div className="section-line"></div>
        </div>

        <div className="contact-grid">
          <div ref={formRef} className={`contact-form-card ${formVisible ? "visible" : ""}`} data-ao>
            {status === "success" ? (
              <div className="form-success" style={{ display: "flex" }}>
                <div className="success-icon">✓</div>
                <p>{t.contact.success}</p>
              </div>
            ) : (
              <div id="contactForm">
                {status === "error" && <div className="admin-error">{t.contact.error}</div>}
                <input
                  type="text" placeholder={t.contact.name} value={formData.name} onChange={update("name")}
                  className={`form-input ${errors.name ? "error" : ""}`}
                />
                <input
                  type="email" placeholder={t.contact.email} value={formData.email} onChange={update("email")}
                  className={`form-input ${errors.email ? "error" : ""}`}
                />
                <textarea
                  placeholder={t.contact.message} value={formData.message} onChange={update("message")} rows={5}
                  className={`form-input form-textarea ${errors.message ? "error" : ""}`}
                ></textarea>
                <button className="btn-send" onClick={submit} disabled={status === "sending"}>
                  {status === "sending" && <div className="send-spinner"></div>}
                  {status === "sending" ? t.contact.sending : t.contact.send}
                </button>
              </div>
            )}
          </div>

          <div ref={infoRef} className={`contact-info ${infoVisible ? "visible" : ""}`} data-ao="right">
            <div className="connect-card">
              <h3>{t.contact.connectTitle}</h3>
              <div className="contact-links">
                {settings.email && (
                  <a href={`mailto:${settings.email}`} className="contact-link">
                    <div className="contact-link-icon gold-icon"><MailIcon size={14} /></div>
                    <span>{settings.email}</span>
                  </a>
                )}
                {settings.githubUrl && (
                  <a href={settings.githubUrl} target="_blank" rel="noopener noreferrer" className="contact-link">
                    <div className="contact-link-icon gold-icon"><GithubIcon size={14} /></div>
                    <span>{linkLabel(settings.githubUrl)}</span>
                  </a>
                )}
                {settings.linkedinUrl && (
                  <a href={settings.linkedinUrl} target="_blank" rel="noopener noreferrer" className="contact-link contact-linkedin">
                    <div className="contact-link-icon linkedin-icon"><LinkedinIcon size={14} /></div>
                    <span>{linkLabel(settings.linkedinUrl)}</span>
                  </a>
                )}
                {settings.youtubeUrl && (
                  <a href={settings.youtubeUrl} target="_blank" rel="noopener noreferrer" className="contact-link contact-yt">
                    <div className="contact-link-icon yt-icon"><YoutubeIcon size={14} /></div>
                    <span>{youtubeHandle(settings.youtubeUrl)}</span>
                  </a>
                )}
              </div>
            </div>
            {location && (
              <div className="location-card">
                <div className="location-icon"><PinIcon size={18} /></div>
                <div>
                  <div className="location-label">{t.contact.locationLabel}</div>
                  <div className="location-value">{location}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
