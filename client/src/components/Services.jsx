// Services.jsx — the "What I Offer" section (id="services"): cards, each with an icon, a
// title and a short description. The list comes from the public GET /services API (only the
// visible ones, managed in Admin → Services); Portfolio.jsx fetches it and passes it in as
// `items` / `loading`, because the Navbar also needs to know if it's empty.
//
// If there are no services the whole section is skipped. As in About.jsx / Testimonials.jsx,
// the content is a separate component: useReveal() (fade-in on scroll) only watches the
// elements that exist when its component first mounts, and the content mounts after the data.
import { useSite } from "../context/SiteContext";
import { useReveal } from "../hooks/useReveal";
import { serviceIcon } from "../lib/serviceIcons";

export default function Services({ items, loading }) {
  if (loading || items.length === 0) return null;
  return <ServicesContent items={items} />;
}

function ServicesContent({ items }) {
  const { t, lang } = useSite();
  const [headerRef, headerVisible] = useReveal();
  const [gridRef, gridVisible] = useReveal();
  // Current language first; if a text exists in only one language, show that one.
  const pick = (en, ar) => (lang === "ar" ? ar || en : en || ar);

  return (
    <section id="services" className="section-bg">
      <div className="section-bg-circle" style={{ top: "-60px", left: "-60px" }}></div>
      <div className="container">
        <div ref={headerRef} className={`section-header ${headerVisible ? "visible" : ""}`} data-ao>
          <div className="section-badge">{t.services.subtitle}</div>
          <h2>{t.services.title}</h2>
          <div className="section-line"></div>
        </div>

        <div ref={gridRef} className={`services-grid ${gridVisible ? "visible" : ""}`} data-ao>
          {items.map((item) => (
            <div className="service-card" key={item.id}>
              <div className="service-icon">{serviceIcon(item.icon)}</div>
              <h3 className="service-title" dir="auto">{pick(item.titleEn, item.titleAr)}</h3>
              <p className="service-desc" dir="auto">{pick(item.descEn, item.descAr)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
