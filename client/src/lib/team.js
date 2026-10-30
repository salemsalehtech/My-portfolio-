// team.js — shared helpers for the team workspace: the owner's pages (pages/admin/AdminTeam*.jsx)
// and the member portal (pages/team/). Statuses and priorities match the TeamTask model in
// server/src/lib/mongo.js.

export const STATUSES = ["todo", "doing", "review", "done"];
export const PRIORITIES = ["low", "normal", "high", "urgent"];

// Labels in both languages (the owner's dashboard uses the English ones).
export const STATUS_LABEL = {
  en: { todo: "To do", doing: "In progress", review: "Waiting for review", done: "Done" },
  ar: { todo: "لم يبدأ", doing: "قيد التنفيذ", review: "بانتظار المراجعة", done: "تم" },
};
export const PRIORITY_LABEL = {
  en: { low: "Low", normal: "Normal", high: "High", urgent: "Urgent" },
  ar: { low: "منخفضة", normal: "عادية", high: "عالية", urgent: "عاجلة" },
};

// Today as "YYYY-MM-DD" in the browser's time zone — due dates are stored the same way.
export const today = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
export const isOverdue = (task) => Boolean(task.dueDate) && task.status !== "done" && task.dueDate < today();

// "Mona Adel" -> "MA" (shown in the small avatar circles).
export const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

// "2026-11-03" -> "3 Nov" / "3 نوفمبر"
export const formatDue = (date, lang = "en") =>
  date ? new Date(`${date}T00:00:00`).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "short" }) : "";

export const stepsDone = (task) => `${task.steps.filter((s) => s.done).length}/${task.steps.length}`;

// The public address of the member portal, to send to new members.
export const portalLink = () => `${window.location.origin}${window.location.pathname}#/team`;

// Which status changes a member may make on their own task (same rule as routes/team.js).
export const MEMBER_MOVES = { todo: ["doing", "review"], doing: ["todo", "review"], review: ["doing"], done: [] };

// "3 min ago" / "منذ 3 دقائق" — for comments and notifications.
export const timeAgo = (iso, lang = "en") => {
  const sec = Math.round((new Date(iso) - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", { numeric: "auto" });
  if (Math.abs(sec) < 60) return rtf.format(0, "second");
  if (Math.abs(sec) < 3600) return rtf.format(Math.round(sec / 60), "minute");
  if (Math.abs(sec) < 86400) return rtf.format(Math.round(sec / 3600), "hour");
  return rtf.format(Math.round(sec / 86400), "day");
};

// Texts of the pieces both the owner's dashboard and the member portal use: board filters,
// comments, the notification bell 🔔 and the daily standup. `owner` is how the owner appears.
export const SHARED_COPY = {
  en: {
    owner: "Salem (lead)", formerMember: "Former member",
    search: "Search tasks…", everyone: "Everyone", onlyMine: "Only mine", unassigned: "Unassigned",
    anyPriority: "Any priority", onlyLate: "Overdue only", clear: "Clear", shown: (n, all) => `${n} of ${all} tasks`,
    dragHint: "Drag a card to another column to change its status.", moveFailed: "Couldn't move the task.",
    comments: "Comments", noComments: "No comments yet — ask a question or share an update.",
    writeComment: "Write a comment…", send: "Send", deleteComment: "Delete comment", sending: "Sending…",
    bell: "Notifications", noNotes: "You're all caught up.", reminders: "Due dates",
    overdue: "Overdue", dueToday: "Due today", dueTomorrow: "Due tomorrow", markRead: "Mark all as read",
    note: {
      assigned: (a, d) => `${a} assigned you “${d}”`,
      approved: (a, d) => `${a} approved “${d}” ✓`,
      returned: (a, d) => `${a} sent “${d}” back with notes`,
      submitted: (a, d) => `${a} sent “${d}” for review`,
      comment: (a, d) => `${a} commented on “${d}”`,
      blocker: (a, d) => `${a} is blocked: ${d}`,
    },
    standup: "Daily standup", standupIntro: "Three quick lines for the team — takes a minute.",
    yesterday: "What did you do yesterday?", todayQ: "What will you do today?", blockers: "Anything blocking you?",
    yesterdayShort: "Yesterday", todayShort: "Today", blockersShort: "Blockers", none: "None",
    saveStandup: "Post standup", edit: "Edit", saved: "Posted ✓", standupDone: "Today's standup is posted.",
  },
  ar: {
    owner: "سالم (المدير)", formerMember: "عضو سابق",
    search: "ابحث في المهام…", everyone: "الجميع", onlyMine: "مهامي فقط", unassigned: "بدون مسؤول",
    anyPriority: "كل الأولويات", onlyLate: "المتأخرة فقط", clear: "مسح", shown: (n, all) => `${n} من ${all} مهام`,
    dragHint: "اسحب البطاقة إلى عمود آخر لتغيير حالتها.", moveFailed: "تعذّر نقل المهمة.",
    comments: "التعليقات", noComments: "لا توجد تعليقات بعد — اسأل سؤالًا أو شارك تحديثًا.",
    writeComment: "اكتب تعليقًا…", send: "إرسال", deleteComment: "حذف التعليق", sending: "جارٍ الإرسال…",
    bell: "الإشعارات", noNotes: "لا يوجد جديد.", reminders: "المواعيد",
    overdue: "متأخرة", dueToday: "موعدها اليوم", dueTomorrow: "موعدها غدًا", markRead: "تعليم الكل كمقروء",
    note: {
      assigned: (a, d) => `${a} أسند إليك «${d}»`,
      approved: (a, d) => `${a} وافق على «${d}» ✓`,
      returned: (a, d) => `${a} أعاد «${d}» مع ملاحظات`,
      submitted: (a, d) => `${a} أرسل «${d}» للمراجعة`,
      comment: (a, d) => `${a} علّق على «${d}»`,
      blocker: (a, d) => `${a} لديه عائق: ${d}`,
    },
    standup: "الاجتماع اليومي", standupIntro: "ثلاثة أسطر سريعة للفريق — دقيقة واحدة.",
    yesterday: "ماذا أنجزت أمس؟", todayQ: "ماذا ستعمل اليوم؟", blockers: "هل يعطّلك شيء؟",
    yesterdayShort: "أمس", todayShort: "اليوم", blockersShort: "العوائق", none: "لا شيء",
    saveStandup: "نشر", edit: "تعديل", saved: "تم النشر ✓", standupDone: "تم نشر اجتماع اليوم.",
  },
};
