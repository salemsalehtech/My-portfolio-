// HeroPortrait.jsx — the portrait in the hero, drawn like a plate from an engineering drawing:
// a frame with one 45° chamfered corner (the same cut as the logo's traces), registration marks
// at the corners, a dimension line under it carrying the name and roles, a vertical one beside it
// carrying the city and the local time, and the availability status pinned to the frame.
//
// The photo sits in black and white and comes into colour on hover; it also drifts a few pixels
// with the pointer. Both are skipped when the visitor prefers reduced motion.
//
// Props: `src` (the photo URL), `name`, `roles` (string), `place` (city), `time` (Cairo time),
// `status` (availability text), `available` (bool).
import { useRef } from "react";

export default function HeroPortrait({ src, name, roles, place, time, status, available }) {
  const frameRef = useRef(null);

  const onMove = (e) => {
    const el = frameRef.current;
    if (!el || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    el.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  };
  const onLeave = () => {
    frameRef.current?.style.setProperty("--px", 0);
    frameRef.current?.style.setProperty("--py", 0);
  };

  return (
    <figure className="plate" dir="ltr">
      <div className="plate-body">
        <div className="plate-frame" ref={frameRef} onPointerMove={onMove} onPointerLeave={onLeave}>
          <img src={src} alt={name} width="760" height="950" />
          <span className="plate-grid" aria-hidden="true" />
        </div>
        <span className="plate-reg is-tl" aria-hidden="true" />
        <span className="plate-reg is-tr" aria-hidden="true" />
        <span className="plate-reg is-bl" aria-hidden="true" />
        <span className="plate-reg is-br" aria-hidden="true" />
        <p className={`plate-status ${available ? "is-available" : "is-busy"}`}><span aria-hidden="true" />{status}</p>
        <p className="plate-side"><span>{place}</span><span>{time}</span></p>
      </div>
      <figcaption className="plate-dim">
        <span className="plate-dim-line" aria-hidden="true" />
        <span className="plate-dim-text">{name}{roles && <> — {roles}</>}</span>
      </figcaption>
    </figure>
  );
}
