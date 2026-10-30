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
import { useAdminT } from "../../lib/adminI18n";

const EMPTY = { slug: "", titleEn: "", titleAr: "", descEn: "", descAr: "", open: true, fields: [] };
const MAX_FIELDS = 30; // keep in sync with the Form model on the server
const blankField = () => ({ key: newFieldKey(), type: "text", labelEn: "", labelAr: "", required: false, options: [] });

export default function AdminFormEditor() {
  const { t } = useAdminT();
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

  if (!form) return <p>{error || t("Loading…")}</p>;

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
      <p><Link to="/admin/forms">{t("← All forms")}</Link></p>
      <h1>{isNew ? t("New Form") : t("Edit Form")}</h1>
      <form className="admin-form" onSubmit={save}>
        <div className="admin-form-row">
          <Field label={t("Title (EN)")} value={form.titleEn} onChange={set("titleEn")} maxLength={200} placeholder={t("e.g. Project request")} />
          <Field label={t("Title (AR)")} value={form.titleAr} onChange={set("titleAr")} maxLength={200} rtl />
        </div>
        <div className="admin-form-row">
          <Field label={t("Description (EN, optional)")} value={form.descEn} onChange={set("descEn")} maxLength={1000} multiline />
          <Field label={t("Description (AR, optional)")} value={form.descAr} onChange={set("descAr")} maxLength={1000} multiline rtl />
        </div>
        <div className="admin-form-row">
          <Field label={t("Link name")} value={form.slug} onChange={(v) => { setSlugTouched(true); set("slug")(v.toLowerCase()); }} maxLength={80} placeholder="project-request" />
          <label className="admin-check" style={{ alignSelf: "end", paddingBottom: 12 }}>
            <input type="checkbox" checked={form.open} onChange={(e) => set("open")(e.target.checked)} /> {t("Open — people can send answers")}
          </label>
        </div>
        <p style={{ opacity: 0.7, fontSize: 13, margin: 0 }}>
          {t("Fill at least one title. A title in a language = a link in that language. Link name: a-z, 0-9 and dashes only.")}
        </p>

        <h2 style={{ marginTop: 18 }}>{t("Fields")}</h2>
        {form.fields.length === 0 && <p className="admin-empty">{t("No fields yet — add at least one.")}</p>}
        {form.fields.map((field, index) => (
          <div className="admin-field-card" key={field.key}>
            <div className="admin-form-row admin-field-row">
              <label>{t("Type")}
                <select className="form-input" value={field.type} onChange={(e) => updateField(index, { type: e.target.value })}>
                  {FIELD_TYPES.map((ft) => <option key={ft.value} value={ft.value}>{t(ft.label)}</option>)}
                </select>
              </label>
              <Field label={t("Label (EN)")} value={field.labelEn} onChange={(v) => updateField(index, { labelEn: v })} maxLength={200} />
              <Field label={t("Label (AR)")} value={field.labelAr} onChange={(v) => updateField(index, { labelAr: v })} maxLength={200} rtl />
            </div>
            {field.type === "select" && (
              <label>{t("Choices — one per line")}
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
              <label className="admin-check"><input type="checkbox" checked={field.required} onChange={(e) => updateField(index, { required: e.target.checked })} /> {t("Required")}</label>
              <div className="actions">
                <button type="button" className="admin-btn" onClick={() => moveField(index, -1)} disabled={index === 0} aria-label={t("Move up")}>↑</button>
                <button type="button" className="admin-btn" onClick={() => moveField(index, 1)} disabled={index === form.fields.length - 1} aria-label={t("Move down")}>↓</button>
                <button type="button" className="admin-btn admin-btn-danger" onClick={() => removeField(index)}>{t("Remove")}</button>
              </div>
            </div>
          </div>
        ))}
        {form.fields.length < MAX_FIELDS && (
          <div><button type="button" className="admin-btn" onClick={() => setFields([...form.fields, blankField()])}>{t("+ Add field")}</button></div>
        )}

        {error && <p className="admin-error">{error}</p>}
        <div className="admin-form-actions">
          {saved && <span style={{ alignSelf: "center", opacity: 0.8 }}>{t("Saved ✓")}</span>}
          <button type="submit" className="admin-btn admin-btn-primary">{t("Save")}</button>
        </div>
      </form>
    </div>
  );
}
