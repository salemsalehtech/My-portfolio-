// NotFound.jsx — the page for any address the site doesn't have (route "*" in App.jsx), e.g. an
// old or mistyped link. A trace in the brand's style starts at the saffron pad and stops short of
// an empty pad: nothing is connected at this address. Below it: the address that was asked for and
// the ways back (home, the articles, contact).
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSite } from "../context/SiteContext";
import BlogHeader from "../components/BlogHeader";

// The trace in a 640-wide box, drawn left to right; in Arabic it is mirrored so the signal starts
// at the reading edge (the coordinates are mirrored, so the SVG needs no CSS flip).
const W = 640;
const RUN = [[18, 60], [190, 60], [220, 30], [350, 30], [380, 60], [470, 60]];
const STUB = [[500, 60], [548, 60]];
const PAD_START = 18, PAD_END = 584;
const line = (points, flip) => "M" + points.map(([x, y]) => `${flip ? W - x : x} ${y}`).join("L");

export default function NotFound() {
  const { t, lang } = useSite();
  const flip = lang === "ar";
  const copy = t.notFound;
  const { pathname, search } = useLocation();

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { document.title = `${copy.eyebrow} | Salem Saleh`; }, [copy.eyebrow]);

  return (
    <div className="blog-page">
      <BlogHeader />
      <main className="container nf-main">
        <svg className="nf-trace" viewBox="0 0 640 120" aria-hidden="true">
          <path className="nf-run" d={line(RUN, flip)} pathLength="100" />
          <path className="nf-stub" d={line(STUB, flip)} />
          <circle className="nf-pad-start" cx={flip ? W - PAD_START : PAD_START} cy="60" r="11" />
          <circle className="nf-pad-end" cx={flip ? W - PAD_END : PAD_END} cy="60" r="16" />
        </svg>

        <p className="nf-eyebrow">{copy.eyebrow}</p>
        <h1 className="nf-title">{copy.title}</h1>
        <p className="nf-text">{copy.text}</p>
        <p className="nf-address"><span>{copy.address}</span> <code dir="ltr">#{pathname}{search}</code></p>

        <div className="nf-actions">
          <Link to="/" className="btn-primary">{copy.home}</Link>
          <Link to="/blog" className="btn-secondary">{copy.blog}</Link>
          <Link to="/" state={{ scrollTo: "contact" }} className="btn-secondary">{copy.contact}</Link>
        </div>
      </main>
    </div>
  );
}
