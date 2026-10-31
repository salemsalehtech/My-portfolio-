// ProductPage.jsx — a product's landing page (/#/p/<slug>), loaded on demand. Built from the
// product's blocks (see lib/products.js and the Product model): a hero with the call-to-action
// buttons, then text / features / gallery / video / pricing / FAQ / reviews in the owner's order,
// and a closing "ready to start?" band. The product's accent colour themes the page (--accent).
//
// "Subscribe" opens the product's Form Builder form (/#/form/<formSlug>/<lang>) until online
// payments exist. Prices show in EGP or USD (a switch; Arabic starts with EGP).
// ?preview=<id> lets the logged-in owner see a draft (it is read through the admin API).
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useSite } from "../context/SiteContext";
import { pick } from "../lib/pick";
import { renderMarkdown } from "../lib/markdown";
import { youtubeId, youtubeEmbedUrl } from "../lib/youtube";
import { COMPANY } from "../lib/brand";
import { SunIcon, MoonIcon } from "../components/team/icons";
import { formatPrice, productCoverUrl, productImageUrl } from "../lib/products";
import BrandMark from "../components/BrandMark";

export default function ProductPage() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const preview = params.get("preview");
  const { t, lang, theme, toggleLang, toggleTheme } = useSite();
  const c = t.product;
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const [currency, setCurrency] = useState(lang === "ar" ? "EGP" : "USD");

  useEffect(() => {
    setProduct(null);
    const load = preview && localStorage.getItem("adminToken") ? api.get(`/admin/products/${preview}`) : api.get(`/products/${slug}`);
    load.then(setProduct).catch((err) => setError(err.message));
  }, [slug, preview]);
  useEffect(() => { setCurrency(lang === "ar" ? "EGP" : "USD"); }, [lang]);
  useEffect(() => {
    if (product) document.title = `${pick(lang, product.nameEn, product.nameAr)} · ${COMPANY}`;
  }, [product, lang]);

  const L = (en, ar) => pick(lang, en, ar);
  // Text in the language actually shown gets the matching direction (an Arabic text starting
  // with an English word would otherwise be laid out left to right).
  const dirOf = (en, ar) => (pick(lang, en, ar) === ar && ar ? "rtl" : "ltr");

  const header = (
    <header className="blog-header">
      <Link to="/" className="nav-logo">
        <BrandMark height={26} className="nav-badge" />
        <span className="nav-name">{COMPANY}</span>
      </Link>
      <nav className="blog-header-links">
        <Link to="/" className="nav-link">{t.nav.home}</Link>
        <Link to="/" state={{ scrollTo: "products" }} className="nav-link">{t.nav.products}</Link>
      </nav>
      <div className="blog-header-actions">
        <button className="btn-lang" onClick={toggleLang}>{lang === "en" ? "AR" : "EN"}</button>
        <button className="btn-theme" onClick={toggleTheme} aria-label="Theme">{theme === "dark" ? <SunIcon size={17} /> : <MoonIcon size={17} />}</button>
      </div>
    </header>
  );

  if (!product) {
    return (
      <div className="pp">
        {header}
        <main className="pp-empty">
          {error ? (<><h1>{error === "Product not found" ? c.notFound : error}</h1><Link className="pp-btn" to="/">{c.backHome}</Link></>) : <p>…</p>}
        </main>
      </div>
    );
  }

  const name = L(product.nameEn, product.nameAr);
  const formLink = product.formSlug ? `/form/${product.formSlug}/${lang}` : null;
  const hasPricing = product.blocks.some((b) => b.type === "pricing" && b.items.length);
  const subscribe = (label = c.subscribe, cls = "pp-btn") =>
    formLink ? <Link className={cls} to={formLink}>{label}</Link> : <Link className={cls} to="/" state={{ scrollTo: "contact" }}>{c.contact}</Link>;

  return (
    <div className="pp" style={{ "--accent": product.accent }}>
      {header}
      {preview && !product.published && <p className="pp-draft">{c.draft}</p>}

      <section className="pp-hero">
        <div className="pp-hero-text">
          <span className="pp-eyebrow">{COMPANY}</span>
          <h1 dir={dirOf(product.nameEn, product.nameAr)}>{name}</h1>
          {L(product.taglineEn, product.taglineAr) && <p className="pp-tagline" dir={dirOf(product.taglineEn, product.taglineAr)}>{L(product.taglineEn, product.taglineAr)}</p>}
          <div className="pp-actions">
            {subscribe()}
            {product.demoUrl && <a className="pp-btn pp-btn-ghost" href={product.demoUrl} target="_blank" rel="noopener noreferrer">{c.demo} ↗</a>}
            {hasPricing && <a className="pp-text-link" href="#pricing" onClick={(e) => { e.preventDefault(); document.getElementById("pp-pricing")?.scrollIntoView({ behavior: "smooth" }); }}>{c.seePricing}</a>}
          </div>
        </div>
        {product.hasImage && (
          <div className="pp-shot">
            <div className="pp-shot-bar"><span /><span /><span /></div>
            <img src={productCoverUrl(product)} alt={name} />
          </div>
        )}
      </section>

      {product.blocks.map((block, i) => (
        <Block key={block._id || i} block={block} lang={lang} c={c} L={L} dirOf={dirOf} currency={currency} setCurrency={setCurrency} formLink={formLink} />
      ))}

      <section className="pp-final">
        <h2>{c.readyTitle}</h2>
        <p>{c.readyText}</p>
        <div className="pp-actions pp-actions-center">
          {subscribe(c.startNow)}
          <Link className="pp-btn pp-btn-ghost" to="/" state={{ scrollTo: "contact" }}>{c.contact}</Link>
        </div>
      </section>

      <footer className="pp-footer">
        <span>© {new Date().getFullYear()} {COMPANY}</span>
        <Link to="/">{c.backHome}</Link>
      </footer>
    </div>
  );
}

// One block of the page. Empty titles fall back to a default per type ("Features", "Pricing"…).
function Block({ block, lang, c, L, dirOf, currency, setCurrency, formLink }) {
  const title = L(block.titleEn, block.titleAr) || c.titles[block.type] || "";
  const titleDir = block.titleEn || block.titleAr ? dirOf(block.titleEn, block.titleAr) : undefined;
  const items = block.items || [];
  const heading = title && <h2 className="pp-h2" dir={titleDir}>{title}</h2>;

  if (block.type === "text") {
    const body = L(block.bodyEn, block.bodyAr);
    return (
      <section className="pp-block pp-text">
        {heading}
        {body && <div className="prose pp-prose" dir={dirOf(block.bodyEn, block.bodyAr)} dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />}
      </section>
    );
  }
  if (block.type === "features") {
    return (
      <section className="pp-block">
        {heading}
        <div className="pp-features">
          {items.map((it, i) => (
            <article className="pp-feature" key={i}>
              <span className="pp-feature-num">{String(i + 1).padStart(2, "0")}</span>
              <h3 dir={dirOf(it.titleEn, it.titleAr)}>{L(it.titleEn, it.titleAr)}</h3>
              {L(it.textEn, it.textAr) && <p dir={dirOf(it.textEn, it.textAr)}>{L(it.textEn, it.textAr)}</p>}
            </article>
          ))}
        </div>
      </section>
    );
  }
  if (block.type === "gallery") {
    const pics = items.filter((it) => it.image);
    if (!pics.length) return null;
    return (
      <section className="pp-block">
        {heading}
        <div className="pp-gallery">
          {pics.map((it, i) => (
            <figure key={i}>
              <a href={productImageUrl(it.image)} target="_blank" rel="noopener noreferrer"><img src={productImageUrl(it.image)} alt={L(it.titleEn, it.titleAr)} loading="lazy" /></a>
              {L(it.titleEn, it.titleAr) && <figcaption dir={dirOf(it.titleEn, it.titleAr)}>{L(it.titleEn, it.titleAr)}</figcaption>}
            </figure>
          ))}
        </div>
      </section>
    );
  }
  if (block.type === "video") {
    const id = youtubeId(block.url);
    if (!id) return null;
    return (
      <section className="pp-block">
        {heading}
        <div className="pp-video"><iframe src={youtubeEmbedUrl(id)} title={title} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>
      </section>
    );
  }
  if (block.type === "pricing") {
    const field = currency === "EGP" ? "priceEgp" : "priceUsd";
    return (
      <section className="pp-block" id="pp-pricing">
        {heading}
        <div className="pp-currency" role="group" aria-label={c.currency}>
          {["EGP", "USD"].map((cur) => (
            <button key={cur} type="button" className={currency === cur ? "is-on" : ""} aria-pressed={currency === cur} onClick={() => setCurrency(cur)}>{c.currencies[cur]}</button>
          ))}
        </div>
        <div className="pp-plans">
          {items.map((it, i) => {
            const lines = L(it.textEn, it.textAr).split("\n").map((l) => l.trim()).filter(Boolean);
            return (
              <article className={`pp-plan ${it.highlight ? "is-highlight" : ""}`} key={i}>
                {it.highlight && <span className="pp-plan-badge">{c.popular}</span>}
                <h3 dir={dirOf(it.titleEn, it.titleAr)}>{L(it.titleEn, it.titleAr)}</h3>
                <p className="pp-price">
                  {it[field] > 0 ? <><strong>{formatPrice(it[field], currency, lang)}</strong><span>{c.perMonth}</span></> : <strong className="pp-price-ask">{c.askPrice}</strong>}
                </p>
                {lines.length > 0 && <ul dir={dirOf(it.textEn, it.textAr)}>{lines.map((l, j) => <li key={j}>{l}</li>)}</ul>}
                {formLink
                  ? <Link className={it.highlight ? "pp-btn" : "pp-btn pp-btn-ghost"} to={formLink}>{c.subscribe}</Link>
                  : <Link className="pp-btn pp-btn-ghost" to="/" state={{ scrollTo: "contact" }}>{c.contact}</Link>}
              </article>
            );
          })}
        </div>
      </section>
    );
  }
  if (block.type === "faq") {
    return (
      <section className="pp-block pp-narrow">
        {heading}
        <div className="pp-faq">
          {items.map((it, i) => (
            <details key={i}>
              <summary dir={dirOf(it.titleEn, it.titleAr)}>{L(it.titleEn, it.titleAr)}</summary>
              <p dir={dirOf(it.textEn, it.textAr)}>{L(it.textEn, it.textAr)}</p>
            </details>
          ))}
        </div>
      </section>
    );
  }
  if (block.type === "reviews") {
    return (
      <section className="pp-block">
        {heading}
        <div className="pp-reviews">
          {items.map((it, i) => (
            <figure className="pp-review" key={i}>
              <blockquote dir={dirOf(it.textEn, it.textAr)}>“{L(it.textEn, it.textAr)}”</blockquote>
              <figcaption><strong dir="auto">{L(it.titleEn, it.titleAr)}</strong>{L(it.subtitleEn, it.subtitleAr) && <span dir="auto">{L(it.subtitleEn, it.subtitleAr)}</span>}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    );
  }
  return null;
}
