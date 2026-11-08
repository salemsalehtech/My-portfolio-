// RatingInput.jsx — 1–5 stars (or 0–max for the bonus) as a row of buttons; used by the owner
// when approving a task (TeamTaskEditor.jsx). Arrow keys work as in a radio group.
import { StarIcon } from "./icons";

export default function RatingInput({ label, value, onChange, min = 1, max = 5 }) {
  const values = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  return (
    <div className="ui-rating" role="radiogroup" aria-label={label}>
      <span className="ui-rating-label">{label}</span>
      <span className="ui-rating-stars">
        {values.map((v) => (
          <button key={v} type="button" role="radio" aria-checked={value === v} aria-label={`${label}: ${v}`}
            className={v <= value && v > 0 ? "is-on" : ""} onClick={() => onChange(value === v ? (min === 0 ? 0 : v) : v)}>
            {v === 0 ? "0" : <StarIcon size={18} />}
          </button>
        ))}
      </span>
    </div>
  );
}
