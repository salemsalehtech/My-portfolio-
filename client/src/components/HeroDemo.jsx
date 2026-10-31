// HeroDemo.jsx — the interactive window in the hero: a small clinic-booking screen that switches
// between Arabic and English (text, direction and layout together), because building products
// that work in both languages is the work this site sells.
//
// The visitor can switch the language, pick a day and a time and confirm. Until they touch it,
// the language flips by itself every few seconds; after the first interaction it stays put.
// It's a static demo: nothing is saved or sent.
import { useEffect, useMemo, useState } from "react";
import { CheckIcon } from "./team/icons";

const COPY = {
  ar: {
    app: "عيادة النور", title: "احجز موعدك", sub: "د. منى عادل · أسنان", day: "اختار اليوم", time: "المواعيد المتاحة",
    confirm: "تأكيد الحجز", done: "تم الحجز", doneSub: (d, t) => `${d} الساعة ${t} — هيوصلك تذكير قبلها بيوم.`, again: "حجز تاني",
    locale: "ar-EG",
  },
  en: {
    app: "Al Nour Clinic", title: "Book a visit", sub: "Dr. Mona Adel · Dentist", day: "Pick a day", time: "Available times",
    confirm: "Confirm booking", done: "Booked", doneSub: (d, t) => `${d} at ${t} — you'll get a reminder the day before.`, again: "Book another",
    locale: "en-GB",
  },
};
const SLOTS = ["10:00", "11:30", "13:00", "16:30", "18:00", "19:30"];
const FULL = new Set([1, 4]); // slots shown as taken

export default function HeroDemo({ caption }) {
  const [lang, setLang] = useState("ar");
  const [touched, setTouched] = useState(false);
  const [day, setDay] = useState(1);
  const [slot, setSlot] = useState(2);
  const [booked, setBooked] = useState(false);
  const c = COPY[lang];

  // Flip the language on its own until the visitor interacts (not when motion is reduced).
  useEffect(() => {
    if (touched || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setLang((l) => (l === "ar" ? "en" : "ar")), 3800);
    return () => clearInterval(timer);
  }, [touched]);
  const touch = (fn) => (...args) => { setTouched(true); fn(...args); };

  const days = useMemo(() => Array.from({ length: 5 }, (_, i) => new Date(Date.now() + (i + 1) * 864e5)), []);
  const fmt = (d, opts) => d.toLocaleDateString(c.locale, opts);
  const time = (s) => {
    const [h, m] = s.split(":").map(Number);
    return new Date(2026, 0, 1, h, m).toLocaleTimeString(c.locale, { hour: "numeric", minute: "2-digit" });
  };

  return (
    <figure className="demo">
      <div className="demo-window" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
        <div className="demo-bar" dir="ltr">
          <span className="demo-dots" aria-hidden="true"><i /><i /><i /></span>
          <span className="demo-url">clinic.salemsaleh.tech</span>
          <div className="demo-lang" role="group" aria-label="Language">
            <button type="button" className={lang === "ar" ? "is-on" : ""} aria-pressed={lang === "ar"} onClick={touch(() => setLang("ar"))} lang="ar">عربي</button>
            <button type="button" className={lang === "en" ? "is-on" : ""} aria-pressed={lang === "en"} onClick={touch(() => setLang("en"))} lang="en">EN</button>
          </div>
        </div>

        <div className="demo-body" key={lang}>
          <div className="demo-head">
            <span className="demo-logo" aria-hidden="true">{lang === "ar" ? "ن" : "N"}</span>
            <div><strong>{c.app}</strong><span>{c.sub}</span></div>
          </div>

          {booked ? (
            <div className="demo-done" role="status">
              <span className="demo-done-icon"><CheckIcon size={26} /></span>
              <strong>{c.done}</strong>
              <p>{c.doneSub(fmt(days[day], { weekday: "long", day: "numeric", month: "long" }), time(SLOTS[slot]))}</p>
              <button type="button" className="demo-link" onClick={touch(() => setBooked(false))}>{c.again}</button>
            </div>
          ) : (
            <>
              <h3>{c.title}</h3>
              <p className="demo-label">{c.day}</p>
              <div className="demo-days">
                {days.map((d, i) => (
                  <button type="button" key={i} className={i === day ? "is-on" : ""} aria-pressed={i === day} onClick={touch(() => setDay(i))}>
                    <span>{fmt(d, { weekday: "short" })}</span>
                    <strong>{fmt(d, { day: "numeric" })}</strong>
                  </button>
                ))}
              </div>
              <p className="demo-label">{c.time}</p>
              <div className="demo-slots">
                {SLOTS.map((s, i) => (
                  <button type="button" key={s} disabled={FULL.has(i)} className={i === slot ? "is-on" : ""} aria-pressed={i === slot} onClick={touch(() => setSlot(i))}>{time(s)}</button>
                ))}
              </div>
              <button type="button" className="demo-confirm" onClick={touch(() => setBooked(true))}>{c.confirm}</button>
            </>
          )}
        </div>
      </div>
      {caption && <figcaption className="demo-caption">{caption}</figcaption>}
    </figure>
  );
}
