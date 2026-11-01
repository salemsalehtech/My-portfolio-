// YouTube.jsx — the "YouTube Channel" section (id="youtube"): a channel-info card plus a list
// of videos fetched live from the public GET /youtube API via useCollection(). Each video links
// out to YouTube directly (there's no in-page player). A video link shows YouTube's own
// thumbnail; a link without a video id (a channel or a playlist page) keeps the plain ink tile.
//
// Props: `settings` — the site-wide profile content from Admin → "Profile & Links" (loaded in
// pages/Portfolio.jsx): the channel link, its @handle (read from the link) and the description.
import { useSite } from "../context/SiteContext";
import { useReveal } from "../hooks/useReveal";
import { useCollection } from "../hooks/useCollection";
import { pick, youtubeHandle } from "../lib/pick";
import { YoutubeIcon } from "../lib/socialIcons";
import { ArrowIcon } from "./ArrowIcon";

// "https://www.youtube.com/watch?v=zBw1ZlFd-HY&list=…" / "https://youtu.be/zBw1ZlFd-HY" → "zBw1ZlFd-HY"
const videoId = (url) => (String(url || "").match(/(?:[?&]v=|youtu\.be\/|\/embed\/|\/shorts\/)([\w-]{11})/) || [])[1];

export default function YouTube({ settings }) {
  const { t, lang } = useSite();
  const channelUrl = settings.youtubeUrl;
  const { data: videos } = useCollection("/youtube");
  const [headerRef, headerVisible] = useReveal();
  const [cardRef, cardVisible] = useReveal();
  const [listRef, listVisible] = useReveal();

  return (
    <section id="youtube" className="section-bg">
      <div className="yt-bg-glow"></div>
      <div className="container">
        <div ref={headerRef} className={`section-header ${headerVisible ? "visible" : ""}`} data-ao>
          <div className="section-badge">{t.youtube.subtitle}</div>
          <h2>{t.youtube.title}</h2>
          <div className="section-line"></div>
        </div>

        <div className="yt-grid">
          <div ref={cardRef} className={`yt-channel-card ${cardVisible ? "visible" : ""}`} data-ao>
            <div className="yt-logo">
              <YoutubeIcon size={32} fill="white" />
            </div>
            <h3>{pick(lang, settings.nameEn, settings.nameAr)}</h3>
            {channelUrl && <p className="yt-handle">{youtubeHandle(channelUrl)}</p>}
            <p className="yt-desc">{pick(lang, settings.channelDescEn, settings.channelDescAr)}</p>
            {channelUrl && (
              <a href={channelUrl} target="_blank" rel="noopener noreferrer" className="btn-primary yt-subscribe">
                <YoutubeIcon size={16} />
                {t.youtube.subscribe}
              </a>
            )}
          </div>

          <div ref={listRef} className={`yt-videos ${listVisible ? "visible" : ""}`} data-ao="right">
            {videos.map((video) => {
              const title = lang === "ar" ? video.titleAr : video.titleEn;
              const sub = lang === "ar" ? video.subAr : video.subEn;
              const id = videoId(video.url);
              return (
                <a href={video.url} target="_blank" rel="noopener noreferrer" className="yt-video cut-card" key={video.id}>
                  <div className="yt-thumb">
                    {id && <img src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`} alt="" loading="lazy" />}
                    <div className="yt-thumb-overlay"></div>
                    <div className="yt-play">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="#CC0000"><polygon points="3,1 11,6 3,11" /></svg>
                    </div>
                  </div>
                  <div className="yt-info">
                    <h4 className="yt-title">{title}</h4>
                    <p className="yt-sub">{sub}</p>
                  </div>
                  <span className="yt-go"><ArrowIcon /></span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
