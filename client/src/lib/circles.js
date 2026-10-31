// circles.js — shared helpers for the savings circles (جمعيات): the member portal (pages/gam3eya/)
// and the owner's pages (pages/admin/AdminCircle*.jsx). The money rules live on the server
// (server/src/lib/circles.js); these only format and share.

// "1500" → "1,500 ج.م" / "EGP 1,500"
export const money = (amount, lang = "ar") =>
  new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-US", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(amount || 0);

// "2026-11-05" → "5 نوفمبر 2026" / "5 Nov 2026"; monthName("2026-11-05") → "نوفمبر 2026"
export const day = (date, lang = "ar") =>
  date ? new Date(`${date}T12:00:00`).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
export const monthName = (date, lang = "ar") =>
  date ? new Date(`${date}T12:00:00`).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { month: "long", year: "numeric" }) : "";

// Days from today (Cairo date string) to a date: 0 = today, negative = past.
export const daysUntil = (date, today) => Math.round((new Date(`${date}T12:00:00Z`) - new Date(`${today}T12:00:00Z`)) / 864e5);

// A WhatsApp chat with a ready message (Egyptian numbers 01… become 201…).
export const whatsappLink = (phone, text) => {
  const digits = String(phone || "").replace(/\D/g, "");
  const intl = digits.startsWith("0") && digits.length === 11 ? `2${digits}` : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
};

export const METHODS = ["instapay", "vodafone", "cash", "other"];
export const METHOD_LABEL = {
  en: { instapay: "InstaPay", vodafone: "Vodafone Cash", cash: "Cash", other: "Other" },
  ar: { instapay: "InstaPay", vodafone: "فودافون كاش", cash: "كاش", other: "أخرى" },
};
export const STATE_LABEL = {
  en: { paid: "Paid", review: "Being checked", late: "Late", due: "Due soon", upcoming: "Upcoming" },
  ar: { paid: "مدفوع", review: "قيد المراجعة", late: "متأخر", due: "قرب ميعاده", upcoming: "لم يأتِ بعد" },
};

// The member's calendar file (.ics): every payment date and their turn(s), with a reminder the
// day before — their phone then reminds them every month, for free.
export function downloadCalendar(circle, lang = "ar") {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const esc = (t) => String(t).replace(/([,;\\])/g, "\\$1");
  const event = (uid, date, title) => [
    "BEGIN:VEVENT", `UID:${uid}@salemsaleh.tech`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${date.replace(/-/g, "")}`, `SUMMARY:${esc(title)}`,
    "BEGIN:VALARM", "TRIGGER:-PT15H", "ACTION:DISPLAY", `DESCRIPTION:${esc(title)}`, "END:VALARM",
    "END:VEVENT",
  ];
  const ar = lang === "ar";
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Salem Saleh Tech//Gam3eya//AR", "CALSCALE:GREGORIAN"];
  for (const d of circle.me.dues) {
    if (d.state === "paid") continue;
    lines.push(...event(`${circle.id}-pay-${d.month}`, d.dueDate, ar ? `قسط ${circle.name}: ${d.due} ج.م` : `${circle.name} payment: EGP ${d.due}`));
  }
  for (const t of circle.turns) {
    lines.push(...event(`${circle.id}-turn-${t.month}`, t.payoutDate, ar ? `قبض ${circle.name}: ${t.amount} ج.م 🎉` : `${circle.name} payout: EGP ${t.amount} 🎉`));
  }
  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${circle.name}.ics` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Texts of the member portal (/#/gam3eya).
export const CIRCLE_COPY = {
  en: {
    portal: "Savings circles", tagline: "Your circle, clear and on time.",
    perks: ["Know your turn and when you receive", "Pay by InstaPay or Vodafone Cash and upload the screenshot", "Reminders before every due date"],
    phone: "Phone number", password: "Password", signIn: "Sign in", signingIn: "Signing in…",
    loginIntro: "Sign in with your phone number and password.", expired: "Your login has expired. Please sign in again.",
    pendingNote: "Your account is waiting for approval. You can sign in once it's approved.",
    join: "Join the circles", joinIntro: "Create your account. Once it's approved you can sign in.",
    fullName: "Full name", create: "Create account", creating: "Creating…", haveAccount: "Already have an account?",
    joinedTitle: "Account created ✓", joinedText: (n) => `Thanks, ${n}! Your account is waiting for approval.`, toLogin: "Go to sign in",
    badInvite: "This invite link is no longer valid. Ask for a new one.",
    newPassTitle: "Choose your own password", newPassIntro: "For your safety, replace the temporary password first.",
    current: "Current password", next: "New password (at least 8 characters)", confirm: "Repeat the new password",
    savePass: "Save password", mismatch: "The two new passwords do not match", changePass: "Change password",
    cancel: "Cancel", logout: "Log out", switchTo: "عربي", themeDark: "Dark mode", themeLight: "Light mode", visitSite: "Visit the website",
    hello: (n) => `Hi, ${n}`, loading: "Loading…", noCircles: "You're not in a circle yet. When the organizer adds you, it shows here.",
    perMonth: "a month", shares: (s) => (s === 0.5 ? "half a share" : s === 1 ? "one share" : `${s} shares`),
    nextPayment: "Next payment", allPaid: "All paid ✓", payNow: "Pay now", due: "Due", late: "Late", daysLeft: (n) => (n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`), daysLate: (n) => `${n} day(s) late`,
    myTurn: "My turn", receive: "You receive", sharedWith: "shared (half share)", handed: "Handed over — did you receive it?", confirmReceived: "Yes, I received it ✓", receivedOk: "Received ✓",
    progress: "Saved so far", of: "of", goal: "Saving for", goalPlaceholder: "e.g. a new car", setGoal: "Set", editGoal: "Edit",
    months: "Month by month", month: "Month", amount: "Amount", status: "Status", receipt: "Receipt", payments: "My payments",
    noPayments: "No payments yet.", rejected: "Not accepted", why: "Reason",
    addCalendar: "Add dates to my calendar", earlyTurn: "I need my turn early", earlyReason: "Why do you need it early?", send: "Send", requestSent: "Request sent — the organizer will reply.",
    requestOpen: "Your request is with the organizer.", requestAnswered: (ok, r) => `${ok ? "Accepted" : "Declined"}${r ? `: ${r}` : ""}`,
    certificate: "Circle certificate", finished: "Finished",
    waitTitle: "The next circle", waitOn: "You're on the list for the next circle ✓", waitOff: "Want to join the next circle?", waitJoin: "Put me on the list", waitLeave: "Remove me", waitNote: "A note (optional)",
    payTitle: "Send a payment", payFor: "For the month of", payTo: "Send the money to", copy: "Copy", copied: "Copied ✓", scanQr: "Scan with your phone camera to pay by InstaPay",
    method: "How did you pay?", screenshot: "Screenshot of the transfer", screenshotHint: "Required for InstaPay / Vodafone Cash (PNG or JPG, max 2 MB).",
    note: "A note (optional)", notePlaceholder: "e.g. I paid in two parts", submitPay: "Send for confirmation", sending: "Sending…", sent: "Sent ✓ — it shows as paid once confirmed.",
    review: "Payments to confirm", reviewIntro: "You're a helper in this circle.", confirmPay: "Confirm ✓", rejectPay: "Reject", rejectReason: "Why is it rejected?", nothingToReview: "Nothing to confirm.",
    notifications: "Notifications", noNotes: "You're all caught up.", remindersTitle: "Reminders",
    remindPay: (a, d) => `Pay ${a} by ${d}`, remindLate: (a) => `Your payment of ${a} is late`, remindPayout: (a, d) => `You receive ${a} on ${d} 🎉`,
    note_: {
      confirmed: (a, d) => `Your payment was confirmed ✓ ${d}`, rejected: (a, d) => `Your payment wasn't accepted: ${d}`,
      handed: (a, d) => `Your turn's money was handed over 🎉 ${d}`, answered: (a, d) => `Reply to your request: ${d}`,
      added: (a, d) => `You were added to the circle "${d}"`, submitted: (a, d) => `${a} sent a payment: ${d}`,
    },
    pushOn: "Turn on phone notifications", pushOnDone: "Phone notifications are on ✓", pushBlocked: "Notifications are blocked in this browser's settings.",
    pushIos: "On iPhone: tap Share → Add to Home Screen, open it from there, then turn notifications on.",
    install: "Install as an app", print: "Print", error: "Something went wrong. Please try again.", back: "← Back",
  },
  ar: {
    portal: "الجمعيات", tagline: "جمعيتك واضحة وفي ميعادها.",
    perks: ["اعرف دورك وهتقبض إمتى", "ادفع بـ InstaPay أو فودافون كاش وارفع صورة التحويل", "تذكير قبل كل ميعاد دفع"],
    phone: "رقم الموبايل", password: "كلمة المرور", signIn: "تسجيل الدخول", signingIn: "جارٍ الدخول…",
    loginIntro: "سجّل الدخول برقم موبايلك وكلمة المرور.", expired: "انتهت صلاحية الدخول. سجّل الدخول مرة تانية.",
    pendingNote: "حسابك بانتظار الموافقة. تقدر تسجّل الدخول بعد الموافقة عليه.",
    join: "الانضمام للجمعيات", joinIntro: "أنشئ حسابك. بعد الموافقة عليه تقدر تسجّل الدخول.",
    fullName: "الاسم بالكامل", create: "إنشاء الحساب", creating: "جارٍ الإنشاء…", haveAccount: "عندك حساب بالفعل؟",
    joinedTitle: "تم إنشاء الحساب ✓", joinedText: (n) => `شكرًا يا ${n}! حسابك بانتظار الموافقة.`, toLogin: "الذهاب لتسجيل الدخول",
    badInvite: "رابط الدعوة ده مبقاش صالح. اطلب رابط جديد.",
    newPassTitle: "اختار كلمة مرور خاصة بيك", newPassIntro: "لأمانك، غيّر كلمة المرور المؤقتة الأول.",
    current: "كلمة المرور الحالية", next: "كلمة المرور الجديدة (8 أحرف على الأقل)", confirm: "اكتب كلمة المرور الجديدة تاني",
    savePass: "حفظ كلمة المرور", mismatch: "كلمتين المرور الجداد مش متطابقين", changePass: "تغيير كلمة المرور",
    cancel: "إلغاء", logout: "تسجيل الخروج", switchTo: "English", themeDark: "الوضع الداكن", themeLight: "الوضع الفاتح", visitSite: "زيارة الموقع",
    hello: (n) => `أهلًا، ${n}`, loading: "جارٍ التحميل…", noCircles: "إنت لسه مش في جمعية. أول ما المنظّم يضيفك هتظهر هنا.",
    perMonth: "في الشهر", shares: (s) => (s === 0.5 ? "نص سهم" : s === 1 ? "سهم واحد" : `${s} أسهم`),
    nextPayment: "القسط الجاي", allPaid: "كله مدفوع ✓", payNow: "ادفع دلوقتي", due: "الميعاد", late: "متأخر", daysLeft: (n) => (n === 0 ? "النهارده" : n === 1 ? "بكرة" : `بعد ${n} يوم`), daysLate: (n) => `متأخر ${n} يوم`,
    myTurn: "دوري", receive: "هتقبض", sharedWith: "مشترك (نص سهم)", handed: "اتسلّمت الفلوس — استلمتها؟", confirmReceived: "أيوه، استلمت ✓", receivedOk: "تم الاستلام ✓",
    progress: "اللي حوّشته لحد دلوقتي", of: "من", goal: "بحوّش عشان", goalPlaceholder: "مثلًا: عربية جديدة", setGoal: "حفظ", editGoal: "تعديل",
    months: "شهر بشهر", month: "الشهر", amount: "المبلغ", status: "الحالة", receipt: "إيصال", payments: "دفعاتي",
    noPayments: "مفيش دفعات لسه.", rejected: "لم تُقبل", why: "السبب",
    addCalendar: "أضف المواعيد لتقويم موبايلي", earlyTurn: "محتاج دوري بدري", earlyReason: "محتاجه بدري ليه؟", send: "إرسال", requestSent: "الطلب اتبعت — المنظّم هيرد عليك.",
    requestOpen: "طلبك عند المنظّم.", requestAnswered: (ok, r) => `${ok ? "اتقبل" : "اترفض"}${r ? `: ${r}` : ""}`,
    certificate: "شهادة الجمعية", finished: "خلصت",
    waitTitle: "الجمعية الجاية", waitOn: "إنت في قايمة الجمعية الجاية ✓", waitOff: "عايز تدخل الجمعية الجاية؟", waitJoin: "ضيفني للقايمة", waitLeave: "شيلني", waitNote: "ملاحظة (اختياري)",
    payTitle: "إرسال دفعة", payFor: "عن شهر", payTo: "حوّل الفلوس على", copy: "نسخ", copied: "اتنسخ ✓", scanQr: "امسح الكود بكاميرا الموبايل للدفع بـ InstaPay",
    method: "دفعت إزاي؟", screenshot: "صورة التحويل", screenshotHint: "مطلوبة لـ InstaPay وفودافون كاش (PNG أو JPG، حتى 2 ميجا).",
    note: "ملاحظة (اختياري)", notePlaceholder: "مثلًا: دفعت على مرتين", submitPay: "إرسال للتأكيد", sending: "جارٍ الإرسال…", sent: "اتبعت ✓ — هتظهر مدفوعة أول ما تتأكد.",
    review: "دفعات محتاجة تأكيد", reviewIntro: "إنت مساعد في الجمعية دي.", confirmPay: "تأكيد ✓", rejectPay: "رفض", rejectReason: "مرفوضة ليه؟", nothingToReview: "مفيش حاجة محتاجة تأكيد.",
    notifications: "الإشعارات", noNotes: "مفيش جديد.", remindersTitle: "تذكيرات",
    remindPay: (a, d) => `ادفع ${a} قبل ${d}`, remindLate: (a) => `قسطك ${a} متأخر`, remindPayout: (a, d) => `هتقبض ${a} يوم ${d} 🎉`,
    note_: {
      confirmed: (a, d) => `دفعتك اتأكدت ✓ ${d}`, rejected: (a, d) => `دفعتك ما اتقبلتش: ${d}`,
      handed: (a, d) => `فلوس دورك اتسلّمت 🎉 ${d}`, answered: (a, d) => `رد على طلبك: ${d}`,
      added: (a, d) => `اتضفت لجمعية «${d}»`, submitted: (a, d) => `${a} بعت دفعة: ${d}`,
    },
    pushOn: "شغّل إشعارات الموبايل", pushOnDone: "إشعارات الموبايل شغالة ✓", pushBlocked: "الإشعارات مقفولة من إعدادات المتصفح.",
    pushIos: "على الآيفون: اضغط مشاركة ← إضافة إلى الشاشة الرئيسية، وافتحه من هناك، وبعدين شغّل الإشعارات.",
    install: "سطّبه كتطبيق", print: "طباعة", error: "حصلت مشكلة. جرّب تاني.", back: "→ رجوع",
  },
};

// Server error messages the member can meet, in Arabic.
export const CIRCLE_SERVER_AR = {
  "Wrong phone number or password": "رقم الموبايل أو كلمة المرور غلط",
  "Too many attempts. Please try again later.": "محاولات كتير. جرّب بعد شوية.",
  "Your account is waiting for approval": "حسابك بانتظار الموافقة",
  "This phone number already has an account — sign in instead": "الرقم ده عليه حساب بالفعل — سجّل الدخول",
  "This invite link is no longer valid. Ask for a new one.": "رابط الدعوة ده مبقاش صالح. اطلب رابط جديد.",
  "The password must be 8 to 100 characters": "كلمة المرور لازم تكون من 8 لـ 100 حرف",
  "Write your name (up to 80 characters)": "اكتب اسمك (لحد 80 حرف)",
  "Write a correct phone number": "اكتب رقم موبايل صحيح",
  "The current password is wrong": "كلمة المرور الحالية غلط",
  "Attach a screenshot of the transfer": "ارفع صورة التحويل",
  "The amount must be at least 1": "المبلغ لازم يكون 1 على الأقل",
  "Write the amount": "اكتب المبلغ",
  "Image is too large (max 2 MB)": "الصورة كبيرة (الحد 2 ميجا)",
  "The image must be PNG, JPEG or WebP": "الصورة لازم تكون PNG أو JPG أو WebP",
  "You already have an open request in this circle": "عندك طلب مفتوح بالفعل في الجمعية دي",
  "Write the reason": "اكتب السبب",
  "Write why the payment is rejected": "اكتب سبب الرفض",
  "This circle has finished": "الجمعية دي خلصت",
};
