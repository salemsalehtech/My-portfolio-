// AdminProjects.jsx — admin CRUD page for portfolio projects (shown at /admin/projects).
//
// Layout is: a table of existing projects, plus a modal with a create/edit form (opened by
// "+ New Project" or a row's "Edit" button). `editing` tracks which mode the modal is in:
//   - null    modal closed
//   - "new"   modal open, creating a new project
//   - <id>    modal open, editing the project with that id
//
// Every field here maps 1:1 to a field on the Project model in server/src/lib/mongo.js —
// titleEn/titleAr and descEn/descAr are the bilingual copy shown on the public site (see
// components/Projects.jsx), catLabelEn/catLabelAr is the filter chip label, and `tags` is
// stored as an array on the server but edited here as one comma-separated text field for
// simplicity (see the split/join in save()/openEdit() below).
//
// Picture: "Upload picture" on a row sends a screenshot to PUT /admin/projects/:id/image
// (PNG / JPEG / WebP, max 2 MB — same as certificates). A new project must be saved first.
import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { readAsBase64 } from "../../lib/readAsBase64";
import { projectImageUrl } from "../../components/Projects";

// ---- Blank form shape, used both for a fresh "New Project" and as the shape `form` state
//      always has ----
const EMPTY = {
  titleEn: "", titleAr: "", descEn: "", descAr: "", tags: "", category: "web",
  githubUrl: "", demoUrl: "", gradient: "linear-gradient(135deg,#1E3A5F,#2E5B9A)",
  catLabelEn: "", catLabelAr: "", order: 0,
  problemEn: "", problemAr: "", solutionEn: "", solutionAr: "", resultEn: "", resultAr: "",
};

// The optional case-study fields, drawn as pairs of EN/AR text areas in the form below.
const CASE_STUDY = [
  { key: "problem", label: "The problem" },
  { key: "solution", label: "The solution" },
  { key: "result", label: "The result" },
];

const MAX_MB = 2; // keep in sync with MAX_IMAGE_BYTES on the server
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export default function AdminProjects() {
  // ---- STATE ----
  const [projects, setProjects] = useState([]); // the table's data
  const [editing, setEditing] = useState(null); // null | "new" | <project id>
  const [form, setForm] = useState(EMPTY);       // the modal form's current values
  const [error, setError] = useState("");        // picture upload problems
  const [uploadingId, setUploadingId] = useState(null);
  const fileInput = useRef(null);
  const uploadFor = useRef(null); // which project the file picker was opened for

  // ---- DATA LOADING ----
  // Re-fetches the full list from the server; called on mount and again after every
  // create/edit/delete below instead of patching local state by hand.
  const load = () => api.get("/admin/projects").then(setProjects);
  useEffect(() => { load(); }, []);

  // ---- FORM HANDLERS ----
  const openNew = () => { setForm(EMPTY); setEditing("new"); };
  // tags is an array on the server; join it into "a, b, c" for the text input here.
  // `...EMPTY` first so projects saved before the case-study fields existed still get "" values.
  const openEdit = (p) => { setForm({ ...EMPTY, ...p, tags: p.tags.join(", ") }); setEditing(p.id); };

  const save = async (e) => {
    e.preventDefault();
    // Reverse of openEdit's join: split the comma-separated text back into a clean array
    // before sending it to the server.
    const payload = { ...form, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean), order: Number(form.order) };
    if (editing === "new") await api.post("/admin/projects", payload);
    else await api.put(`/admin/projects/${editing}`, payload);
    setEditing(null);
    load();
  };

  const remove = async (id) => {
    if (!confirm("Delete this project?")) return;
    await api.del(`/admin/projects/${id}`);
    load();
  };

  // ---- PICTURE ----
  const pickImage = (p) => { uploadFor.current = p.id; setError(""); fileInput.current.click(); };

  const upload = async (e) => {
    const file = e.target.files[0];
    const id = uploadFor.current;
    e.target.value = ""; // allow choosing the same file again later
    if (!file || !id) return;
    if (!IMAGE_TYPES.includes(file.type)) return setError("Please choose a PNG, JPEG or WebP image.");
    if (file.size > MAX_MB * 1024 * 1024) return setError(`The image is too large (max ${MAX_MB} MB).`);
    setUploadingId(id);
    try {
      await api.put(`/admin/projects/${id}/image`, { data: await readAsBase64(file) });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingId(null);
    }
  };

  const removeImage = async (p) => {
    if (!confirm("Remove the picture of this project?")) return;
    await api.del(`/admin/projects/${p.id}/image`);
    load();
  };

  // ---- RENDER: table of existing projects ----
  return (
    <div>
      <h1>Projects</h1>
      <div className="admin-toolbar">
        <button className="admin-btn admin-btn-primary" onClick={openNew}>+ New Project</button>
      </div>
      {error && editing === null && <p className="admin-error">{error}</p>}
      <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} hidden />
      <table className="admin-table">
        <thead>
          <tr><th>Picture</th><th>Title</th><th>Category</th><th>Order</th><th></th></tr>
        </thead>
        <tbody>
          {projects.length === 0 && <tr><td colSpan={5} className="admin-empty">No projects yet.</td></tr>}
          {projects.map((p) => (
            <tr key={p.id}>
              <td className="admin-thumb-cell">
                {p.hasImage ? <img className="admin-thumb" src={projectImageUrl(p)} alt="" /> : "—"}
              </td>
              <td>{p.titleEn}</td>
              <td>{p.category}</td>
              <td>{p.order}</td>
              <td className="actions">
                <button className="admin-btn" onClick={() => pickImage(p)} disabled={uploadingId === p.id}>
                  {uploadingId === p.id ? "Uploading…" : p.hasImage ? "Replace picture" : "Upload picture"}
                </button>
                {p.hasImage && <button className="admin-btn" onClick={() => removeImage(p)}>Remove picture</button>}
                <button className="admin-btn" onClick={() => openEdit(p)}>Edit</button>
                <button className="admin-btn admin-btn-danger" onClick={() => remove(p.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ opacity: 0.7, fontSize: 13 }}>Pictures: PNG, JPEG or WebP, up to {MAX_MB} MB. A landscape screenshot (16:9, e.g. 1280×720) looks best. Projects without a picture show their gradient.</p>

      {/* ---- RENDER: create/edit modal form (only mounted while editing !== null) ---- */}
      {editing !== null && (
        <div className="admin-modal-overlay" onClick={() => setEditing(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing === "new" ? "New Project" : "Edit Project"}</h2>
            <form className="admin-form" onSubmit={save}>
              <div className="admin-form-row">
                <label>Title (EN)
                  <input className="form-input" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} required />
                </label>
                <label>Title (AR)
                  <input className="form-input" value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} required />
                </label>
              </div>
              <label>Description (EN)
                <textarea className="form-input form-textarea" rows={3} value={form.descEn} onChange={(e) => setForm({ ...form, descEn: e.target.value })} required />
              </label>
              <label>Description (AR)
                <textarea className="form-input form-textarea" rows={3} value={form.descAr} onChange={(e) => setForm({ ...form, descAr: e.target.value })} required />
              </label>
              <label>Tags (comma separated)
                <input className="form-input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
              </label>
              <div className="admin-form-row">
                <label>Category
                  <select className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="web">web</option>
                    <option value="youtube">youtube</option>
                    <option value="automation">automation</option>
                  </select>
                </label>
                <label>Order
                  <input className="form-input" type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} />
                </label>
              </div>
              <div className="admin-form-row">
                <label>Category Label (EN)
                  <input className="form-input" value={form.catLabelEn} onChange={(e) => setForm({ ...form, catLabelEn: e.target.value })} required />
                </label>
                <label>Category Label (AR)
                  <input className="form-input" value={form.catLabelAr} onChange={(e) => setForm({ ...form, catLabelAr: e.target.value })} required />
                </label>
              </div>
              <div className="admin-form-row">
                <label>GitHub URL
                  <input className="form-input" value={form.githubUrl} onChange={(e) => setForm({ ...form, githubUrl: e.target.value })} />
                </label>
                <label>Demo URL
                  <input className="form-input" value={form.demoUrl} onChange={(e) => setForm({ ...form, demoUrl: e.target.value })} />
                </label>
              </div>
              <label>Gradient (CSS) — shown when the project has no picture
                <input className="form-input" value={form.gradient} onChange={(e) => setForm({ ...form, gradient: e.target.value })} />
              </label>

              <h3 style={{ marginTop: 10 }}>Case study (optional)</h3>
              <p style={{ opacity: 0.7, fontSize: 13, margin: 0 }}>
                Shown in the project popup as Problem → Solution → Result. Leave a part empty to skip it.
              </p>
              {CASE_STUDY.map(({ key, label }) => (
                <div className="admin-form-row" key={key}>
                  <label>{label} (EN)
                    <textarea className="form-input form-textarea" rows={3} value={form[`${key}En`]} onChange={(e) => setForm({ ...form, [`${key}En`]: e.target.value })} maxLength={1500} />
                  </label>
                  <label>{label} (AR)
                    <textarea className="form-input form-textarea" rows={3} dir="rtl" value={form[`${key}Ar`]} onChange={(e) => setForm({ ...form, [`${key}Ar`]: e.target.value })} maxLength={1500} />
                  </label>
                </div>
              ))}
              <div className="admin-form-actions">
                <button type="button" className="admin-btn" onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit" className="admin-btn admin-btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
