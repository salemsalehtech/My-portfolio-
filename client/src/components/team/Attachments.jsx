// Attachments.jsx — the files attached to a task (a PDF brief, screenshots, designs, the result),
// shown in the owner's task editor and the member's task window. The owner adds and removes any
// file (routes/adminTeam.js); the assignee adds their result to their own task and removes only
// the files they added (routes/team.js); everyone on the project opens them. Files are private,
// so they are fetched with the login token and opened from a temporary object URL.
//
// Two modes:
//   - saved task: `path` = "/admin/team/tasks/:id/attachments" or "/team/tasks/:id/attachments";
//     the list loads from it and (with `canUpload`) a picked file is uploaded at once.
//   - new task (owner, not saved yet): no `path`; picked files wait in `queue` / `onQueue` and the
//     task editor uploads them with uploadAttachment() right after the task is created.
// `filePath(file)` / `deletePath(file)` give each file's own address; `canDelete(file)` says
// whether this person may remove it.
import { useEffect, useRef, useState } from "react";
import { api, fetchImageUrl } from "../../lib/api";
import { readAsBase64 } from "../../lib/readAsBase64";
import { SHARED_COPY } from "../../lib/team";
import { PaperclipIcon, FileIcon, XIcon, MicIcon } from "./icons";
import VoiceRecorder, { canRecord } from "./VoiceRecorder";
import ImageMarkup from "./ImageMarkup";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"]; // what the file picker offers
const AUDIO = ["audio/webm", "audio/ogg", "audio/mp4"]; // voice notes (recorded here, not picked)
const allowed = (type) => TYPES.includes(type) || AUDIO.includes(type.split(";")[0]);

export const uploadAttachment = async (path, file) => api.post(path, { name: file.name, data: await readAsBase64(file) });

const sizeText = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const isImage = (type) => type.startsWith("image/");

export default function Attachments({
  path, filePath, deletePath, canUpload = false, canDelete = () => false, queue, onQueue,
  buttonClass = "admin-btn", lang = "en", msg = (text) => text,
}) {
  const c = SHARED_COPY[lang];
  const pending = !path; // a new task: files wait until it is saved
  const [list, setList] = useState(pending ? [] : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [marking, setMarking] = useState(null); // a picked picture open in ImageMarkup
  const input = useRef(null);

  useEffect(() => {
    if (pending) return;
    setList(null);
    api.get(path).then(setList).catch((err) => setError(err.message));
  }, [path, pending]);

  const items = pending ? (queue || []).map((file, i) => ({ id: `q${i}`, filename: file.name, contentType: file.type, size: file.size, file })) : list;

  // A single picked picture opens the mark-up window first; anything else is added straight away.
  const pick = (e) => {
    const files = [...e.target.files];
    e.target.value = "";
    if (files.length === 1 && files[0].type.startsWith("image/") && files[0].size <= MAX_BYTES) setMarking(files[0]);
    else add(files);
  };

  // Checks the files in the browser first, so a wrong file fails before any upload.
  const add = async (files) => {
    setError("");
    const bad = files.find((f) => !allowed(f.type) || f.size > MAX_BYTES);
    if (bad) return setError(allowed(bad.type) ? c.tooBig(bad.name) : c.badType(bad.name));
    if ((items?.length || 0) + files.length > 10) return setError(msg("Up to 10 files per task"));
    if (pending) return onQueue([...(queue || []), ...files]);
    setBusy(true);
    try {
      for (const file of files) {
        const added = await uploadAttachment(path, file);
        setList((now) => [...now, added]);
      }
    } catch (err) {
      setError(msg(err.message));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item) => {
    if (pending) return onQueue(queue.filter((f) => f !== item.file));
    if (!confirm(c.deleteFileQ(item.filename))) return;
    try { await api.del(deletePath(item)); setList((now) => now.filter((x) => x.id !== item.id)); } catch (err) { setError(msg(err.message)); }
  };

  // The tab is opened right away (inside the click) so pop-up blockers allow it, then pointed at
  // the file once it has downloaded.
  const open = async (item) => {
    if (item.file) return window.open(URL.createObjectURL(item.file), "_blank", "noopener");
    const tab = window.open("", "_blank");
    try {
      const url = await fetchImageUrl(filePath(item));
      if (tab) tab.location.href = url;
      else Object.assign(document.createElement("a"), { href: url, download: item.filename }).click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      tab?.close();
      setError(msg(err.message));
    }
  };

  if (!canUpload && list && list.length === 0) return null; // nothing to show
  return (
    <section className="tm-files">
      <h3>{c.files}{items && items.length > 0 && <span className="tm-count">{items.length}</span>}</h3>
      {items === null && !error && <p className="tm-muted tm-small">…</p>}
      {items && items.length === 0 && <p className="tm-muted tm-small">{c.noFiles}</p>}
      {items && items.length > 0 && (
        <ul className="tm-file-list">
          {items.map((item) => (
            <li key={item.id} className="tm-file">
              <button type="button" className="tm-file-open" onClick={() => open(item)} title={c.openFile}>
                <Thumb item={item} path={!item.file && isImage(item.contentType) ? filePath(item) : null} />
                <span className="tm-file-name" dir="auto">{item.filename}</span>
                <span className="tm-file-meta">
                  {item.file ? c.sentOnSave : [sizeText(item.size), item.member ? c.by(item.member.name) : null].filter(Boolean).join(" · ")}
                </span>
              </button>
              {(item.file || canDelete(item)) && (
                <button type="button" className="tm-icon-btn" onClick={() => remove(item)} aria-label={c.deleteFile} title={c.deleteFile}>
                  <XIcon size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canUpload && (
        <div className="tm-file-add">
          <input ref={input} type="file" accept={TYPES.join(",")} multiple hidden onChange={pick} />
          <button type="button" className={buttonClass} onClick={() => input.current.click()} disabled={busy}>
            <PaperclipIcon size={15} /> {busy ? c.uploading : c.attach}
          </button>
          {canRecord() && <VoiceRecorder lang={lang} className={buttonClass} onDone={(f) => add([f])} onError={setError} />}
          <span className="tm-muted tm-small">{c.attachHint}</span>
        </div>
      )}
      {error && <p className="tm-error" role="alert">{error}</p>}
      {marking && <ImageMarkup file={marking} lang={lang} onCancel={() => setMarking(null)} onDone={(f) => { setMarking(null); add([f]); }} />}
    </section>
  );
}

// A small preview for pictures (fetched with the login token); a file icon for PDFs.
function Thumb({ item, path }) {
  const [src, setSrc] = useState(item.file && isImage(item.contentType) ? URL.createObjectURL(item.file) : null);
  useEffect(() => {
    if (!path) return undefined;
    let url = null;
    let alive = true;
    fetchImageUrl(path).then((u) => { url = u; if (alive) setSrc(u); else URL.revokeObjectURL(u); }).catch(() => {});
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [path]);
  useEffect(() => () => { if (src && item.file) URL.revokeObjectURL(src); }, [src, item.file]);
  if (src) return <img className="tm-file-thumb" src={src} alt="" />;
  return <span className="tm-file-thumb is-doc">{item.contentType.startsWith("audio/") ? <MicIcon size={18} /> : <FileIcon size={18} />}</span>;
}
