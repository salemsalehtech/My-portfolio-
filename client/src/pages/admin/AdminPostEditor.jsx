// AdminPostEditor.jsx — write or edit one blog post (/admin/posts/new and /admin/posts/:id).
// Loaded on demand (React.lazy in App.jsx) because it uses the Markdown libraries.
//
// - Title / excerpt / body in English and Arabic (fill at least one title; a post may be in one
//   language only — the site then shows that language).
// - The link name (slug) is built from the English title until you edit it yourself; it may only
//   use a-z, 0-9 and dashes (an Arabic-only post needs one typed by hand).
// - The body is Markdown, with a Write / Preview switch that renders exactly like the site.
// - "Save draft" keeps it private; "Publish" makes it visible on the site.
// The cover picture is uploaded from the posts list (AdminPosts.jsx) after the first save.
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { renderMarkdown, readingMinutes } from "../../lib/markdown";
import { Field } from "./FormParts";
import { slugify } from "../../lib/slug";
import { useAdminT } from "../../lib/adminI18n";

const EMPTY = { slug: "", titleEn: "", titleAr: "", excerptEn: "", excerptAr: "", bodyEn: "", bodyAr: "", tags: [], published: false };


export default function AdminPostEditor() {
  const { t } = useAdminT();
  const { id } = useParams(); // "new" or a post id
  const isNew = id === "new";
  const navigate = useNavigate();
  const [form, setForm] = useState(isNew ? EMPTY : null);
  const [tagsText, setTagsText] = useState("");
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [tab, setTab] = useState("en"); // which language body is being edited
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    if (isNew) return;
    api.get(`/admin/posts/${id}`)
      .then((post) => { setForm({ ...EMPTY, ...post }); setTagsText(post.tags.join(", ")); })
      .catch((err) => setError(err.message));
  }, [id, isNew]);

  if (!form) return <p>{error || t("Loading…")}</p>;

  const set = (key) => (value) => {
    const next = { ...form, [key]: value };
    if (key === "titleEn" && !slugTouched) next.slug = slugify(value); // keep slug in step with the title
    setForm(next);
    setSaved("");
  };

  const save = async (publish) => {
    setError("");
    const payload = {
      ...form,
      published: publish === undefined ? form.published : publish,
      tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
    };
    try {
      const post = isNew ? await api.post("/admin/posts", payload) : await api.put(`/admin/posts/${id}`, payload);
      setForm({ ...EMPTY, ...post });
      setSlugTouched(true);
      setSaved(post.published ? t("Published ✓") : t("Draft saved ✓"));
      if (isNew) navigate(`/admin/posts/${post.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  const bodyKey = tab === "en" ? "bodyEn" : "bodyAr";

  return (
    <div className="post-editor">
      <p><Link to="/admin/posts">{t("← All posts")}</Link></p>
      <h1>{isNew ? t("New post") : t("Edit post")} <span className="admin-sub">{form.published ? t("· Published") : t("· Draft")}</span></h1>

      <div className="admin-form">
        <div className="admin-form-row">
          <Field label={t("Title (EN)")} value={form.titleEn} onChange={set("titleEn")} maxLength={200} />
          <Field label={t("Title (AR)")} value={form.titleAr} onChange={set("titleAr")} maxLength={200} rtl />
        </div>
        <label>
          {t("Link name — the address will be")} /blog/<strong>{form.slug || "…"}</strong>
          <input
            className="form-input"
            value={form.slug}
            maxLength={80}
            onChange={(e) => { setSlugTouched(true); setForm({ ...form, slug: e.target.value.toLowerCase() }); }}
            placeholder="my-first-post"
          />
        </label>
        <div className="admin-form-row">
          <Field label={t("Short summary (EN) — shown on the cards")} value={form.excerptEn} onChange={set("excerptEn")} multiline maxLength={400} />
          <Field label={t("Short summary (AR)")} value={form.excerptAr} onChange={set("excerptAr")} multiline maxLength={400} rtl />
        </div>
        <label>
          {t("Tags (comma separated, up to 8)")}
          <input className="form-input" value={tagsText} onChange={(e) => { setTagsText(e.target.value); setSaved(""); }} placeholder={t("React, Node.js, Career")} />
        </label>

        <div className="editor-tabs">
          <button type="button" className={`admin-btn ${tab === "en" ? "admin-btn-primary" : ""}`} onClick={() => setTab("en")}>{t("English text")}</button>
          <button type="button" className={`admin-btn ${tab === "ar" ? "admin-btn-primary" : ""}`} onClick={() => setTab("ar")}>{t("Arabic text")}</button>
          <span className="editor-spacer" />
          <button type="button" className="admin-btn" onClick={() => setPreview(!preview)}>{preview ? t("✎ Write") : t("👁 Preview")}</button>
          <span className="admin-sub">{t("~{n} min read", { n: readingMinutes(form[bodyKey]) })}</span>
        </div>
        {preview ? (
          <div className="prose editor-preview" dir={tab === "ar" ? "rtl" : "ltr"} dangerouslySetInnerHTML={{ __html: renderMarkdown(form[bodyKey]) || `<p><em>${t("Nothing to preview yet.")}</em></p>` }} />
        ) : (
          <textarea
            className="form-input editor-body"
            dir={tab === "ar" ? "rtl" : "ltr"}
            value={form[bodyKey]}
            onChange={(e) => set(bodyKey)(e.target.value)}
            maxLength={60000}
            placeholder={tab === "ar" ? t("اكتب المقال هنا بالـ Markdown…") : t("Write the article here in Markdown…")}
          />
        )}
        <p className="admin-sub">
          {t("Markdown:")} <code>## Heading</code> · <code>**bold**</code> · <code>*italic*</code> · <code>{t("- list item")}</code> ·{" "}
          <code>{t("[link](https://…)")}</code> · <code>{t("![image](https://…)")}</code> · <code>`code`</code> · <code>```</code> {t("before and after a code block")}
        </p>

        {error && <p className="admin-error">{error}</p>}
        <div className="admin-form-actions">
          {saved && <span>{saved}</span>}
          <button type="button" className="admin-btn" onClick={() => save(false)}>{form.published ? t("Unpublish (save as draft)") : t("Save draft")}</button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => save(true)}>{form.published ? t("Save") : t("Publish")}</button>
        </div>
      </div>
    </div>
  );
}
