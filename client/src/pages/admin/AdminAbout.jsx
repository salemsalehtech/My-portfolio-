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

const ICONS = [
  { value: "education", label: "Education" },
  { value: "location", label: "Location" },
  { value: "language", label: "Language" },
  { value: "other", label: "Other" },
];

// A labelled text input / textarea. `rtl` makes Arabic fields type right-to-left.
function Field({ label, value, onChange, multiline, rtl }) {
  const props = { className: "form-input", value, dir: rtl ? "rtl" : "ltr", onChange: (e) => onChange(e.target.value) };
  return (
    <label>
      {label}
      {multiline ? <textarea rows={4} {...props} /> : <input {...props} />}
    </label>
  );
}

// Editable list with add / remove / move up / move down. `renderRow(item, update)` draws one row.
function ListEditor({ title, items, onChange, blank, renderRow }) {
  const update = (index, patch) => onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const remove = (index) => onChange(items.filter((_, i) => i !== index));
  const move = (index, step) => {
    const target = index + step;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div style={{ marginBottom: 28 }}>
      <h2>{title}</h2>
      {items.length === 0 && <p className="admin-empty">Nothing here — this block is hidden on the site.</p>}
      {items.map((item, index) => (
        <div key={index} className="admin-form-row" style={{ alignItems: "end", marginBottom: 10 }}>
          {renderRow(item, (patch) => update(index, patch))}
          <div className="actions">
            <button type="button" className="admin-btn" onClick={() => move(index, -1)} disabled={index === 0}>↑</button>
            <button type="button" className="admin-btn" onClick={() => move(index, 1)} disabled={index === items.length - 1}>↓</button>
            <button type="button" className="admin-btn admin-btn-danger" onClick={() => remove(index)}>✕</button>
          </div>
        </div>
      ))}
      <button type="button" className="admin-btn" onClick={() => onChange([...items, { ...blank }])}>+ Add</button>
    </div>
  );
}

export default function AdminAbout() {
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
    if (!confirm("Discard your changes and go back to the original About content?")) return;
    await api.del("/admin/about");
    setForm(aboutDefaults());
    setSaved(false);
  };

  if (!form) return <p>Loading…</p>;

  // ---- RENDER ----
  return (
    <div>
      <h1>About</h1>
      <form className="admin-form" onSubmit={save}>
        <h2>Heading</h2>
        <div className="admin-form-row">
          <Field label="Small badge (EN)" value={form.badgeEn} onChange={set("badgeEn")} />
          <Field label="Small badge (AR)" value={form.badgeAr} onChange={set("badgeAr")} rtl />
        </div>
        <div className="admin-form-row">
          <Field label="Title (EN)" value={form.titleEn} onChange={set("titleEn")} />
          <Field label="Title (AR)" value={form.titleAr} onChange={set("titleAr")} rtl />
        </div>

        <h2>Bio</h2>
        <div className="admin-form-row">
          <Field label="Paragraph 1 (EN)" value={form.p1En} onChange={set("p1En")} multiline />
          <Field label="Paragraph 1 (AR)" value={form.p1Ar} onChange={set("p1Ar")} multiline rtl />
        </div>
        <div className="admin-form-row">
          <Field label="Paragraph 2 (EN)" value={form.p2En} onChange={set("p2En")} multiline />
          <Field label="Paragraph 2 (AR)" value={form.p2Ar} onChange={set("p2Ar")} multiline rtl />
        </div>

        <ListEditor
          title="Info rows"
          items={form.infoItems}
          onChange={set("infoItems")}
          blank={{ icon: "other", textEn: "", textAr: "" }}
          renderRow={(item, update) => (
            <>
              <label>Icon
                <select className="form-input" value={item.icon} onChange={(e) => update({ icon: e.target.value })}>
                  {ICONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              <Field label="Text (EN)" value={item.textEn} onChange={(v) => update({ textEn: v })} />
              <Field label="Text (AR)" value={item.textAr} onChange={(v) => update({ textAr: v })} rtl />
            </>
          )}
        />

        <ListEditor
          title="Stat cards"
          items={form.stats}
          onChange={set("stats")}
          blank={{ number: "", labelEn: "", labelAr: "" }}
          renderRow={(item, update) => (
            <>
              <Field label="Number (e.g. 10+)" value={item.number} onChange={(v) => update({ number: v })} />
              <Field label="Label (EN)" value={item.labelEn} onChange={(v) => update({ labelEn: v })} />
              <Field label="Label (AR)" value={item.labelAr} onChange={(v) => update({ labelAr: v })} rtl />
            </>
          )}
        />

        <h2>Interests</h2>
        <div className="admin-form-row">
          <Field label="Card title (EN)" value={form.interestsTitleEn} onChange={set("interestsTitleEn")} />
          <Field label="Card title (AR)" value={form.interestsTitleAr} onChange={set("interestsTitleAr")} rtl />
        </div>
        <ListEditor
          title="Interest tags"
          items={form.interests}
          onChange={set("interests")}
          blank={{ en: "", ar: "" }}
          renderRow={(item, update) => (
            <>
              <Field label="Tag (EN)" value={item.en} onChange={(v) => update({ en: v })} />
              <Field label="Tag (AR)" value={item.ar} onChange={(v) => update({ ar: v })} rtl />
            </>
          )}
        />

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
