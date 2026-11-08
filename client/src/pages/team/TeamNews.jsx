// TeamNews.jsx — the "Announcements" tab (/#/team/news): messages from the owner to the whole
// team — text (Markdown) with files and voice notes. Pinned ones come first. "Got it" tells the
// owner this member has read it (POST /api/team/announcements/:id/read).
import { useState } from "react";
import { api } from "../../lib/api";
import { timeAgo } from "../../lib/team";
import MarkdownView from "../../components/team/MarkdownView";
import Attachments from "../../components/team/Attachments";
import BrandLoader from "../../components/BrandLoader";
import { CheckIcon, PinIcon } from "../../components/team/icons";
import { useTeam } from "./TeamPortal";
import { useWork } from "./WorkContext";

export default function TeamNews() {
  const { t, lang, msg } = useTeam();
  const { news, loading, error, markNewsRead } = useWork();
  return (
    <main className="tm-page">
      <header className="tm-pagehead">
        <h1>{t.news}</h1>
        <p className="tm-muted">{t.newsIntro}</p>
      </header>
      {error && <p className="tm-error">{error}</p>}
      {loading ? <BrandLoader label={t.loading} /> : (
        <>
          {news.items.length === 0 && <p className="tm-empty">{t.newsEmpty}</p>}
          <div className="tm-news">
            {news.items.map((a) => <NewsItem key={a.id} item={a} t={t} lang={lang} msg={msg} onRead={markNewsRead} />)}
          </div>
        </>
      )}
    </main>
  );
}

function NewsItem({ item, t, lang, msg, onRead }) {
  const [busy, setBusy] = useState(false);
  const read = async () => {
    setBusy(true);
    try { await api.post(`/team/announcements/${item.id}/read`); onRead(item.id); } finally { setBusy(false); }
  };
  return (
    <article className={`cut-card tm-newsitem ${item.read ? "" : "is-unread"}`}>
      <header className="tm-newsitem-head">
        <div>
          {item.pinned && <span className="tm-pill"><PinIcon size={12} /> {t.pinned}</span>}
          {!item.read && <span className="tm-pill is-new">{t.newsNew}</span>}
          <h2 dir="auto">{item.title}</h2>
          <span className="tm-muted tm-small">{timeAgo(item.publishedAt, lang)}</span>
        </div>
      </header>
      {item.body && <MarkdownView text={item.body} />}
      <Attachments path={`/team/announcements/${item.id}/attachments`} filePath={(f) => `/team/attachments/${f.id}`} lang={lang} msg={msg} />
      <div className="tm-newsitem-foot">
        {item.read
          ? <span className="tm-muted tm-small"><CheckIcon size={13} /> {t.newsDone}</span>
          : <button className="fp-btn" onClick={read} disabled={busy}><CheckIcon size={15} /> {t.newsRead}</button>}
      </div>
    </article>
  );
}
