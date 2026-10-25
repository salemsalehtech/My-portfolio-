// siteDefaults.js — the built-in site-wide profile content, in the same shape the server stores
// it (see siteSettingsSchema in server/src/lib/mongo.js). Shown until "Profile & Links" is saved
// in the dashboard, and used there to pre-fill the form / for "Reset to original".
import { T, heroTitles } from "../i18n/translations";

export function siteDefaults() {
  const en = T.en;
  const ar = T.ar;
  return {
    greetingEn: en.greeting, greetingAr: ar.greeting,
    nameEn: en.name, nameAr: ar.name,
    titles: heroTitles.en.map((title, i) => ({ en: title, ar: heroTitles.ar[i] || title })),
    taglineEn: en.tagline, taglineAr: ar.tagline,
    uspEn: "", uspAr: "",
    email: "contact@salemsaleh.dev",
    githubUrl: "https://github.com/salemsalehtech",
    linkedinUrl: "https://www.linkedin.com/in/salemsalehtech",
    youtubeUrl: "https://www.youtube.com/@SalemSaleh1",
    locationEn: en.about.location, locationAr: ar.about.location,
    roleEn: "Software Engineer", roleAr: "مهندس برمجيات",
    channelDescEn: en.youtube.channelDesc, channelDescAr: ar.youtube.channelDesc,
  };
}
