// Process.jsx — "How a project goes" (id="process"): the steps of working together, in order —
// so the numbers mean something here. The steps come from Profile & Links in the dashboard; while
// none are saved, the built-in four (t.process.steps) are shown.
import { useSite } from "../context/SiteContext";
import { useReveal } from "../hooks/useReveal";
import { pick } from "../lib/pick";

export default function Process({ settings }) {
  const { t, lang } = useSite();
  const [headerRef, headerVisible] = useReveal();
  const [listRef, listVisible] = useReveal();
  const steps = settings.process?.length
    ? settings.process.map((s) => ({ title: pick(lang, s.titleEn, s.titleAr), text: pick(lang, s.textEn, s.textAr) }))
    : t.process.steps;

  return (
    <section id="process" className="section-bg">
      <div className="container">
        <div ref={headerRef} className={`section-header ${headerVisible ? "visible" : ""}`} data-ao>
          <div className="section-badge">{t.process.subtitle}</div>
          <h2>{t.process.title}</h2>
        </div>
        <ol ref={listRef} className={`process-steps ${listVisible ? "visible" : ""}`} data-ao>
          {steps.map((step, i) => (
            <li key={i} className="process-step">
              <span className="process-num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              {step.text && <p>{step.text}</p>}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
