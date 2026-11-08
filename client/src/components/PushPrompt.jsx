// PushPrompt.jsx — the one "Turn on phone notifications" control (lib/webPush.js), used by the
// savings-circle portal, the team portal and the owner's dashboard (Circles + Team pages).
// `base` is the API prefix that hands out the key and saves the subscription ("/circle",
// "/team", "/admin/circles"). `text` = { on, done, blocked, ios, error }.
// variant "card" = a member portal card; "admin" = a small dashboard button.
import { useEffect, useState } from "react";
import { pushSupported, pushState, enablePush, isIos, isStandalone } from "../lib/webPush";
import { BellIcon, PhoneIcon } from "./team/icons";

export default function PushPrompt({ base, text, variant = "card" }) {
  const [state, setState] = useState("checking");
  const [error, setError] = useState("");
  useEffect(() => { pushState().then(setState).catch(() => setState("unsupported")); }, []);

  const turnOn = async () => {
    setError("");
    try {
      await enablePush(base);
      setState("on");
    } catch (err) {
      setState(err.message === "blocked" ? "blocked" : "off");
      if (err.message !== "blocked") setError(text.error);
    }
  };

  // (On an iPhone, Safari only offers push after "Add to Home Screen" — the card says so.)
  if (state === "checking" || (state === "unsupported" && variant === "admin")) return null;
  if (state === "on") {
    return variant === "admin"
      ? <span className="admin-sub"><BellIcon size={14} className="ui-icon" /> {text.done}</span>
      : <p className="tm-muted tm-small gm-push-ok"><BellIcon size={14} className="ui-icon" /> {text.done}</p>;
  }
  if (variant === "admin") {
    return state === "off" ? <button className="admin-btn" onClick={turnOn}><BellIcon size={15} /> {text.on}</button> : null;
  }
  return (
    <section className="gm-push">
      {state === "blocked" ? <p className="tm-muted">{text.blocked}</p>
        : !pushSupported() || (isIos() && !isStandalone()) ? <p className="tm-muted"><PhoneIcon size={15} className="ui-icon" /> {text.ios}</p>
          : <button className="fp-btn" onClick={turnOn}><BellIcon size={16} /> {text.on}</button>}
      {error && <p className="tm-error tm-small">{error}</p>}
    </section>
  );
}
