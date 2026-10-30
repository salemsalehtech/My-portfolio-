// AdminCV.jsx — admin page for the CV (PDF) shown on the public site's About section.
// Upload a PDF here and the "Download CV" button appears for visitors; upload again to
// replace it; delete it to hide the button. The file is read in the browser, sent to
// PUT /api/admin/cv as base64, and stored in MongoDB (see server/src/routes/admin.js).
import { useEffect, useRef, useState } from "react";
import { api, API_BASE } from "../../lib/api";
import { readAsBase64 } from "../../lib/readAsBase64";
import { useAdminT } from "../../lib/adminI18n";

const MAX_MB = 4; // keep in sync with MAX_CV_BYTES on the server

export default function AdminCV() {
  const { t } = useAdminT();
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
    if (file.type !== "application/pdf") return setError(t("Please choose a PDF file."));
    if (file.size > MAX_MB * 1024 * 1024) return setError(t("The file is too large (max {mb} MB).", { mb: MAX_MB }));

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
    if (!confirm(t("Delete the CV? The download button will disappear from the site."))) return;
    await api.del("/admin/cv");
    load();
  };

  return (
    <div>
      <h1>{t("CV")}</h1>

      {info === null && <p>{t("Loading…")}</p>}

      {info && info.available && (
        <p>
          {t("Current file:")} <strong dir="ltr">{info.filename}</strong> ({Math.round(info.size / 1024)} KB, {t("uploaded")}{" "}
          {new Date(info.updatedAt).toLocaleString()}) —{" "}
          <a href={`${API_BASE}/cv`} target="_blank" rel="noreferrer">{t("preview")}</a>
        </p>
      )}
      {info && !info.available && <p className="admin-empty">{t("No CV uploaded yet — the download button is hidden on the site.")}</p>}

      {error && <p className="admin-error">{error}</p>}

      <input ref={fileInput} type="file" accept="application/pdf" onChange={upload} hidden />
      <div className="actions">
        <button className="admin-btn admin-btn-primary" onClick={() => fileInput.current.click()} disabled={uploading}>
          {uploading ? t("Uploading…") : info && info.available ? t("Replace CV (PDF)") : t("Upload CV (PDF)")}
        </button>
        {info && info.available && (
          <button className="admin-btn admin-btn-danger" onClick={remove} disabled={uploading}>{t("Delete")}</button>
        )}
      </div>
      <p style={{ opacity: 0.7 }}>{t("PDF only, up to {mb} MB.", { mb: MAX_MB })}</p>
    </div>
  );
}
