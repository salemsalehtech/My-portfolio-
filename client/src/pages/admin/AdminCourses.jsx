// AdminCourses.jsx — admin page for the Courses & Content section (/admin/courses). Same table +
// modal-form structure as AdminCertificates.jsx, including the cover picture per course:
// "Upload picture" on a row sends the image to PUT /admin/courses/:id/image (PNG / JPEG / WebP,
// max 2 MB — checked again on the server). A new course must be saved first; then its row gets
// the upload button.
//
// Fields map 1:1 to the Course model in server/src/lib/mongo.js. `visible` hides a course
// without deleting it; `order` sorts the cards (lowest first).
import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { readAsBase64 } from "../../lib/readAsBase64";
import { courseImageUrl } from "../../components/Courses";
import { useAdminT } from "../../lib/adminI18n";

const EMPTY = { titleEn: "", titleAr: "", descEn: "", descAr: "", platform: "", detailsEn: "", detailsAr: "", url: "", visible: true, order: 0 };
const MAX_MB = 2; // keep in sync with MAX_IMAGE_BYTES on the server
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export default function AdminCourses() {
  const { t } = useAdminT();
  // ---- STATE ----
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null); // null | "new" | <course id>
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [uploadingId, setUploadingId] = useState(null);
  const fileInput = useRef(null);
  const uploadFor = useRef(null); // which course the file picker was opened for

  // ---- DATA LOADING ----
  const load = () => api.get("/admin/courses").then(setItems);
  useEffect(() => { load(); }, []);

  // ---- FORM HANDLERS ----
  const openNew = () => { setForm({ ...EMPTY, order: items.length }); setError(""); setEditing("new"); };
  const openEdit = (item) => { setForm({ ...EMPTY, ...item }); setError(""); setEditing(item.id); };
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setError("");
    const payload = { ...form, order: Number(form.order) };
    try {
      if (editing === "new") await api.post("/admin/courses", payload);
      else await api.put(`/admin/courses/${editing}`, payload);
      setEditing(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleVisible = async (item) => {
    await api.put(`/admin/courses/${item.id}`, { visible: !item.visible });
    load();
  };

  const remove = async (id) => {
    if (!confirm(t("Delete this course?"))) return;
    await api.del(`/admin/courses/${id}`);
    load();
  };

  // ---- PICTURE ----
  const pickImage = (item) => { uploadFor.current = item.id; setError(""); fileInput.current.click(); };

  const upload = async (e) => {
    const file = e.target.files[0];
    const id = uploadFor.current;
    e.target.value = ""; // allow choosing the same file again later
    if (!file || !id) return;
    if (!IMAGE_TYPES.includes(file.type)) return setError(t("Please choose a PNG, JPEG or WebP image."));
    if (file.size > MAX_MB * 1024 * 1024) return setError(t("The image is too large (max {mb} MB).", { mb: MAX_MB }));
    setUploadingId(id);
    try {
      await api.put(`/admin/courses/${id}/image`, { data: await readAsBase64(file) });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingId(null);
    }
  };

  const removeImage = async (item) => {
    if (!confirm(t("Remove the picture of this course?"))) return;
    await api.del(`/admin/courses/${item.id}/image`);
    load();
  };

  // ---- RENDER: table of existing courses ----
  return (
    <div>
      <h1>{t("Courses")}</h1>
      <div className="admin-toolbar">
        <button className="admin-btn admin-btn-primary" onClick={openNew}>{t("+ New Course")}</button>
      </div>
      {error && editing === null && <p className="admin-error">{error}</p>}
      <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} hidden />
      <table className="admin-table">
        <thead>
          <tr><th>{t("Picture")}</th><th>{t("Title")}</th><th>{t("Platform")}</th><th>{t("Details")}</th><th>{t("Order")}</th><th>{t("On site")}</th><th></th></tr>
        </thead>
        <tbody>
          {items.length === 0 && <tr><td colSpan={7} className="admin-empty">{t("No courses yet — the section is hidden on the site until you add one.")}</td></tr>}
          {items.map((item) => (
            <tr key={item.id}>
              <td className="admin-thumb-cell">
                {/* Pictures are served only for visible courses, so hidden ones show a tick instead. */}
                {item.hasImage && item.visible && <img className="admin-thumb" src={courseImageUrl(item)} alt="" />}
                {item.hasImage && !item.visible && "✓"}
                {!item.hasImage && "—"}
              </td>
              <td>{item.titleEn || item.titleAr}</td>
              <td>{item.platform}</td>
              <td>{item.detailsEn || item.detailsAr}</td>
              <td>{item.order}</td>
              <td>{item.visible ? t("Visible") : t("Hidden")}</td>
              <td className="actions">
                <button className="admin-btn" onClick={() => pickImage(item)} disabled={uploadingId === item.id}>
                  {uploadingId === item.id ? "Uploading…" : item.hasImage ? t("Replace picture") : t("Upload picture")}
                </button>
                {item.hasImage && <button className="admin-btn" onClick={() => removeImage(item)}>{t("Remove picture")}</button>}
                <button className="admin-btn" onClick={() => toggleVisible(item)}>{item.visible ? t("Hide") : t("Show")}</button>
                <button className="admin-btn" onClick={() => openEdit(item)}>{t("Edit")}</button>
                <button className="admin-btn admin-btn-danger" onClick={() => remove(item.id)}>{t("Delete")}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ opacity: 0.7, fontSize: 13 }}>Pictures: PNG, JPEG or WebP, up to {MAX_MB} MB. A landscape image (e.g. a 1280×720 YouTube thumbnail) looks best.</p>

      {/* ---- RENDER: create/edit modal form ---- */}
      {editing !== null && (
        <div className="admin-modal-overlay" onClick={() => setEditing(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing === "new" ? t("New Course") : t("Edit Course")}</h2>
            <form className="admin-form" onSubmit={save}>
              <div className="admin-form-row">
                <label>{t("Title (EN)")}
                  <input className="form-input" value={form.titleEn} onChange={set("titleEn")} maxLength={160} />
                </label>
                <label>{t("Title (AR)")}
                  <input className="form-input" dir="rtl" value={form.titleAr} onChange={set("titleAr")} maxLength={160} />
                </label>
              </div>
              <div className="admin-form-row">
                <label>{t("Description (EN)")}
                  <textarea className="form-input" rows={3} value={form.descEn} onChange={set("descEn")} maxLength={500} />
                </label>
                <label>{t("Description (AR)")}
                  <textarea className="form-input" dir="rtl" rows={3} value={form.descAr} onChange={set("descAr")} maxLength={500} />
                </label>
              </div>
              <div className="admin-form-row">
                <label>{t("Details (EN)")}
                  <input className="form-input" value={form.detailsEn} onChange={set("detailsEn")} maxLength={80} placeholder={t("e.g. 12 lessons · Free")} />
                </label>
                <label>{t("Details (AR)")}
                  <input className="form-input" dir="rtl" value={form.detailsAr} onChange={set("detailsAr")} maxLength={80} placeholder="مثلاً: 12 درس · مجاني" />
                </label>
              </div>
              <div className="admin-form-row">
                <label>{t("Platform")}
                  <input className="form-input" value={form.platform} onChange={set("platform")} maxLength={40} placeholder={t("e.g. YouTube, Udemy")} />
                </label>
                <label>{t("Order (lowest first)")}
                  <input className="form-input" type="number" value={form.order} onChange={set("order")} />
                </label>
              </div>
              <label>{t("Link (playlist / course page)")}
                <input className="form-input" type="url" value={form.url} onChange={set("url")} placeholder="https://…" />
              </label>
              <label>
                <input type="checkbox" checked={form.visible} onChange={(e) => setForm({ ...form, visible: e.target.checked })} /> {t("Show on the site")}
              </label>
              <p style={{ opacity: 0.7, fontSize: 13 }}>{t("Fill at least one title. The picture is uploaded from the table after saving.")}</p>
              {error && <p className="admin-error">{error}</p>}
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
