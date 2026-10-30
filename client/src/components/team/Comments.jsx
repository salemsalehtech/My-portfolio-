// Comments.jsx — the conversation inside a task, for the owner (task editor) and members (task
// window). Comments load when the task opens; a new one is added to the end right away.
//
// Props: `path` — the comments address (/team/tasks/:id/comments or /admin/team/tasks/:id/comments),
// `deletePath(comment)`, `canDelete(comment)`, `lang`, `me` (the member id, to mark own comments),
// `onCount(n)` — told the new number of comments, so the board's 💬 badge stays right.
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { SHARED_COPY, initials, timeAgo } from "../../lib/team";

export default function Comments({ path, deletePath, canDelete, lang = "en", me, onCount }) {
  const c = SHARED_COPY[lang];
  const [list, setList] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setList(null);
    api.get(path).then(setList).catch((err) => setError(err.message));
  }, [path]);

  const update = (next) => { setList(next); onCount?.(next.length); };
  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    setError("");
    try {
      const comment = await api.post(path, { body });
      update([...list, comment]);
      setText("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (comment) => {
    try { await api.del(deletePath(comment)); update(list.filter((x) => x.id !== comment.id)); } catch (err) { setError(err.message); }
  };
  // Ctrl/Cmd + Enter sends.
  const onKey = (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(e); };

  const author = (x) => (x.byOwner ? c.owner : x.member ? x.member.name : c.formerMember);

  return (
    <section className="tm-comments">
      <h3>{c.comments}{list && list.length > 0 && <span className="tm-count">{list.length}</span>}</h3>
      {list === null && !error && <p className="tm-muted tm-small">…</p>}
      {list && list.length === 0 && <p className="tm-muted tm-small">{c.noComments}</p>}
      {list && list.length > 0 && (
        <ul className="tm-comment-list">
          {list.map((x) => (
            <li key={x.id} className={`tm-comment ${x.member?.id && x.member.id === me ? "is-mine" : ""} ${x.byOwner ? "is-owner" : ""}`}>
              <span className="tm-avatar">{x.byOwner ? "SS" : initials(x.member?.name || "?")}</span>
              <div className="tm-comment-main">
                <div className="tm-comment-head">
                  <strong>{author(x)}</strong>
                  <span className="tm-muted tm-small" title={new Date(x.createdAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB")}>{timeAgo(x.createdAt, lang)}</span>
                  {canDelete(x) && <button type="button" className="tm-icon-btn" onClick={() => remove(x)} aria-label={c.deleteComment} title={c.deleteComment}>✕</button>}
                </div>
                <p dir="auto">{x.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="tm-error" role="alert">{error}</p>}
      <form className="tm-comment-form" onSubmit={send}>
        <textarea className="fp-input" dir="auto" rows={2} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} placeholder={c.writeComment} maxLength={2000} />
        <button className="fp-btn" type="submit" disabled={busy || !text.trim()}>{busy ? c.sending : c.send}</button>
      </form>
    </section>
  );
}
