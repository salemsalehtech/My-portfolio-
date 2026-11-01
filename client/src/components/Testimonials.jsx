// Testimonials.jsx — the "What Clients Say" section (id="testimonials"): equal cards with the
// client's words, rating, name, role, and (when chosen in Admin → Testimonials) the project the
// review is about, which opens that project's case study. The list comes from the public
// GET /testimonials API (only the ones marked visible); Portfolio.jsx fetches it and passes it in
// as `items` / `loading`, because the Navbar also needs to know if it's empty.
//
// If there are no testimonials the whole section is skipped, so the page never shows an
// empty box. As in About.jsx, the component that renders the content is separate from this
// one: useReveal() (fade-in on scroll) only watches elements that exist when its component
// first mounts, and the content mounts after the data has arrived.
//
// TestimonialCard is also the live preview in the dashboard's testimonial form.
import { useSite } from "../context/SiteContext";
import { useReveal } from "../hooks/useReveal";
import { ArrowIcon } from "./ArrowIcon";

export default function Testimonials({ items, loading }) {
  if (loading || items.length === 0) return null;
  return <TestimonialsContent items={items} />;
}

// The rating as five pads (filled = earned), read out as "5 out of 5".
function Rating({ rating, label }) {
  return (
    <div className="testimonial-rating" role="img" aria-label={label.replace("{n}", rating)}>
      {[1, 2, 3, 4, 5].map((n) => <span key={n} className={n <= rating ? "on" : ""} />)}
    </div>
  );
}

// Projects.jsx listens for this and opens the project's case study.
const openProject = (id) => window.dispatchEvent(new CustomEvent("open-project", { detail: { id } }));

// One review. `item.project` is { id, titleEn, titleAr } or null.
export function TestimonialCard({ item }) {
  const { t, lang } = useSite();
  // The site's language first; a review written in one language only falls back to it.
  const pick = (en, ar) => (lang === "ar" ? ar || en : en || ar);
  const project = item.project && pick(item.project.titleEn, item.project.titleAr);
  const name = (item.authorName || "").trim();

  return (
    <figure className="testimonial-card cut-card">
      <div className="testimonial-head">
        <span className="testimonial-mark" aria-hidden="true">“</span>
        <Rating rating={Number(item.rating) || 5} label={t.testimonials.rating} />
      </div>
      <blockquote className="testimonial-text" dir="auto">{pick(item.textEn, item.textAr)}</blockquote>
      {project && (
        <button type="button" className="testimonial-project" onClick={() => openProject(item.project.id)}>
          <span>{t.testimonials.about}</span> <bdi>{project}</bdi> <ArrowIcon size={14} />
        </button>
      )}
      <figcaption className="testimonial-author">
        <div className="testimonial-avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</div>
        <div className="testimonial-who">
          <div className="testimonial-name" dir="auto">{name}</div>
          {pick(item.roleEn, item.roleAr) && <div className="testimonial-role" dir="auto">{pick(item.roleEn, item.roleAr)}</div>}
        </div>
      </figcaption>
    </figure>
  );
}

function TestimonialsContent({ items }) {
  const { t } = useSite();
  const [headerRef, headerVisible] = useReveal();
  const [gridRef, gridVisible] = useReveal();

  return (
    <section id="testimonials" className="section-bg">
      <div className="container">
        <div ref={headerRef} className={`section-header ${headerVisible ? "visible" : ""}`} data-ao>
          <div className="section-badge">{t.testimonials.subtitle}</div>
          <h2>{t.testimonials.title}</h2>
        </div>

        <div ref={gridRef} className={`testimonials-grid ${gridVisible ? "visible" : ""}`} data-ao>
          {items.map((item) => <TestimonialCard item={item} key={item.id} />)}
        </div>
      </div>
    </section>
  );
}
