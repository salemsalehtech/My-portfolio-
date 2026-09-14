// particles.js — the animation engine behind the canvas particle background seen in Hero.jsx.
//
// This is plain JS (no React) on purpose: it's just Canvas 2D drawing code, so it lives in
// lib/ next to api.js rather than inside the Particles.jsx component. Particles.jsx just
// gets a <canvas> element onto the screen and hands it to startParticleField() below.
//
// startParticleField(canvas, getTheme) spawns a field of small dots that drift slowly and
// draws a faint connecting line between any two dots that are close together. `getTheme`
// is a function (not a fixed value) so the animation loop always uses the CURRENT theme
// without needing to be restarted when the user toggles dark/light mode.
//
// Returns a cleanup function — call it when the component unmounts (stops the animation
// loop and removes the resize listener).
export function startParticleField(canvas, getTheme) {
  const ctx = canvas.getContext("2d");
  let particles = [];
  let animId = null;

  // (Re)builds the particle field to match the canvas's current size. Runs once up front
  // and again every time the window is resized.
  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const n = Math.min(80, Math.floor((canvas.width * canvas.height) / 14000));
    particles = Array.from({ length: n }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.8 + 0.4, dx: (Math.random() - 0.5) * 0.35, dy: (Math.random() - 0.5) * 0.35,
      o: Math.random() * 0.45 + 0.08,
    }));
  }
  resize();
  window.addEventListener("resize", resize);

  // One animation frame: move every particle a little, draw it, then draw a faint line
  // between any two particles that ended up close together. Schedules itself again via
  // requestAnimationFrame, so this keeps looping until the returned cleanup() is called.
  function draw() {
    const { width: W, height: H } = canvas;
    ctx.clearRect(0, 0, W, H);
    const light = getTheme() === "light";
    particles.forEach((p) => {
      p.x = (p.x + p.dx + W) % W;
      p.y = (p.y + p.dy + H) % H;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = light ? `rgba(30,58,95,${p.o * 0.4})` : `rgba(232,160,32,${p.o})`;
      ctx.fill();
    });
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 110) {
          const al = (1 - d / 110) * 0.12;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = light ? `rgba(30,58,95,${al * 0.5})` : `rgba(232,160,32,${al})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }
    animId = requestAnimationFrame(draw);
  }
  draw();

  return function cleanup() {
    window.removeEventListener("resize", resize);
    if (animId) cancelAnimationFrame(animId);
  };
}
