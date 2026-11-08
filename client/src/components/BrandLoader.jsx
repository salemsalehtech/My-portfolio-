// BrandLoader.jsx — the one "please wait" of the whole product: the SS mark with a saffron signal
// running along its two circuit traces, like current through a board. Used while a page waits
// for data, while signing in, and while a file uploads — never a bare spinner or "Loading…".
//
// Props: `label` (said to screen readers and shown under the mark), `size` (mark height in px),
// `variant`: "page" (centred in the content area), "screen" (covers the whole window — app start,
// sign-in), "inline" (small, inside a button or a row).
import { TRACE_PATHS } from "./BrandMark";

export default function BrandLoader({ label = "", size, variant = "page" }) {
  size ??= variant === "screen" ? 64 : variant === "inline" ? 16 : 48;
  const mark = (
    <svg className="bl-mark" width={size * 1.55} height={size} viewBox="-3 2 100 58" aria-hidden="true">
      <g fill="none" strokeWidth="6.5" strokeLinejoin="miter">
        {TRACE_PATHS.map((d) => <path key={`b${d}`} d={d} pathLength="100" className="bl-base" />)}
        {TRACE_PATHS.map((d, i) => <path key={`s${d}`} d={d} pathLength="100" className="bl-signal" style={{ animationDelay: `${i * 0.35}s` }} />)}
      </g>
      <circle cx="40" cy="9" r="6.2" className="bl-pad is-start" />
      <circle cx="4" cy="53" r="6.2" className="bl-pad" />
      <circle cx="90" cy="9" r="6.2" className="bl-pad is-start" style={{ animationDelay: ".35s" }} />
      <circle cx="54" cy="53" r="6.2" className="bl-pad" style={{ animationDelay: ".35s" }} />
    </svg>
  );
  if (variant === "inline") return <span className="bl is-inline" role="status" aria-label={label}>{mark}</span>;
  return (
    <div className={`bl is-${variant}`} role="status" aria-live="polite">
      {mark}
      {label && <span className="bl-label">{label}</span>}
    </div>
  );
}
