// Particles.jsx — thin wrapper that mounts a <canvas> and hands it to the particle
// animation engine in lib/particles.js. Rendered as a background layer inside Hero.jsx
// (the hero/landing section, id="home"); takes no props. Reads the current theme from
// useSite() so the particle color matches dark/light mode.
import { useEffect, useRef } from "react";
import { useSite } from "../context/SiteContext";
import { startParticleField } from "../lib/particles";

export default function Particles() {
  const canvasRef = useRef(null);
  const { theme } = useSite();
  // Mirrored into a ref (rather than an effect dependency) so the running animation loop
  // can always read the LATEST theme without being torn down and restarted every time the
  // user toggles dark/light mode.
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return startParticleField(canvas, () => themeRef.current);
  }, []);

  return <canvas id="particles" ref={canvasRef}></canvas>;
}
