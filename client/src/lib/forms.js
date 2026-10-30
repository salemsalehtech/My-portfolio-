// forms.js — shared helpers for the Form Builder (Admin → Forms, the public /form/:slug page).
// The field types the builder offers (keep in sync with FORM_FIELD_TYPES in server/src/lib/mongo.js).
export const FIELD_TYPES = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Paragraph" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "number", label: "Number" },
  { value: "select", label: "Choose from a list" },
  { value: "date", label: "Date" },
];

// A new field gets a short random key that never changes — answers are stored under it, so a
// field can be renamed later without losing what people already sent.
export const newFieldKey = () => "f" + Math.random().toString(36).slice(2, 10);

// The public link of a form, e.g. https://…/My-portfolio-/#/form/job-application/ar
export const formLink = (slug, lang) =>
  `${window.location.origin}${window.location.pathname}#/form/${slug}${lang ? `/${lang}` : ""}`;

// Columns of the answers sheet: the form's current fields, then any older field that was deleted
// from the form but still has answers (so nothing people sent is ever hidden).
export function sheetColumns(form, responses) {
  const columns = form.fields.map((f) => ({ key: f.key, label: f.labelEn || f.labelAr, type: f.type }));
  const known = new Set(columns.map((c) => c.key));
  for (const r of responses) {
    for (const key of Object.keys(r.answers || {})) {
      if (!known.has(key)) { known.add(key); columns.push({ key, label: `(deleted field) ${key}`, type: "text" }); }
    }
  }
  return columns;
}

export const formatSubmitted = (iso) =>
  new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

// Excel has no time zones: shift the date so the sheet shows the same local time as the dashboard.
const localTime = (iso) => { const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000); };

// Downloads all answers as a real Excel file (.xlsx). The Excel library is loaded only when the
// button is pressed, so it never slows down the rest of the dashboard.
export async function downloadExcel(form, responses) {
  const { default: writeExcelFile } = await import("write-excel-file/browser");
  const columns = sheetColumns(form, responses);
  const header = [...columns.map((c) => c.label), "Submitted", "Language"].map((value) => ({ value, fontWeight: "bold" }));
  const rows = responses.map((r) => [
    ...columns.map((c) => {
      const value = (r.answers || {})[c.key];
      if (value === undefined || value === "") return null;
      return c.type === "number" && Number.isFinite(Number(value)) ? Number(value) : value;
    }),
    localTime(r.createdAt),
    r.lang === "ar" ? "Arabic" : "English",
  ]);
  await writeExcelFile([header, ...rows], {
    sheet: "Responses",
    columns: [...columns.map((c) => ({ width: c.type === "textarea" ? 45 : 24 })), { width: 20 }, { width: 10 }],
    dateFormat: "yyyy-mm-dd hh:mm",
    stickyRowsCount: 1,
    rightToLeft: !form.titleEn && Boolean(form.titleAr), // an Arabic-only form opens right-to-left
  }).toFile(`${form.slug}-responses.xlsx`);
}
