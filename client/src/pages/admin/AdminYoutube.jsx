// AdminYoutube.jsx — admin CRUD page for the YouTube video list (shown at /admin/youtube).
// Same table + modal-form structure as AdminProjects.jsx and AdminSkills.jsx — see the
// comment at the top of AdminProjects.jsx for the general pattern. Fields map 1:1 to the
// YoutubeVideo model in server/src/lib/mongo.js and are what components/YouTube.jsx
// displays on the public site.
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAdminT } from "../../lib/adminI18n";

const EMPTY = {
  titleEn: "", titleAr: "", subEn: "", subAr: "",
  gradient: "linear-gradient(135deg,#7A0000,#CC0000)", url: "", order: 0,
};

export default function AdminYoutube() {
  const { t } = useAdminT();
  // ---- STATE ----
  const [videos, setVideos] = useState([]);
  const [editing, setEditing] = useState(null); // null | "new" | <video id>
  const [form, setForm] = useState(EMPTY);

  // ---- DATA LOADING ----
  const load = () => api.get("/admin/youtube").then(setVideos);
  useEffect(() => { load(); }, []);

  // ---- FORM HANDLERS ----
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
    if (!confirm(t("Delete this video?"))) return;
    await api.del(`/admin/youtube/${id}`);
    load();
  };

  // ---- RENDER: table of existing videos ----
  return (
    <div>
      <h1>{t("YouTube Videos")}</h1>
      <div className="admin-toolbar">
        <button className="admin-btn admin-btn-primary" onClick={openNew}>{t("+ New Video")}</button>
      </div>
      <table className="admin-table">
        <thead>
          <tr><th>{t("Title")}</th><th>{t("Order")}</th><th></th></tr>
        </thead>
        <tbody>
          {videos.length === 0 && <tr><td colSpan={3} className="admin-empty">{t("No videos yet.")}</td></tr>}
          {videos.map((v) => (
            <tr key={v.id}>
              <td>{v.titleEn}</td>
              <td>{v.order}</td>
              <td className="actions">
                <button className="admin-btn" onClick={() => openEdit(v)}>{t("Edit")}</button>
                <button className="admin-btn admin-btn-danger" onClick={() => remove(v.id)}>{t("Delete")}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ---- RENDER: create/edit modal form ---- */}
      {editing !== null && (
        <div className="admin-modal-overlay" onClick={() => setEditing(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing === "new" ? t("New Video") : t("Edit Video")}</h2>
            <form className="admin-form" onSubmit={save}>
              <div className="admin-form-row">
                <label>{t("Title (EN)")}
                  <input className="form-input" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} required />
                </label>
                <label>{t("Title (AR)")}
                  <input className="form-input" value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} required />
                </label>
              </div>
              <div className="admin-form-row">
                <label>{t("Subtitle (EN)")}
                  <input className="form-input" value={form.subEn} onChange={(e) => setForm({ ...form, subEn: e.target.value })} />
                </label>
                <label>{t("Subtitle (AR)")}
                  <input className="form-input" value={form.subAr} onChange={(e) => setForm({ ...form, subAr: e.target.value })} />
                </label>
              </div>
              <label>{t("Video URL")}
                <input className="form-input" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required />
              </label>
              <label>{t("Gradient (CSS)")}
                <input className="form-input" value={form.gradient} onChange={(e) => setForm({ ...form, gradient: e.target.value })} />
              </label>
              <label>{t("Order")}
                <input className="form-input" type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} />
              </label>
              <div className="admin-form-actions">
                <button type="button" className="admin-btn" onClick={() => setEditing(null)}>{t("Cancel")}</button>
                <button type="submit" className="admin-btn admin-btn-primary">{t("Save")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
