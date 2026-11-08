// BrandBackdrop.jsx — the large SS mark behind the team and circle portals, so the page isn't a
// blank sheet. It reacts to scrolling with CSS only (scroll-driven animations): the traces draw
// themselves and the mark drifts and turns slightly as the page moves; no JavaScript runs on
// scroll, so it costs nothing. Browsers without scroll timelines (and people who prefer reduced
// motion) simply see the mark still. Purely decorative: hidden from screen readers, never clickable.
import { TRACE_PATHS } from "./BrandMark";

export default function BrandBackdrop() {
  return (
    <div className="bd" aria-hidden="true">
      <svg className="bd-mark" viewBox="-3 2 100 58">
        <g fill="none" strokeWidth="6.5" strokeLinejoin="miter">
          {TRACE_PATHS.map((d) => <path key={d} d={d} pathLength="100" />)}
        </g>
        <circle cx="40" cy="9" r="6.2" className="bd-pad is-start" />
        <circle cx="4" cy="53" r="6.2" className="bd-pad" />
        <circle cx="90" cy="9" r="6.2" className="bd-pad" />
        <circle cx="54" cy="53" r="6.2" className="bd-pad" />
      </svg>
      <div className="bd-grid" />
    </div>
  );
}
