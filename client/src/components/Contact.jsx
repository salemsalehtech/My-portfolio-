// Contact.jsx — the "Get In Touch" section (id="contact"): a contact form on the left,
// static social/location info on the right. Submitting the form calls the public
// POST /contact endpoint (see server/src/routes/contact.js) via lib/api.js — there is no
// admin auth involved here, anyone can send a message.
import { useState } from "react";
import { useSite } from "../context/SiteContext";
import { useReveal } from "../hooks/useReveal";
import { api } from "../lib/api";

export default function Contact() {
  const { t } = useSite();
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
        <div className="section-header" data-ao>
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
                <a href="mailto:contact@salemsaleh.dev" className="contact-link">
                  <div className="contact-link-icon gold-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                  </div>
                  <span>contact@salemsaleh.dev</span>
                </a>
                <a href="https://github.com/solx4" target="_blank" rel="noopener noreferrer" className="contact-link">
                  <div className="contact-link-icon gold-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.79-.26.79-.58v-2.23c-3.34.73-4.03-1.42-4.03-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 016 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.19.7.8.58A12 12 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
                  </div>
                  <span>github.com/solx4</span>
                </a>
                <a href="https://www.linkedin.com/in/solx4" target="_blank" rel="noopener noreferrer" className="contact-link contact-linkedin">
                  <div className="contact-link-icon linkedin-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 110-4.12 2.06 2.06 0 010 4.12zm1.78 13.02H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45C23.2 24 24 23.23 24 22.27V1.73C24 .77 23.2 0 22.22 0z" /></svg>
                  </div>
                  <span>linkedin.com/in/solx4</span>
                </a>
                <a href="https://www.youtube.com/@SalemSaleh1" target="_blank" rel="noopener noreferrer" className="contact-link contact-yt">
                  <div className="contact-link-icon yt-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 00.5 6.2 31 31 0 000 12a31 31 0 00.5 5.8 3 3 0 002.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 002.1-2.1A31 31 0 0024 12a31 31 0 00-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" /></svg>
                  </div>
                  <span>@SalemSaleh1</span>
                </a>
              </div>
            </div>
            <div className="location-card">
              <div className="location-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
              </div>
              <div>
                <div className="location-label">Location</div>
                <div className="location-value">Alexandria, Egypt</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
