// AdminSkills.jsx — admin CRUD page for the skills list (shown at /admin/skills). Same
// table + modal-form structure as AdminProjects.jsx and AdminYoutube.jsx — see the comment
// at the top of AdminProjects.jsx for the general pattern (editing state, load-after-mutate).
//
// Fields map to the Skill model in server/src/lib/mongo.js and to the public Skills section
// (components/Skills.jsx): `tier` "core" puts the tool on the core-stack band at the top, the other
// tiers list it under its `group`'s column. `icon` is a key of lib/toolIcons.js ("" = guess from
// the name, "none" = show `abbr` instead). `noteEn`/`noteAr` is one short line under the name.
// Skills saved before tiers existed show their old level until edited here.
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAdminT } from "../../lib/adminI18n";

const GROUPS = ["frontend", "backend", "tools"];
const TIERS = [
  ["core", "Core — the band at the top"],
  ["regular", "Regular"],
  ["working", "When needed"],
];
const TIER_LABEL = { core: "Core", regular: "Regular", working: "When needed" };

const EMPTY = { name: "", group: "frontend", tier: "regular", icon: "", noteEn: "", noteAr: "", abbr: "", order: 0 };

// the same fallback the public section uses for skills saved before tiers existed
function tierOf(s) {
  if (s.tier) return s.tier;
  const level = String(s.levelEn || "").toLowerCase();
  if (level === "expert") return "core";
  if (level === "advanced") return "regular";
  if (level) return "working";
  return s.percentage >= 90 ? "core" : s.percentage >= 80 ? "regular" : "working";
}

function Logo({ icon, size = 20 }) {
  if (!icon) return null;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d={icon.path} />
    </svg>
  );
}

export default function AdminSkills() {
  const { t } = useAdminT();
  // ---- STATE ----
  const [skills, setSkills] = useState([]);
  const [editing, setEditing] = useState(null); // null | "new" | <skill id>
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [icons, setIcons] = useState(null); // lib/toolIcons.js, loaded on demand

  // ---- DATA LOADING ----
  const load = () => api.get("/admin/skills").then(setSkills);
  useEffect(() => {
    load();
    import("../../lib/toolIcons").then(setIcons);
  }, []);

  const iconOf = (s) => icons?.iconFor(s) || null;
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  // ---- FORM HANDLERS ----
  const openNew = () => { setForm(EMPTY); setError(""); setEditing("new"); };
  const openEdit = (s) => {
    setForm({ ...EMPTY, ...s, tier: tierOf(s), icon: s.icon || "", noteEn: s.noteEn || "", noteAr: s.noteAr || "" });
    setError("");
    setEditing(s.id);
  };

  const save = async (e) => {
    e.preventDefault();
    const { name, group, tier, icon, noteEn, noteAr, abbr, order } = form;
    const payload = { name: name.trim(), group, tier, icon, noteEn: noteEn.trim(), noteAr: noteAr.trim(), abbr: abbr.trim(), order: Number(order) || 0 };
    try {
      if (editing === "new") await api.post("/admin/skills", payload);
      else await api.put(`/admin/skills/${editing}`, payload);
      setEditing(null);
      load();
    } catch (err) {
      setError(err.message || t("Could not save."));
    }
  };

  const remove = async (id) => {
    if (!confirm(t("Delete this skill?"))) return;
    await api.del(`/admin/skills/${id}`);
    load();
  };

  const sorted = [...skills].sort((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || (a.order ?? 0) - (b.order ?? 0));
  const guessed = icons?.iconFor({ name: form.name }); // what "Automatic" would show

  // ---- RENDER: table of existing skills ----
  return (
    <div>
      <h1>{t("Skills")}</h1>
      <p className="admin-sub">{t("Core tools appear large on the band at the top of the Skills section; the rest are listed under their group.")}</p>
      <div className="admin-toolbar">
        <button className="admin-btn admin-btn-primary" onClick={openNew}>{t("+ New Skill")}</button>
      </div>
      <table className="admin-table">
        <thead>
          <tr><th></th><th>{t("Name")}</th><th>{t("Group")}</th><th>{t("Tier")}</th><th>{t("Order")}</th><th></th></tr>
        </thead>
        <tbody>
          {skills.length === 0 && <tr><td colSpan={6} className="admin-empty">{t("No skills yet.")}</td></tr>}
          {sorted.map((s) => (
            <tr key={s.id}>
              <td className="admin-icon-cell"><Logo icon={iconOf(s)} />{!iconOf(s) && icons && <span className="skill-abbr-cell">{s.abbr}</span>}</td>
              <td>{s.name}{(s.noteEn || s.noteAr) && <div className="admin-sub">{s.noteEn || s.noteAr}</div>}</td>
              <td>{t(s.group)}</td>
              <td><span className={`skill-tier-pill is-${tierOf(s)}`}>{t(TIER_LABEL[tierOf(s)])}</span></td>
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
            {error && <div className="admin-error">{error}</div>}
            <form className="admin-form" onSubmit={save}>
              <div className="admin-form-row">
                <label>{t("Name")}
                  <input className="form-input" value={form.name} onChange={set("name")} placeholder="Next.js" required />
                </label>
                <label>{t("Order")}
                  <input className="form-input" type="number" value={form.order} onChange={set("order")} />
                </label>
              </div>
              <div className="admin-form-row">
                <label>{t("Group")}
                  <select className="form-input" value={form.group} onChange={set("group")}>
                    {GROUPS.map((g) => <option key={g} value={g}>{t(g)}</option>)}
                  </select>
                </label>
                <label>{t("Tier")}
                  <select className="form-input" value={form.tier} onChange={set("tier")}>
                    {TIERS.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
                  </select>
                </label>
              </div>
              <div className="admin-form-row">
                <label>{t("What you use it for (EN) — optional")}
                  <input className="form-input" value={form.noteEn} onChange={set("noteEn")} maxLength={120} placeholder="App Router, server components" />
                </label>
                <label>{t("What you use it for (AR) — optional")}
                  <input className="form-input" value={form.noteAr} onChange={set("noteAr")} maxLength={120} dir="rtl" />
                </label>
              </div>

              <fieldset className="skill-icon-picker">
                <legend>{t("Logo")}</legend>
                <div className="skill-icon-grid">
                  <button type="button" className={form.icon === "" ? "active" : ""} onClick={() => setForm({ ...form, icon: "" })} title={t("Automatic (from the name)")}>
                    {guessed ? <Logo icon={guessed} size={22} /> : <span>Auto</span>}
                    <small>{t("Automatic")}</small>
                  </button>
                  {icons && Object.entries(icons.TOOL_ICONS).map(([key, icon]) => (
                    <button type="button" key={key} className={form.icon === key ? "active" : ""} onClick={() => setForm({ ...form, icon: key })} title={icon.title}>
                      <Logo icon={icon} size={22} />
                      <small>{icon.title}</small>
                    </button>
                  ))}
                  <button type="button" className={form.icon === "none" ? "active" : ""} onClick={() => setForm({ ...form, icon: "none" })}>
                    <span>Aa</span>
                    <small>{t("No logo")}</small>
                  </button>
                </div>
              </fieldset>
              {(form.icon === "none" || (form.icon === "" && !guessed)) && (
                <label>{t("Short letters shown instead of a logo")}
                  <input className="form-input" value={form.abbr} onChange={set("abbr")} maxLength={4} placeholder="UX" />
                </label>
              )}

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
