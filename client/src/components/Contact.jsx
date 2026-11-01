// Contact.jsx — the "Tell me about your project" section (id="contact"): a short project brief on
// one side, and on the other what happens after sending it, the availability / booking card and
// the other ways to reach me. Submitting calls the public POST /contact endpoint (see
// server/src/routes/contact.js) via lib/api.js — no login involved, anyone can send a message.
//
// The brief: what they need (the site's own services, from Admin → Services, or "something else"),
// when, a rough budget (optional), how to be answered (email, or WhatsApp with a phone number), and
// the message. The answers are kept on the visitor's device until sent (lib/contactBrief.js →
// DRAFT_KEY). A service card's "Start a project like this" link picks its service here through the
// "contact-prefill" window event (components/Services.jsx).
//
// Props: `settings` — the site-wide profile content from Admin → "Profile & Links" (loaded in
// pages/Portfolio.jsx): email, GitHub / LinkedIn / YouTube links, the location, availability and
// booking link. An empty value in the dashboard hides that row. `services` — the visible services.
import { useEffect, useState } from "react";
import { useSite } from "../context/SiteContext";
import { useReveal } from "../hooks/useReveal";
import { api } from "../lib/api";
import { pick, linkLabel, youtubeHandle } from "../lib/pick";
import { TIMELINES, BUDGETS, DRAFT_KEY } from "../lib/contactBrief";
import { GithubIcon, LinkedinIcon, YoutubeIcon, MailIcon, PinIcon } from "../lib/socialIcons";

const EMPTY = { projectType: "", timeline: "", budget: "", channel: "email", name: "", email: "", phone: "", message: "" };
const MAX_MESSAGE = 5000;

const readDraft = () => {
  try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}") }; } catch { return EMPTY; }
};

// One row of single-choice buttons. Clicking the chosen one again clears it when `clearable`.
function Choices({ label, hint, options, value, onChange, clearable = false }) {
  return (
    <fieldset className="brief-group">
      <legend className="brief-label">{label}{hint && <span> · {hint}</span>}</legend>
      <div className="brief-chips">
        {options.map(([id, text]) => (
          <button type="button" key={id} className="brief-chip" aria-pressed={value === id}
            onClick={() => onChange(value === id && clearable ? "" : id)}>
            <bdi>{text}</bdi>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function Contact({ settings, services = [] }) {
  const { t, lang } = useSite();
  const c = t.contact;
  const location = pick(lang, settings.locationEn, settings.locationAr);
  const [headerRef, headerVisible] = useReveal();
  const [formRef, formVisible] = useReveal();
  const [infoRef, infoVisible] = useReveal();
  const [form, setForm] = useState(readDraft);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [sentTo, setSentTo] = useState(null); // { name, channel } of the message just sent

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const typed = (key) => (e) => set(key)(e.target.value);

  // Keep the unsent answers on this device (storage may be blocked: then they just aren't kept).
  const hasDraft = Boolean(form.name || form.message || form.projectType);
  useEffect(() => {
    try {
      if (hasDraft) localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      else localStorage.removeItem(DRAFT_KEY);
    } catch { /* storage unavailable */ }
  }, [form, hasDraft]);

  // "Start a project like this" on a service card.
  useEffect(() => {
    const onPrefill = (e) => { set("projectType")(e.detail?.projectType || ""); setStatus("idle"); };
    window.addEventListener("contact-prefill", onPrefill);
    return () => window.removeEventListener("contact-prefill", onPrefill);
  }, []);

  const needOptions = [
    ...services.map((s) => pick(lang, s.titleEn, s.titleAr)).filter(Boolean).map((title) => [title, title]),
    [c.other, c.other],
  ];

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = c.errName;
    if (form.channel === "email" && !/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = c.errEmail;
    if (form.channel === "whatsapp" && !/^\+?\d{8,15}$/.test(form.phone.replace(/[^\d+]/g, ""))) errs.phone = c.errPhone;
    if (!form.message.trim()) errs.message = c.errMessage;
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setStatus("sending");
    try {
      await api.post("/contact", {
        ...form,
        email: form.channel === "email" ? form.email : "",
        phone: form.channel === "whatsapp" ? form.phone : "",
      });
      setSentTo({ name: form.name.trim().split(/\s+/)[0], channel: form.channel });
      setForm(EMPTY);
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  const fieldError = (key) => errors[key] && <span className="brief-error" role="alert">{errors[key]}</span>;

  return (
    <section id="contact" className="section-surface">
      <div className="container">
        <div ref={headerRef} className={`section-header ${headerVisible ? "visible" : ""}`} data-ao>
          <div className="section-badge">{c.subtitle}</div>
          <h2>{c.title}</h2>
        </div>

        <div className="contact-grid">
          <div ref={formRef} className={`brief cut-card ${formVisible ? "visible" : ""}`} data-ao>
            {status === "sent" && sentTo ? (
              <div className="brief-sent" role="status">
                <span className="brief-sent-pad" aria-hidden="true" />
                <h3>{c.sentTitle.replace("{name}", sentTo.name)}</h3>
                <p>{sentTo.channel === "whatsapp" ? c.sentWhatsapp : c.sentEmail}</p>
                <button type="button" className="btn-secondary" onClick={() => setStatus("idle")}>{c.sendAnother}</button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                {status === "error" && <div className="admin-error">{c.error}</div>}

                <Choices label={c.need} options={needOptions} value={form.projectType} onChange={set("projectType")} clearable />
                <Choices label={c.when} options={TIMELINES.map((x) => [x.id, x[lang]])} value={form.timeline} onChange={set("timeline")} clearable />
                <Choices label={c.budget} hint={c.optional} options={BUDGETS[lang].map((b) => [b, b])} value={form.budget} onChange={set("budget")} clearable />

                <div className="brief-row">
                  <label className="brief-field">
                    <span className="brief-label">{c.name}</span>
                    <input className={`form-input ${errors.name ? "error" : ""}`} value={form.name} onChange={typed("name")} maxLength={100} autoComplete="name" />
                    {fieldError("name")}
                  </label>
                  <div className="brief-field">
                    <span className="brief-label" id="brief-reply">{c.replyOn}</span>
                    <div className="brief-switch" role="group" aria-labelledby="brief-reply">
                      <button type="button" aria-pressed={form.channel === "email"} onClick={() => set("channel")("email")}>{c.byEmail}</button>
                      <button type="button" aria-pressed={form.channel === "whatsapp"} onClick={() => set("channel")("whatsapp")}>{c.byWhatsapp}</button>
                    </div>
                  </div>
                </div>

                {form.channel === "email" ? (
                  <label className="brief-field">
                    <span className="brief-label">{c.email}</span>
                    <input type="email" dir="ltr" className={`form-input ${errors.email ? "error" : ""}`} value={form.email} onChange={typed("email")} maxLength={200} autoComplete="email" />
                    {fieldError("email")}
                  </label>
                ) : (
                  <label className="brief-field">
                    <span className="brief-label">{c.phone}</span>
                    <input type="tel" dir="ltr" className={`form-input ${errors.phone ? "error" : ""}`} value={form.phone} onChange={typed("phone")} maxLength={20} autoComplete="tel" placeholder="01xxxxxxxxx" />
                    {fieldError("phone")}
                  </label>
                )}

                <label className="brief-field">
                  <span className="brief-label">{c.message}</span>
                  <textarea className={`form-input form-textarea ${errors.message ? "error" : ""}`} value={form.message} onChange={typed("message")}
                    rows={5} maxLength={MAX_MESSAGE} placeholder={c.messageHint} dir="auto" />
                  <span className="brief-meta">
                    {fieldError("message")}
                    <span className="brief-count">{form.message.length.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")} / {MAX_MESSAGE.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}</span>
                  </span>
                </label>

                <div className="brief-submit">
                  <button type="submit" className="btn-primary" disabled={status === "sending"}>
                    {status === "sending" && <span className="send-spinner" aria-hidden="true" />}
                    {status === "sending" ? c.sending : c.send}
                  </button>
                  {hasDraft && <span className="brief-draft">{c.draftSaved}</span>}
                </div>
              </form>
            )}
          </div>

          <div ref={infoRef} className={`contact-info ${infoVisible ? "visible" : ""}`} data-ao="right">
            <div className="next-steps">
              <h3 className="brief-label">{c.nextTitle}</h3>
              <ol>
                {c.next.map(([title, text]) => (
                  <li key={title}><strong>{title}</strong><span>{text}</span></li>
                ))}
              </ol>
            </div>

            {(settings.bookingUrl || settings.availableForWork === false) && (
              <div className="connect-card booking-card">
                <p className={`hero-status ${settings.availableForWork === false ? "is-busy" : "is-available"}`}><span aria-hidden="true" />
                  {(lang === "ar" ? settings.availabilityAr || settings.availabilityEn : settings.availabilityEn || settings.availabilityAr) || (settings.availableForWork === false ? t.busy : t.available)}
                </p>
                {settings.bookingUrl && <a className="btn-secondary" href={settings.bookingUrl} target="_blank" rel="noopener noreferrer">{t.bookCall}</a>}
              </div>
            )}

            <div className="connect-card">
              <h3 className="brief-label">{c.connectTitle}</h3>
              <div className="contact-links">
                {settings.email && (
                  <a href={`mailto:${settings.email}`} className="contact-link">
                    <span className="contact-link-icon"><MailIcon size={14} /></span>
                    <span dir="ltr">{settings.email}</span>
                  </a>
                )}
                {settings.githubUrl && (
                  <a href={settings.githubUrl} target="_blank" rel="noopener noreferrer" className="contact-link">
                    <span className="contact-link-icon"><GithubIcon size={14} /></span>
                    <span dir="ltr">{linkLabel(settings.githubUrl)}</span>
                  </a>
                )}
                {settings.linkedinUrl && (
                  <a href={settings.linkedinUrl} target="_blank" rel="noopener noreferrer" className="contact-link">
                    <span className="contact-link-icon"><LinkedinIcon size={14} /></span>
                    <span dir="ltr">{linkLabel(settings.linkedinUrl)}</span>
                  </a>
                )}
                {settings.youtubeUrl && (
                  <a href={settings.youtubeUrl} target="_blank" rel="noopener noreferrer" className="contact-link">
                    <span className="contact-link-icon"><YoutubeIcon size={14} /></span>
                    <span dir="ltr">{youtubeHandle(settings.youtubeUrl)}</span>
                  </a>
                )}
                {location && (
                  <p className="contact-link contact-location">
                    <span className="contact-link-icon"><PinIcon size={14} /></span>
                    <span>{location}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
