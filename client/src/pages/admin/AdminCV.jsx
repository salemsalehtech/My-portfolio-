// AdminCV.jsx — admin page for the CV (PDF) shown on the public site's About section.
// Upload a PDF here and the "Download CV" button appears for visitors; upload again to
// replace it; delete it to hide the button. The file is read in the browser, sent to
// PUT /api/admin/cv as base64, and stored in MongoDB (see server/src/routes/admin.js).
import { useEffect, useRef, useState } from "react";
import { api, API_BASE } from "../../lib/api";

const MAX_MB = 4; // keep in sync with MAX_CV_BYTES on the server

// Reads a File and resolves with its content as a base64 string (without the "data:" prefix).
function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}

export default function AdminCV() {
  const [info, setInfo] = useState(null); // null while loading, then { available, filename, size, updatedAt }
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef(null);

  const load = () => api.get("/cv/info").then(setInfo).catch(() => setInfo({ available: false }));
  useEffect(() => { load(); }, []);

  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError("");
    if (file.type !== "application/pdf") return setError("Please choose a PDF file.");
    if (file.size > MAX_MB * 1024 * 1024) return setError(`The file is too large (max ${MAX_MB} MB).`);

    setUploading(true);
    try {
      const data = await readAsBase64(file);
      await api.put("/admin/cv", { filename: file.name, data });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = ""; // allow re-selecting the same file
    }
  };

  const remove = async () => {
    if (!confirm("Delete the CV? The download button will disappear from the site.")) return;
    await api.del("/admin/cv");
    load();
  };

  return (
    <div>
      <h1>CV</h1>

      {info === null && <p>Loading…</p>}

      {info && info.available && (
        <p>
          Current file: <strong>{info.filename}</strong> ({Math.round(info.size / 1024)} KB, uploaded{" "}
          {new Date(info.updatedAt).toLocaleString()}) —{" "}
          <a href={`${API_BASE}/cv`} target="_blank" rel="noreferrer">preview</a>
        </p>
      )}
      {info && !info.available && <p className="admin-empty">No CV uploaded yet — the download button is hidden on the site.</p>}

      {error && <p className="admin-error">{error}</p>}

      <input ref={fileInput} type="file" accept="application/pdf" onChange={upload} hidden />
      <div className="actions">
        <button className="admin-btn admin-btn-primary" onClick={() => fileInput.current.click()} disabled={uploading}>
          {uploading ? "Uploading…" : info && info.available ? "Replace CV (PDF)" : "Upload CV (PDF)"}
        </button>
        {info && info.available && (
          <button className="admin-btn admin-btn-danger" onClick={remove} disabled={uploading}>Delete</button>
        )}
      </div>
      <p style={{ opacity: 0.7 }}>PDF only, up to {MAX_MB} MB.</p>
    </div>
  );
}
