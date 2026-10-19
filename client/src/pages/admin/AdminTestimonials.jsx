// AdminTestimonials.jsx — admin CRUD page for client testimonials (shown at /admin/testimonials).
// Same table + modal-form structure as AdminSkills.jsx / AdminProjects.jsx — see the comment
// at the top of AdminProjects.jsx for the general pattern (editing state, load-after-mutate).
//
// Fields map 1:1 to the Testimonial model in server/src/lib/mongo.js. `visible` controls whether
// the testimonial appears on the public site; hidden ones stay saved here. `order` sorts the
// cards (lowest first).
//
// Clients can also write their own: the box at the top has the two feedback links (English /
// Arabic form) to send them. What they submit arrives here as "Pending" (hidden, listed first);
// "Approve" publishes it on the site.
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

// The public form links. HashRouter keeps the route after "#", so this works on the live site
// (…/My-portfolio-/#/feedback/ar) and locally (http://localhost:5173/#/feedback/ar) alike.
const feedbackLink = (lang) => `${window.location.origin}${window.location.pathname}#/feedback/${lang}`;
const LINKS = [
  { lang: "ar", label: "Arabic form (العربية)" },
  { lang: "en", label: "English form" },
];

const EMPTY = {
  authorName: "", roleEn: "", roleAr: "", textEn: "", textAr: "",
  rating: 5, visible: true, order: 0,
};

// Short preview of a testimonial for the table: its English text, or the Arabic one if that is
// the only language it was written in.
const preview = (item) => {
  const text = item.textEn || item.textAr;
  return text.length > 90 ? text.slice(0, 90) + "…" : text;
};

export default function AdminTestimonials() {
  // ---- STATE ----
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null); // null | "new" | <testimonial id>
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(""); // which link was just copied ("ar" | "en" | "")

  // ---- DATA LOADING ----
  const load = () => api.get("/admin/testimonials").then(setItems);
  useEffect(() => { load(); }, []);

  // ---- FORM HANDLERS ----
  const openNew = () => { setForm(EMPTY); setError(""); setEditing("new"); };
  const openEdit = (item) => { setForm(item); setError(""); setEditing(item.id); };

  const save = async (e) => {
    e.preventDefault();
    setError("");
    const payload = { ...form, rating: Number(form.rating), order: Number(form.order) };
    try {
      if (editing === "new") await api.post("/admin/testimonials", payload);
      else await api.put(`/admin/testimonials/${editing}`, payload);
      setEditing(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  // Show/Hide and Approve are the same update: publishing also ends the "pending" state.
  const toggleVisible = async (item) => {
    await api.put(`/admin/testimonials/${item.id}`, { visible: !item.visible, pending: false });
    load();
  };

  const copyLink = async (lang) => {
    try {
      await navigator.clipboard.writeText(feedbackLink(lang));
      setCopied(lang);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      window.prompt("Copy this link:", feedbackLink(lang)); // clipboard blocked: let the owner copy by hand
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this testimonial?")) return;
    await api.del(`/admin/testimonials/${id}`);
    load();
  };

  // ---- RENDER: table of existing testimonials ----
  return (
    <div>
      <h1>Testimonials</h1>

      <div className="admin-linkbox">
        <p><strong>Ask a client for a testimonial:</strong> send them one of these links (they write in the language of the form). What they send shows up below as <em>Pending</em> until you approve it.</p>
        {LINKS.map(({ lang, label }) => (
          <div className="admin-linkrow" key={lang}>
            <span>{label}</span>
            <input className="form-input" readOnly value={feedbackLink(lang)} onFocus={(e) => e.target.select()} />
            <button className="admin-btn" onClick={() => copyLink(lang)}>{copied === lang ? "Copied ✓" : "Copy"}</button>
            <a className="admin-btn" href={feedbackLink(lang)} target="_blank" rel="noreferrer">Open</a>
          </div>
        ))}
      </div>

      <div className="admin-toolbar">
        <button className="admin-btn admin-btn-primary" onClick={openNew}>+ New Testimonial</button>
      </div>
      <table className="admin-table">
        <thead>
          <tr><th>Author</th><th>Testimonial</th><th>Rating</th><th>Order</th><th>On site</th><th></th></tr>
        </thead>
        <tbody>
          {items.length === 0 && <tr><td colSpan={6} className="admin-empty">No testimonials yet — the section is hidden on the site until you add one.</td></tr>}
          {items.map((item) => (
            <tr key={item.id} className={item.pending ? "admin-row-unread" : ""}>
              <td>{item.authorName}</td>
              <td>{preview(item)}</td>
              <td>{"★".repeat(item.rating)}</td>
              <td>{item.order}</td>
              <td>{item.pending ? "Pending review" : item.visible ? "Visible" : "Hidden"}</td>
              <td className="actions">
                {item.pending
                  ? <button className="admin-btn admin-btn-primary" onClick={() => toggleVisible(item)}>Approve</button>
                  : <button className="admin-btn" onClick={() => toggleVisible(item)}>{item.visible ? "Hide" : "Show"}</button>}
                <button className="admin-btn" onClick={() => openEdit(item)}>Edit</button>
                <button className="admin-btn admin-btn-danger" onClick={() => remove(item.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ---- RENDER: create/edit modal form ---- */}
      {editing !== null && (
        <div className="admin-modal-overlay" onClick={() => setEditing(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing === "new" ? "New Testimonial" : "Edit Testimonial"}</h2>
            <form className="admin-form" onSubmit={save}>
              <label>Author name
                <input className="form-input" value={form.authorName} onChange={(e) => setForm({ ...form, authorName: e.target.value })} required />
              </label>
              <div className="admin-form-row">
                <label>Role / company (EN)
                  <input className="form-input" value={form.roleEn} onChange={(e) => setForm({ ...form, roleEn: e.target.value })} />
                </label>
                <label>Role / company (AR)
                  <input className="form-input" dir="rtl" value={form.roleAr} onChange={(e) => setForm({ ...form, roleAr: e.target.value })} />
                </label>
              </div>
              <label>Testimonial (EN) — fill at least one of the two languages
                <textarea className="form-input" rows={4} value={form.textEn} onChange={(e) => setForm({ ...form, textEn: e.target.value })} />
              </label>
              <label>Testimonial (AR) — the other language is shown if one is empty
                <textarea className="form-input" rows={4} dir="rtl" value={form.textAr} onChange={(e) => setForm({ ...form, textAr: e.target.value })} />
              </label>
              <div className="admin-form-row">
                <label>Rating
                  <select className="form-input" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>
                    {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)} ({n})</option>)}
                  </select>
                </label>
                <label>Order (lowest first)
                  <input className="form-input" type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} />
                </label>
              </div>
              <label>
                <input type="checkbox" checked={form.visible} onChange={(e) => setForm({ ...form, visible: e.target.checked })} /> Show on the site
              </label>
              {error && <p className="admin-error">{error}</p>}
              <div className="admin-form-actions">
                <button type="button" className="admin-btn" onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit" className="admin-btn admin-btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
