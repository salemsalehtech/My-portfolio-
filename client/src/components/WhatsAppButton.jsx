// WhatsAppButton.jsx — the floating "Chat on WhatsApp" button (bottom corner, opposite the
// scroll-to-top button). It opens a chat with a ready first message and is shown only when a
// WhatsApp number is set in Admin → "Profile & Links". Each chat started is counted once per
// session in the anonymous analytics (Admin → Analytics → "WhatsApp chats").
//
// Props: `number` — settings.whatsapp; `text` — the first message (default: t.whatsapp.hello);
// `visible` — false hides it (the home page waits until the visitor has scrolled past the hero).
import { useSite } from "../context/SiteContext";
import { whatsappLink } from "../lib/whatsapp";
import { WhatsappIcon } from "../lib/socialIcons";
import { track } from "../lib/analytics";

export default function WhatsAppButton({ number, text, visible = true }) {
  const { t } = useSite();
  if (!number) return null;
  return (
    <a className={`wa-float ${visible ? "visible" : ""}`} href={whatsappLink(number, text || t.whatsapp.hello)}
      target="_blank" rel="noopener noreferrer" onClick={() => track("whatsapp")} aria-label={t.whatsapp.label}
      tabIndex={visible ? undefined : -1}>
      <WhatsappIcon size={20} />
      <span>{t.whatsapp.label}</span>
    </a>
  );
}
