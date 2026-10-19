// aboutDefaults.js — the built-in content of the About section, in the same shape the
// server stores it (see aboutSchema in server/src/lib/mongo.js).
//
// It is used in two places:
//   - components/About.jsx shows it until content has been saved from the dashboard, so the
//     site looks exactly as before on a fresh database;
//   - pages/admin/AdminAbout.jsx uses it to pre-fill the form the first time, and for "Reset".
import { T } from "../i18n/translations";

export function aboutDefaults() {
  const en = T.en;
  const ar = T.ar;
  return {
    badgeEn: en.about.subtitle, badgeAr: ar.about.subtitle,
    titleEn: en.about.title, titleAr: ar.about.title,
    p1En: en.about.p1, p1Ar: ar.about.p1,
    p2En: en.about.p2, p2Ar: ar.about.p2,
    infoItems: [
      { icon: "education", textEn: en.about.edu, textAr: ar.about.edu },
      { icon: "location", textEn: en.about.location, textAr: ar.about.location },
      { icon: "language", textEn: "English (Fluent)", textAr: "English (Fluent)" },
    ],
    stats: [
      { number: "10+", labelEn: en.about.statProjects, labelAr: ar.about.statProjects },
      { number: "8+", labelEn: en.about.statSkills, labelAr: ar.about.statSkills },
      { number: "20+", labelEn: en.about.statVideos, labelAr: ar.about.statVideos },
    ],
    interestsTitleEn: en.about.interestsTitle, interestsTitleAr: ar.about.interestsTitle,
    interests: en.interests.map((item, i) => ({ en: item, ar: ar.interests[i] || item })),
  };
}
