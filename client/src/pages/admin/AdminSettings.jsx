// AdminSettings.jsx — the "Profile & Links" admin page (/admin/settings). Controls the content
// that isn't tied to one list: the Hero (greeting, name, rotating titles, tagline, USP line),
// the contact links (email, GitHub, LinkedIn, YouTube), the location, the footer role and the
// YouTube channel description — each text in English and Arabic.
//
// Same approach as AdminAbout.jsx: load the saved document (or the built-in defaults), edit it
// in one `form` object, save everything with one PUT /admin/settings. Leaving a link empty
// hides it on the site. The server rejects links that don't start with http:// or https://.
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { siteDefaults } from "../../lib/siteDefaults";
import { Field, ListEditor } from "./FormParts";

export default function AdminSettings() {
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
    if (!confirm("Discard your changes and go back to the original texts and links?")) return;
    await api.del("/admin/settings");
    setForm(siteDefaults());
    setSaved(false);
  };

  if (!form) return <p>Loading…</p>;

  // ---- RENDER ----
  return (
    <div>
      <h1>Profile &amp; Links</h1>
      <form className="admin-form" onSubmit={save}>
        <h2>Hero (top of the page)</h2>
        <div className="admin-form-row">
          <Field label="Greeting (EN)" value={form.greetingEn} onChange={set("greetingEn")} />
          <Field label="Greeting (AR)" value={form.greetingAr} onChange={set("greetingAr")} rtl />
        </div>
        <div className="admin-form-row">
          <Field label="Name (EN)" value={form.nameEn} onChange={set("nameEn")} />
          <Field label="Name (AR)" value={form.nameAr} onChange={set("nameAr")} rtl />
        </div>
        <div className="admin-form-row">
          <Field label="Tagline (EN)" value={form.taglineEn} onChange={set("taglineEn")} multiline />
          <Field label="Tagline (AR)" value={form.taglineAr} onChange={set("taglineAr")} multiline rtl />
        </div>
        <p style={{ opacity: 0.7, fontSize: 13 }}>
          USP — one short line that says what makes you different (e.g. “I build fast, bilingual web apps and teach what I build.”). Leave empty to hide it.
        </p>
        <div className="admin-form-row">
          <Field label="USP line (EN)" value={form.uspEn} onChange={set("uspEn")} maxLength={300} />
          <Field label="USP line (AR)" value={form.uspAr} onChange={set("uspAr")} maxLength={300} rtl />
        </div>

        <ListEditor
          title="Rotating titles (shown one after another under your name)"
          items={form.titles}
          onChange={set("titles")}
          blank={{ en: "", ar: "" }}
          max={6}
          emptyText="No titles — the rotating line is hidden."
          renderRow={(item, update) => (
            <>
              <Field label="Title (EN)" value={item.en} onChange={(v) => update({ en: v })} maxLength={80} />
              <Field label="Title (AR)" value={item.ar} onChange={(v) => update({ ar: v })} maxLength={80} rtl />
            </>
          )}
        />

        <h2>Links (empty = hidden)</h2>
        <div className="admin-form-row">
          <Field label="Email" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" />
          <Field label="GitHub URL" type="url" value={form.githubUrl} onChange={set("githubUrl")} placeholder="https://github.com/…" />
        </div>
        <div className="admin-form-row">
          <Field label="LinkedIn URL" type="url" value={form.linkedinUrl} onChange={set("linkedinUrl")} placeholder="https://www.linkedin.com/in/…" />
          <Field label="YouTube channel URL" type="url" value={form.youtubeUrl} onChange={set("youtubeUrl")} placeholder="https://www.youtube.com/@…" />
        </div>

        <h2>Other texts</h2>
        <div className="admin-form-row">
          <Field label="Location (EN)" value={form.locationEn} onChange={set("locationEn")} />
          <Field label="Location (AR)" value={form.locationAr} onChange={set("locationAr")} rtl />
        </div>
        <div className="admin-form-row">
          <Field label="Role in the footer (EN)" value={form.roleEn} onChange={set("roleEn")} />
          <Field label="Role in the footer (AR)" value={form.roleAr} onChange={set("roleAr")} rtl />
        </div>
        <div className="admin-form-row">
          <Field label="YouTube channel description (EN)" value={form.channelDescEn} onChange={set("channelDescEn")} multiline />
          <Field label="YouTube channel description (AR)" value={form.channelDescAr} onChange={set("channelDescAr")} multiline rtl />
        </div>

        {error && <p className="admin-error">{error}</p>}
        <div className="admin-form-actions">
          <button type="button" className="admin-btn" onClick={reset}>Reset to original</button>
          <button type="submit" className="admin-btn admin-btn-primary">Save</button>
          {saved && <span>Saved ✓</span>}
        </div>
      </form>
    </div>
  );
}
