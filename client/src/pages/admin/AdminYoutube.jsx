import { useEffect, useState } from "react";
import { api } from "../../lib/api";

const EMPTY = {
  titleEn: "", titleAr: "", subEn: "", subAr: "",
  gradient: "linear-gradient(135deg,#7A0000,#CC0000)", url: "", order: 0,
};

export default function AdminYoutube() {
  const [videos, setVideos] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const load = () => api.get("/admin/youtube").then(setVideos);
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(EMPTY); setEditing("new"); };
  const openEdit = (v) => { setForm(v); setEditing(v.id); };

  const save = async (e) => {
    e.preventDefault();
    const payload = { ...form, order: Number(form.order) };
    if (editing === "new") await api.post("/admin/youtube", payload);
    else await api.put(`/admin/youtube/${editing}`, payload);
    setEditing(null);
    load();
  };

  const remove = async (id) => {
    if (!confirm("Delete this video?")) return;
    await api.del(`/admin/youtube/${id}`);
    load();
  };

  return (
    <div>
      <h1>YouTube Videos</h1>
      <div className="admin-toolbar">
        <button className="admin-btn admin-btn-primary" onClick={openNew}>+ New Video</button>
      </div>
      <table className="admin-table">
        <thead>
          <tr><th>Title</th><th>Order</th><th></th></tr>
        </thead>
        <tbody>
          {videos.length === 0 && <tr><td colSpan={3} className="admin-empty">No videos yet.</td></tr>}
          {videos.map((v) => (
            <tr key={v.id}>
              <td>{v.titleEn}</td>
              <td>{v.order}</td>
              <td className="actions">
                <button className="admin-btn" onClick={() => openEdit(v)}>Edit</button>
                <button className="admin-btn admin-btn-danger" onClick={() => remove(v.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing !== null && (
        <div className="admin-modal-overlay" onClick={() => setEditing(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing === "new" ? "New Video" : "Edit Video"}</h2>
            <form className="admin-form" onSubmit={save}>
              <div className="admin-form-row">
                <label>Title (EN)
                  <input className="form-input" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} required />
                </label>
                <label>Title (AR)
                  <input className="form-input" value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} required />
                </label>
              </div>
              <div className="admin-form-row">
                <label>Subtitle (EN)
                  <input className="form-input" value={form.subEn} onChange={(e) => setForm({ ...form, subEn: e.target.value })} />
                </label>
                <label>Subtitle (AR)
                  <input className="form-input" value={form.subAr} onChange={(e) => setForm({ ...form, subAr: e.target.value })} />
                </label>
              </div>
              <label>Video URL
                <input className="form-input" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required />
              </label>
              <label>Gradient (CSS)
                <input className="form-input" value={form.gradient} onChange={(e) => setForm({ ...form, gradient: e.target.value })} />
              </label>
              <label>Order
                <input className="form-input" type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} />
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
