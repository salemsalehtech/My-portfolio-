// PublicForm.jsx — the page people open from a Form Builder link (route /form/:slug or
// /form/:slug/en|ar). It sits in FormShell (profile panel + "Visit my website"), not in the
// normal site layout.
//
// The form itself (title, fields, open/closed) is built in Admin → Forms and read from
// GET /forms/:slug. The language comes from the link; without one, the form's own language is
// used (Arabic if it only has an Arabic title, otherwise English). When the form exists in both
// languages, a switch at the top changes it.
//
// Questions are numbered; optional ones say so (required is the normal case). A thin bar shows
// how many questions are answered. Answers go to POST /forms/:slug/submit, which is rate limited
// and re-checks everything (required fields, email / phone / number / date formats, list
// choices); the checks here only give instant feedback.
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { pick } from "../lib/pick";
import FormShell, { ArrowIcon, FormMessage } from "../components/FormShell";

// The page's own text, per language (the form's title and fields come from the dashboard).
const COPY = {
  en: {
    optional: "Optional", choose: "Choose…", send: "Send answers", sending: "Sending…",
    progress: (done, total) => `${done} of ${total} answered`,
    privacy: "Your answers go directly to me and are never shared.",
    errRequired: "This question needs an answer", errEmail: "Please enter a valid email address",
    errPhone: "Please enter a valid phone number", errNumber: "Please enter a number",
    errSend: "Something went wrong. Please try again in a moment.",
    errCheck: "Please check the highlighted questions.",
    doneTitle: "Thank you — your answers were sent.", doneBody: "I'll read them carefully and get back to you if needed.",
    closedTitle: "This form is closed", closedBody: "It is no longer accepting answers.",
    notFound: "This form does not exist", notFoundBody: "The link may be wrong or the form was removed.",
    loading: "Loading…", switchTo: "عربي",
  },
  ar: {
    optional: "اختياري", choose: "اختر…", send: "إرسال الإجابات", sending: "جارٍ الإرسال…",
    progress: (done, total) => `تمت الإجابة على ${done} من ${total}`,
    privacy: "إجاباتك تصلني مباشرة ولا تتم مشاركتها مع أحد.",
    errRequired: "هذا السؤال يحتاج إلى إجابة", errEmail: "من فضلك اكتب بريدًا إلكترونيًا صحيحًا",
    errPhone: "من فضلك اكتب رقم هاتف صحيحًا", errNumber: "من فضلك اكتب رقمًا",
    errSend: "حدث خطأ ما. حاول مرة أخرى بعد قليل.",
    errCheck: "من فضلك راجع الأسئلة المحددة.",
    doneTitle: "شكرًا لك — تم إرسال إجاباتك.", doneBody: "سأقرؤها باهتمام وأتواصل معك إذا لزم الأمر.",
    closedTitle: "هذا النموذج مغلق", closedBody: "لم يعد يستقبل إجابات.",
    notFound: "هذا النموذج غير موجود", notFoundBody: "ربما يكون الرابط خاطئًا أو تم حذف النموذج.",
    loading: "جارٍ التحميل…", switchTo: "English",
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
const PLACEHOLDERS = { email: "name@example.com", phone: "+20 1xx xxx xxxx" };

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
  const title = form ? pick(lang, form.titleEn, form.titleAr) : "";

  useEffect(() => { if (title) document.title = title; }, [title]);

  const switchLink = form && form.titleEn && form.titleAr && status !== "done"
    ? { to: `/form/${slug}/${lang === "ar" ? "en" : "ar"}`, label: c.switchTo }
    : null;

  const setAnswer = (key) => (e) => {
    setAnswers({ ...answers, [key]: e.target.value });
    if (errors[key]) setErrors({ ...errors, [key]: null }); // clear the message once they fix it
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    for (const field of form.fields) {
      const problem = fieldError(field, String(answers[field.key] ?? "").trim(), c);
      if (problem) errs[field.key] = problem;
    }
    setErrors(errs);
    const first = form.fields.find((f) => errs[f.key]);
    if (first) { document.getElementById(`q-${first.key}`)?.focus(); return; }

    setStatus("sending");
    try {
      await api.post(`/forms/${slug}/submit`, { answers, lang, website: trap });
      setStatus("done");
      window.scrollTo({ top: 0 });
    } catch {
      setStatus("error");
    }
  };

  let content;
  if (status === "loading") content = <p className="fp-lead">{c.loading}</p>;
  else if (status === "missing") content = <FormMessage lang={lang} tone="info" title={c.notFound} body={c.notFoundBody} />;
  else if (!form.open) content = <FormMessage lang={lang} tone="info" title={c.closedTitle} body={c.closedBody} />;
  else if (status === "done") content = <FormMessage lang={lang} title={c.doneTitle} body={c.doneBody} />;
  else {
    const desc = pick(lang, form.descEn, form.descAr);
    const answered = form.fields.filter((f) => String(answers[f.key] ?? "").trim()).length;
    const total = form.fields.length;
    const hasErrors = Object.values(errors).some(Boolean);
    content = (
      <form onSubmit={submit} noValidate>
        <header className="fp-header">
          <h1 className="fp-title">{title}</h1>
          {desc && <p className="fp-lead">{desc}</p>}
          <div className="fp-progress" aria-hidden="true">
            <div className="fp-progress-track"><span style={{ width: `${total ? (answered / total) * 100 : 0}%` }} /></div>
            <span className="fp-progress-text">{c.progress(answered, total)}</span>
          </div>
        </header>

        <ol className="fp-questions">
          {form.fields.map((field, i) => {
            const label = pick(lang, field.labelEn, field.labelAr);
            const id = `q-${field.key}`;
            const err = errors[field.key];
            const props = {
              id,
              className: "fp-input",
              value: answers[field.key] ?? "",
              onChange: setAnswer(field.key),
              "aria-invalid": Boolean(err),
              "aria-describedby": err ? `${id}-err` : undefined,
              required: field.required,
            };
            return (
              <li className={`fp-q ${err ? "has-error" : ""}`} key={field.key}>
                <span className="fp-q-num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <div className="fp-q-body">
                  <label className="fp-q-label" htmlFor={id}>
                    {label}
                    {!field.required && <span className="fp-q-opt">{c.optional}</span>}
                  </label>
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
                      placeholder={PLACEHOLDERS[field.type]}
                      autoComplete={field.type === "email" ? "email" : field.type === "phone" ? "tel" : undefined}
                      {...props}
                    />
                  )}
                  {err && <p className="fp-q-error" id={`${id}-err`}>{err}</p>}
                </div>
              </li>
            );
          })}
        </ol>

        {/* Honeypot: hidden from people, bots fill it in and get silently ignored by the server. */}
        <input className="feedback-trap" name="website" value={trap} onChange={(e) => setTrap(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" />

        <div className="fp-submit">
          {status === "error" && <p className="fp-alert" role="alert">{c.errSend}</p>}
          {hasErrors && status !== "error" && <p className="fp-alert" role="alert">{c.errCheck}</p>}
          <button className="fp-btn" type="submit" disabled={status === "sending"}>
            <span>{status === "sending" ? c.sending : c.send}</span>
            {status !== "sending" && <ArrowIcon rtl={lang === "ar"} />}
          </button>
          <p className="fp-note">{c.privacy}</p>
        </div>
      </form>
    );
  }

  return <FormShell lang={lang} switchLink={switchLink}>{content}</FormShell>;
}
