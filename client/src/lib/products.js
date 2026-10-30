// products.js — shared helpers for product landing pages: the public page (pages/ProductPage.jsx),
// the home page section (components/Products.jsx) and the editor (pages/admin/AdminProductEditor.jsx).
// Block types and item fields match the Product model in server/src/lib/mongo.js.
import { API_BASE } from "./api";
import { slugify } from "./slug";

export const BLOCK_TYPES = ["text", "features", "gallery", "video", "pricing", "faq", "reviews"];

export const blankItem = () => ({ titleEn: "", titleAr: "", subtitleEn: "", subtitleAr: "", textEn: "", textAr: "", priceEgp: 0, priceUsd: 0, highlight: false, image: null });
export const blankBlock = (type) => ({ type, titleEn: "", titleAr: "", bodyEn: "", bodyAr: "", url: "", items: type === "text" || type === "video" ? [] : [blankItem()] });

// A link name for a new product: from the name if it has Latin letters, otherwise "product-xxxx".
export const productSlug = (name) => slugify(name) || `product-${Date.now().toString(36)}`;
// A name typed in Arabic goes to the Arabic field, anything else to the English one.
export const nameFields = (name) => (/[\u0600-\u06FF]/.test(name) ? { nameAr: name } : { nameEn: name });

export const productCoverUrl = (p) => `${API_BASE}/products/${p.id}/cover?v=${encodeURIComponent(p.updatedAt || "")}`;
export const productImageUrl = (id) => `${API_BASE}/products/images/${id}`;

// 499 → "EGP 499" / "‏499 ج.م.‏", 15 → "US$15" / "15 US$". Whole numbers only.
export const formatPrice = (amount, currency, lang) =>
  new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
