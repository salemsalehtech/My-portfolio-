// AdminProductEditor.jsx — edits one product and its landing page (/admin/products/:id), loaded
// on demand. Three parts:
//   Basics  — names, tagline, card summary (English + Arabic), link name, accent colour, live
//             demo link, the "Subscribe" form (a Form Builder form), published, and the cover picture
//   Blocks  — the page, top to bottom: add a block by type, move it up / down, remove it; each
//             type has its own fields (see lib/products.js and the Product model)
// Everything except pictures is saved together with "Save"; pictures upload at once (the cover
// to /cover, gallery pictures to /images — their id goes into the gallery item).
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { readAsBase64 } from "../../lib/readAsBase64";
import { slugify } from "../../lib/slug";
import { BLOCK_TYPES, blankBlock, blankItem, productCoverUrl, productImageUrl } from "../../lib/products";
import { useAdminT } from "../../lib/adminI18n";

const MAX_MB = 2;
const BLOCK_LABEL = {
  text: "Text (problem, solution, tech…)", features: "Features", gallery: "Screenshots",
  video: "Demo video (YouTube)", pricing: "Pricing plans", faq: "FAQ", reviews: "Client reviews",
};
const FIELDS = ["slug", "published", "order", "accent", "nameEn", "nameAr", "taglineEn", "taglineAr", "summaryEn", "summaryAr", "demoUrl", "formSlug", "blocks"];

export default function AdminProductEditor() {
  const { t } = useAdminT();
  const { id } = useParams();
  const [product, setProduct] = useState(null); // the saved version (for hasImage / updatedAt)
  const [form, setForm] = useState(null);
  const [forms, setForms] = useState([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);

  const take = (p) => { setProduct(p); setForm(Object.fromEntries(FIELDS.map((f) => [f, p[f]]))); setDirty(false); };
  useEffect(() => {
    api.get(`/admin/products/${id}`).then(take).catch((err) => setError(err.message));
    api.get("/admin/forms").then(setForms).catch(() => {});
  }, [id]);

  // Warn before leaving the page with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (!form) return <p className={error ? "admin-error" : ""}>{error || t("Loading…")}</p>;

  const set = (patch) => { setForm((f) => ({ ...f, ...patch })); setDirty(true); setStatus(""); };
  const field = (key) => ({ value: form[key] ?? "", onChange: (e) => set({ [key]: e.target.value }) });
  const setBlock = (i, patch) => set({ blocks: form.blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)) });
  const moveBlock = (i, step) => {
    const next = [...form.blocks];
    [next[i], next[i + step]] = [next[i + step], next[i]];
    set({ blocks: next });
  };

  const save = async (e) => {
    e?.preventDefault();
    setError("");
    setStatus(t("Saving…"));
    try {
      take(await api.put(`/admin/products/${id}`, form));
      setStatus(t("Saved"));
    } catch (err) {
      setStatus("");
      setError(err.message);
    }
  };

  const previewHref = `#/p/${product.slug}${product.published ? "" : `?preview=${product.id}`}`;
  return (
    <form className="admin-form pd-editor" onSubmit={save}>
      <p><Link to="/admin/products">{t("← Products")}</Link></p>
      <div className="pd-head">
        <h1 dir="auto">{form.nameEn || form.nameAr || t("Product")}</h1>
        <div className="pd-head-actions">
          <a className="admin-btn" href={previewHref} target="_blank" rel="noreferrer">{product.published ? t("View page ↗") : t("Preview ↗")}</a>
          <button type="submit" className="admin-btn admin-btn-primary">{t("Save")}</button>
        </div>
      </div>
      {dirty && <p className="admin-notice">{t("You have unsaved changes.")}</p>}
      {status && <p className="admin-sub">{status}</p>}
      {error && <p className="admin-error">{error}</p>}

      <section className="admin-linkbox pd-section">
        <h2>{t("Basics")}</h2>
        <BiField label={t("Name")} en={field("nameEn")} ar={field("nameAr")} maxLength={80} />
        <BiField label={t("Tagline — one line under the name")} en={field("taglineEn")} ar={field("taglineAr")} maxLength={200} />
        <BiField label={t("Card summary (home page)")} en={field("summaryEn")} ar={field("summaryAr")} maxLength={400} multiline />
        <div className="admin-form-row">
          <label>{t("Link name")}
            <span className="pd-slug"><span className="admin-sub">/p/</span><input className="form-input" dir="ltr" {...field("slug")} maxLength={60} required /></span>
            {form.nameEn && slugify(form.nameEn) !== form.slug && (
              <button type="button" className="tm-link-btn" onClick={() => set({ slug: slugify(form.nameEn) })}>{t("Use “{slug}”", { slug: slugify(form.nameEn) })}</button>
            )}
          </label>
          <label>{t("Accent colour")}
            <span className="pd-color"><input type="color" value={form.accent} onChange={(e) => set({ accent: e.target.value })} /><input className="form-input" dir="ltr" {...field("accent")} maxLength={7} /></span>
          </label>
        </div>
        <div className="admin-form-row">
          <label>{t("Live demo link (optional)")}<input className="form-input" type="url" dir="ltr" {...field("demoUrl")} placeholder="https://…" /></label>
          <label>{t("“Subscribe” opens this form")}
            <select className="form-input" {...field("formSlug")}>
              <option value="">{t("— None (buttons go to the contact section) —")}</option>
              {forms.map((f) => <option key={f.id} value={f.slug}>{f.titleEn || f.titleAr} ({f.slug})</option>)}
            </select>
          </label>
        </div>
        <div className="admin-form-row">
          <label>{t("Order (smaller = first)")}<input className="form-input" type="number" value={form.order} onChange={(e) => set({ order: Number(e.target.value) || 0 })} /></label>
          <label className="admin-check pd-publish"><input type="checkbox" checked={form.published} onChange={(e) => set({ published: e.target.checked })} />{t("Published — shown on the site")}</label>
        </div>
        <CoverPicture product={product} onChange={(p) => setProduct({ ...product, hasImage: p.hasImage, updatedAt: p.updatedAt })} />
      </section>

      <section className="pd-section">
        <h2>{t("Page blocks")}</h2>
        {form.blocks.length === 0 && <p className="admin-empty">{t("No blocks yet — add the first one below (e.g. Features, then Pricing).")}</p>}
        {form.blocks.map((block, i) => (
          <div className="admin-linkbox pd-block" key={block._id || `new-${i}`}>
            <div className="pd-block-head">
              <strong>{i + 1}. {t(BLOCK_LABEL[block.type])}</strong>
              <div className="actions">
                <button type="button" className="admin-btn" onClick={() => moveBlock(i, -1)} disabled={i === 0} aria-label={t("Move up")}>↑</button>
                <button type="button" className="admin-btn" onClick={() => moveBlock(i, 1)} disabled={i === form.blocks.length - 1} aria-label={t("Move down")}>↓</button>
                <button type="button" className="admin-btn admin-btn-danger" onClick={() => { if (confirm(t("Remove this block?"))) set({ blocks: form.blocks.filter((_, j) => j !== i) }); }} aria-label={t("Remove")}>✕</button>
              </div>
            </div>
            <BlockEditor block={block} productId={id} onChange={(patch) => setBlock(i, patch)} />
          </div>
        ))}
        {form.blocks.length < 20 && <AddBlock onAdd={(type) => set({ blocks: [...form.blocks, blankBlock(type)] })} />}
      </section>

      <div className="admin-form-actions pd-save-bar">
        {status && <span className="admin-sub" style={{ alignSelf: "center" }}>{status}</span>}
        <button type="submit" className="admin-btn admin-btn-primary">{t("Save")}</button>
      </div>
    </form>
  );
}

// English + Arabic versions of one text, side by side (stacked on phones).
function BiField({ label, en, ar, multiline, rows = 3, maxLength }) {
  const { t } = useAdminT();
  const Tag = multiline ? "textarea" : "input";
  return (
    <div className="pd-bi">
      <span className="pd-bi-label">{label}</span>
      <div className="admin-form-row">
        <label className="pd-bi-lang">English<Tag className="form-input" dir="ltr" rows={multiline ? rows : undefined} maxLength={maxLength} {...en} /></label>
        <label className="pd-bi-lang">{t("Arabic")}<Tag className="form-input" dir="rtl" rows={multiline ? rows : undefined} maxLength={maxLength} {...ar} /></label>
      </div>
    </div>
  );
}
// Same, for one key pair of an object (a block or an item).
const pair = (obj, onChange, base) => ({
  en: { value: obj[`${base}En`] ?? "", onChange: (e) => onChange({ [`${base}En`]: e.target.value }) },
  ar: { value: obj[`${base}Ar`] ?? "", onChange: (e) => onChange({ [`${base}Ar`]: e.target.value }) },
});

function AddBlock({ onAdd }) {
  const { t } = useAdminT();
  const [type, setType] = useState("features");
  return (
    <div className="pd-add">
      <select className="form-input" value={type} onChange={(e) => setType(e.target.value)} aria-label={t("Block type")}>
        {BLOCK_TYPES.map((bt) => <option key={bt} value={bt}>{t(BLOCK_LABEL[bt])}</option>)}
      </select>
      <button type="button" className="admin-btn admin-btn-primary" onClick={() => onAdd(type)}>{t("+ Add block")}</button>
    </div>
  );
}

// The fields of one block, by type.
function BlockEditor({ block, productId, onChange }) {
  const { t } = useAdminT();
  const items = block.items || [];
  const setItem = (i, patch) => onChange({ items: items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  const moveItem = (i, step) => { const next = [...items]; [next[i], next[i + step]] = [next[i + step], next[i]]; onChange({ items: next }); };
  const removeItem = (i) => onChange({ items: items.filter((_, j) => j !== i) });
  const titleHint = block.type === "text" ? t("Heading") : t("Heading (empty = the default one)");

  const itemLabels = {
    features: { one: t("Feature"), add: t("+ Add feature") },
    gallery: { one: t("Picture"), add: t("+ Add picture") },
    pricing: { one: t("Plan"), add: t("+ Add plan") },
    faq: { one: t("Question"), add: t("+ Add question") },
    reviews: { one: t("Review"), add: t("+ Add review") },
  }[block.type];

  return (
    <div className="pd-block-body">
      {block.type !== "video" && <BiField label={titleHint} {...pair(block, onChange, "title")} maxLength={160} />}
      {block.type === "text" && <BiField label={t("Text (Markdown: **bold**, - lists, ## headings)")} {...pair(block, onChange, "body")} multiline rows={6} maxLength={8000} />}
      {block.type === "video" && (
        <>
          <BiField label={t("Heading (empty = the default one)")} {...pair(block, onChange, "title")} maxLength={160} />
          <label>{t("YouTube link")}<input className="form-input" type="url" dir="ltr" value={block.url} onChange={(e) => onChange({ url: e.target.value })} placeholder="https://youtu.be/…" /></label>
        </>
      )}
      {itemLabels && (
        <div className="pd-items">
          {items.map((it, i) => (
            <div className="pd-item" key={i}>
              <div className="pd-item-head">
                <span className="admin-sub">{itemLabels.one} {i + 1}</span>
                <div className="actions">
                  <button type="button" className="admin-btn" onClick={() => moveItem(i, -1)} disabled={i === 0}>↑</button>
                  <button type="button" className="admin-btn" onClick={() => moveItem(i, 1)} disabled={i === items.length - 1}>↓</button>
                  <button type="button" className="admin-btn admin-btn-danger" onClick={() => removeItem(i)}>✕</button>
                </div>
              </div>
              <ItemFields type={block.type} item={it} productId={productId} onChange={(patch) => setItem(i, patch)} />
            </div>
          ))}
          {items.length < 24 && <button type="button" className="admin-btn" onClick={() => onChange({ items: [...items, blankItem()] })}>{itemLabels.add}</button>}
        </div>
      )}
    </div>
  );
}

function ItemFields({ type, item, productId, onChange }) {
  const { t } = useAdminT();
  const p = (base) => pair(item, onChange, base);
  if (type === "features") return (<>
    <BiField label={t("Feature name")} {...p("title")} maxLength={160} />
    <BiField label={t("Short description")} {...p("text")} multiline rows={2} maxLength={1500} />
  </>);
  if (type === "gallery") return (<>
    <GalleryPicture item={item} productId={productId} onChange={onChange} />
    <BiField label={t("Caption (optional)")} {...p("title")} maxLength={160} />
  </>);
  if (type === "pricing") return (<>
    <BiField label={t("Plan name")} {...p("title")} maxLength={160} />
    <div className="admin-form-row">
      <label>{t("Price per month — EGP")}<input className="form-input" type="number" min={0} value={item.priceEgp} onChange={(e) => onChange({ priceEgp: Math.max(0, Number(e.target.value) || 0) })} /></label>
      <label>{t("Price per month — USD")}<input className="form-input" type="number" min={0} value={item.priceUsd} onChange={(e) => onChange({ priceUsd: Math.max(0, Number(e.target.value) || 0) })} /></label>
    </div>
    <p className="admin-sub">{t("0 = shows “Ask us” instead of a price.")}</p>
    <BiField label={t("What's included — one per line")} {...p("text")} multiline rows={4} maxLength={1500} />
    <label className="admin-check"><input type="checkbox" checked={item.highlight} onChange={(e) => onChange({ highlight: e.target.checked })} />{t("Highlight as “Most popular”")}</label>
  </>);
  if (type === "faq") return (<>
    <BiField label={t("Question")} {...p("title")} maxLength={160} />
    <BiField label={t("Answer")} {...p("text")} multiline rows={3} maxLength={1500} />
  </>);
  if (type === "reviews") return (<>
    <BiField label={t("Client name")} {...p("title")} maxLength={160} />
    <BiField label={t("Their role / company (optional)")} {...p("subtitle")} maxLength={120} />
    <BiField label={t("What they said")} {...p("text")} multiline rows={3} maxLength={1500} />
  </>);
  return null;
}

// Upload / replace the picture of one gallery item.
function GalleryPicture({ item, productId, onChange }) {
  const { t } = useAdminT();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const upload = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) return setError(t("The image is too large (max {mb} MB).", { mb: MAX_MB }));
    setBusy(true);
    setError("");
    try {
      const { id } = await api.post(`/admin/products/${productId}/images`, { data: await readAsBase64(file) });
      onChange({ image: id });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="pd-picture">
      {item.image ? <img src={productImageUrl(item.image)} alt="" /> : <span className="pd-picture-empty">{t("No picture yet")}</span>}
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} hidden />
      <button type="button" className="admin-btn" onClick={() => input.current.click()} disabled={busy}>{busy ? t("Uploading…") : item.image ? t("Replace picture") : t("Upload picture")}</button>
      {error && <span className="admin-error">{error}</span>}
    </div>
  );
}

// The cover picture (hero screenshot + home page card). Uploads right away.
function CoverPicture({ product, onChange }) {
  const { t } = useAdminT();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const upload = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) return setError(t("The image is too large (max {mb} MB).", { mb: MAX_MB }));
    setBusy(true);
    setError("");
    try { onChange(await api.put(`/admin/products/${product.id}/cover`, { data: await readAsBase64(file) })); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const remove = async () => { onChange(await api.del(`/admin/products/${product.id}/cover`)); };
  return (
    <div className="pd-cover">
      <span className="pd-bi-label">{t("Cover picture — a screenshot of the product (PNG, JPEG or WebP, max 2 MB)")}</span>
      <div className="pd-picture">
        {product.hasImage ? <img src={productCoverUrl(product)} alt="" /> : <span className="pd-picture-empty">{t("No picture yet")}</span>}
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} hidden />
        <button type="button" className="admin-btn" onClick={() => input.current.click()} disabled={busy}>{busy ? t("Uploading…") : product.hasImage ? t("Replace picture") : t("Upload picture")}</button>
        {product.hasImage && <button type="button" className="admin-btn admin-btn-danger" onClick={remove}>{t("Remove")}</button>}
        {error && <span className="admin-error">{error}</span>}
      </div>
    </div>
  );
}
