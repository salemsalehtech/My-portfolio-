// FeedbackForm.jsx — the page a client opens from the link the owner sends them (route
// /feedback/en or /feedback/ar) to leave a testimonial. It is a standalone page inside
// FormShell (profile panel + "Visit my website"), with no navbar and no other sections.
//
// The language comes from the URL, not from the site's language toggle: the "en" link shows an
// English form (left-to-right) and the "ar" link an Arabic one (right-to-left), and the client
// writes in that language. The text is saved in the matching field (textEn / textAr) as a
// PENDING, hidden testimonial — it only appears on the site after the owner approves it in
// Admin → Testimonials. The endpoint (POST /testimonials/submit, server/src/routes/testimonials.js)
// is rate limited and re-validates everything; the checks here just give instant feedback.
import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import FormShell, { ArrowIcon, FormMessage } from "../components/FormShell";

// All the text of this page, per language (this page is independent of translations.js).
const COPY = {
  en: {
    title: "How was your experience?",
    intro: "Thank you for trusting me with your project. Your honest feedback takes a minute and helps future clients.",
    name: "Your name",
    role: "Your role / company",
    rating: "Your rating",
    message: "Your feedback",
    messagePlaceholder: "What was it like working together? What did you like most?",
    send: "Send feedback",
    optional: "Optional",
    sending: "Sending…",
    errName: "Please enter your name",
    errRating: "Please choose a rating",
    errMessage: "Please write at least 10 characters",
    errSend: "Something went wrong. Please try again in a moment.",
    doneTitle: "Thank you for your feedback.",
    doneBody: "Your feedback has been sent. It will appear on my website after I review it.",
    pageTitle: "Share your feedback | Salem Saleh",
  },
  ar: {
    title: "كيف كانت تجربتك؟",
    intro: "شكرًا لثقتك وتعاملك معي. رأيك الصريح يستغرق دقيقة ويفيد العملاء القادمين.",
    name: "اسمك",
    role: "وظيفتك / شركتك",
    rating: "تقييمك",
    message: "رأيك",
    messagePlaceholder: "كيف كانت تجربة العمل معي؟ وما أكثر شيء أعجبك؟",
    send: "إرسال الرأي",
    optional: "اختياري",
    sending: "جارٍ الإرسال…",
    errName: "من فضلك اكتب اسمك",
    errRating: "من فضلك اختر تقييمًا",
    errMessage: "من فضلك اكتب 10 أحرف على الأقل",
    errSend: "حدث خطأ ما. حاول مرة أخرى بعد قليل.",
    doneTitle: "شكرًا لك على رأيك.",
    doneBody: "تم إرسال رأيك. سيظهر على موقعي بعد مراجعته.",
    pageTitle: "شاركنا رأيك | سالم صالح",
  },
};

export default function FeedbackForm() {
  const { lang } = useParams();
  // Anything other than /feedback/en or /feedback/ar goes to the English form.
  if (lang !== "en" && lang !== "ar") return <Navigate to="/feedback/en" replace />;
  return <FeedbackFormPage lang={lang} />;
}

function FeedbackFormPage({ lang }) {
  const c = COPY[lang];
  const isAr = lang === "ar";
  const [form, setForm] = useState({ name: "", role: "", rating: 0, message: "", website: "" });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | done | error

  useEffect(() => { document.title = c.pageTitle; }, [c.pageTitle]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = c.errName;
    if (!form.rating) errs.rating = c.errRating;
    if (form.message.trim().length < 10) errs.message = c.errMessage;
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setStatus("sending");
    try {
      await api.post("/testimonials/submit", { ...form, lang });
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  const field = (n, id, label, control, err, optional) => (
    <li className={`fp-q ${err ? "has-error" : ""}`}>
      <span className="fp-q-num" aria-hidden="true">{String(n).padStart(2, "0")}</span>
      <div className="fp-q-body">
        <label className="fp-q-label" htmlFor={id}>{label}{optional && <span className="fp-q-opt">{c.optional}</span>}</label>
        {control}
        {err && <p className="fp-q-error" id={`${id}-err`}>{err}</p>}
      </div>
    </li>
  );

  return (
    <FormShell lang={lang}>
      {status === "done" ? (
        <FormMessage lang={lang} title={c.doneTitle} body={c.doneBody} />
      ) : (
        <form onSubmit={submit} noValidate>
          <header className="fp-header">
            <h1 className="fp-title">{c.title}</h1>
            <p className="fp-lead">{c.intro}</p>
          </header>

          <ol className="fp-questions">
            {field(1, "fb-name", c.name,
              <input id="fb-name" className="fp-input" value={form.name} onChange={set("name")} maxLength={120} autoComplete="name" aria-invalid={Boolean(errors.name)} />,
              errors.name)}
            {field(2, "fb-role", c.role,
              <input id="fb-role" className="fp-input" value={form.role} onChange={set("role")} maxLength={160} />,
              null, true)}
            <li className={`fp-q ${errors.rating ? "has-error" : ""}`}>
              <span className="fp-q-num" aria-hidden="true">03</span>
              <div className="fp-q-body">
                <span className="fp-q-label" id="fb-rating">{c.rating}</span>
                <div className="feedback-stars" role="radiogroup" aria-labelledby="fb-rating">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={form.rating === n}
                      aria-label={`${n} / 5`}
                      className={n <= form.rating ? "on" : ""}
                      onClick={() => setForm({ ...form, rating: n })}
                    >★</button>
                  ))}
                </div>
                {errors.rating && <p className="fp-q-error">{errors.rating}</p>}
              </div>
            </li>
            {field(4, "fb-message", c.message,
              <textarea id="fb-message" className="fp-input" rows={6} value={form.message} onChange={set("message")} placeholder={c.messagePlaceholder} maxLength={1500} aria-invalid={Boolean(errors.message)} />,
              errors.message)}
          </ol>

          {/* Honeypot: hidden from people, bots fill it in and get silently ignored by the server. */}
          <input className="feedback-trap" name="website" value={form.website} onChange={set("website")} tabIndex={-1} autoComplete="off" aria-hidden="true" />

          <div className="fp-submit">
            {status === "error" && <p className="fp-alert" role="alert">{c.errSend}</p>}
            <button className="fp-btn" type="submit" disabled={status === "sending"}>
              <span>{status === "sending" ? c.sending : c.send}</span>
              {status !== "sending" && <ArrowIcon rtl={isAr} />}
            </button>
          </div>
        </form>
      )}
    </FormShell>
  );
}
