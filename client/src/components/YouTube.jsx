// YouTube.jsx — the "YouTube Channel" section (id="youtube"): a channel-info card plus a list
// of videos fetched live from the public GET /youtube API via useCollection(). Each video links
// out to YouTube directly (there's no in-page player).
//
// Props: `settings` — the site-wide profile content from Admin → "Profile & Links" (loaded in
// pages/Portfolio.jsx): the channel link, its @handle (read from the link) and the description.
import { useSite } from "../context/SiteContext";
import { useReveal } from "../hooks/useReveal";
import { useCollection } from "../hooks/useCollection";
import { pick, youtubeHandle } from "../lib/pick";
import { YoutubeIcon } from "../lib/socialIcons";

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
              <a href={channelUrl} target="_blank" rel="noopener noreferrer" className="btn-youtube">
                <YoutubeIcon size={15} />
                {t.youtube.subscribe}
              </a>
            )}
          </div>

          <div ref={listRef} className={`yt-videos ${listVisible ? "visible" : ""}`} data-ao="right">
            {videos.map((video) => {
              const title = lang === "ar" ? video.titleAr : video.titleEn;
              const sub = lang === "ar" ? video.subAr : video.subEn;
              return (
                <a href={video.url} target="_blank" rel="noopener noreferrer" className="yt-video" key={video.id}>
                  <div className="yt-thumb" style={{ background: video.gradient }}>
                    <div className="yt-thumb-overlay"></div>
                    <div className="yt-play">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="#CC0000"><polygon points="3,1 11,6 3,11" /></svg>
                    </div>
                  </div>
                  <div className="yt-info">
                    <h4 className="yt-title">{title}</h4>
                    <p className="yt-sub">{sub}</p>
                  </div>
                  <div className="yt-icon-btn">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="#FF0000"><polygon points="5,3 19,12 5,21" /></svg>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
