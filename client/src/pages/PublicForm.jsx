// PublicForm.jsx — the page people open from a Form Builder link (route /form/:slug or
// /form/:slug/en|ar). A standalone page like FeedbackForm.jsx: no navbar, no other sections.
//
// The form itself (title, fields, open/closed) is built in Admin → Forms and read from
// GET /forms/:slug. The language comes from the link; without one, the form's own language is
// used (Arabic if it only has an Arabic title, otherwise English). When the form exists in both
// languages, a small switch at the top changes it.
//
// Answers go to POST /forms/:slug/submit, which is rate limited and re-checks everything
// (required fields, email / phone / number / date formats, list choices); the checks here only
// give instant feedback.
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { pick } from "../lib/pick";

// The page's own text, per language (the form's title and fields come from the dashboard).
const COPY = {
  en: {
    required: "required", choose: "Choose…", send: "Send", sending: "Sending…",
    errRequired: "This field is required", errEmail: "Please enter a valid email",
    errPhone: "Please enter a valid phone number", errNumber: "Please enter a number",
    errSend: "Something went wrong. Please try again in a moment.",
    doneTitle: "Thank you! 🙏", doneBody: "Your answers have been sent.",
    closedTitle: "This form is closed", closedBody: "It is no longer accepting answers.",
    notFound: "This form does not exist.", loading: "Loading…", switchTo: "عربي",
  },
  ar: {
    required: "مطلوب", choose: "اختر…", send: "إرسال", sending: "جارٍ الإرسال…",
    errRequired: "هذا الحقل مطلوب", errEmail: "من فضلك اكتب بريدًا إلكترونيًا صحيحًا",
    errPhone: "من فضلك اكتب رقم هاتف صحيحًا", errNumber: "من فضلك اكتب رقمًا",
    errSend: "حدث خطأ ما. حاول مرة أخرى بعد قليل.",
    doneTitle: "شكرًا لك! 🙏", doneBody: "تم إرسال إجاباتك.",
    closedTitle: "هذا النموذج مغلق", closedBody: "لم يعد يستقبل إجابات.",
    notFound: "هذا النموذج غير موجود.", loading: "جارٍ التحميل…", switchTo: "English",
  },
};

// Same rules as the server (server/src/routes/forms.js → checkAnswer), as messages for people.
function fieldError(field, value, c) {
  if (!value) return field.required ? c.errRequired : null;
  if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return c.errEmail;
  if (field.type === "phone" && !/^\+?[\d\s()-]{6,25}$/.test(value)) return c.errPhone;
  if (field.type === "number" && !Number.isFinite(Number(value))) return c.errNumber;
  return null;
}

const INPUT_TYPES = { email: "email", phone: "tel", number: "number", date: "date", text: "text" };

export default function PublicForm() {
  const { slug, lang: urlLang } = useParams();
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | missing | ready | sending | done | error
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [trap, setTrap] = useState(""); // honeypot

  useEffect(() => {
    api.get(`/forms/${slug}`).then((f) => { setForm(f); setStatus("ready"); }).catch(() => setStatus("missing"));
  }, [slug]);

  const lang = urlLang === "ar" || urlLang === "en"
    ? urlLang
    : form && !form.titleEn && form.titleAr ? "ar" : "en";
  const c = COPY[lang];
  const isAr = lang === "ar";
  const title = form ? pick(lang, form.titleEn, form.titleAr) : "";

  useEffect(() => { if (title) document.title = title; }, [title]);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    for (const field of form.fields) {
      const problem = fieldError(field, String(answers[field.key] ?? "").trim(), c);
      if (problem) errs[field.key] = problem;
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setStatus("sending");
    try {
      await api.post(`/forms/${slug}/submit`, { answers, lang, website: trap });
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  const set = (key) => (e) => setAnswers({ ...answers, [key]: e.target.value });

  let content;
  if (status === "loading") content = <p className="feedback-intro">{c.loading}</p>;
  else if (status === "missing") content = <div className="feedback-done"><h1>{c.notFound}</h1></div>;
  else if (!form.open) content = <div className="feedback-done"><h1>{c.closedTitle}</h1><p>{c.closedBody}</p></div>;
  else if (status === "done") content = <div className="feedback-done"><h1>{c.doneTitle}</h1><p>{c.doneBody}</p></div>;
  else {
    const desc = pick(lang, form.descEn, form.descAr);
    content = (
      <form onSubmit={submit} noValidate>
        <h1>{title}</h1>
        {desc && <p className="feedback-intro" style={{ whiteSpace: "pre-line" }}>{desc}</p>}

        {form.fields.map((field) => {
          const label = pick(lang, field.labelEn, field.labelAr);
          const props = {
            className: `form-input ${errors[field.key] ? "error" : ""}`,
            value: answers[field.key] ?? "",
            onChange: set(field.key),
            "aria-invalid": Boolean(errors[field.key]),
          };
          return (
            <label className="feedback-field" key={field.key}>
              <span>{label}{field.required && <em className="form-req" title={c.required}> *</em>}</span>
              {field.type === "textarea" && <textarea rows={5} maxLength={3000} {...props} />}
              {field.type === "select" && (
                <select {...props}>
                  <option value="">{c.choose}</option>
                  {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              )}
              {INPUT_TYPES[field.type] && (
                <input
                  type={INPUT_TYPES[field.type]}
                  maxLength={300}
                  dir={field.type === "email" || field.type === "phone" ? "ltr" : undefined}
                  autoComplete={field.type === "email" ? "email" : field.type === "phone" ? "tel" : undefined}
                  {...props}
                />
              )}
              {errors[field.key] && <small className="feedback-error">{errors[field.key]}</small>}
            </label>
          );
        })}

        {/* Honeypot: hidden from people, bots fill it in and get silently ignored by the server. */}
        <input className="feedback-trap" name="website" value={trap} onChange={(e) => setTrap(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" />

        {status === "error" && <p className="feedback-error feedback-error-box">{c.errSend}</p>}
        <button className="btn-send" type="submit" disabled={status === "sending"}>
          {status === "sending" ? c.sending : c.send}
        </button>
      </form>
    );
  }

  return (
    <div className="feedback-page" dir={isAr ? "rtl" : "ltr"} lang={lang} style={isAr ? { fontFamily: "var(--font-ar)" } : undefined}>
      <div className="feedback-card">
        <div className="feedback-brand">
          <div className="nav-badge">SS</div>
          <span className="nav-name">Salem Saleh</span>
          {form && form.titleEn && form.titleAr && status !== "done" && (
            <Link className="form-lang-switch" to={`/form/${slug}/${isAr ? "en" : "ar"}`}>{c.switchTo}</Link>
          )}
        </div>
        {content}
      </div>
    </div>
  );
}
