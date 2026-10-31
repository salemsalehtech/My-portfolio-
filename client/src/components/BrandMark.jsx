// BrandMark.jsx — the Salem Saleh Tech logo: "SS" drawn as two circuit traces (straight runs,
// 45° corners, a pad at each end). The first pad is saffron; everything else takes the text colour,
// so the mark works on light and dark backgrounds without a box behind it.
//
// Props: `height` in px (the mark is 1.55× as wide), `title` for screen readers, `draw` to animate
// the traces drawing themselves once (used in the hero), `className`.
export const TRACE_PATHS = [
  "M40 9H13L4 18V22L13 31H31L40 40V44L31 53H4",
  "M90 9H63L54 18V22L63 31H81L90 40V44L81 53H54",
];

export default function BrandMark({ height = 28, title = "Salem Saleh Tech", draw = false, className = "" }) {
  return (
    <svg className={`brand-mark ${draw ? "is-drawing" : ""} ${className}`} width={height * 1.55} height={height} viewBox="-3 2 100 58" role="img" aria-label={title}>
      <g fill="none" stroke="currentColor" strokeWidth="6.5" strokeLinejoin="miter">
        {TRACE_PATHS.map((d) => <path key={d} d={d} pathLength="100" />)}
      </g>
      <circle cx="40" cy="9" r="6.2" fill="var(--gold, #E3A21A)" />
      <circle cx="4" cy="53" r="6.2" fill="currentColor" />
      <circle cx="90" cy="9" r="6.2" fill="currentColor" />
      <circle cx="54" cy="53" r="6.2" fill="currentColor" />
    </svg>
  );
}
