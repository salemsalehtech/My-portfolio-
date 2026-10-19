// YouTube.jsx — the "YouTube Channel" section (id="youtube"): a static channel-info card
// plus a list of videos fetched live from the public GET /youtube API via useCollection().
// Each video links out to YouTube directly (there's no in-page player).
import { useSite } from "../context/SiteContext";
import { useReveal } from "../hooks/useReveal";
import { useCollection } from "../hooks/useCollection";

export default function YouTube() {
  const { t, lang } = useSite();
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
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 00.5 6.2 31 31 0 000 12a31 31 0 00.5 5.8 3 3 0 002.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 002.1-2.1A31 31 0 0024 12a31 31 0 00-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" /></svg>
            </div>
            <h3>Salem Saleh</h3>
            <p className="yt-handle">@SalemSaleh1</p>
            <p className="yt-desc">{t.youtube.channelDesc}</p>
            <a href="https://www.youtube.com/@SalemSaleh1" target="_blank" rel="noopener noreferrer" className="btn-youtube">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 00.5 6.2 31 31 0 000 12a31 31 0 00.5 5.8 3 3 0 002.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 002.1-2.1A31 31 0 0024 12a31 31 0 00-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" /></svg>
              {t.youtube.subscribe}
            </a>
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
