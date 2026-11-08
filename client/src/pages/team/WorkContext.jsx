// WorkContext.jsx — the member's work, loaded once for every tab of the portal (Home, My tasks,
// Projects, Announcements, Me) instead of each page fetching the same lists again:
//   tasks, projects, announcements ({ items, unread }), `loading`, reload(), and the task window:
//   openTask(task) shows TeamTaskModal over any tab; updates flow back into the lists.
// Also celebrates (once per browser) a task approved since the member's last visit.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { SHARED_COPY } from "../../lib/team";
import { toast } from "../../components/Toaster";
import { useTeam } from "./TeamPortal";
import TeamTaskModal from "./TeamTaskModal";

const WorkCtx = createContext(null);
export const useWork = () => useContext(WorkCtx);

export function WorkProvider({ children }) {
  const { lang, member, msg } = useTeam();
  const [tasks, setTasks] = useState(null);
  const [projects, setProjects] = useState([]);
  const [news, setNews] = useState({ items: [], unread: 0 });
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);

  // A task approved since the last visit gets a small celebration, once (remembered per browser).
  const celebrate = useCallback((list) => {
    const key = `teamCheer:${member.id}`;
    let seen = "";
    try { seen = localStorage.getItem(key) || ""; } catch { /* private mode */ }
    const newest = list.filter((x) => x.status === "done" && x.completedAt).map((x) => x.completedAt).sort().pop();
    if (!newest || newest <= seen) return;
    try { localStorage.setItem(key, newest); } catch { /* private mode */ }
    if (seen) toast(SHARED_COPY[lang].approvedCheer, { confetti: true }); // not on the very first visit
  }, [member.id, lang]);

  const reload = useCallback(() => Promise.all([api.get("/team/tasks"), api.get("/team/projects"), api.get("/team/announcements")])
    .then(([tk, pr, nw]) => { setTasks(tk); setProjects(pr); setNews(nw); celebrate(tk); })
    .catch((err) => setError(err.message)), [celebrate]);
  useEffect(() => { reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const replaceTask = (updated) => {
    setTasks((list) => list && list.map((x) => (x.id === updated.id ? { ...x, ...updated, project: x.project } : x)));
    setOpen((cur) => (cur && cur.id === updated.id ? { ...cur, ...updated, project: cur.project } : cur));
  };
  const markNewsRead = (id) => setNews((n) => ({
    items: n.items.map((a) => (a.id === id ? { ...a, read: true } : a)),
    unread: Math.max(0, n.unread - (n.items.find((a) => a.id === id && !a.read) ? 1 : 0)),
  }));

  const value = {
    tasks, projects, news, error: error && msg(error), loading: tasks === null && !error,
    reload, openTask: setOpen, replaceTask, markNewsRead,
  };
  return (
    <WorkCtx.Provider value={value}>
      {children}
      {open && <TeamTaskModal task={open} projectName={open.project?.name} onClose={() => setOpen(null)} onChange={replaceTask} />}
    </WorkCtx.Provider>
  );
}
