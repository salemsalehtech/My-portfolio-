// OwnerPush.jsx — "Notify me on this device" for the owner, shown on the Circles and Team pages.
// One subscription serves both: the owner's devices are saved with member = null, and both the
// circles (lib/circles.js) and the team (lib/teamPush.js) push to null for the owner.
import PushPrompt from "../../components/PushPrompt";
import { useAdminT } from "../../lib/adminI18n";

export default function OwnerPush() {
  const { t } = useAdminT();
  return (
    <PushPrompt
      base="/admin/circles"
      variant="admin"
      text={{ on: t("Notify me on this device"), done: t("Phone notifications on"), blocked: "", ios: "", error: "" }}
    />
  );
}
