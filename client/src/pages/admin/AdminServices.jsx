// AdminServices.jsx — admin CRUD page for the services shown in the "What I Offer" section
// (at /admin/services). Same table + modal-form structure as AdminTestimonials.jsx.
//
// Fields map 1:1 to the Service model in server/src/lib/mongo.js. `icon` is one of the
// built-in icons in lib/serviceIcons.jsx (a preview is shown next to the picker). `visible`
// hides a service without deleting it; `order` sorts the cards (lowest first).
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { SERVICE_ICONS, serviceIcon } from "../../lib/serviceIcons";
import { useAdminT } from "../../lib/adminI18n";

const EMPTY = { titleEn: "", titleAr: "", descEn: "", descAr: "", icon: "web", visible: true, order: 0 };

export default function AdminServices() {
  const { t } = useAdminT();
  // ---- STATE ----
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null); // null | "new" | <service id>
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");

  // ---- DATA LOADING ----
  const load = () => api.get("/admin/services").then(setItems);
  useEffect(() => { load(); }, []);

  // ---- FORM HANDLERS ----
  const openNew = () => { setForm({ ...EMPTY, order: items.length }); setError(""); setEditing("new"); };
  const openEdit = (item) => { setForm(item); setError(""); setEditing(item.id); };
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setError("");
    const payload = { ...form, order: Number(form.order) };
    try {
      if (editing === "new") await api.post("/admin/services", payload);
      else await api.put(`/admin/services/${editing}`, payload);
      setEditing(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleVisible = async (item) => {
    await api.put(`/admin/services/${item.id}`, { visible: !item.visible });
    load();
  };

  const remove = async (id) => {
    if (!confirm(t("Delete this service?"))) return;
    await api.del(`/admin/services/${id}`);
    load();
  };

  // ---- RENDER: table of existing services ----
  return (
    <div>
      <h1>{t("Services")}</h1>
      <div className="admin-toolbar">
        <button className="admin-btn admin-btn-primary" onClick={openNew}>{t("+ New Service")}</button>
      </div>
      <table className="admin-table">
        <thead>
          <tr><th></th><th>{t("Title")}</th><th>{t("Description")}</th><th>{t("Order")}</th><th>{t("On site")}</th><th></th></tr>
        </thead>
        <tbody>
          {items.length === 0 && <tr><td colSpan={6} className="admin-empty">{t("No services yet — the section is hidden on the site until you add one.")}</td></tr>}
          {items.map((item) => (
            <tr key={item.id}>
              <td className="admin-icon-cell">{serviceIcon(item.icon)}</td>
              <td>{item.titleEn || item.titleAr}</td>
              <td>{(item.descEn || item.descAr).slice(0, 80)}{(item.descEn || item.descAr).length > 80 ? "…" : ""}</td>
              <td>{item.order}</td>
              <td>{item.visible ? t("Visible") : t("Hidden")}</td>
              <td className="actions">
                <button className="admin-btn" onClick={() => toggleVisible(item)}>{item.visible ? t("Hide") : t("Show")}</button>
                <button className="admin-btn" onClick={() => openEdit(item)}>{t("Edit")}</button>
                <button className="admin-btn admin-btn-danger" onClick={() => remove(item.id)}>{t("Delete")}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ---- RENDER: create/edit modal form ---- */}
      {editing !== null && (
        <div className="admin-modal-overlay" onClick={() => setEditing(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing === "new" ? t("New Service") : t("Edit Service")}</h2>
            <form className="admin-form" onSubmit={save}>
              <div className="admin-form-row">
                <label>{t("Title (EN)")}
                  <input className="form-input" value={form.titleEn} onChange={set("titleEn")} maxLength={120} />
                </label>
                <label>{t("Title (AR)")}
                  <input className="form-input" dir="rtl" value={form.titleAr} onChange={set("titleAr")} maxLength={120} />
                </label>
              </div>
              <label>{t("Description (EN)")}
                <textarea className="form-input" rows={3} value={form.descEn} onChange={set("descEn")} maxLength={600} />
              </label>
              <label>{t("Description (AR)")}
                <textarea className="form-input" rows={3} dir="rtl" value={form.descAr} onChange={set("descAr")} maxLength={600} />
              </label>
              <div className="admin-form-row" style={{ alignItems: "end" }}>
                <label>{t("Icon")}
                  <select className="form-input" value={form.icon} onChange={set("icon")}>
                    {Object.entries(SERVICE_ICONS).map(([key, { label }]) => <option key={key} value={key}>{t(label)}</option>)}
                  </select>
                </label>
                <div className="service-icon" title={t("Preview")}>{serviceIcon(form.icon)}</div>
                <label>{t("Order (lowest first)")}
                  <input className="form-input" type="number" value={form.order} onChange={set("order")} />
                </label>
              </div>
              <label>
                <input type="checkbox" checked={form.visible} onChange={(e) => setForm({ ...form, visible: e.target.checked })} /> {t("Show on the site")}
              </label>
              <p style={{ opacity: 0.7, fontSize: 13 }}>{t("Fill at least one title. If a text is empty in one language, the other language is shown.")}</p>
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
