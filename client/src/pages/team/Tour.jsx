// Tour.jsx — three short cards the first time a member opens the portal: where tasks are,
// that asking for help is fine, and how to hand work in. "Skip" or "Got it" saves it (POST
// /api/team/tour-done) so it never shows again on any device.
import { useState } from "react";
import { api } from "../../lib/api";
import { SHARED_COPY } from "../../lib/team";
import BrandMark from "../../components/BrandMark";
import { useTeam } from "./TeamPortal";

export default function Tour() {
  const { lang, member, setMember } = useTeam();
  const c = SHARED_COPY[lang];
  const [step, setStep] = useState(0);
  if (member.tourDone) return null;
  const finish = () => {
    setMember({ ...member, tourDone: true });
    api.post("/team/tour-done").catch(() => {});
  };
  const [title, body] = c.tour[step];
  const last = step === c.tour.length - 1;
  return (
    <div className="tm-overlay">
      <div className="tm-dialog tm-tour cut-card" role="dialog" aria-modal="true" aria-labelledby="tm-tour-title">
        <BrandMark className="tm-tour-mark" height={40} draw />
        <span className="tm-eyebrow">{step + 1} / {c.tour.length}</span>
        <h2 id="tm-tour-title">{title}</h2>
        <p>{body}</p>
        <div className="tm-tour-dots" aria-hidden="true">{c.tour.map((_, i) => <span key={i} className={i === step ? "is-on" : ""} />)}</div>
        <div className="actions">
          {!last && <button className="fp-btn fp-btn-ghost" onClick={finish}>{c.skip}</button>}
          <button className="fp-btn" onClick={() => (last ? finish() : setStep(step + 1))}>{last ? c.gotIt : c.next}</button>
        </div>
      </div>
    </div>
  );
}
