// RulesGate.jsx — when the owner publishes (or updates) the team rules, a member sees them once
// and agrees before carrying on (POST /api/team/rules/agree). Members who already agreed to the
// current version never see it. RulesView is also used on the sign-up page (TeamJoin.jsx).
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { SHARED_COPY } from "../../lib/team";
import MarkdownView from "../../components/team/MarkdownView";
import { useTeam } from "./TeamPortal";

// The rules in the reader's language (falls back to the other one if only one was written).
export function RulesView({ rules, lang }) {
  const text = (lang === "ar" ? rules.rulesAr || rules.rulesEn : rules.rulesEn || rules.rulesAr) || "";
  return <div className="tm-rules-text"><MarkdownView text={text} empty={SHARED_COPY[lang].rulesNone} /></div>;
}

export default function RulesGate() {
  const { lang, member, setMember, msg } = useTeam();
  const c = SHARED_COPY[lang];
  const [rules, setRules] = useState(null);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { api.get("/team/rules").then(setRules).catch(() => {}); }, []);
  if (!rules?.version || (member.rulesAgreed || 0) >= rules.version) return null;

  const agree = async () => {
    setError("");
    try {
      setMember(await api.post("/team/rules/agree", { version: rules.version }));
    } catch (err) {
      setError(msg(err.message));
      api.get("/team/rules").then(setRules).catch(() => {}); // a newer version came out meanwhile
    }
  };
  return (
    <div className="tm-overlay">
      <div className="tm-dialog tm-rules" role="dialog" aria-modal="true" aria-labelledby="tm-rules-title">
        <h2 id="tm-rules-title">{c.rules}</h2>
        <p className="tm-muted">{c.rulesUpdated}</p>
        <RulesView rules={rules} lang={lang} />
        <label className="tm-check">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} /> {c.rulesAgree}
        </label>
        {error && <p className="tm-error" role="alert">{error}</p>}
        <div className="actions"><button className="fp-btn" disabled={!checked} onClick={agree}>{c.agree}</button></div>
      </div>
    </div>
  );
}
