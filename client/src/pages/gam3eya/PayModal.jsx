// PayModal.jsx — "Pay now" in the member portal. Shows where to send the money (InstaPay address
// and Vodafone Cash number with copy buttons, an InstaPay QR code when the owner set a payment
// link), then the member picks the month, the amount (the rest of that month by default), how
// they paid, attaches the transfer screenshot and an optional note. The payment then waits for
// the owner (or a helper) to confirm it.
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { readAsBase64 } from "../../lib/readAsBase64";
import { money, monthName, METHODS, METHOD_LABEL } from "../../lib/circles";
import { useCircle } from "./CirclePortal";

function CopyRow({ label, value }) {
  const { t } = useCircle();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { window.prompt(label, value); }
  };
  return (
    <div className="gm-copy">
      <span className="tm-muted tm-small">{label}</span>
      <code dir="ltr">{value}</code>
      <button type="button" className="fp-btn fp-btn-ghost" onClick={copy}>{copied ? t.copied : t.copy}</button>
    </div>
  );
}

// The InstaPay payment link as a QR code (qrcode-generator is loaded only here).
function Qr({ text }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    import("qrcode-generator").then(({ default: qrcode }) => {
      const qr = qrcode(0, "M");
      qr.addData(text);
      qr.make();
      setSvg(qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true }));
    }).catch(() => {});
  }, [text]);
  return svg ? <div className="gm-qr" dangerouslySetInnerHTML={{ __html: svg }} /> : null;
}

export default function PayModal({ circle, month, payInfo, onClose, onSent }) {
  const { t, lang, msg } = useCircle();
  const open = circle.me.dues.filter((d) => d.state !== "paid");
  const [form, setForm] = useState(() => {
    const d = circle.me.dues[month];
    return { month, amount: d ? d.due - d.paid : circle.me.monthlyDue, method: payInfo?.instapay ? "instapay" : payInfo?.vodafone ? "vodafone" : "instapay", note: "" };
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);
  const pickMonth = (e) => {
    const m = Number(e.target.value);
    const d = circle.me.dues[m];
    setForm({ ...form, month: m, amount: d.due - d.paid });
  };
  const pickFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) return setError(msg("Image is too large (max 2 MB)"));
    setError("");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post(`/circle/circles/${circle.id}/payments`, {
        month: form.month, amount: Number(form.amount), method: form.method, note: form.note,
        proof: file ? await readAsBase64(file) : undefined,
      });
      onSent();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tm-overlay" onClick={onClose}>
      <form className="tm-dialog tm-task gm-pay" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="tm-task-head"><h2>{t.payTitle}</h2><button type="button" className="tm-close" onClick={onClose} aria-label={t.cancel}>✕</button></div>

        {payInfo && (payInfo.instapay || payInfo.vodafone) && (
          <div className="gm-payto">
            <strong>{t.payTo}</strong>
            {payInfo.instapay && <CopyRow label="InstaPay" value={payInfo.instapay} />}
            {payInfo.vodafone && <CopyRow label={METHOD_LABEL[lang].vodafone} value={payInfo.vodafone} />}
            {payInfo.instapayLink && (
              <div className="gm-qr-wrap">
                <Qr text={payInfo.instapayLink} />
                <span className="tm-small tm-muted">{t.scanQr}</span>
                <a className="tm-small" href={payInfo.instapayLink} target="_blank" rel="noreferrer">InstaPay ↗</a>
              </div>
            )}
            {payInfo.payNote && <p className="tm-small tm-muted" dir="auto">{payInfo.payNote}</p>}
          </div>
        )}

        <div className="gm-pay-grid">
          <label className="tm-field"><span>{t.payFor}</span>
            <select className="fp-input" value={form.month} onChange={pickMonth}>
              {open.map((d) => <option key={d.month} value={d.month}>{monthName(d.dueDate, lang)} — {money(d.due - d.paid, lang)}</option>)}
            </select>
          </label>
          <label className="tm-field"><span>{t.amount}</span>
            <input className="fp-input" type="number" min={1} inputMode="numeric" value={form.amount} onChange={set("amount")} required />
          </label>
        </div>
        <fieldset className="gm-methods">
          <legend>{t.method}</legend>
          {METHODS.map((m) => (
            <label key={m} className={form.method === m ? "is-on" : ""}>
              <input type="radio" name="method" value={m} checked={form.method === m} onChange={set("method")} />{METHOD_LABEL[lang][m]}
            </label>
          ))}
        </fieldset>
        <label className="tm-field"><span>{t.screenshot}{form.method !== "cash" && " *"}</span>
          <input className="fp-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={pickFile} required={form.method !== "cash" && !file} />
          <small className="tm-muted">{t.screenshotHint}</small>
        </label>
        {preview && <img className="gm-preview" src={preview} alt="" />}
        <label className="tm-field"><span>{t.note}</span>
          <input className="fp-input" dir="auto" value={form.note} onChange={set("note")} maxLength={500} placeholder={t.notePlaceholder} />
        </label>
        {error && <p className="tm-error" role="alert">{msg(error)}</p>}
        <button className="fp-btn tm-btn-block" type="submit" disabled={busy}>{busy ? t.sending : t.submitPay}</button>
      </form>
    </div>
  );
}
