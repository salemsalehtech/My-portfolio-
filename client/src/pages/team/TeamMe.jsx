// TeamMe.jsx — the "Me" tab (/#/team/me): who I am on the team (name, specialty, username), my
// badges and the owner's thank-you notes, my availability, and phone notifications.
import { SHARED_COPY, initials } from "../../lib/team";
import PushPrompt from "../../components/PushPrompt";
import { useTeam } from "./TeamPortal";
import CheersCard from "./CheersCard";
import AvailabilityCard from "./AvailabilityCard";

export default function TeamMe() {
  const { t, lang, member } = useTeam();
  const sc = SHARED_COPY[lang];
  return (
    <main className="tm-page">
      <header className="tm-profile cut-card">
        <span className="tm-avatar is-xl">{initials(member.name)}</span>
        <div>
          <h1 dir="auto">{member.name}</h1>
          <p className="tm-muted">{[member.specialty, `@${member.username}`].filter(Boolean).join(" · ")}</p>
        </div>
      </header>
      <p className="tm-muted tm-small">{t.profileHint}</p>
      <CheersCard />
      <AvailabilityCard />
      <PushPrompt base="/team" text={{ on: sc.pushOn, done: sc.pushDone, blocked: sc.pushBlocked, ios: sc.pushIos, error: t.error }} />
    </main>
  );
}
