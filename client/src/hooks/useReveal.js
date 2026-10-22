// useReveal.js — a small "fade/slide in on scroll" hook used all over the public portfolio
// (About, Contact, Hero, Projects, Services, Skills, Testimonials, YouTube).
//
// Usage: const [ref, visible] = useReveal();  then put ref on the element you want to
// animate, and toggle a "visible" CSS class based on the visible flag (see index.css for
// the actual animation — this hook only tracks WHEN to add the class, not HOW it looks).
//
// Under the hood it's a thin wrapper around the browser's IntersectionObserver API: it
// watches the element and flips visible to true the first time at least 12% of it scrolls
// into the viewport, then stops watching since the animation only needs to fire once.
//
// `ref` is a "callback ref" (a function React calls with the element), stored in state. That
// matters: if the element appears LATER — e.g. a block rendered only once API data arrives —
// the hook notices and starts watching it then. (With a plain useRef + a mount-only effect,
// such a block would never be watched and would stay invisible, since elements marked
// [data-ao] start at opacity 0.)
import { useEffect, useState } from "react";

export function useReveal() {
  const [element, setElement] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!element || visible) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    obs.observe(element);
    return () => obs.disconnect();
  }, [element, visible]);

  return [setElement, visible];
}
