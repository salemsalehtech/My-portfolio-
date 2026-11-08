// AdminTeamNews.jsx — Admin → Team → Announcements: a message to the whole team (Markdown) with
// files, pictures or voice notes. Publishing makes a draft, uploads the files, then publishes —
// so every member is notified once, with the files already there. Below: what was sent, who
// pressed "Got it" (and who didn't yet), pin / unpin, delete.
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { SHARED_COPY, timeAgo } from "../../lib/team";
import MarkdownView from "../../components/team/MarkdownView";
import Attachments, { uploadAttachment } from "../../components/team/Attachments";
import BrandLoader from "../../components/BrandLoader";
import { PinIcon, CheckIcon, MegaphoneIcon } from "../../components/team/icons";
import { toast } from "../../components/Toaster";
import { useAdminT } from "../../lib/adminI18n";

const BLANK = { title: "", body: "", pinned: false };

export default function AdminTeamNews() {
  const { t, lang } = useAdminT();
  const [data, setData] = useState(null);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [files, setFiles] = useState([]);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () => api.get("/admin/team/announcements").then(setData).catch((err) => setError(err.message));
  useEffect(() => {
    load();
    api.get("/admin/team/members").then((m) => setMembers(m.filter((x) => x.active && !x.pending))).catch(() => {});
  }, []);

  const publish = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const draft = await api.post("/admin/team/announcements", form);
      for (const file of files) await uploadAttachment(`/admin/team/announcements/${draft.id}/attachments`, file);
      await api.post(`/admin/team/announcements/${draft.id}/publish`);
      toast(t("Announcement sent to the team"));
      setForm(BLANK);
      setFiles([]);
      setPreview(false);
      load();
    } catch (err) {
      setError(err.message);
      load(); // a draft may exist now — it shows in the list with a Publish button
    } finally {
      setBusy(false);
    }
  };
  const act = async (fn, done) => {
    try { await fn(); if (done) toast(done); load(); } catch (err) { setError(err.message); }
  };

  return (
    <div className="tm-newsadmin">
      <form className="admin-form cut-card tm-composer" onSubmit={publish}>
        <h2><MegaphoneIcon size={20} className="ui-icon" /> {t("New announcement")}</h2>
        <label>{t("Title")}<input className="form-input" dir="auto" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={160} required placeholder={t("e.g. No work on Thursday")} /></label>
        <label>
          <span className="tm-label-row">{t("Message (Markdown)")}
            <button type="button" className="admin-btn" onClick={() => setPreview(!preview)}>{preview ? t("Write") : t("Preview")}</button>
          </span>
          {preview
            ? <div className="tm-preview"><MarkdownView text={form.body} empty={t("Nothing written yet.")} /></div>
            : <textarea className="form-input" dir="auto" rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} maxLength={20000} />}
        </label>
        <Attachments path={null} canUpload queue={files} onQueue={setFiles} lang={lang} />
        <label className="tm-check"><input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} /> {t("Pin it to the top")}</label>
        {error && <p className="admin-error">{error}</p>}
        <div className="admin-form-actions">
          <button className="admin-btn admin-btn-primary" disabled={busy || !form.title.trim()}>
            {busy ? <BrandLoader variant="inline" size={14} label={t("Sending…")} /> : null} {busy ? t("Sending…") : t("Send to the whole team")}
          </button>
        </div>
      </form>

      <h2>{t("Sent")}</h2>
      {data === null && <BrandLoader />}
      {data && data.items.length === 0 && <p className="admin-empty">{t("Nothing sent yet.")}</p>}
      <div className="tm-news">
        {data?.items.map((a) => {
          const readers = new Set(a.readBy.map((r) => r.id));
          const notYet = members.filter((m) => !readers.has(m.id));
          return (
            <article key={a.id} className="cut-card tm-newsitem">
              <header className="tm-newsitem-head">
                <div>
                  {a.pinned && <span className="tm-pill"><PinIcon size={12} /> {t("Pinned")}</span>}
                  {!a.publishedAt && <span className="tm-pill is-late">{t("Draft")}</span>}
                  <h3 dir="auto">{a.title}</h3>
                  <span className="tm-muted tm-small">{timeAgo(a.publishedAt || a.createdAt, lang)}</span>
                </div>
                <div className="tm-newsitem-actions">
                  {!a.publishedAt && <button className="admin-btn admin-btn-primary" onClick={() => act(() => api.post(`/admin/team/announcements/${a.id}/publish`), t("Announcement sent to the team"))}>{t("Publish")}</button>}
                  <button className="admin-btn" onClick={() => act(() => api.put(`/admin/team/announcements/${a.id}`, { pinned: !a.pinned }))}>{a.pinned ? t("Unpin") : t("Pin")}</button>
                  <button className="admin-btn admin-btn-danger" onClick={() => confirm(t("Delete this announcement?")) && act(() => api.del(`/admin/team/announcements/${a.id}`))}>{t("Delete")}</button>
                </div>
              </header>
              {a.body && <MarkdownView text={a.body} />}
              <Attachments path={`/admin/team/announcements/${a.id}/attachments`} filePath={(f) => `/admin/team/attachments/${f.id}`}
                deletePath={(f) => `/admin/team/attachments/${f.id}`} canDelete={() => true} lang={lang} />
              {a.publishedAt && (
                <p className="tm-small tm-readers">
                  <CheckIcon size={13} /> {t("Read by {a} of {b}", { a: readers.size, b: data.team })}
                  {a.readBy.length > 0 && <span className="tm-muted"> · {a.readBy.map((r) => r.name).join("، ")}</span>}
                  {notYet.length > 0 && <span className="tm-muted"> · {t("Not yet:")} {notYet.map((m) => m.name).join("، ")}</span>}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
