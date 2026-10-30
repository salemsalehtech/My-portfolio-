// AdminFormEditor.jsx — build or edit one form (/admin/forms/new and /admin/forms/:id).
//
// - Title and description in English and/or Arabic: the form gets a public link for each
//   language that has a title (shown on the Forms list).
// - The link name (slug) is built from the English title until you edit it yourself.
// - Fields: add as many as needed (up to 30), choose each one's type, label (EN / AR) and whether
//   it is required; "Choose from a list" fields take one choice per line. ↑ / ↓ change the order.
//   Each field keeps a hidden key forever (lib/forms.js → newFieldKey), so renaming a field
//   later keeps the answers already received.
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { FIELD_TYPES, newFieldKey } from "../../lib/forms";
import { slugify } from "../../lib/slug";
import { Field } from "./FormParts";

const EMPTY = { slug: "", titleEn: "", titleAr: "", descEn: "", descAr: "", open: true, fields: [] };
const MAX_FIELDS = 30; // keep in sync with the Form model on the server
const blankField = () => ({ key: newFieldKey(), type: "text", labelEn: "", labelAr: "", required: false, options: [] });

export default function AdminFormEditor() {
  const { id } = useParams(); // "new" or a form id
  const isNew = id === "new";
  const navigate = useNavigate();
  const [form, setForm] = useState(isNew ? { ...EMPTY, fields: [blankField()] } : null);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isNew) return;
    api.get(`/admin/forms/${id}`).then((f) => setForm({ ...EMPTY, ...f })).catch((err) => setError(err.message));
  }, [id, isNew]);

  if (!form) return <p>{error || "Loading…"}</p>;

  const set = (key) => (value) => {
    const next = { ...form, [key]: value };
    if (key === "titleEn" && !slugTouched) next.slug = slugify(value); // keep slug in step with the title
    setForm(next);
    setSaved(false);
  };

  // ---- fields list ----
  const setFields = (fields) => { setForm({ ...form, fields }); setSaved(false); };
  const updateField = (index, patch) => setFields(form.fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  const removeField = (index) => setFields(form.fields.filter((_, i) => i !== index));
  const moveField = (index, step) => {
    const target = index + step;
    if (target < 0 || target >= form.fields.length) return;
    const next = [...form.fields];
    [next[index], next[target]] = [next[target], next[index]];
    setFields(next);
  };

  const save = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const result = isNew ? await api.post("/admin/forms", form) : await api.put(`/admin/forms/${id}`, form);
      setSaved(true);
      setSlugTouched(true); // once saved, the link may already be shared — stop following the title
      if (isNew) navigate(`/admin/forms/${result.id}`, { replace: true });
      else setForm({ ...EMPTY, ...result });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <p><Link to="/admin/forms">← All forms</Link></p>
      <h1>{isNew ? "New Form" : "Edit Form"}</h1>
      <form className="admin-form" onSubmit={save}>
        <div className="admin-form-row">
          <Field label="Title (EN)" value={form.titleEn} onChange={set("titleEn")} maxLength={200} placeholder="e.g. Project request" />
          <Field label="Title (AR)" value={form.titleAr} onChange={set("titleAr")} maxLength={200} rtl />
        </div>
        <div className="admin-form-row">
          <Field label="Description (EN, optional)" value={form.descEn} onChange={set("descEn")} maxLength={1000} multiline />
          <Field label="Description (AR, optional)" value={form.descAr} onChange={set("descAr")} maxLength={1000} multiline rtl />
        </div>
        <div className="admin-form-row">
          <Field label="Link name" value={form.slug} onChange={(v) => { setSlugTouched(true); set("slug")(v.toLowerCase()); }} maxLength={80} placeholder="project-request" />
          <label className="admin-check" style={{ alignSelf: "end", paddingBottom: 12 }}>
            <input type="checkbox" checked={form.open} onChange={(e) => set("open")(e.target.checked)} /> Open — people can send answers
          </label>
        </div>
        <p style={{ opacity: 0.7, fontSize: 13, margin: 0 }}>
          Fill at least one title. A title in a language = a link in that language. Link name: a-z, 0-9 and dashes only.
        </p>

        <h2 style={{ marginTop: 18 }}>Fields</h2>
        {form.fields.length === 0 && <p className="admin-empty">No fields yet — add at least one.</p>}
        {form.fields.map((field, index) => (
          <div className="admin-field-card" key={field.key}>
            <div className="admin-form-row admin-field-row">
              <label>Type
                <select className="form-input" value={field.type} onChange={(e) => updateField(index, { type: e.target.value })}>
                  {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              <Field label="Label (EN)" value={field.labelEn} onChange={(v) => updateField(index, { labelEn: v })} maxLength={200} />
              <Field label="Label (AR)" value={field.labelAr} onChange={(v) => updateField(index, { labelAr: v })} maxLength={200} rtl />
            </div>
            {field.type === "select" && (
              <label>Choices — one per line
                <textarea
                  className="form-input"
                  rows={4}
                  value={field.options.join("\n")}
                  onChange={(e) => updateField(index, { options: e.target.value.split("\n") })}
                  placeholder={"Website\nMobile app\nOther"}
                />
              </label>
            )}
            <div className="admin-field-actions">
              <label className="admin-check"><input type="checkbox" checked={field.required} onChange={(e) => updateField(index, { required: e.target.checked })} /> Required</label>
              <div className="actions">
                <button type="button" className="admin-btn" onClick={() => moveField(index, -1)} disabled={index === 0} aria-label="Move up">↑</button>
                <button type="button" className="admin-btn" onClick={() => moveField(index, 1)} disabled={index === form.fields.length - 1} aria-label="Move down">↓</button>
                <button type="button" className="admin-btn admin-btn-danger" onClick={() => removeField(index)}>Remove</button>
              </div>
            </div>
          </div>
        ))}
        {form.fields.length < MAX_FIELDS && (
          <div><button type="button" className="admin-btn" onClick={() => setFields([...form.fields, blankField()])}>+ Add field</button></div>
        )}

        {error && <p className="admin-error">{error}</p>}
        <div className="admin-form-actions">
          {saved && <span style={{ alignSelf: "center", opacity: 0.8 }}>Saved ✓</span>}
          <button type="submit" className="admin-btn admin-btn-primary">Save</button>
        </div>
      </form>
    </div>
  );
}
