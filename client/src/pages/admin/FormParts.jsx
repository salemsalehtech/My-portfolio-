import { useAdminT } from "../../lib/adminI18n";
// FormParts.jsx — small form building blocks shared by the admin pages that edit one big
// document (AdminAbout.jsx, AdminSettings.jsx).

// A labelled text input / textarea. `rtl` makes Arabic fields type right-to-left.
// Extra props (type, placeholder, maxLength…) are passed to the input.
export function Field({ label, value, onChange, multiline, rtl, ...rest }) {
  const props = { className: "form-input", value, dir: rtl ? "rtl" : "ltr", onChange: (e) => onChange(e.target.value), ...rest };
  return (
    <label>
      {label}
      {multiline ? <textarea rows={4} {...props} /> : <input {...props} />}
    </label>
  );
}

// Editable list with add / remove / move up / move down. `renderRow(item, update)` draws one row.
// `max` (optional) hides the "+ Add" button once the list is full.
export function ListEditor({ title, items, onChange, blank, renderRow, max, emptyText }) {
  const { t } = useAdminT();
  const update = (index, patch) => onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const remove = (index) => onChange(items.filter((_, i) => i !== index));
  const move = (index, step) => {
    const target = index + step;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div style={{ marginBottom: 28 }}>
      <h2>{title}</h2>
      {items.length === 0 && <p className="admin-empty">{emptyText || t("Nothing here — this block is hidden on the site.")}</p>}
      {items.map((item, index) => (
        <div key={index} className="admin-form-row" style={{ alignItems: "end", marginBottom: 10 }}>
          {renderRow(item, (patch) => update(index, patch))}
          <div className="actions">
            <button type="button" className="admin-btn" onClick={() => move(index, -1)} disabled={index === 0}>↑</button>
            <button type="button" className="admin-btn" onClick={() => move(index, 1)} disabled={index === items.length - 1}>↓</button>
            <button type="button" className="admin-btn admin-btn-danger" onClick={() => remove(index)}>✕</button>
          </div>
        </div>
      ))}
      {(!max || items.length < max) && (
        <button type="button" className="admin-btn" onClick={() => onChange([...items, { ...blank }])}>{t("+ Add")}</button>
      )}
    </div>
  );
}
