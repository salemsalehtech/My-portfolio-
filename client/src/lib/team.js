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
// The sign-up address of an invite link (the token is only known right after creating it).
export const joinLink = (token) => `${portalLink()}/join/${token}`;

// The structured brief the owner can start a task description from (task editor → "Brief
// template"): the same sections the AI "Improve" button writes (server/src/lib/ai.js).
export const BRIEF_TEMPLATE = {
  en: "## Goal\nWhat the result should be, in one sentence.\n\n## Why it matters\n\n## Exactly what to do\n1. \n\n## Out of scope\n- \n\n## References\n- Like this: \n- Not like this: \n",
  ar: "## الهدف\nالنتيجة المطلوبة في جملة واحدة.\n\n## ليه مهم\n\n## المطلوب بالظبط\n1. \n\n## مش مطلوب\n- \n\n## مراجع\n- زي ده: \n- مش زي ده: \n",
};

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
      approved: (a, d) => `${a} approved “${d}”`,
      returned: (a, d) => `${a} sent “${d}” back with notes`,
      submitted: (a, d) => `${a} sent “${d}” for review`,
      comment: (a, d) => `${a} commented on “${d}”`,
      blocker: (a, d) => `${a} is blocked: ${d}`,
      signup: (a) => `${a} signed up with an invite — approve the account`,
      file: (a, d) => `${a} attached a file to “${d}”`,
      mention: (a, d) => `${a} mentioned you in “${d}”`,
      reply: (a, d) => `${a} replied to your comment on “${d}”`,
      kudos: (a, d) => `A thank-you note: ${d}`,
      star: () => "You are the star of the week!",
      claimed: (a, d) => `${a} took “${d}”`,
      rules: () => "The team rules were updated — read and agree",
      weekly: () => "This week's summary is ready",
      help: (a, d) => `${a} needs help with “${d}”`,
      extension: (a, d) => `${a} asked for more time on “${d}”`,
      extension_ok: (a, d) => `${a} gave you more time on “${d}”`,
      extension_no: (a, d) => `${a} kept the due date of “${d}”`,
    },
    by: (n) => `by ${n}`,
    needHelp: "I need help", helpQ: "What's blocking you? Be specific — what you tried and where you're stuck.",
    helpFlag: "Needs help", helpSolved: "Solved", sendHelp: "Ask for help",
    needTime: "I need more time", newDate: "New due date", whyTime: "Why? (one or two lines)",
    sendTime: "Send request", timeAsked: (d) => `More time requested until ${d} — waiting for an answer.`, withdrawReq: "Withdraw",
    timeFlag: "More time asked", grant: (d) => `Give until ${d}`, keepDate: "Keep the date", cancel: "Cancel",
    avail: { available: "Available", busy: "Busy", away: "Away" },
    availQ: "Your status", availUntil: "Until", availNote: "Note (optional)", availSave: "Save",
    availHint: "Lets the lead see who has room before giving out new tasks.",
    reply: "Reply", replyingTo: (n) => `Replying to ${n}`, mentionHint: "Type @ to mention someone",
    criteria: "Done means…", criteriaHint: "Tick each point when it's true — the lead checks the same list.",
    understood: "I understood what's needed", understoodOn: (d) => `Understood · ${d}`, askQuestion: "I have a question",
    questionStart: "Question: ",
    size: "Size", sizes: { "": "—", S: "Small · hours", M: "Medium · 1–2 days", L: "Large · 3+ days" },
    pool: "Open tasks — pick one", claim: "I'll take it", claimHint: "The lead left these open for anyone on the project.",
    kudos: "Thank-you notes", badges: "Your badges", noBadges: "Finish your first task to get your first badge.",
    goal: "Team goal this month", goalOf: (d, t) => `${d} of ${t} tasks`,
    badge: {
      first: ["First task", "Your first approved task"], ten: ["10 tasks", "Ten tasks approved"], fifty: ["50 tasks", "Fifty tasks approved"],
      onTime: ["On time", "10 tasks finished on time"], firstTime: ["Right first time", "5 tasks approved with no changes"],
      creative: ["Creative", "Top marks for creativity, 3 times"], extraMile: ["Extra mile", "Went beyond the task"],
      standup: ["Regular", "20 daily standups"], star: ["Star of the week", "Picked as star of the week"],
    },
    rules: "Team rules", rulesAgree: "I read the team rules and agree to them", rulesUpdated: "The team rules were updated — please read them and agree.",
    agree: "Agree", rulesNone: "No rules published yet.",
    approvedCheer: "Approved — great work!",
    record: "Record a voice note", stopRec: "Stop and attach", recording: (s) => `Recording… ${s}s`, micBlocked: "Microphone access was refused.",
    markUp: "Mark up", tools: { arrow: "Arrow", box: "Box", pen: "Pen" }, undo: "Undo", attachMarked: "Attach",
    pushOn: "Notify me on this phone", pushDone: "Phone notifications are on (quiet 10 pm – 9 am and Fridays).",
    pushBlocked: "Notifications are blocked in this browser's settings.", pushIos: "On iPhone: Share → Add to Home Screen, then open it from there to turn notifications on.",
    tour: [
      ["Your tasks live here", "The home page shows what needs you now. Open a task to see the brief, files and comments."],
      ["Stuck? Say so", "Use “I need help” or “I need more time” inside a task — it never counts against you."],
      ["Show your work", "Attach screenshots, a PDF or a voice note, tick “Done means…”, then send it for review."],
    ],
    next: "Next", skip: "Skip", gotIt: "Got it",
    files: "Attachments", noFiles: "No files attached.", attach: "Attach PDF or picture",
    attachHint: "PDF, pictures or a voice note · up to 5 MB each · 10 files", uploading: "Uploading…",
    tooBig: (n) => `“${n}” is larger than 5 MB.`, badType: (n) => `“${n}” is not a PDF or a picture.`,
    openFile: "Open", deleteFile: "Remove file", deleteFileQ: (n) => `Remove “${n}”?`, sentOnSave: "Sent when you save the task",
    standup: "Daily standup", standupIntro: "Three quick lines for the team — takes a minute.",
    yesterday: "What did you do yesterday?", todayQ: "What will you do today?", blockers: "Anything blocking you?",
    yesterdayShort: "Yesterday", todayShort: "Today", blockersShort: "Blockers", none: "None",
    saveStandup: "Post standup", edit: "Edit", saved: "Posted", standupDone: "Today's standup is posted.",
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
      approved: (a, d) => `${a} وافق على «${d}»`,
      returned: (a, d) => `${a} أعاد «${d}» مع ملاحظات`,
      submitted: (a, d) => `${a} أرسل «${d}» للمراجعة`,
      comment: (a, d) => `${a} علّق على «${d}»`,
      blocker: (a, d) => `${a} لديه عائق: ${d}`,
      signup: (a) => `${a} أنشأ حسابًا برابط دعوة — وافق على الحساب`,
      file: (a, d) => `${a} أرفق ملفًا في «${d}»`,
      mention: (a, d) => `${a} ذكرك في «${d}»`,
      reply: (a, d) => `${a} رد على تعليقك في «${d}»`,
      kudos: (a, d) => `رسالة تقدير: ${d}`,
      star: () => "مبروك! انت نجم الأسبوع",
      claimed: (a, d) => `${a} أخد «${d}»`,
      rules: () => "قواعد الفريق اتحدّثت — اقراها ووافق",
      weekly: () => "ملخص الأسبوع جاهز",
      help: (a, d) => `${a} محتاج مساعدة في «${d}»`,
      extension: (a, d) => `${a} طلب وقتًا إضافيًا لـ «${d}»`,
      extension_ok: (a, d) => `${a} مدّ لك موعد «${d}»`,
      extension_no: (a, d) => `${a} أبقى موعد «${d}» كما هو`,
    },
    by: (n) => `من ${n}`,
    needHelp: "محتاج مساعدة", helpQ: "إيه اللي موقفك؟ اكتب جربت إيه ووقفت فين بالظبط.",
    helpFlag: "محتاج مساعدة", helpSolved: "اتحلّت", sendHelp: "اطلب مساعدة",
    needTime: "محتاج وقت أكتر", newDate: "الموعد الجديد", whyTime: "ليه؟ (سطر أو اتنين)",
    sendTime: "إرسال الطلب", timeAsked: (d) => `طلبت تمديد لحد ${d} — مستني الرد.`, withdrawReq: "سحب الطلب",
    timeFlag: "طلب وقت إضافي", grant: (d) => `مدّ لحد ${d}`, keepDate: "إبقاء الموعد", cancel: "إلغاء",
    avail: { available: "متاح", busy: "مشغول", away: "إجازة" },
    availQ: "حالتك", availUntil: "لحد", availNote: "ملاحظة (اختياري)", availSave: "حفظ",
    availHint: "عشان المدير يعرف مين عنده وقت قبل ما يوزّع تاسكات جديدة.",
    reply: "رد", replyingTo: (n) => `رد على ${n}`, mentionHint: "اكتب @ عشان تذكر حد",
    criteria: "يبقى خلصان لما…", criteriaHint: "علّم على كل نقطة لما تتحقق — المدير بيراجع نفس القائمة.",
    understood: "فهمت المطلوب", understoodOn: (d) => `فهم المطلوب · ${d}`, askQuestion: "عندي سؤال",
    questionStart: "سؤال: ",
    size: "الحجم", sizes: { "": "—", S: "صغيرة · ساعات", M: "متوسطة · يوم أو اتنين", L: "كبيرة · 3 أيام أو أكتر" },
    pool: "تاسكات متاحة — اختار واحدة", claim: "أنا هاخدها", claimHint: "المدير سايبها مفتوحة لأي حد في المشروع.",
    kudos: "رسائل تقدير", badges: "شاراتك", noBadges: "خلّص أول تاسك وخد أول شارة.",
    goal: "هدف الفريق الشهر ده", goalOf: (d, t) => `${d} من ${t} تاسك`,
    badge: {
      first: ["أول تاسك", "أول تاسك اتقبلت"], ten: ["10 تاسكات", "عشر تاسكات اتقبلت"], fifty: ["50 تاسك", "خمسين تاسك اتقبلت"],
      onTime: ["في الميعاد", "10 تاسكات خلصت في ميعادها"], firstTime: ["من أول مرة", "5 تاسكات اتقبلت من غير تعديل"],
      creative: ["مبدع", "أعلى تقييم إبداع 3 مرات"], extraMile: ["عمل أكتر من المطلوب", "عمل حاجة زيادة عن التاسك"],
      standup: ["ملتزم", "20 اجتماع يومي"], star: ["نجم الأسبوع", "اتختار نجم الأسبوع"],
    },
    rules: "قواعد الفريق", rulesAgree: "قريت قواعد الفريق وموافق عليها", rulesUpdated: "قواعد الفريق اتحدّثت — اقراها ووافق.",
    agree: "موافق", rulesNone: "لسه مفيش قواعد منشورة.",
    approvedCheer: "اتقبلت — شغل ممتاز!",
    record: "سجّل رسالة صوتية", stopRec: "إيقاف وإرفاق", recording: (s) => `بيسجّل… ${s} ث`, micBlocked: "الميكروفون مرفوض.",
    markUp: "علّم عليها", tools: { arrow: "سهم", box: "مربع", pen: "قلم" }, undo: "تراجع", attachMarked: "إرفاق",
    pushOn: "نبّهني على الموبايل ده", pushDone: "إشعارات الموبايل شغالة (هدوء من 10 بالليل لـ 9 الصبح ويوم الجمعة).",
    pushBlocked: "الإشعارات مقفولة من إعدادات المتصفح.", pushIos: "على الآيفون: مشاركة ← إضافة للشاشة الرئيسية، وافتحه من هناك عشان تشغّل الإشعارات.",
    tour: [
      ["تاسكاتك هنا", "الصفحة الرئيسية بتوريك المطلوب منك دلوقتي. افتح أي تاسك تشوف الوصف والملفات والتعليقات."],
      ["واقف؟ قول", "استخدم «محتاج مساعدة» أو «محتاج وقت أكتر» جوه التاسك — عمرها ما بتتحسب ضدك."],
      ["ورّي شغلك", "ارفع صور أو PDF أو رسالة صوتية، علّم على «يبقى خلصان لما…»، وبعدين سلّمها للمراجعة."],
    ],
    next: "التالي", skip: "تخطي", gotIt: "تمام",
    files: "المرفقات", noFiles: "لا توجد ملفات مرفقة.", attach: "إرفاق PDF أو صورة",
    attachHint: "PDF أو صور أو رسالة صوتية · حتى 5 ميجا للملف · 10 ملفات", uploading: "جارٍ الرفع…",
    tooBig: (n) => `«${n}» أكبر من 5 ميجا.`, badType: (n) => `«${n}» ليس PDF ولا صورة.`,
    openFile: "فتح", deleteFile: "حذف الملف", deleteFileQ: (n) => `حذف «${n}»؟`, sentOnSave: "سيُرسل عند حفظ المهمة",
    standup: "الاجتماع اليومي", standupIntro: "ثلاثة أسطر سريعة للفريق — دقيقة واحدة.",
    yesterday: "ماذا أنجزت أمس؟", todayQ: "ماذا ستعمل اليوم؟", blockers: "هل يعطّلك شيء؟",
    yesterdayShort: "أمس", todayShort: "اليوم", blockersShort: "العوائق", none: "لا شيء",
    saveStandup: "نشر", edit: "تعديل", saved: "تم النشر", standupDone: "تم نشر اجتماع اليوم.",
  },
};
