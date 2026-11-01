// ArrowIcon.jsx — the small arrow at the end of buttons and "read more" links. It points to the
// reading direction: CSS flips it on Arabic pages (body.ar .arrow-icon in index.css).
export function ArrowIcon({ size = 16 }) {
  return (
    <svg className="arrow-icon" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" aria-hidden="true">
      <path d="M2 8h11M9 4l4 4-4 4" />
    </svg>
  );
}
