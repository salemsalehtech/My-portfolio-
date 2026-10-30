// AdminAbout.jsx — admin page that controls the whole public "About" section (components/
// About.jsx): headings, the two bio paragraphs, the info rows (education / location / …),
// the stat cards and the interests list — each in English and Arabic.
//
// The page loads the saved content (or the built-in defaults if nothing was saved yet),
// keeps the whole thing in one `form` object, and sends it with a single PUT /admin/about.
// The CV file is managed separately in AdminCV.jsx.
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { aboutDefaults } from "../../lib/aboutDefaults";
import { Field, ListEditor } from "./FormParts";
import { youtubeId, youtubeEmbedUrl } from "../../lib/youtube";
import { useAdminT } from "../../lib/adminI18n";

const ICONS = [
  { value: "education", label: "Education" },
  { value: "location", label: "Location" },
  { value: "language", label: "Language" },
  { value: "other", label: "Other" },
];

export default function AdminAbout() {
  const { t } = useAdminT();
  // ---- STATE ----
  const [form, setForm] = useState(null); // null while loading
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const set = (key) => (value) => { setForm({ ...form, [key]: value }); setSaved(false); };

  // ---- DATA LOADING ---- saved content if it exists, otherwise the built-in defaults.
  useEffect(() => {
    api.get("/admin/about")
      .then((data) => setForm(data.exists ? data : aboutDefaults()))
      .catch((err) => { setError(err.message); setForm(aboutDefaults()); });
  }, []);

  // ---- ACTIONS ----
  const save = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const data = await api.put("/admin/about", form);
      setForm(data);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const reset = async () => {
    if (!confirm(t("Discard your changes and go back to the original About content?"))) return;
    await api.del("/admin/about");
    setForm(aboutDefaults());
    setSaved(false);
  };

  if (!form) return <p>{t("Loading…")}</p>;

  // ---- RENDER ----
  return (
    <div>
      <h1>{t("About")}</h1>
      <form className="admin-form" onSubmit={save}>
        <h2>{t("Heading")}</h2>
        <div className="admin-form-row">
          <Field label={t("Small badge (EN)")} value={form.badgeEn} onChange={set("badgeEn")} />
          <Field label={t("Small badge (AR)")} value={form.badgeAr} onChange={set("badgeAr")} rtl />
        </div>
        <div className="admin-form-row">
          <Field label={t("Title (EN)")} value={form.titleEn} onChange={set("titleEn")} />
          <Field label={t("Title (AR)")} value={form.titleAr} onChange={set("titleAr")} rtl />
        </div>

        <h2>{t("Bio")}</h2>
        <div className="admin-form-row">
          <Field label={t("Paragraph 1 (EN)")} value={form.p1En} onChange={set("p1En")} multiline />
          <Field label={t("Paragraph 1 (AR)")} value={form.p1Ar} onChange={set("p1Ar")} multiline rtl />
        </div>
        <div className="admin-form-row">
          <Field label={t("Paragraph 2 (EN)")} value={form.p2En} onChange={set("p2En")} multiline />
          <Field label={t("Paragraph 2 (AR)")} value={form.p2Ar} onChange={set("p2Ar")} multiline rtl />
        </div>

        <ListEditor
          title={t("Info rows")}
          items={form.infoItems}
          onChange={set("infoItems")}
          blank={{ icon: "other", textEn: "", textAr: "" }}
          renderRow={(item, update) => (
            <>
              <label>{t("Icon")}
                <select className="form-input" value={item.icon} onChange={(e) => update({ icon: e.target.value })}>
                  {ICONS.map((o) => <option key={o.value} value={o.value}>{t(o.label)}</option>)}
                </select>
              </label>
              <Field label={t("Text (EN)")} value={item.textEn} onChange={(v) => update({ textEn: v })} />
              <Field label={t("Text (AR)")} value={item.textAr} onChange={(v) => update({ textAr: v })} rtl />
            </>
          )}
        />

        <ListEditor
          title={t("Stat cards")}
          items={form.stats}
          onChange={set("stats")}
          blank={{ number: "", labelEn: "", labelAr: "" }}
          renderRow={(item, update) => (
            <>
              <Field label={t("Number (e.g. 10+)")} value={item.number} onChange={(v) => update({ number: v })} />
              <Field label={t("Label (EN)")} value={item.labelEn} onChange={(v) => update({ labelEn: v })} />
              <Field label={t("Label (AR)")} value={item.labelAr} onChange={(v) => update({ labelAr: v })} rtl />
            </>
          )}
        />

        <h2>{t("Interests")}</h2>
        <div className="admin-form-row">
          <Field label={t("Card title (EN)")} value={form.interestsTitleEn} onChange={set("interestsTitleEn")} />
          <Field label={t("Card title (AR)")} value={form.interestsTitleAr} onChange={set("interestsTitleAr")} rtl />
        </div>
        <ListEditor
          title={t("Interest tags")}
          items={form.interests}
          onChange={set("interests")}
          blank={{ en: "", ar: "" }}
          renderRow={(item, update) => (
            <>
              <Field label={t("Tag (EN)")} value={item.en} onChange={(v) => update({ en: v })} />
              <Field label={t("Tag (AR)")} value={item.ar} onChange={(v) => update({ ar: v })} rtl />
            </>
          )}
        />

        <h2>{t("“About me” video (optional)")}</h2>
        <Field
          label={t("YouTube link — shown under the About section; leave empty for no video")}
          type="url"
          placeholder="https://www.youtube.com/watch?v=…  or  https://youtu.be/…"
          value={form.videoUrl || ""}
          onChange={set("videoUrl")}
        />
        {form.videoUrl && !youtubeId(form.videoUrl) && (
          <p className="admin-error">{t("This doesn’t look like a YouTube video link — the server will refuse it.")}</p>
        )}
        {youtubeId(form.videoUrl) && (
          <div className="about-video admin-video-preview">
            <iframe src={youtubeEmbedUrl(youtubeId(form.videoUrl))} title={t("Video preview")} loading="lazy" allowFullScreen></iframe>
          </div>
        )}

        {error && <p className="admin-error">{error}</p>}
        <div className="admin-form-actions">
          <button type="button" className="admin-btn" onClick={reset}>{t("Reset to original")}</button>
          <button type="submit" className="admin-btn admin-btn-primary">{t("Save")}</button>
          {saved && <span>{t("Saved ✓")}</span>}
        </div>
      </form>
    </div>
  );
}
