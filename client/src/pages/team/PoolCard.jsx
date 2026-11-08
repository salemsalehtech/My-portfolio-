// PoolCard.jsx — "Open tasks — pick one": unassigned tasks the owner left open for anyone on the
// project (GET /api/team/pool). "I'll take it" claims one (first come, first served — the server
// makes sure only one member gets it) and the home page reloads its task list.
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { SHARED_COPY, PRIORITY_LABEL, formatDue } from "../../lib/team";
import { toast } from "../../components/Toaster";
import { useTeam } from "./TeamPortal";

export default function PoolCard({ onClaimed }) {
  const { lang, msg } = useTeam();
  const c = SHARED_COPY[lang];
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(null);
  const load = () => api.get("/team/pool").then(setList).catch(() => setList([]));
  useEffect(() => { load(); }, []);
  if (list.length === 0) return null;

  const claim = async (task) => {
    setBusy(task.id);
    try {
      await api.post(`/team/tasks/${task.id}/claim`);
      onClaimed();
    } catch (err) {
      toast(msg(err.message), { tone: "error" });
    } finally {
      setBusy(null);
      load();
    }
  };
  return (
    <section className="tm-section">
      <h2>{c.pool}</h2>
      <p className="tm-muted tm-small">{c.claimHint}</p>
      <div className="tm-pool">
        {list.map((task) => (
          <div key={task.id} className="cut-card tm-pool-item">
            <span className={`tm-prio is-${task.priority}`}>{PRIORITY_LABEL[lang][task.priority]}</span>
            <strong dir="auto">{task.title}</strong>
            <span className="tm-muted tm-small" dir="auto">{task.project.name}{task.dueDate ? ` · ${formatDue(task.dueDate, lang)}` : ""}</span>
            <button className="fp-btn" disabled={busy === task.id} onClick={() => claim(task)}>{c.claim}</button>
          </div>
        ))}
      </div>
    </section>
  );
}
