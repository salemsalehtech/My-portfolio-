# خطة تطوير موقع البورتفوليو (My-portfolio-)

> **⚠️ المرجع الرسمي للخطة دلوقتي هو [ROADMAP.md](ROADMAP.md)** — فيه الحالة الحالية، الجدول الزمني، والترتيب المقترح. الملف ده بقى ملاحظات التخطيط الأصلية + أرشيف البرومبتات اللي اتبعتت. لو في اختلاف بينهم، `ROADMAP.md` هو الصح.

الريبو: https://github.com/salemsalehtech/My-portfolio-
ملحوظة: الموقع ده مستقل تمامًا، ومالوش أي علاقة بمشروع "UniConnect" (اسم مشروع تاني مختلف كليًا).

> هذا الملف هو نسخة محفوظة من الخطة المتفق عليها، عشان Salem يقدر يرجع لها ويكمل منها في أي وقت من غير ما يفقد أي تفاصيل.

## قواعد الشغل في المحادثة دي (اتفقنا عليها)

- بنجمع المعلومات ونبني To-Do List للمهام. البرومبت الخاص بأي مهمة بيتكتب بس لما Salem يطلبه صراحة وقتها ("اعملّي برومبت للتاسك ده"). كل مهمة كبيرة = برومبت لوحدها.
- **قاعدة "كل حاجة من الداشبورد"**: أي محتوى أو ميزة تتضاف للموقع (حالية أو مستقبلية) لازم تتحكم فيها Salem بالكامل من لوحة تحكم (`/admin`) — إضافة/تعديل/حذف — من غير ما يلمس كود خالص. أي مورد جديد لازم يتبني بنمط: موديل + API عام + API إداري (CRUD) + صفحة إدارة + قسم عرض. مفيش محتوى ثابت (hardcoded).
- **قاعدة صياغة البرومبتات (Golden Rule)**: كل برومبت لكلود كود من دلوقتي **لازم يتكتب بالإنجليزي**، وبصياغة احترافية بأسلوب "Senior Software Engineer prompt"، شامل الأقسام دي بالترتيب: Role، Context، Task، Constraints، Output/Deliverable، Acceptance Criteria.
- **قاعدة نقطة الأمان (Safety Checkpoint)**: قبل أي تاسك بيعدل كود موجود وشغال فعليًا (زي 1.1 و2.1)، البرومبت لازم يتضمن خطوة إنشاء Git branch جديد أو commit/tag واضح قبل البدء، عشان Salem يقدر يرجع بسهولة لو حاجة اتكسرت، من غير ما يحتاج خبرة Git متقدمة.
- **قاعدة الفحص اليدوي (Manual QA)**: بما إن مفيش test suite في المشروع، كل تاسك كبير (1.1، 2.1، 2.4، وأي مورد جديد) لازم البرومبت يخلص بقايمة فحص يدوية بسيطة يعملها Salem بنفسه بعد التنفيذ (مثال عام: فتح كل الصفحات، تجربة تبديل اللغة EN/AR، تجربة تبديل الوضع الليلي/النهاري، تسجيل دخول الأدمن، إرسال فورم Contact تجريبي) قبل ما يعتبر التاسك خلص.
- **قاعدة إرجاع الحماية (Security Restore Reminder)**: بما إن تاسك 2.1 هيبسّط/يوقف مؤقتًا rate limiting وhelmet، لازم نحط تذكير واضح إننا **نرجعهم إجباريًا قبل** إطلاق أي ميزة فيها فورم عام جديد يستقبل بيانات من زوار غرباء (المتجر، فورم طلب المشروع، فورم الفيدباك، الاشتراك البريدي، الدردشة السريعة) — لأن من غيرهم الموقع بيبقى مكشوف لسبام وهجمات brute-force على تسجيل الدخول.

## الوضع الحالي

- **client/**: React 18 + Vite. صفحة عامة (Hero/About/Skills/Projects/Contact/YouTube) + admin dashboard كامل (Projects, Skills, YouTube, Messages).
- **server/**: Express + Mongoose (MongoDB). فيه JWT auth, rate limiting, helmet, nodemailer.
- الموقع أصلاً مبني بمبدأ "التحكم من الداشبورد" لموارد Project/Skill/YoutubeVideo — نفس النمط هيتكرر مع كل ميزة جديدة.
- ثنائي اللغة (EN/AR) بالكامل على مستوى الداتا والواجهة.
- الفرونت منشور على GitHub Pages. **السيرفر لسه مش منشور على Render** (مشكلة معلقة).
- `client/.env.production` فيه قيمة placeholder لسه لـ VITE_API_URL.
- Salem لسه في مرحلة تعلم React، وعاوز يقدر يقرأ ويفهم كل ملف في الكود.
- الاستضافة: GitHub Pages + Render + MongoDB Atlas (مش هينقل لـ Hostinger)، وممكن يشتري دومين خاص لاحقًا من أي مكان ويربطه بـ GitHub Pages.
- **ملحوظة تقنية**: `client/vite.config.js` فيه `base: "/My-portfolio-/"` وقت البناء — لازم يترجع لـ `"/"` لو اتربط دومين خاص لاحقًا (تاسك 2.6).

## To-Do List (بالترتيب)

### المرحلة 1 — الفرونت إند

- [x] **1.1** تنظيم/تبسيط بنية ملفات client/src للقراءة (بدون تغيير الشكل/السلوك) — **تم فعليًا**. راجع [FRONTEND_CLEANUP_NOTES.md](FRONTEND_CLEANUP_NOTES.md): اتقسم `Particles.jsx` → `lib/particles.js`، واتقسمت `scrollToSection` من `useScrollTracking.js` لـ `lib/scrollToSection.js`، وكل باقي الملفات خدت تعليقات توضيحية أعلاها. اتأكد بـ `npm run build` (نفس المخرجات بالظبط). ⚠️ اتعمل بنسخة البرومبت اللي كانت قبل إضافة قواعد Safety Checkpoint/Manual QA — يفضّل عمل Manual QA كامل لو لسه ماتعملش.
- [ ] **1.2** بعد التنظيم: ملف PDF يوثّق كل حاجة اتعملت في الفرونت إند، بأسلوب مناسب لمبتدئ.
- [ ] **1.3** SEO أساسي + مشاركة سوشيال ميديا: Meta tags + Open Graph tags في `index.html`.

### المرحلة 2 — الباك إند وقاعدة البيانات + النشر (بعد الفرونت)

- [ ] **2.1** تبسيط الباك إند مؤقتًا (rate limiting, helmet تتوثق كتعليقات وترجع وقت الحاجة — مع Safety Checkpoint إجباري قبل البدء) مع إبقاء JWT auth.
- [ ] **2.2** تعليقات وشرح واضح على كل ملف في server/src.
- [ ] **2.3** تثبيت قرار قاعدة البيانات: **MongoDB** (استمرار).
- [ ] **2.4** حل مشكلة نشر السيرفر على Render (Salem يعمل حساب Render + MongoDB Atlas بنفسه) + تصحيح VITE_API_URL في client/.env.production + Manual QA كامل بعدها.
- [ ] **2.5** ملف PDF توثيق للباك إند.
- [ ] **2.6** (لما Salem يشتري دومين خاص لاحقًا) ربط الدومين بـ GitHub Pages + تعديل `base` في vite.config.js + تحديث CLIENT_ORIGIN.

### المرحلة 3 — Backlog مستقبلي

كل عنصر يتبني بمبدأ "كل حاجة من الداشبورد"، وأي عنصر فيه فورم عام (🔒 = محتاج نتأكد إن rate limiting/helmet رجعوا الأول):

**محتوى وبراند شخصي:**

- **مدونة/مقالات تقنية (Blog)** — يحسّن SEO ويبني سمعة Salem كمبرمج/مدرّس.
- **زرار تحميل السيرة الذاتية (CV/Resume PDF)** في الصفحة الرئيسية أو About — رابط PDF يتحط من الداشبورد.
- **عرض شهادات/إنجازات (Certificates)** — قسم جديد (موديل + admin CRUD) لعرض شهادات الكورسات (زي DEPI) والإنجازات.
- **اشتراك بريدي (Newsletter)** 🔒 — الزوار يسجلوا إيميلهم عشان يوصلهم إشعار عند نشر كورس/منتج/مقال جديد.
- **قسم مرتبط بالسوشيال ميديا/الكورسات**: ملخص كورس + ملفات + تمارين عملية.
- **فيديو "عن نفسي"** في About (رابط يتحط من الداشبورد).

**العملاء والعمل (Business/Client-facing):**

- **حجز ميعاد أونلاين (Booking/Calendar)** 🔒 — العميل يحجز معاد مكالمة مباشرة من الموقع؛ مرتبطة بفكرة فورم الإنتيك (ممكن يبقوا نفس الميزة لاحقًا: فورم يحدد المتطلبات + يفتح تقويم لاختيار معاد).
- **نموذج طلب مشروع (Intake Form)** 🔒 — فكرة غير مكتملة، هترتبط باحتمال الحجز الأونلاين.
- **صفحة الخدمات + التسعير** — فكرة غير مكتملة.
- **فورم فيدباك للعميل بعد انتهاء الشغل** 🔒 — يظهر كـ Testimonial بعد موافقة Salem.
- **متجر برامج/منتجات رقمية** 🔒 (شراء + تحميل، يحتاج لاحقًا نظام دفع وتخزين ملفات).
- عرض منتجات إضافية مستقبلاً.

**تحسينات تقنية/تجربة استخدام:**

- **تصنيف/فلترة المشاريع بالتاج (Filter Projects)** — الزوار يفلتروا مشاريع Salem حسب التقنية (React/Node/إلخ)، مبني على بيانات موجودة بالفعل (مجرد إضافة حقل tags للموديل + فلترة في الواجهة).
- **لوحة إحصائيات بسيطة للأدمن (Visitor Analytics)** — عدد الزوار وأكتر صفحة بتتفتح، تظهر في `/admin` بدل أداة خارجية.
- **دردشة سريعة للزوار (Simple Contact Chat Widget)** 🔒 — نسخة مبسطة جدًا لسؤال سريع بديل عن فورم Contact الطويل، **منفصلة تمامًا عن UniConnect** (لا علاقة بينهم خالص).

## قرارات ثابتة اتاخدت

- قاعدة البيانات: **MongoDB** (استمرار، مش تغيير).
- الستاك: Node.js + Express (زي ما هو).
- الاستضافة: GitHub Pages + Render + MongoDB Atlas — **مش هننتقل لـ Hostinger**.
- **كل شيء يتحكم فيه من الداشبورد**، مفيش محتوى ثابت في الكود.
- **كل برومبت بالإنجليزي وبصياغة Senior Engineer** (Role/Context/Task/Constraints/Output/Acceptance Criteria).
- **كل تاسك بيعدل كود شغال = Safety Checkpoint (git branch/commit) قبل البدء + Manual QA checklist بعد الانتهاء.**
- **لازم نرجع rate limiting/helmet قبل أي فورم عام جديد.**
- منهج العمل: تنظيم/تبسيط أولاً، توثيق PDF بعد كل مرحلة كبيرة، وبرومبتات تتكتب مهمة مهمة وقت الطلب فقط.

## ملحوظات من كورس "Portfolio Building"

عناصر ناقصة حاليًا: Testimonials، Offered Services، USP statement واضح، Achievements/Education، وتحويل المشاريع لـ Case Studies. هتترتب مع الـ Backlog بمبدأ "كل حاجة من الداشبورد".

## البرومبتات اللي اتكتبت فعليًا

### Task 1.1 — Frontend cleanup for readability ✅ منفّذ

> **الحالة: تم التنفيذ.** ده البرومبت اللي اتبعت وقتها (نسخة قبل إضافة قواعد Safety Checkpoint/Manual QA). محفوظ هنا للأرشيف فقط.

```
ROLE
You are a Senior React Engineer at a top-tier software company, known for writing
clean, well-documented, junior-friendly code without ever over-engineering.

CONTEXT
- Repo: https://github.com/salemsalehtech/My-portfolio- (read CLAUDE.md fully before doing anything).
- Stack: React 18 + Vite (client/), Express + Mongoose/MongoDB (server/) — do NOT touch server/ in this task.
- The site owner (Salem) is a beginner learning React. He needs to be able to open
  any file under client/src and understand it, then extend it himself.
- The site is fully bilingual (EN/AR) via i18n/translations.js and SiteContext — this
  must keep working exactly as it does today.
- This is a live, working personal portfolio — not a prototype. Nothing user-facing
  may break.

TASK
Improve the readability and organization of client/src ONLY. Do not redesign the UI
and do not change any user-facing behavior. Minor, safe improvements are allowed
only if they directly improve clarity (e.g., splitting an oversized file into smaller
named pieces that are imported back together), never cosmetic/visual changes.

Concretely:
1. Review the current structure of client/src (components/, pages/, pages/admin/,
   context/, hooks/, i18n/, lib/). Identify any file that is too large, unclear, or
   organized in a way that would confuse a beginner.
2. Add clear, beginner-friendly comments at the top of every component file and
   above any non-obvious logic, explaining: what the file does, what data/props it
   receives, and how it fits into the rest of the app.
3. If (and only if) a file is genuinely too large or mixes unrelated concerns, split
   it into smaller, clearly named files/components, keeping all existing behavior
   identical.
4. Keep the existing patterns intact: components consume useSite() for theme/lang,
   all HTTP calls go through lib/api.js, admin pages use hooks/useCollection.js.
   Do not introduce a new pattern that competes with these.

CONSTRAINTS
- Do NOT touch anything under server/.
- Do NOT change visual design, layout, colors, or any user-facing text/translations.
- Do NOT change any API calls, routes, or data shapes.
- If you are unsure whether a restructuring is safe or could break imports, STOP and
  ask me before making the change, rather than guessing.
- Keep every commit small and focused so I can review and understand each change.

OUTPUT / DELIVERABLE
- The cleaned-up, commented client/src code.
- A new markdown file at the repo root named FRONTEND_CLEANUP_NOTES.md listing,
  file by file, what you changed and why. This will be used later to generate a
  beginner-friendly PDF explaining the whole frontend, so be specific and clear.

ACCEPTANCE CRITERIA
- `npm run dev` and `npm run build` in client/ both work exactly as before, with no
  visual or functional regressions.
- Every component file has a short explanatory comment block at the top.
- FRONTEND_CLEANUP_NOTES.md exists and clearly documents every change made.
- If anything was ambiguous, you asked me before proceeding instead of guessing.
```

## آخر تحديث للحالة

- **1.1 خلصت فعليًا** ([FRONTEND_CLEANUP_NOTES.md](FRONTEND_CLEANUP_NOTES.md) موجود ومؤكد).
- التالي في الدور (تحديث 2026-10-18): Manual QA لـ 1.1، بعدين **2.4** (نشر السيرفر — الموقع اللايف مش بيعرض داتا من غيره)، بعدين **1.3** (SEO). الترتيب الكامل في [ROADMAP.md](ROADMAP.md#recommended-next-steps-in-order).
- **تعديل على 2.1:** rate limiting وhelmet مش هيتوقفوا — هيتشرحوا بتعليقات بس، لأن فورم Contact ودخول الأدمن عامين أصلًا.
- برومبتات المهام القادمة (2.1 وما بعدها) هتتكتب بقواعد Safety Checkpoint + Manual QA كاملة من البداية.
