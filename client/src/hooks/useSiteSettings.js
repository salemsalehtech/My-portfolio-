// useSiteSettings.js — loads the site-wide profile content ("Profile & Links" in the dashboard)
// from GET /settings. Called once in pages/Portfolio.jsx, which passes the result to the Hero,
// YouTube, Contact and Footer sections.
//
// It never returns "nothing": the Hero is the first thing visitors see, so it must not stay
// empty while the server wakes up. It starts from the copy cached by this browser on an earlier
// visit (lib/apiCache.js), or else from the built-in defaults (lib/siteDefaults.js), and then
// switches to the server's answer. Saved settings are merged over the defaults, so a field the
// server doesn't send can never be undefined.
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { readCache, writeCache } from "../lib/apiCache";
import { siteDefaults } from "../lib/siteDefaults";

const toSettings = (data) => (data && data.exists ? { ...siteDefaults(), ...data } : siteDefaults());

export function useSiteSettings() {
  const [settings, setSettings] = useState(() => toSettings(readCache("/settings")));

  useEffect(() => {
    api.get("/settings")
      .then((data) => { setSettings(toSettings(data)); writeCache("/settings", data); })
      .catch(() => { /* keep what we show (cache or defaults) */ });
  }, []);

  return settings;
}
