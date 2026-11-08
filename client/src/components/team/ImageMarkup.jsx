// ImageMarkup.jsx — draw arrows, boxes or free lines on a screenshot before attaching it, so
// "this button, here" is obvious without a paragraph of text. Opened by Attachments.jsx when a
// single picture is picked. onDone(file) gets the marked-up picture (or the original, untouched,
// when nothing was drawn); onCancel() closes without attaching.
import { useEffect, useRef, useState } from "react";
import { SHARED_COPY } from "../../lib/team";

const MAX_SIDE = 1800; // big enough to read, small enough to stay under 5 MB
const INK = "#E5484D"; // red reads on light and dark screenshots alike

function drawShape(ctx, s) {
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = s.w;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (s.tool === "box") {
    ctx.strokeRect(s.x1, s.y1, s.x2 - s.x1, s.y2 - s.y1);
  } else if (s.tool === "pen") {
    ctx.beginPath();
    s.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  } else {
    const angle = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
    const head = s.w * 4.5;
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2 - Math.cos(angle) * head * 0.6, s.y2 - Math.sin(angle) * head * 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s.x2, s.y2);
    ctx.lineTo(s.x2 - head * Math.cos(angle - 0.45), s.y2 - head * Math.sin(angle - 0.45));
    ctx.lineTo(s.x2 - head * Math.cos(angle + 0.45), s.y2 - head * Math.sin(angle + 0.45));
    ctx.closePath();
    ctx.fill();
  }
}

export default function ImageMarkup({ file, lang, onDone, onCancel }) {
  const c = SHARED_COPY[lang];
  const canvas = useRef(null);
  const img = useRef(null);
  const drawing = useRef(null);
  const [tool, setTool] = useState("arrow");
  const [shapes, setShapes] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
      canvas.current.width = Math.round(image.width * scale);
      canvas.current.height = Math.round(image.height * scale);
      img.current = image;
      setReady(true);
    };
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Redraw: the picture, then every shape (and the one being drawn).
  const paint = (extra) => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx || !img.current) return;
    ctx.drawImage(img.current, 0, 0, canvas.current.width, canvas.current.height);
    [...shapes, ...(extra ? [extra] : [])].forEach((s) => drawShape(ctx, s));
  };
  useEffect(() => { if (ready) paint(); }); // eslint-disable-line react-hooks/exhaustive-deps

  const point = (e) => {
    const r = canvas.current.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * canvas.current.width, ((e.clientY - r.top) / r.height) * canvas.current.height];
  };
  const down = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = point(e);
    const w = Math.max(3, Math.round(canvas.current.width / 250));
    drawing.current = { tool, w, x1: x, y1: y, x2: x, y2: y, points: [[x, y]] };
  };
  const move = (e) => {
    const s = drawing.current;
    if (!s) return;
    const [x, y] = point(e);
    s.x2 = x; s.y2 = y;
    if (s.tool === "pen") s.points.push([x, y]);
    paint(s);
  };
  const up = () => {
    const s = drawing.current;
    drawing.current = null;
    if (s && (Math.hypot(s.x2 - s.x1, s.y2 - s.y1) > 4 || s.points.length > 3)) setShapes((list) => [...list, s]);
  };

  const finish = () => {
    if (!shapes.length) return onDone(file);
    const type = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
    canvas.current.toBlob((blob) => {
      const name = file.name.replace(/\.[^.]+$/, "") + (type === "image/png" ? "-marked.png" : "-marked.jpg");
      onDone(new File([blob], name, { type }));
    }, type, 0.9);
  };

  return (
    <div className="tm-overlay" onClick={onCancel}>
      <div className="tm-dialog tm-markup" role="dialog" aria-modal="true" aria-label={c.markUp} onClick={(e) => e.stopPropagation()}>
        <div className="tm-markup-bar">
          <div className="tm-segment" role="radiogroup" aria-label={c.markUp}>
            {["arrow", "box", "pen"].map((t) => (
              <button key={t} type="button" role="radio" aria-checked={tool === t} className={tool === t ? "is-on" : ""} onClick={() => setTool(t)}>{c.tools[t]}</button>
            ))}
          </div>
          <button type="button" className="fp-btn fp-btn-ghost" onClick={() => setShapes((s) => s.slice(0, -1))} disabled={!shapes.length}>{c.undo}</button>
          <span className="tm-grow" />
          <button type="button" className="fp-btn fp-btn-ghost" onClick={onCancel}>{c.cancel}</button>
          <button type="button" className="fp-btn" onClick={finish} disabled={!ready}>{c.attachMarked}</button>
        </div>
        <div className="tm-markup-stage">
          <canvas ref={canvas} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
        </div>
      </div>
    </div>
  );
}
