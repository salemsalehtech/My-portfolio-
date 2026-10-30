// AdminProducts.jsx — the product list (/admin/products), loaded on demand. Each product has a
// landing page at /#/p/<slug>; "New product" asks for a name, makes a draft and opens the editor
// (AdminProductEditor.jsx). A team project can also become a product from its Settings tab.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { productCoverUrl, productSlug, nameFields } from "../../lib/products";
import { useAdminT } from "../../lib/adminI18n";

export default function AdminProducts() {
  const { t } = useAdminT();
  const navigate = useNavigate();
  const [products, setProducts] = useState(null);
  const [error, setError] = useState("");
  const load = () => api.get("/admin/products").then(setProducts).catch((err) => setError(err.message));
  useEffect(() => { load(); }, []);

  const create = async () => {
    const name = window.prompt(t("Product name"));
    if (!name || !name.trim()) return;
    try {
      const product = await api.post("/admin/products", { ...nameFields(name.trim()), slug: productSlug(name) });
      navigate(`/admin/products/${product.id}`);
    } catch (err) {
      setError(err.message);
    }
  };
  const togglePublished = async (p) => { await api.put(`/admin/products/${p.id}`, { published: !p.published }); load(); };
  const remove = async (p) => {
    if (!confirm(t("Delete “{name}” and its page? This cannot be undone.", { name: p.nameEn || p.nameAr }))) return;
    await api.del(`/admin/products/${p.id}`);
    load();
  };

  return (
    <div>
      <h1>{t("Products")}</h1>
      <p className="admin-sub" style={{ marginBottom: 16 }}>{t("Each product gets its own landing page on the site, and a card in the Products section.")}</p>
      <div className="admin-toolbar"><button className="admin-btn admin-btn-primary" onClick={create}>{t("+ New product")}</button></div>
      {error && <p className="admin-error">{error}</p>}
      {products === null && !error && <p>{t("Loading…")}</p>}
      {products && (
        <table className="admin-table">
          <thead><tr><th></th><th>{t("Product")}</th><th>{t("Link")}</th><th>{t("Status")}</th><th></th></tr></thead>
          <tbody>
            {products.length === 0 && <tr><td colSpan={5} className="admin-empty">{t("No products yet — the section is hidden on the site until you publish one.")}</td></tr>}
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.hasImage ? <img className="admin-thumb" src={productCoverUrl(p)} alt="" /> : <span className="pd-swatch" style={{ background: p.accent }} />}</td>
                <td><Link to={`/admin/products/${p.id}`}><strong dir="auto">{p.nameEn || p.nameAr}</strong></Link>{p.nameEn && p.nameAr && <div className="admin-sub" dir="rtl">{p.nameAr}</div>}</td>
                <td><code>/p/{p.slug}</code></td>
                <td>{p.published ? <span className="tm-pill">{t("Published")}</span> : <span className="tm-pill is-off">{t("Draft")}</span>}</td>
                <td className="actions">
                  <Link className="admin-btn" to={`/admin/products/${p.id}`}>{t("Edit")}</Link>
                  <a className="admin-btn" href={`#/p/${p.slug}${p.published ? "" : `?preview=${p.id}`}`} target="_blank" rel="noreferrer">{p.published ? t("View") : t("Preview")}</a>
                  <button className="admin-btn" onClick={() => togglePublished(p)}>{p.published ? t("Unpublish") : t("Publish")}</button>
                  <button className="admin-btn admin-btn-danger" onClick={() => remove(p)}>{t("Delete")}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
