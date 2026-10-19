// AdminTestimonials.jsx — admin CRUD page for client testimonials (shown at /admin/testimonials).
// Same table + modal-form structure as AdminSkills.jsx / AdminProjects.jsx — see the comment
// at the top of AdminProjects.jsx for the general pattern (editing state, load-after-mutate).
//
// Fields map 1:1 to the Testimonial model in server/src/lib/mongo.js. `visible` controls whether
// the testimonial appears on the public site; hidden ones stay saved here. `order` sorts the
// cards (lowest first).
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

const EMPTY = {
  authorName: "", roleEn: "", roleAr: "", textEn: "", textAr: "",
  rating: 5, visible: true, order: 0,
};

export default function AdminTestimonials() {
  // ---- STATE ----
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null); // null | "new" | <testimonial id>
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");

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

  const toggleVisible = async (item) => {
    await api.put(`/admin/testimonials/${item.id}`, { visible: !item.visible });
    load();
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
            <tr key={item.id}>
              <td>{item.authorName}</td>
              <td>{item.textEn.length > 90 ? item.textEn.slice(0, 90) + "…" : item.textEn}</td>
              <td>{"★".repeat(item.rating)}</td>
              <td>{item.order}</td>
              <td>{item.visible ? "Visible" : "Hidden"}</td>
              <td className="actions">
                <button className="admin-btn" onClick={() => toggleVisible(item)}>{item.visible ? "Hide" : "Show"}</button>
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
              <label>Testimonial (EN)
                <textarea className="form-input" rows={4} value={form.textEn} onChange={(e) => setForm({ ...form, textEn: e.target.value })} required />
              </label>
              <label>Testimonial (AR) — optional, English is shown if empty
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
