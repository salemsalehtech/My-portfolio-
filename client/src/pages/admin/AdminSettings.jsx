// AdminSettings.jsx — the "Profile & Links" admin page (/admin/settings). Controls the content
// that isn't tied to one list: the Hero (greeting, name, rotating titles, tagline, USP line),
// the contact links (email, GitHub, LinkedIn, YouTube), the location, the footer role and the
// YouTube channel description — each text in English and Arabic.
//
// Same approach as AdminAbout.jsx: load the saved document (or the built-in defaults), edit it
// in one `form` object, save everything with one PUT /admin/settings. Leaving a link empty
// hides it on the site. The server rejects links that don't start with http:// or https://.
import { useEffect, useRef, useState } from "react";
import { api, API_BASE } from "../../lib/api";
import { readAsBase64 } from "../../lib/readAsBase64";
import { T } from "../../i18n/translations";
import { siteDefaults } from "../../lib/siteDefaults";
import { Field, ListEditor } from "./FormParts";
import { useAdminT } from "../../lib/adminI18n";

export default function AdminSettings() {
  const { t } = useAdminT();
  // ---- STATE ----
  const [form, setForm] = useState(null); // null while loading
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const set = (key) => (value) => { setForm({ ...form, [key]: value }); setSaved(false); };

  // ---- DATA LOADING ---- saved settings if they exist, otherwise the built-in defaults.
  useEffect(() => {
    api.get("/admin/settings")
      .then((data) => setForm(data.exists ? { ...siteDefaults(), ...data } : siteDefaults()))
      .catch((err) => { setError(err.message); setForm(siteDefaults()); });
  }, []);

  // ---- ACTIONS ----
  const save = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const data = await api.put("/admin/settings", form);
      setForm({ ...siteDefaults(), ...data });
      setSaved(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const reset = async () => {
    if (!confirm(t("Discard your changes and go back to the original texts and links?"))) return;
    await api.del("/admin/settings");
    setForm(siteDefaults());
    setSaved(false);
  };

  if (!form) return <p>{t("Loading…")}</p>;

  // ---- RENDER ----
  return (
    <div>
      <h1>{t("Profile & Links")}</h1>
      <form className="admin-form" onSubmit={save}>
        <h2>{t("Hero (top of the page)")}</h2>
        <div className="admin-form-row">
          <Field label={t("Greeting (EN)")} value={form.greetingEn} onChange={set("greetingEn")} />
          <Field label={t("Greeting (AR)")} value={form.greetingAr} onChange={set("greetingAr")} rtl />
        </div>
        <div className="admin-form-row">
          <Field label={t("Name (EN)")} value={form.nameEn} onChange={set("nameEn")} />
          <Field label={t("Name (AR)")} value={form.nameAr} onChange={set("nameAr")} rtl />
        </div>
        <div className="admin-form-row">
          <Field label={t("Tagline (EN)")} value={form.taglineEn} onChange={set("taglineEn")} multiline />
          <Field label={t("Tagline (AR)")} value={form.taglineAr} onChange={set("taglineAr")} multiline rtl />
        </div>
        <p style={{ opacity: 0.7, fontSize: 13 }}>
          {t("USP — one short line that says what makes you different (e.g. “I build fast, bilingual web apps and teach what I build.”). Leave empty to hide it.")}
        </p>
        <div className="admin-form-row">
          <Field label={t("USP line (EN)")} value={form.uspEn} onChange={set("uspEn")} maxLength={300} />
          <Field label={t("USP line (AR)")} value={form.uspAr} onChange={set("uspAr")} maxLength={300} rtl />
        </div>

        <ListEditor
          title={t("Rotating titles (shown one after another under your name)")}
          items={form.titles}
          onChange={set("titles")}
          blank={{ en: "", ar: "" }}
          max={6}
          emptyText={t("No titles — the rotating line is hidden.")}
          renderRow={(item, update) => (
            <>
              <Field label={t("Title (EN)")} value={item.en} onChange={(v) => update({ en: v })} maxLength={80} />
              <Field label={t("Title (AR)")} value={item.ar} onChange={(v) => update({ ar: v })} maxLength={80} rtl />
            </>
          )}
        />

        <h2>{t("Photo and availability")}</h2>
        <PhotoUpload settings={form} onChange={(data) => setForm({ ...form, hasPhoto: data.hasPhoto, updatedAt: data.updatedAt })} />
        <label className="admin-check">
          <input type="checkbox" checked={form.availableForWork !== false} onChange={(e) => set("availableForWork")(e.target.checked)} />
          {t("Taking new projects (shows a green dot; off = “Fully booked”)")}
        </label>
        <div className="admin-form-row">
          <Field label={t("Availability text (EN, optional)")} value={form.availabilityEn} onChange={set("availabilityEn")} maxLength={160} placeholder={T.en.available} />
          <Field label={t("Availability text (AR, optional)")} value={form.availabilityAr} onChange={set("availabilityAr")} maxLength={160} rtl placeholder={T.ar.available} />
        </div>
        <Field label={t("Booking link (Calendly, WhatsApp, a form…) — shows “Book a call”")} type="url" value={form.bookingUrl} onChange={set("bookingUrl")} placeholder="https://calendly.com/…" />

        <ListEditor
          title={t("How a project goes (steps, in order — empty = the 4 built-in steps)")}
          items={form.process || []}
          onChange={set("process")}
          blank={{ titleEn: "", titleAr: "", textEn: "", textAr: "" }}
          max={6}
          emptyText={t("Using the built-in steps: We talk · A clear offer · I build, you watch · Launch and support.")}
          renderRow={(item, update) => (
            <>
              <Field label={t("Step (EN)")} value={item.titleEn} onChange={(v) => update({ titleEn: v })} maxLength={160} />
              <Field label={t("Step (AR)")} value={item.titleAr} onChange={(v) => update({ titleAr: v })} maxLength={160} rtl />
              <Field label={t("Details (EN)")} value={item.textEn} onChange={(v) => update({ textEn: v })} maxLength={300} />
              <Field label={t("Details (AR)")} value={item.textAr} onChange={(v) => update({ textAr: v })} maxLength={300} rtl />
            </>
          )}
        />

        <h2>{t("Links (empty = hidden)")}</h2>
        <div className="admin-form-row">
          <Field label={t("Email")} type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" />
          <Field label={t("GitHub URL")} type="url" value={form.githubUrl} onChange={set("githubUrl")} placeholder="https://github.com/…" />
        </div>
        <div className="admin-form-row">
          <Field label={t("LinkedIn URL")} type="url" value={form.linkedinUrl} onChange={set("linkedinUrl")} placeholder="https://www.linkedin.com/in/…" />
          <Field label={t("YouTube channel URL")} type="url" value={form.youtubeUrl} onChange={set("youtubeUrl")} placeholder="https://www.youtube.com/@…" />
        </div>
        <Field label={t("WhatsApp number — shows the floating chat button and the WhatsApp button in the “Have a project?” band")} type="tel" value={form.whatsapp || ""} onChange={set("whatsapp")} placeholder="01012345678" />

        <h2>{t("Other texts")}</h2>
        <div className="admin-form-row">
          <Field label={t("Location (EN)")} value={form.locationEn} onChange={set("locationEn")} />
          <Field label={t("Location (AR)")} value={form.locationAr} onChange={set("locationAr")} rtl />
        </div>
        <div className="admin-form-row">
          <Field label={t("Role in the footer (EN)")} value={form.roleEn} onChange={set("roleEn")} />
          <Field label={t("Role in the footer (AR)")} value={form.roleAr} onChange={set("roleAr")} rtl />
        </div>
        <div className="admin-form-row">
          <Field label={t("YouTube channel description (EN)")} value={form.channelDescEn} onChange={set("channelDescEn")} multiline />
          <Field label={t("YouTube channel description (AR)")} value={form.channelDescAr} onChange={set("channelDescAr")} multiline rtl />
        </div>

        {error && <p className="admin-error">{error}</p>}
        <div className="admin-form-actions">
          <button type="button" className="admin-btn" onClick={reset}>{t("Reset to original")}</button>
          <button type="submit" className="admin-btn admin-btn-primary">{t("Save")}</button>
          {saved && <span>{t("Saved")}</span>}
        </div>
      </form>
    </div>
  );
}

// The hero portrait: uploads at once (PNG, JPEG or WebP, max 2 MB). Without one, the built-in
// photo is shown.
function PhotoUpload({ settings, onChange }) {
  const { t } = useAdminT();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const upload = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return setError(t("The image is too large (max {mb} MB).", { mb: 2 }));
    setBusy(true);
    setError("");
    try { onChange(await api.put("/admin/settings/photo", { data: await readAsBase64(file) })); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const remove = async () => { onChange(await api.del("/admin/settings/photo")); };
  const src = settings.hasPhoto ? `${API_BASE}/settings/photo?v=${encodeURIComponent(settings.updatedAt || "")}` : `${import.meta.env.BASE_URL}uploads/portrait.webp`;
  return (
    <div className="pd-picture" style={{ marginBottom: 14 }}>
      <img src={src} alt="" style={{ width: 96, height: 120, objectFit: "cover", borderRadius: 8 }} />
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} hidden />
      <button type="button" className="admin-btn" onClick={() => input.current.click()} disabled={busy}>{busy ? t("Uploading…") : t("Upload your photo")}</button>
      {settings.hasPhoto && <button type="button" className="admin-btn admin-btn-danger" onClick={remove}>{t("Use the built-in photo")}</button>}
      <span className="admin-sub">{t("A portrait (4:5) works best — e.g. 800 × 1000 px.")}</span>
      {error && <span className="admin-error">{error}</span>}
    </div>
  );
}
