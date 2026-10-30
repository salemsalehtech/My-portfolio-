// AdminSkills.jsx — admin CRUD page for the skills list (shown at /admin/skills). Same
// table + modal-form structure as AdminProjects.jsx and AdminYoutube.jsx — see the comment
// at the top of AdminProjects.jsx for the general pattern (editing state, load-after-mutate).
//
// Fields map 1:1 to the Skill model in server/src/lib/mongo.js: `color`/`textColor` style
// the little colored abbreviation badge on the public site (components/Skills.jsx),
// `percentage` drives the progress bar width, and `group` (frontend/backend/tools) decides
// which tab the skill shows up under.
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAdminT } from "../../lib/adminI18n";

const EMPTY = {
  name: "", abbr: "", color: "#E8A020", textColor: "#ffffff",
  percentage: 80, levelEn: "Advanced", levelAr: "متقدم", group: "frontend", order: 0,
};

export default function AdminSkills() {
  const { t } = useAdminT();
  // ---- STATE ----
  const [skills, setSkills] = useState([]);
  const [editing, setEditing] = useState(null); // null | "new" | <skill id>
  const [form, setForm] = useState(EMPTY);

  // ---- DATA LOADING ----
  const load = () => api.get("/admin/skills").then(setSkills);
  useEffect(() => { load(); }, []);

  // ---- FORM HANDLERS ----
  const openNew = () => { setForm(EMPTY); setEditing("new"); };
  const openEdit = (s) => { setForm(s); setEditing(s.id); };

  const save = async (e) => {
    e.preventDefault();
    const payload = { ...form, percentage: Number(form.percentage), order: Number(form.order) };
    if (editing === "new") await api.post("/admin/skills", payload);
    else await api.put(`/admin/skills/${editing}`, payload);
    setEditing(null);
    load();
  };

  const remove = async (id) => {
    if (!confirm(t("Delete this skill?"))) return;
    await api.del(`/admin/skills/${id}`);
    load();
  };

  // ---- RENDER: table of existing skills ----
  return (
    <div>
      <h1>{t("Skills")}</h1>
      <div className="admin-toolbar">
        <button className="admin-btn admin-btn-primary" onClick={openNew}>{t("+ New Skill")}</button>
      </div>
      <table className="admin-table">
        <thead>
          <tr><th>{t("Name")}</th><th>{t("Group")}</th><th>%</th><th>{t("Order")}</th><th></th></tr>
        </thead>
        <tbody>
          {skills.length === 0 && <tr><td colSpan={5} className="admin-empty">{t("No skills yet.")}</td></tr>}
          {skills.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{s.group}</td>
              <td>{s.percentage}%</td>
              <td>{s.order}</td>
              <td className="actions">
                <button className="admin-btn" onClick={() => openEdit(s)}>{t("Edit")}</button>
                <button className="admin-btn admin-btn-danger" onClick={() => remove(s.id)}>{t("Delete")}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ---- RENDER: create/edit modal form ---- */}
      {editing !== null && (
        <div className="admin-modal-overlay" onClick={() => setEditing(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing === "new" ? t("New Skill") : t("Edit Skill")}</h2>
            <form className="admin-form" onSubmit={save}>
              <div className="admin-form-row">
                <label>{t("Name")}
                  <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </label>
                <label>{t("Abbreviation")}
                  <input className="form-input" value={form.abbr} onChange={(e) => setForm({ ...form, abbr: e.target.value })} required />
                </label>
              </div>
              <div className="admin-form-row">
                <label>{t("Color")}
                  <input className="form-input" type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
                </label>
                <label>{t("Text Color")}
                  <input className="form-input" type="color" value={form.textColor} onChange={(e) => setForm({ ...form, textColor: e.target.value })} />
                </label>
              </div>
              <div className="admin-form-row">
                <label>{t("Group")}
                  <select className="form-input" value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })}>
                    <option value="frontend">frontend</option>
                    <option value="backend">backend</option>
                    <option value="tools">tools</option>
                  </select>
                </label>
                <label>{t("Percentage")}
                  <input className="form-input" type="number" min={0} max={100} value={form.percentage} onChange={(e) => setForm({ ...form, percentage: e.target.value })} />
                </label>
              </div>
              <div className="admin-form-row">
                <label>{t("Level (EN)")}
                  <input className="form-input" value={form.levelEn} onChange={(e) => setForm({ ...form, levelEn: e.target.value })} />
                </label>
                <label>{t("Level (AR)")}
                  <input className="form-input" value={form.levelAr} onChange={(e) => setForm({ ...form, levelAr: e.target.value })} />
                </label>
              </div>
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
