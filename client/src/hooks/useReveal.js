// useReveal.js — a small "fade/slide in on scroll" hook used all over the public portfolio
// (About, Contact, Hero, Projects, Skills, YouTube).
//
// Usage: const [ref, visible] = useReveal();  then put ref on the element you want to
// animate, and toggle a "visible" CSS class based on the visible flag (see index.css for
// the actual animation — this hook only tracks WHEN to add the class, not HOW it looks).
//
// Under the hood it's a thin wrapper around the browser's IntersectionObserver API: it
// watches the ref'd element and flips visible to true the first time at least 12% of it
// scrolls into the viewport, then stops watching (obs.unobserve) since the animation only
// needs to fire once.
import { useEffect, useRef, useState } from "react";

export function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return [ref, visible];
}
