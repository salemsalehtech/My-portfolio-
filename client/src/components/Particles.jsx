import { useEffect, useRef } from "react";
import { useSite } from "../context/SiteContext";

export default function Particles() {
  const canvasRef = useRef(null);
  const { theme } = useSite();
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let particles = [];
    let animId = null;

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

    function draw() {
      const { width: W, height: H } = canvas;
      ctx.clearRect(0, 0, W, H);
      const light = themeRef.current === "light";
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

    return () => {
      window.removeEventListener("resize", resize);
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  return <canvas id="particles" ref={canvasRef}></canvas>;
}
