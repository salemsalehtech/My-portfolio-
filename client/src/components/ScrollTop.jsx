// ScrollTop.jsx — small floating button that scrolls the page back to the top.
// Prop: `visible` (boolean) controls whether it's shown — passed down from
// pages/Portfolio.jsx, which gets it from useScrollTracking() (true once the page has been
// scrolled down more than 400px).
export default function ScrollTop({ visible }) {
  return (
    <button
      className={`scroll-top ${visible ? "visible" : ""}`}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
    </button>
  );
}
