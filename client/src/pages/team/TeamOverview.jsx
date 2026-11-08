// TeamOverview.jsx — the portal's Home tab (/#/team), laid out like a dashboard:
//   greeting + date, one strip of four numbers (open / overdue / waiting for review / done),
//   a banner for an unread announcement, then two columns —
//   main: "Needs attention", today's standup, open tasks anyone can take;
//   side: the team goal, badges and thank-you notes, my availability, phone notifications.
// On phones the side column drops under the main one. Rules to agree to and the first-login
// tour show here as overlays when needed.
import { Link } from "react-router-dom";
import { isOverdue, inDays, SHARED_COPY } from "../../lib/team";
import { ListIcon, AlertIcon, EyeIcon, CheckCircleIcon, MegaphoneIcon, ChevronIcon } from "../../components/team/icons";
import BrandLoader from "../../components/BrandLoader";
import PushPrompt from "../../components/PushPrompt";
import { useTeam } from "./TeamPortal";
import { useWork } from "./WorkContext";
import TaskRow from "./TaskRow";
import StandupCard from "./StandupCard";
import AvailabilityCard from "./AvailabilityCard";
import CheersCard from "./CheersCard";
import PoolCard from "./PoolCard";
import RulesGate from "./RulesGate";
import Tour from "./Tour";

export default function TeamOverview() {
  const { t, lang, member } = useTeam();
  const { tasks, news, loading, error, openTask, reload } = useWork();
  const sc = SHARED_COPY[lang];
  const list = tasks || [];
  const soon = inDays(2);
  const attention = list.filter((x) => x.status !== "done" && x.status !== "review" &&
    (isOverdue(x) || (x.dueDate && x.dueDate <= soon) || (x.reviewNote && x.status === "doing") || x.helpNote));
  const stats = [
    { label: t.statOpen, value: list.filter((x) => x.status === "todo" || x.status === "doing").length, Icon: ListIcon },
    { label: t.statLate, value: list.filter(isOverdue).length, Icon: AlertIcon, tone: "late" },
    { label: t.statReview, value: list.filter((x) => x.status === "review").length, Icon: EyeIcon, tone: "review" },
    { label: t.statDone, value: list.filter((x) => x.status === "done").length, Icon: CheckCircleIcon, tone: "done" },
  ];
  const unread = news.items.find((a) => !a.read);
  const dateLine = new Date().toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <main className="tm-page tm-page-wide">
      <header className="tm-hello">
        <span className="tm-eyebrow">{dateLine}</span>
        <h1>{t.hello(member.name.split(" ")[0])}</h1>
        {member.specialty && <p className="tm-muted">{member.specialty}</p>}
      </header>
      {error && <p className="tm-error">{error}</p>}

      {loading ? <BrandLoader label={t.loading} /> : (
        <>
          <div className="tm-statstrip">
            {stats.map(({ label, value, Icon, tone }) => (
              <div className={`tm-statcell ${tone && value ? `is-${tone}` : ""}`} key={label}>
                <span className="tm-statcell-icon"><Icon size={17} /></span>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>

          {unread && (
            <Link to="/team/news" className="tm-newsbanner">
              <span className="cut-icon"><MegaphoneIcon size={18} /></span>
              <span className="tm-newsbanner-text">
                <span className="tm-eyebrow">{t.newsNew}</span>
                <strong dir="auto">{unread.title}</strong>
              </span>
              <span className="tm-newsbanner-go">{t.openNews} <ChevronIcon size={15} /></span>
            </Link>
          )}

          <div className="tm-layout">
            <div className="tm-main">
              <section className={`tm-panel tm-focus ${attention.length ? "" : "is-calm"}`}>
                <div className="tm-panel-head">
                  <h2>{t.focus}</h2>
                  <Link to="/team/tasks" className="tm-panel-link">{t.allTasks} <ChevronIcon size={14} /></Link>
                </div>
                {attention.length === 0 ? <p className="tm-muted">{t.focusEmpty}</p> : (
                  <div className="tm-rows">
                    {attention.map((task) => <TaskRow key={task.id} task={task} lang={lang} onOpen={openTask} />)}
                  </div>
                )}
              </section>
              <StandupCard />
              <PoolCard onClaimed={reload} />
            </div>
            <aside className="tm-aside">
              <CheersCard />
              <AvailabilityCard />
              <PushPrompt base="/team" text={{ on: sc.pushOn, done: sc.pushDone, blocked: sc.pushBlocked, ios: sc.pushIos, error: t.error }} />
            </aside>
          </div>
        </>
      )}
      <RulesGate />
      <Tour />
    </main>
  );
}
