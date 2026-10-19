// SiteContext.jsx — global theme (dark/light) and language (en/ar) state for the whole app.
//
// This is a React Context: it holds state once at the top of the app (see App.jsx, which
// wraps everything in <SiteProvider>) and lets any component below read/update it without
// passing props down manually ("prop-drilling"). Any component that needs the current
// theme, language, a translated string, or the toggle buttons should call useSite() —
// this is the ONLY place that pattern lives, so keep using it rather than inventing a new
// way to pass theme/language around.
//
// useSite() returns:
//   - theme        "dark" | "light"
//   - lang         "en" | "ar"
//   - toggleTheme  flips theme
//   - toggleLang   flips language
//   - t            the translation dictionary for the current language (see i18n/translations.js)
import { createContext, useContext, useEffect, useState } from "react";
import { T } from "../i18n/translations";

const SiteContext = createContext(null);

export function SiteProvider({ children }) {
  const [theme, setTheme] = useState("light");
  const [lang, setLang] = useState("en");

  // Keep the <html> element's "light" class in sync so index.css can style both themes.
  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  // Keep the page's lang attribute, RTL class, and browser tab title in sync with the
  // selected language whenever it changes.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.body.classList.toggle("ar", lang === "ar");
    document.title = lang === "ar" ? "سالم صالح | بورتفوليو" : "Salem Saleh | Portfolio";
  }, [lang]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const toggleLang = () => setLang((l) => (l === "en" ? "ar" : "en"));

  const value = { theme, lang, toggleTheme, toggleLang, t: T[lang] };
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

// Hook that any component calls to read/update theme, language, and translated text.
// Throws a clear error if used outside <SiteProvider> (e.g. a component rendered before
// App.jsx sets up the provider) instead of silently returning undefined values.
export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite must be used within SiteProvider");
  return ctx;
}
