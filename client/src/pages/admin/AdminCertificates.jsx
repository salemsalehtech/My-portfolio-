// AdminCertificates.jsx — admin page for the Certificates & Achievements section
// (/admin/certificates). Same table + modal-form structure as AdminServices.jsx, plus a picture
// per certificate: "Upload picture" on a row sends the image to PUT
// /admin/certificates/:id/image (PNG / JPEG / WebP, max 2 MB — checked again on the server).
// A new certificate must be saved first; then its row gets the upload button.
//
// Fields map 1:1 to the Certificate model in server/src/lib/mongo.js. `visible` hides a
// certificate without deleting it; `order` sorts the cards (lowest first).
import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { readAsBase64 } from "../../lib/readAsBase64";
import { certificateImageUrl } from "../../components/Certificates";
import { useAdminT } from "../../lib/adminI18n";

const EMPTY = { titleEn: "", titleAr: "", issuerEn: "", issuerAr: "", date: "", credentialUrl: "", visible: true, order: 0 };
const MAX_MB = 2; // keep in sync with MAX_IMAGE_BYTES on the server
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export default function AdminCertificates() {
  const { t } = useAdminT();
  // ---- STATE ----
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null); // null | "new" | <certificate id>
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [uploadingId, setUploadingId] = useState(null);
  const fileInput = useRef(null);
  const uploadFor = useRef(null); // which certificate the file picker was opened for

  // ---- DATA LOADING ----
  const load = () => api.get("/admin/certificates").then(setItems);
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
      if (editing === "new") await api.post("/admin/certificates", payload);
      else await api.put(`/admin/certificates/${editing}`, payload);
      setEditing(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleVisible = async (item) => {
    await api.put(`/admin/certificates/${item.id}`, { visible: !item.visible });
    load();
  };

  const remove = async (id) => {
    if (!confirm(t("Delete this certificate?"))) return;
    await api.del(`/admin/certificates/${id}`);
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
      await api.put(`/admin/certificates/${id}/image`, { data: await readAsBase64(file) });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingId(null);
    }
  };

  const removeImage = async (item) => {
    if (!confirm(t("Remove the picture of this certificate?"))) return;
    await api.del(`/admin/certificates/${item.id}/image`);
    load();
  };

  // ---- RENDER: table of existing certificates ----
  return (
    <div>
      <h1>{t("Certificates")}</h1>
      <div className="admin-toolbar">
        <button className="admin-btn admin-btn-primary" onClick={openNew}>{t("+ New Certificate")}</button>
      </div>
      {error && editing === null && <p className="admin-error">{error}</p>}
      <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} hidden />
      <table className="admin-table">
        <thead>
          <tr><th>{t("Picture")}</th><th>{t("Title")}</th><th>{t("Issuer")}</th><th>{t("Date")}</th><th>{t("Order")}</th><th>{t("On site")}</th><th></th></tr>
        </thead>
        <tbody>
          {items.length === 0 && <tr><td colSpan={7} className="admin-empty">{t("No certificates yet — the section is hidden on the site until you add one.")}</td></tr>}
          {items.map((item) => (
            <tr key={item.id}>
              <td className="admin-thumb-cell">
                {/* Pictures are served only for visible certificates, so hidden ones show a tick instead. */}
                {item.hasImage && item.visible && <img className="admin-thumb" src={certificateImageUrl(item)} alt="" />}
                {item.hasImage && !item.visible && "✓"}
                {!item.hasImage && "—"}
              </td>
              <td>{item.titleEn || item.titleAr}</td>
              <td>{item.issuerEn || item.issuerAr}</td>
              <td>{item.date}</td>
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
      <p style={{ opacity: 0.7, fontSize: 13 }}>Pictures: PNG, JPEG or WebP, up to {MAX_MB} MB. A landscape image (e.g. 1200×800) looks best.</p>

      {/* ---- RENDER: create/edit modal form ---- */}
      {editing !== null && (
        <div className="admin-modal-overlay" onClick={() => setEditing(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing === "new" ? t("New Certificate") : t("Edit Certificate")}</h2>
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
                <label>{t("Issuer (EN)")}
                  <input className="form-input" value={form.issuerEn} onChange={set("issuerEn")} maxLength={120} placeholder={t("e.g. DEPI")} />
                </label>
                <label>{t("Issuer (AR)")}
                  <input className="form-input" dir="rtl" value={form.issuerAr} onChange={set("issuerAr")} maxLength={120} />
                </label>
              </div>
              <div className="admin-form-row">
                <label>{t("Date")}
                  <input className="form-input" value={form.date} onChange={set("date")} maxLength={40} placeholder={t("e.g. 2025 or Jun 2025")} />
                </label>
                <label>{t("Order (lowest first)")}
                  <input className="form-input" type="number" value={form.order} onChange={set("order")} />
                </label>
              </div>
              <label>{t("Verify link (optional)")}
                <input className="form-input" type="url" value={form.credentialUrl} onChange={set("credentialUrl")} placeholder="https://…" />
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
