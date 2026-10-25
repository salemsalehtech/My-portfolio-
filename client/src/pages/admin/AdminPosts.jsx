// AdminPosts.jsx — the blog posts list in the dashboard (/admin/posts): every post (drafts too),
// with Publish / Unpublish, Edit (opens AdminPostEditor), View on the site, the cover picture
// (upload / replace / remove — PNG, JPEG or WebP up to 2 MB, checked again on the server) and
// Delete. Writing happens in the editor; this page is for managing.
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { readAsBase64 } from "../../lib/readAsBase64";
import { postCoverUrl } from "../../lib/posts";

const MAX_MB = 2;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

// The public address of a post (HashRouter: everything after #).
const publicUrl = (slug) => `${window.location.origin}${window.location.pathname}#/blog/${slug}`;

export default function AdminPosts() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState("");
  const [uploadingId, setUploadingId] = useState(null);
  const fileInput = useRef(null);
  const uploadFor = useRef(null);

  const load = () => api.get("/admin/posts").then(setPosts);
  useEffect(() => { load(); }, []);

  const togglePublished = async (post) => {
    setError("");
    try {
      await api.put(`/admin/posts/${post.id}`, { published: !post.published });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (post) => {
    if (!confirm(`Delete "${post.titleEn || post.titleAr}"? This cannot be undone.`)) return;
    await api.del(`/admin/posts/${post.id}`);
    load();
  };

  const pickCover = (post) => { uploadFor.current = post.id; setError(""); fileInput.current.click(); };
  const uploadCover = async (e) => {
    const file = e.target.files[0];
    const id = uploadFor.current;
    e.target.value = "";
    if (!file || !id) return;
    if (!IMAGE_TYPES.includes(file.type)) return setError("Please choose a PNG, JPEG or WebP image.");
    if (file.size > MAX_MB * 1024 * 1024) return setError(`The image is too large (max ${MAX_MB} MB).`);
    setUploadingId(id);
    try {
      await api.put(`/admin/posts/${id}/cover`, { data: await readAsBase64(file) });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingId(null);
    }
  };
  const removeCover = async (post) => {
    if (!confirm("Remove the cover picture?")) return;
    await api.del(`/admin/posts/${post.id}/cover`);
    load();
  };

  return (
    <div>
      <h1>Blog posts</h1>
      <div className="admin-toolbar">
        <button className="admin-btn admin-btn-primary" onClick={() => navigate("/admin/posts/new")}>+ New Post</button>
      </div>
      {error && <p className="admin-error">{error}</p>}
      <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadCover} hidden />
      <table className="admin-table">
        <thead>
          <tr><th>Cover</th><th>Title</th><th>Status</th><th>Last edited</th><th></th></tr>
        </thead>
        <tbody>
          {posts.length === 0 && <tr><td colSpan={5} className="admin-empty">No posts yet — write your first one with “+ New Post”.</td></tr>}
          {posts.map((post) => (
            <tr key={post.id} className={post.published ? "" : "admin-row-draft"}>
              <td className="admin-thumb-cell">
                {/* Covers are served only for published posts, so drafts show a tick instead. */}
                {post.hasCover && post.published && <img className="admin-thumb" src={postCoverUrl(post)} alt="" />}
                {post.hasCover && !post.published && "✓"}
                {!post.hasCover && "—"}
              </td>
              <td>
                <Link to={`/admin/posts/${post.id}`}>{post.titleEn || post.titleAr}</Link>
                <div className="admin-sub">/blog/{post.slug}</div>
              </td>
              <td>{post.published ? `Published ${new Date(post.publishedAt).toLocaleDateString()}` : "Draft"}</td>
              <td>{new Date(post.updatedAt).toLocaleString()}</td>
              <td className="actions">
                <button className="admin-btn" onClick={() => navigate(`/admin/posts/${post.id}`)}>Edit</button>
                <button className={`admin-btn ${post.published ? "" : "admin-btn-primary"}`} onClick={() => togglePublished(post)}>
                  {post.published ? "Unpublish" : "Publish"}
                </button>
                {post.published && <a className="admin-btn" href={publicUrl(post.slug)} target="_blank" rel="noreferrer">View</a>}
                <button className="admin-btn" onClick={() => pickCover(post)} disabled={uploadingId === post.id}>
                  {uploadingId === post.id ? "Uploading…" : post.hasCover ? "Replace cover" : "Upload cover"}
                </button>
                {post.hasCover && <button className="admin-btn" onClick={() => removeCover(post)}>Remove cover</button>}
                <button className="admin-btn admin-btn-danger" onClick={() => remove(post)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ opacity: 0.7, fontSize: 13 }}>Covers: PNG, JPEG or WebP, up to {MAX_MB} MB — a landscape image (about 1200×630) looks best.</p>
    </div>
  );
}
