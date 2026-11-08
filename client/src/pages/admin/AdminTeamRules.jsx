// AdminTeamRules.jsx — Admin → Team → Rules & goal:
//   - the team rules in English and Arabic (Markdown). "Save draft" keeps them private;
//     "Publish" makes a new version: every member must read and agree again (they get a
//     notification), and new members agree while signing up. Below: who agreed to this version.
//   - the shared monthly goal (how many tasks the whole team finishes this month) shown to members.
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import MarkdownView from "../../components/team/MarkdownView";
import { CheckIcon } from "../../components/team/icons";
import { toast } from "../../components/Toaster";
import { useAdminT } from "../../lib/adminI18n";

export default function AdminTeamRules() {
  const { t } = useAdminT();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");

  const load = () => api.get("/admin/team/settings").then((d) => {
    setData(d);
    setForm({ rulesEn: d.rulesEn, rulesAr: d.rulesAr, goalTarget: d.goalTarget, goalLabel: d.goalLabel });
  }).catch((err) => setError(err.message));
  useEffect(() => { load(); }, []);

  const save = async (publish) => {
    if (publish && !confirm(t("Publish the rules? Every member will be asked to read and agree again."))) return;
    setError("");
    try {
      await api.put("/admin/team/settings", { ...form, goalTarget: Number(form.goalTarget) || 0, publish });
      toast(publish ? t("Rules published") : t("Saved"));
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!form) return <p className={error ? "admin-error" : ""}>{error || t("Loading…")}</p>;
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const agreed = data.agreements.filter((a) => a.agreed).length;

  return (
    <div className="admin-form">
      {error && <p className="admin-error">{error}</p>}
      <h2>{t("Team goal this month")}</h2>
      <div className="admin-form-row">
        <label>{t("Tasks to finish together (0 = off)")}<input className="form-input" type="number" min={0} max={1000} value={form.goalTarget} onChange={set("goalTarget")} /></label>
        <label>{t("What it's for (optional)")}<input className="form-input" dir="auto" value={form.goalLabel} onChange={set("goalLabel")} maxLength={120} placeholder={t("e.g. Launch the store app")} /></label>
      </div>
      <div className="admin-form-actions"><button className="admin-btn admin-btn-primary" onClick={() => save(false)}>{t("Save goal")}</button></div>

      <h2>{t("Team rules")} <span className="admin-sub">· {data.rulesVersion ? t("version {n}", { n: data.rulesVersion }) : t("not published yet")}</span></h2>
      <div className="admin-toolbar"><button className="admin-btn" onClick={() => setPreview(!preview)}>{preview ? t("Write") : t("Preview")}</button></div>
      <div className="admin-form-row">
        <label>{t("Rules (English)")}
          {preview ? <div className="tm-preview"><MarkdownView text={form.rulesEn} empty={t("Nothing written yet.")} /></div>
            : <textarea className="form-input" dir="ltr" rows={14} value={form.rulesEn} onChange={set("rulesEn")} maxLength={30000} placeholder={"## Working hours\n## Communication\n## Code & reviews\n## Deadlines"} />}
        </label>
        <label>{t("Rules (Arabic)")}
          {preview ? <div className="tm-preview" dir="rtl"><MarkdownView text={form.rulesAr} empty={t("Nothing written yet.")} /></div>
            : <textarea className="form-input" dir="rtl" rows={14} value={form.rulesAr} onChange={set("rulesAr")} maxLength={30000} placeholder={"## مواعيد الشغل\n## التواصل\n## الكود والمراجعة\n## المواعيد النهائية"} />}
        </label>
      </div>
      <div className="admin-form-actions">
        <button className="admin-btn" onClick={() => save(false)}>{t("Save draft")}</button>
        <button className="admin-btn admin-btn-primary" onClick={() => save(true)} disabled={!form.rulesEn.trim() && !form.rulesAr.trim()}>{t("Publish")}</button>
      </div>

      {data.rulesVersion > 0 && (
        <>
          <h3>{t("Agreed to version {n}: {a} of {b}", { n: data.rulesVersion, a: agreed, b: data.agreements.length })}</h3>
          <ul className="tm-agree-list">
            {data.agreements.map((a) => (
              <li key={a.id} className={a.agreed ? "is-ok" : ""}>{a.agreed ? <CheckIcon size={14} /> : <span className="tm-dot is-todo" />} {a.name}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
