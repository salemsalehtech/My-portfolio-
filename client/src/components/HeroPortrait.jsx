// HeroPortrait.jsx — the stage on the hero's far side: a panel cut on a diagonal, the brand mark
// (components/BrandMark.jsx) drawn huge behind the cut-out portrait, and the mark's bottom strokes
// drawn a second time IN FRONT of the portrait, so the person stands inside the logo.
//
// The traces draw themselves once on load; the mark and the portrait drift apart slightly with the
// pointer (depth). In light mode the panel is ink and the mark saffron; in dark mode they swap.
// Motion is skipped when the visitor prefers reduced motion.
//
// Props: `src` (photo URL), `cutout` (true when the photo has no background — the bundled one;
// an uploaded photo keeps its background and gets a softer fade instead), `name` (alt text),
// `status` (availability text), `available` (bool).
import { useRef } from "react";
import { TRACE_PATHS } from "./BrandMark";

function Mark({ className }) {
  return (
    <svg className={className} viewBox="-3 2 100 58" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="6.5" strokeLinejoin="miter">
        {TRACE_PATHS.map((d) => <path key={d} d={d} pathLength="100" />)}
      </g>
      <circle cx="40" cy="9" r="6.2" fill="currentColor" />
      <circle cx="4" cy="53" r="6.2" fill="currentColor" />
      <circle cx="90" cy="9" r="6.2" fill="currentColor" />
      <circle cx="54" cy="53" r="6.2" fill="currentColor" />
    </svg>
  );
}

export default function HeroPortrait({ src, cutout, name, status, available }) {
  const ref = useRef(null);

  const onMove = (e) => {
    const el = ref.current;
    if (!el || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    el.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  };
  const onLeave = () => {
    ref.current?.style.setProperty("--px", 0);
    ref.current?.style.setProperty("--py", 0);
  };

  return (
    <div className={`stage ${cutout ? "is-cutout" : "is-photo"}`} ref={ref} onPointerMove={onMove} onPointerLeave={onLeave}>
      <Mark className="stage-mark is-back" />
      <div className="stage-fig"><img className="stage-photo" src={src} alt={name} width="760" height="950" /></div>
      <Mark className="stage-mark is-front" />
      <p className={`stage-status ${available ? "is-available" : "is-busy"}`}><span aria-hidden="true" />{status}</p>
    </div>
  );
}
