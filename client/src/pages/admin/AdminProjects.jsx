import { useEffect, useState } from "react";
import { api } from "../../lib/api";

const EMPTY = {
  titleEn: "", titleAr: "", descEn: "", descAr: "", tags: "", category: "web",
  githubUrl: "", demoUrl: "", gradient: "linear-gradient(135deg,#1E3A5F,#2E5B9A)",
  catLabelEn: "", catLabelAr: "", order: 0,
};

export default function AdminProjects() {
  const [projects, setProjects] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const load = () => api.get("/admin/projects").then(setProjects);
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(EMPTY); setEditing("new"); };
  const openEdit = (p) => { setForm({ ...p, tags: p.tags.join(", ") }); setEditing(p.id); };

  const save = async (e) => {
    e.preventDefault();
    const payload = { ...form, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean), order: Number(form.order) };
    if (editing === "new") await api.post("/admin/projects", payload);
    else await api.put(`/admin/projects/${editing}`, payload);
    setEditing(null);
    load();
  };

  const remove = async (id) => {
    if (!confirm("Delete this project?")) return;
    await api.del(`/admin/projects/${id}`);
    load();
  };

  return (
    <div>
      <h1>Projects</h1>
      <div className="admin-toolbar">
        <button className="admin-btn admin-btn-primary" onClick={openNew}>+ New Project</button>
      </div>
      <table className="admin-table">
        <thead>
          <tr><th>Title</th><th>Category</th><th>Order</th><th></th></tr>
        </thead>
        <tbody>
          {projects.length === 0 && <tr><td colSpan={4} className="admin-empty">No projects yet.</td></tr>}
          {projects.map((p) => (
            <tr key={p.id}>
              <td>{p.titleEn}</td>
              <td>{p.category}</td>
              <td>{p.order}</td>
              <td className="actions">
                <button className="admin-btn" onClick={() => openEdit(p)}>Edit</button>
                <button className="admin-btn admin-btn-danger" onClick={() => remove(p.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing !== null && (
        <div className="admin-modal-overlay" onClick={() => setEditing(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing === "new" ? "New Project" : "Edit Project"}</h2>
            <form className="admin-form" onSubmit={save}>
              <div className="admin-form-row">
                <label>Title (EN)
                  <input className="form-input" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} required />
                </label>
                <label>Title (AR)
                  <input className="form-input" value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} required />
                </label>
              </div>
              <label>Description (EN)
                <textarea className="form-input form-textarea" rows={3} value={form.descEn} onChange={(e) => setForm({ ...form, descEn: e.target.value })} required />
              </label>
              <label>Description (AR)
                <textarea className="form-input form-textarea" rows={3} value={form.descAr} onChange={(e) => setForm({ ...form, descAr: e.target.value })} required />
              </label>
              <label>Tags (comma separated)
                <input className="form-input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
              </label>
              <div className="admin-form-row">
                <label>Category
                  <select className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="web">web</option>
                    <option value="youtube">youtube</option>
                    <option value="automation">automation</option>
                  </select>
                </label>
                <label>Order
                  <input className="form-input" type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} />
                </label>
              </div>
              <div className="admin-form-row">
                <label>Category Label (EN)
                  <input className="form-input" value={form.catLabelEn} onChange={(e) => setForm({ ...form, catLabelEn: e.target.value })} required />
                </label>
                <label>Category Label (AR)
                  <input className="form-input" value={form.catLabelAr} onChange={(e) => setForm({ ...form, catLabelAr: e.target.value })} required />
                </label>
              </div>
              <div className="admin-form-row">
                <label>GitHub URL
                  <input className="form-input" value={form.githubUrl} onChange={(e) => setForm({ ...form, githubUrl: e.target.value })} />
                </label>
                <label>Demo URL
                  <input className="form-input" value={form.demoUrl} onChange={(e) => setForm({ ...form, demoUrl: e.target.value })} />
                </label>
              </div>
              <label>Gradient (CSS)
                <input className="form-input" value={form.gradient} onChange={(e) => setForm({ ...form, gradient: e.target.value })} />
              </label>
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
