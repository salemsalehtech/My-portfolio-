// AdminFormResponses.jsx — the answers of one form as a sheet (/admin/forms/:id/responses):
// one row per answer (newest first), one column per field, plus the date it was sent.
// "Download Excel" saves the same table as an .xlsx file (lib/forms.js → downloadExcel).
// Answers to a field that was later removed from the form still show, in an extra column.
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { downloadExcel, formatSubmitted, sheetColumns } from "../../lib/forms";

export default function AdminFormResponses() {
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState([]);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const load = () =>
    Promise.all([api.get(`/admin/forms/${id}`), api.get(`/admin/forms/${id}/responses`)])
      .then(([f, r]) => { setForm(f); setResponses(r); })
      .catch((err) => setError(err.message));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!form) return <p>{error || "Loading…"}</p>;
  const columns = sheetColumns(form, responses);

  const exportExcel = async () => {
    setExporting(true);
    setError("");
    try {
      await downloadExcel(form, responses);
    } catch (err) {
      setError("Could not create the Excel file: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  const remove = async (responseId) => {
    if (!confirm("Delete this answer?")) return;
    await api.del(`/admin/forms/${id}/responses/${responseId}`);
    load();
  };

  return (
    <div>
      <p><Link to="/admin/forms">← All forms</Link></p>
      <h1>{form.titleEn || form.titleAr} — answers</h1>
      <div className="admin-toolbar">
        <button className="admin-btn admin-btn-primary" onClick={exportExcel} disabled={responses.length === 0 || exporting}>
          {exporting ? "Preparing…" : "⬇ Download Excel"}
        </button>
        <Link className="admin-btn" to={`/admin/forms/${id}`}>Edit form</Link>
        <span style={{ opacity: 0.75 }}>{responses.length} answer(s)</span>
      </div>
      {error && <p className="admin-error">{error}</p>}

      {responses.length === 0 ? (
        <p className="admin-empty">No answers yet. Send the form's link from the Forms page.</p>
      ) : (
        <div className="admin-sheet-wrap">
          <table className="admin-table admin-sheet">
            <thead>
              <tr>
                <th>#</th>
                {columns.map((c) => <th key={c.key}>{c.label}</th>)}
                <th>Submitted</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {responses.map((r, i) => (
                <tr key={r.id}>
                  <td className="admin-sheet-num">{responses.length - i}</td>
                  {columns.map((c) => (
                    <td key={c.key} dir="auto" className={c.type === "textarea" ? "admin-sheet-long" : ""}>{(r.answers || {})[c.key] || ""}</td>
                  ))}
                  <td className="admin-sheet-date">{formatSubmitted(r.createdAt)}</td>
                  <td><button className="admin-btn admin-btn-danger" onClick={() => remove(r.id)} aria-label="Delete answer">✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
