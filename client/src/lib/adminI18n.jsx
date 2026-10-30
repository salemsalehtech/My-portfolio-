// adminI18n.jsx — the dashboard's language (English / Arabic), separate from the public site's.
//
// Every admin page writes its text in English and passes it through t():
//     const { t } = useAdminT();
//     <h1>{t("New Certificate")}</h1>
//     t("Delete {name}?", { name: member.name })
// In Arabic, t() looks the English text up in i18n/adminAr.js; anything missing there simply
// stays in English, so a new page never breaks — it only needs its Arabic lines added.
// The choice is remembered in localStorage ("adminLang"). Arabic also flips the layout to RTL.
import { createContext, useContext, useState } from "react";
import { ADMIN_AR } from "../i18n/adminAr";

const AdminI18nContext = createContext(null);

const readLang = () => { try { return localStorage.getItem("adminLang") === "en" ? "en" : "ar"; } catch { return "ar"; } };
const fill = (text, vars) => (vars ? text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : text);

export function AdminI18nProvider({ children }) {
  const [lang, setLangState] = useState(readLang);
  const setLang = (next) => { setLangState(next); try { localStorage.setItem("adminLang", next); } catch { /* private mode */ } };
  const t = (text, vars) => fill(lang === "ar" ? ADMIN_AR[text] ?? text : text, vars);
  return (
    <AdminI18nContext.Provider value={{ lang, setLang, t, dir: lang === "ar" ? "rtl" : "ltr" }}>
      {children}
    </AdminI18nContext.Provider>
  );
}

export function useAdminT() {
  const ctx = useContext(AdminI18nContext);
  if (!ctx) throw new Error("useAdminT must be used within AdminI18nProvider");
  return ctx;
}
