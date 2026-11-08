// CircleRing.jsx — the savings circle drawn as what it is: a ring of months. Each month is one
// segment, filled when the member has paid it, outlined in saffron for the current month, and
// marked with a star for the member's own turn(s). The centre says how far away their turn is.
// It only uses the member's own data (their dues and turns) — no one else's name or payment.
import { StarIcon } from "../team/icons";

const SIZE = 176;
const R = 74;
const C = SIZE / 2;

// The point on the ring at a given fraction of the way round, starting at 12 o'clock.
const at = (f, r = R) => [C + r * Math.sin(2 * Math.PI * f), C - r * Math.cos(2 * Math.PI * f)];
function arc(i, n) {
  const gap = n > 1 ? 0.012 : 0;
  const [x1, y1] = at(i / n + gap);
  const [x2, y2] = at((i + 1) / n - gap);
  const large = 1 / n - 2 * gap > 0.5 ? 1 : 0;
  return `M${x1} ${y1} A${R} ${R} 0 ${large} 1 ${x2} ${y2}`;
}

export default function CircleRing({ circle, t }) {
  const n = circle.months;
  const dues = circle.me.dues;
  const turnMonths = new Set(circle.turns.map((x) => x.month));
  const current = circle.currentMonth; // worked out by the server (buildStatement in lib/circles.js)
  const nextTurn = [...turnMonths].filter((m) => m >= current).sort((a, b) => a - b)[0];
  const finished = circle.status === "finished";
  const headline = finished ? t.ringDone : nextTurn === undefined ? t.ringMonth(current + 1, n)
    : nextTurn === current ? t.ringTurnNow : t.ringTurnIn(nextTurn - current);

  return (
    <figure className="gm-ring" aria-label={`${t.ring}: ${headline}`}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        {Array.from({ length: n }, (_, i) => {
          const state = dues[i]?.state;
          return (
            <path key={i} d={arc(i, n)}
              className={`gm-ring-seg ${state === "paid" ? "is-paid" : ""} ${i === current && !finished ? "is-now" : ""} ${turnMonths.has(i) ? "is-turn" : ""}`} />
          );
        })}
        {[...turnMonths].map((m) => {
          const [x, y] = at((m + 0.5) / n, R - 20);
          return <g key={m} transform={`translate(${x - 8} ${y - 8})`} className="gm-ring-star"><StarIcon size={16} /></g>;
        })}
      </svg>
      <figcaption>
        <strong>{headline}</strong>
        {!finished && <span className="tm-muted tm-small">{t.ringMonth(current + 1, n)}</span>}
      </figcaption>
      <ul className="gm-ring-legend tm-small">
        <li><span className="gm-key is-paid" />{t.ringLegend.paid}</li>
        <li><span className="gm-key is-now" />{t.ringLegend.now}</li>
        <li><span className="gm-key is-turn" />{t.ringLegend.turn}</li>
      </ul>
    </figure>
  );
}
