// Testimonials.jsx — the "What Clients Say" section (id="testimonials"): cards with the
// client's words, star rating, name and role. The list comes from the public GET /testimonials
// API (only the ones marked visible, managed in Admin → Testimonials); Portfolio.jsx fetches it
// and passes it in as `items` / `loading`, because the Navbar also needs to know if it's empty.
//
// If there are no testimonials the whole section is skipped, so the page never shows an
// empty box. As in About.jsx, the component that renders the content is separate from this
// one: useReveal() (fade-in on scroll) only watches elements that exist when its component
// first mounts, and the content mounts after the data has arrived.
import { useSite } from "../context/SiteContext";
import { useReveal } from "../hooks/useReveal";

export default function Testimonials({ items, loading }) {
  if (loading || items.length === 0) return null;
  return <TestimonialsContent items={items} />;
}

function Stars({ rating }) {
  return (
    <div className="testimonial-stars" aria-label={`${rating} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= rating ? "on" : ""}>★</span>
      ))}
    </div>
  );
}

function TestimonialsContent({ items }) {
  const { t, lang } = useSite();
  const [headerRef, headerVisible] = useReveal();
  const [gridRef, gridVisible] = useReveal();
  // Show the text in the site's current language when it exists; a testimonial a client wrote
  // in just one language falls back to that one (never an empty card).
  const pick = (en, ar) => (lang === "ar" ? ar || en : en || ar);

  return (
    <section id="testimonials" className="section-bg">
      <div className="container">
        <div ref={headerRef} className={`section-header ${headerVisible ? "visible" : ""}`} data-ao>
          <div className="section-badge">{t.testimonials.subtitle}</div>
          <h2>{t.testimonials.title}</h2>
          <div className="section-line"></div>
        </div>

        <div ref={gridRef} className={`testimonials-grid ${gridVisible ? "visible" : ""}`} data-ao>
          {items.map((item) => (
            <figure className="testimonial-card" key={item.id}>
              <Stars rating={item.rating} />
              <blockquote className="testimonial-text">{pick(item.textEn, item.textAr)}</blockquote>
              <figcaption className="testimonial-author">
                <div className="testimonial-avatar">{item.authorName.trim().charAt(0).toUpperCase()}</div>
                <div>
                  <div className="testimonial-name">{item.authorName}</div>
                  <div className="testimonial-role">{pick(item.roleEn, item.roleAr)}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
