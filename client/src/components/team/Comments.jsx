// Comments.jsx — the conversation inside a task, for the owner (task editor) and members (task
// window). Comments load when the task opens; a new one is added to the end right away.
// Reply to a comment (its author is notified), and type "@" to mention someone: the people of
// the project, or the owner's handle ("@lead", from the server's rules — lib/rules.js)
// (routes → addComment() in server/src/lib/team.js).
//
// Props: `path` — the comments address (/team/tasks/:id/comments or /admin/team/tasks/:id/comments),
// `deletePath(comment)`, `canDelete(comment)`, `lang`, `me` (the member id, to mark own comments),
// `people` — [{ username, name }] who can be mentioned, `seed` — { text, n }: when `n` changes the
// box is filled with `text` and focused (the task window's "I have a question" button),
// `onCount(n)` — told the new number of comments, so the board's badge stays right.
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../lib/api";
import { SHARED_COPY, initials, timeAgo } from "../../lib/team";
import { ReplyIcon, XIcon } from "./icons";
import { useRules } from "../../lib/rules";

const MENTION = /@([a-z0-9._-]{3,30})/gi;

// The body with @mentions highlighted.
function Body({ text }) {
  const parts = text.split(MENTION);
  return <p dir="auto">{parts.map((part, i) => (i % 2 ? <span key={i} className="tm-mention">@{part}</span> : part))}</p>;
}

export default function Comments({ path, deletePath, canDelete, lang = "en", msg = (text) => text, me, people = [], seed, onCount }) {
  const c = SHARED_COPY[lang];
  const [list, setList] = useState(null);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [query, setQuery] = useState(null); // the "@…" being typed, or null
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const box = useRef(null);

  useEffect(() => {
    setList(null);
    api.get(path).then(setList).catch((err) => setError(err.message));
  }, [path]);
  useEffect(() => {
    if (!seed?.n) return;
    setText(seed.text);
    box.current?.focus();
    box.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [seed?.n]); // eslint-disable-line react-hooks/exhaustive-deps

  const ownerHandle = useRules()?.team.ownerHandle; // "@lead" — from the server's rules
  const handles = useMemo(
    () => [...(ownerHandle ? [{ username: ownerHandle, name: c.owner }] : []), ...people.filter((p) => p.id !== me)],
    [ownerHandle, people, me, c.owner]
  );
  const matches = query === null ? [] : handles.filter((p) => p.username.startsWith(query) || p.name.toLowerCase().includes(query)).slice(0, 6);

  const update = (next) => { setList(next); onCount?.(next.length); };
  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    setError("");
    try {
      const comment = await api.post(path, { body, replyTo: replyTo?.id });
      update([...list, comment]);
      setText("");
      setReplyTo(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (comment) => {
    try { await api.del(deletePath(comment)); update(list.filter((x) => x.id !== comment.id)); } catch (err) { setError(err.message); }
  };

  // Watches the word under the cursor: "@mo" opens the list of people starting with "mo".
  const onChange = (e) => {
    setText(e.target.value);
    const before = e.target.value.slice(0, e.target.selectionStart);
    const m = before.match(/(?:^|\s)@([\p{L}0-9._-]{0,30})$/u);
    setQuery(m ? m[1].toLowerCase() : null);
  };
  const pickMention = (person) => {
    const el = box.current;
    const caret = el.selectionStart;
    const start = text.slice(0, caret).lastIndexOf("@");
    const next = `${text.slice(0, start)}@${person.username} ${text.slice(caret)}`;
    setText(next);
    setQuery(null);
    requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = start + person.username.length + 2; });
  };
  // Ctrl/Cmd + Enter sends; Escape closes the mention list.
  const onKey = (e) => {
    if (e.key === "Escape") setQuery(null);
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(e);
  };

  const author = (x) => (x.byOwner ? c.owner : x.member ? x.member.name : c.formerMember);

  return (
    <section className="tm-comments">
      <h3>{c.comments}{list && list.length > 0 && <span className="tm-count">{list.length}</span>}</h3>
      {list === null && !error && <div className="tm-skeleton" style={{ height: 48 }} />}
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
                  <button type="button" className="tm-icon-btn" onClick={() => { setReplyTo(x); box.current?.focus(); }} aria-label={c.reply} title={c.reply}><ReplyIcon size={14} /></button>
                  {canDelete(x) && <button type="button" className="tm-icon-btn" onClick={() => remove(x)} aria-label={c.deleteComment} title={c.deleteComment}><XIcon size={14} /></button>}
                </div>
                {x.replyTo && (
                  <blockquote className="tm-quote" dir="auto">
                    <strong>{x.replyTo.byOwner ? c.owner : x.replyTo.member?.name || c.formerMember}</strong> {x.replyTo.body.slice(0, 140)}
                  </blockquote>
                )}
                <Body text={x.body} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="tm-error" role="alert">{msg(error)}</p>}
      <form className="tm-comment-form" onSubmit={send}>
        {replyTo && (
          <div className="tm-replying">
            <ReplyIcon size={14} /> {c.replyingTo(author(replyTo))}
            <button type="button" className="tm-icon-btn" onClick={() => setReplyTo(null)} aria-label={c.cancel}><XIcon size={13} /></button>
          </div>
        )}
        <div className="tm-mention-wrap">
          <textarea ref={box} className="fp-input" dir="auto" rows={2} value={text} onChange={onChange} onKeyDown={onKey}
            placeholder={`${c.writeComment} · ${c.mentionHint}`} maxLength={2000} aria-autocomplete="list" />
          {matches.length > 0 && (
            <ul className="tm-mention-list" role="listbox">
              {matches.map((p) => (
                <li key={p.username}>
                  <button type="button" role="option" aria-selected="false" onMouseDown={(e) => { e.preventDefault(); pickMention(p); }}>
                    <span className="tm-avatar">{p.username === ownerHandle ? "SS" : initials(p.name)}</span>
                    <span>{p.name}</span><span className="tm-muted">@{p.username}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button className="fp-btn" type="submit" disabled={busy || !text.trim()}>{busy ? c.sending : c.send}</button>
      </form>
    </section>
  );
}
