// AdminForms.jsx — the Form Builder's list page (/admin/forms). Every custom form, with:
//   - its public link (English / Arabic) to copy and send to people,
//   - Open / Closed: a closed form keeps its answers but its link says "this form is closed",
//   - the number of answers, with a button to see them as a sheet (and download Excel),
//   - Edit (AdminFormEditor.jsx) and Delete (which also deletes the form's answers).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { formLink } from "../../lib/forms";

export default function AdminForms() {
  const [forms, setForms] = useState([]);
  const [copied, setCopied] = useState(""); // "<form id>-<lang>" of the link just copied

  const load = () => api.get("/admin/forms").then(setForms);
  useEffect(() => { load(); }, []);

  const toggleOpen = async (form) => {
    await api.put(`/admin/forms/${form.id}`, { open: !form.open });
    load();
  };

  const remove = async (form) => {
    const answers = form.responseCount ? ` and its ${form.responseCount} answer(s)` : "";
    if (!confirm(`Delete this form${answers}? This cannot be undone.`)) return;
    await api.del(`/admin/forms/${form.id}`);
    load();
  };

  const copy = async (form, lang) => {
    const link = formLink(form.slug, lang);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(`${form.id}-${lang}`);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      window.prompt("Copy this link:", link); // clipboard blocked: let the owner copy by hand
    }
  };

  // Only offer a link for the languages the form has a title in.
  const langsOf = (form) => [form.titleEn && "en", form.titleAr && "ar"].filter(Boolean);

  return (
    <div>
      <h1>Forms</h1>
      <p style={{ opacity: 0.75, marginBottom: 16 }}>
        Build a form, send its link to people, and read the answers here as a sheet — or download them as an Excel file.
      </p>
      <div className="admin-toolbar">
        <Link className="admin-btn admin-btn-primary" to="/admin/forms/new">+ New Form</Link>
      </div>

      {forms.length === 0 && <p className="admin-empty">No forms yet.</p>}
      {forms.map((form) => (
        <div className="admin-linkbox" key={form.id}>
          <div className="admin-form-head">
            <div>
              <strong>{form.titleEn || form.titleAr}</strong>
              <span className={`admin-status ${form.open ? "is-open" : ""}`}>{form.open ? "Open" : "Closed"}</span>
              <div style={{ opacity: 0.7, fontSize: 13, marginTop: 4 }}>
                {form.fields.length} field(s) · {form.responseCount} answer(s)
              </div>
            </div>
            <div className="actions">
              <Link className="admin-btn admin-btn-primary" to={`/admin/forms/${form.id}/responses`}>Answers ({form.responseCount})</Link>
              <button className="admin-btn" onClick={() => toggleOpen(form)}>{form.open ? "Close form" : "Open form"}</button>
              <Link className="admin-btn" to={`/admin/forms/${form.id}`}>Edit</Link>
              <button className="admin-btn admin-btn-danger" onClick={() => remove(form)}>Delete</button>
            </div>
          </div>
          {langsOf(form).map((lang) => (
            <div className="admin-linkrow" key={lang}>
              <span>{lang === "ar" ? "Arabic link" : "English link"}</span>
              <input className="form-input" readOnly value={formLink(form.slug, lang)} onFocus={(e) => e.target.select()} />
              <button className="admin-btn" onClick={() => copy(form, lang)}>{copied === `${form.id}-${lang}` ? "Copied ✓" : "Copy"}</button>
              <a className="admin-btn" href={formLink(form.slug, lang)} target="_blank" rel="noreferrer">Open</a>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
