// Products.jsx — the "Products" section of the home page (id="products"): one card per published
// product (cover picture, name, tagline, a short summary) that opens its landing page /#/p/<slug>.
// Portfolio.jsx fetches GET /products and passes the list in (the Navbar needs to know if it's
// empty); with no products the whole section is skipped. Each card wears the product's accent colour.
import { Link } from "react-router-dom";
import { useSite } from "../context/SiteContext";
import { useReveal } from "../hooks/useReveal";
import { pick } from "../lib/pick";
import { productCoverUrl } from "../lib/products";

export default function Products({ items, loading }) {
  if (loading || items.length === 0) return null;
  return <ProductsContent items={items} />;
}

function ProductsContent({ items }) {
  const { t, lang } = useSite();
  const [headerRef, headerVisible] = useReveal();
  const [gridRef, gridVisible] = useReveal();
  const dirOf = (en, ar) => (pick(lang, en, ar) === ar ? "rtl" : "ltr");

  return (
    <section id="products" className="section-bg">
      <div className="container">
        <div ref={headerRef} className={`section-header ${headerVisible ? "visible" : ""}`} data-ao>
          <div className="section-badge">{t.products.subtitle}</div>
          <h2>{t.products.title}</h2>
          <div className="section-line"></div>
        </div>

        <div ref={gridRef} className={`certs-grid ${gridVisible ? "visible" : ""}`} data-ao>
          {items.map((p) => {
            const summary = pick(lang, p.summaryEn, p.summaryAr) || pick(lang, p.taglineEn, p.taglineAr);
            return (
              <Link className="cert-card product-card" key={p.id} to={`/p/${p.slug}`} style={{ "--accent": p.accent }}>
                <div className={`cert-image ${p.hasImage ? "" : "cert-image-empty"}`}>
                  {p.hasImage ? <img src={productCoverUrl(p)} alt="" loading="lazy" /> : <span className="product-card-initial">{pick(lang, p.nameEn, p.nameAr).slice(0, 1)}</span>}
                </div>
                <div className="cert-body">
                  <h3 className="cert-title" dir={dirOf(p.nameEn, p.nameAr)}>{pick(lang, p.nameEn, p.nameAr)}</h3>
                  {summary && <p className="course-desc" dir="auto">{summary}</p>}
                  <span className="cert-link product-card-link">{t.products.view} <span aria-hidden="true">{lang === "ar" ? "←" : "→"}</span></span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
