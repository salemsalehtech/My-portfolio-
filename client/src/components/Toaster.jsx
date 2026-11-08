// Toaster.jsx — small messages that slide in and leave by themselves ("Saved", "Approved — great
// work!") instead of blocking alert() boxes. Call toast(text, { tone, confetti }) from anywhere;
// <Toaster /> is mounted once by the team portal and the dashboard layout.
// tone: "ok" | "error" | "info". `confetti: true` adds a short burst of brand-coloured pieces.
import { useEffect, useState } from "react";

const listeners = new Set();
let nextId = 1;
export function toast(text, { tone = "ok", confetti = false, ms = 3500 } = {}) {
  const item = { id: nextId++, text, tone, confetti, ms };
  listeners.forEach((fn) => fn(item));
}

const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const PIECES = Array.from({ length: 28 }, (_, i) => i);

export default function Toaster() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const add = (item) => {
      setItems((list) => [...list.slice(-3), item]);
      setTimeout(() => setItems((list) => list.filter((x) => x.id !== item.id)), item.ms);
    };
    listeners.add(add);
    return () => listeners.delete(add);
  }, []);
  const burst = items.some((x) => x.confetti) && !reduceMotion();
  return (
    <>
      <div className="ui-toasts" role="status" aria-live="polite">
        {items.map((x) => <div key={x.id} className={`ui-toast is-${x.tone}`}>{x.text}</div>)}
      </div>
      {burst && (
        <div className="ui-confetti" aria-hidden="true">
          {PIECES.map((i) => <span key={i} style={{ "--i": i, "--x": `${(i * 37) % 100}vw`, "--d": `${0.8 + ((i * 13) % 10) / 10}s` }} />)}
        </div>
      )}
    </>
  );
}
