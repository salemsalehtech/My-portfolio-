// CirclePrint.jsx — printable pages of the member portal:
//   CircleReceipt     (/#/gam3eya/receipt/:id)      — a receipt for one confirmed payment
//   CircleCertificate (/#/gam3eya/certificate/:id)  — when a circle has finished: what the member
//                                                     paid, how many months on time, what they received
// "Print" uses the browser (which can also save as PDF); the top bar and footer are hidden in print.
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { COMPANY } from "../../lib/brand";
import { money, day, monthName, METHOD_LABEL } from "../../lib/circles";
import { useCircle } from "./CirclePortal";
import { PrinterIcon, AwardIcon } from "../../components/team/icons";
import BrandMark from "../../components/BrandMark";

const T = {
  en: { receipt: "Payment receipt", no: "Receipt no.", member: "Member", phone: "Phone", circle: "Circle", month: "For the month of", amount: "Amount", method: "Paid by", sent: "Sent on", confirmed: "Confirmed on", by: "by", owner: "the organizer", note: "Note",
    cert: "Circle completed", certText: (n, c) => `This certifies that ${n} completed the savings circle “${c}”.`, paid: "Total paid", received: "Total received", onTime: "Months paid on time", thanks: "Thank you for your commitment." },
  ar: { receipt: "إيصال دفع", no: "رقم الإيصال", member: "العضو", phone: "الموبايل", circle: "الجمعية", month: "عن شهر", amount: "المبلغ", method: "طريقة الدفع", sent: "تاريخ الإرسال", confirmed: "تاريخ التأكيد", by: "بواسطة", owner: "المنظّم", note: "ملاحظة",
    cert: "إتمام جمعية", certText: (n, c) => `نشهد بأن ${n} أتمّ جمعية «${c}» بنجاح.`, paid: "إجمالي المدفوع", received: "إجمالي المقبوض", onTime: "شهور اتدفعت في ميعادها", thanks: "شكرًا على التزامك." },
};

function Sheet({ children }) {
  const { t } = useCircle();
  return (
    <main className="tm-page gm-print-page">
      <div className="gm-noprint gm-print-tools">
        <Link className="tm-back" to="/gam3eya">{t.back}</Link>
        <button className="fp-btn" onClick={() => window.print()}><PrinterIcon size={16} /> {t.print}</button>
      </div>
      <article className="gm-sheet">
        <header className="gm-sheet-head"><BrandMark height={24} className="tm-logo" /><strong>{COMPANY}</strong></header>
        {children}
      </article>
    </main>
  );
}

export function CircleReceipt() {
  const { id } = useParams();
  const { lang, t: tt, msg } = useCircle();
  const t = T[lang];
  const [p, setP] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api.get(`/circle/payments/${id}`).then(setP).catch((err) => setError(err.message)); }, [id]);
  if (!p) return <main className="tm-page"><p className={error ? "tm-error" : "tm-muted"}>{error ? msg(error) : tt.loading}</p></main>;
  const dueDate = (() => { const [y, m] = p.circle.startMonth.split("-").map(Number); const total = y * 12 + m - 1 + p.month; return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}-01`; })();
  const rows = [
    [t.no, <code key="n" dir="ltr">{p.id.slice(-8).toUpperCase()}</code>],
    [t.member, p.memberName], [t.phone, <span key="ph" dir="ltr">{p.memberPhone}</span>],
    [t.circle, p.circle.name], [t.month, monthName(dueDate, lang)],
    [t.method, METHOD_LABEL[lang][p.method]],
    [t.sent, day(p.createdAt.slice(0, 10), lang)],
    [t.confirmed, `${p.reviewedAt ? day(p.reviewedAt.slice(0, 10), lang) : "—"} · ${t.by} ${p.reviewedBy === "owner" ? t.owner : p.reviewedBy}`],
    ...(p.note ? [[t.note, p.note]] : []),
  ];
  return (
    <Sheet>
      <h1>{t.receipt}</h1>
      <p className="gm-sheet-amount">{money(p.amount, lang)}</p>
      <dl className="gm-sheet-rows">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd dir="auto">{v}</dd></div>)}</dl>
      {p.status !== "confirmed" && <p className="tm-late">{tt.rejected}</p>}
    </Sheet>
  );
}

export function CircleCertificate() {
  const { id } = useParams();
  const { lang, t: tt, member } = useCircle();
  const t = T[lang];
  const [c, setC] = useState(null);
  useEffect(() => { api.get("/circle/circles").then((list) => setC(list.find((x) => x.id === id) || false)).catch(() => setC(false)); }, [id]);
  if (c === null) return <main className="tm-page"><p className="tm-muted">{tt.loading}</p></main>;
  if (!c) return <main className="tm-page"><Link className="tm-back" to="/gam3eya">{tt.back}</Link></main>;
  const onTime = c.me.dues.filter((d) => d.onTime).length;
  const received = c.turns.reduce((s, x) => s + x.amount, 0);
  return (
    <Sheet>
      <div className="gm-cert">
        <span className="gm-cert-medal"><AwardIcon size={28} /></span>
        <h1>{t.cert}</h1>
        <p className="gm-cert-text">{t.certText(member.name, c.name)}</p>
        <dl className="gm-cert-stats">
          <div><dt>{t.paid}</dt><dd>{money(c.me.paidSoFar, lang)}</dd></div>
          <div><dt>{t.received}</dt><dd>{money(received, lang)}</dd></div>
          <div><dt>{t.onTime}</dt><dd>{onTime} / {c.months}</dd></div>
        </dl>
        <p className="tm-muted">{monthName(c.me.dues[0]?.dueDate, lang)} — {monthName(c.me.dues[c.me.dues.length - 1]?.dueDate, lang)}</p>
        <p className="gm-cert-thanks">{t.thanks}</p>
      </div>
    </Sheet>
  );
}
