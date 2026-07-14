import { createContext, useContext, useEffect, useState } from "react";
import { T } from "../i18n/translations";

const SiteContext = createContext(null);

export function SiteProvider({ children }) {
  const [theme, setTheme] = useState("dark");
  const [lang, setLang] = useState("en");

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

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

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite must be used within SiteProvider");
  return ctx;
}
