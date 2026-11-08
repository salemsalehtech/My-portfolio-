// TeamTasks.jsx — the "My tasks" tab (/#/team/tasks): every task of mine grouped by status
// (in progress first), with a filter bar to show one status only. A row opens the task window.
import { useState } from "react";
import { STATUS_LABEL } from "../../lib/team";
import BrandLoader from "../../components/BrandLoader";
import { useTeam } from "./TeamPortal";
import { useWork } from "./WorkContext";
import TaskRow from "./TaskRow";

const GROUPS = ["doing", "todo", "review", "done"];

export default function TeamTasks() {
  const { t, lang } = useTeam();
  const { tasks, loading, error, openTask } = useWork();
  const [only, setOnly] = useState("all");
  const list = tasks || [];
  const count = (s) => list.filter((x) => x.status === s).length;

  return (
    <main className="tm-page tm-page-wide">
      <header className="tm-pagehead">
        <h1>{t.myTasks}</h1>
      </header>
      {error && <p className="tm-error">{error}</p>}
      {loading ? <BrandLoader label={t.loading} /> : (
        <>
          <div className="tm-chips" role="tablist">
            {["all", ...GROUPS].map((s) => (
              <button key={s} type="button" role="tab" aria-selected={only === s} className={`tm-chip ${only === s ? "is-on" : ""}`} onClick={() => setOnly(s)}>
                {s !== "all" && <span className={`tm-dot is-${s}`} />}
                {s === "all" ? t.allTasks : s === "done" ? t.recentlyDone : STATUS_LABEL[lang][s]}
                <span className="tm-chip-count">{s === "all" ? list.length : count(s)}</span>
              </button>
            ))}
          </div>
          {list.length === 0 && <p className="tm-empty">{t.noTasks}</p>}
          {GROUPS.filter((s) => only === "all" || only === s).map((status) => {
            const group = list.filter((x) => x.status === status)
              .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
            if (group.length === 0) return null;
            return (
              <section className="tm-panel tm-group" key={status}>
                <h3 className="tm-group-title"><span className={`tm-dot is-${status}`} />{status === "done" ? t.recentlyDone : STATUS_LABEL[lang][status]}<span className="tm-count">{group.length}</span></h3>
                <div className="tm-rows">
                  {group.map((task) => <TaskRow key={task.id} task={task} lang={lang} onOpen={openTask} />)}
                </div>
              </section>
            );
          })}
        </>
      )}
    </main>
  );
}
