// translations.js — the only translation mechanism in this app (there's no i18n library).
//
// T is an object with one key per language ("en" and "ar"). Each language's value is a
// nested object grouped by page section (nav, about, skills, projects, youtube, contact,
// footer) plus a few top-level strings (greeting, name, tagline...) and an `interests`
// array. context/SiteContext.jsx exposes the CURRENT language's object as `t` (via
// useSite().t), so components read strings like t.about.title or t.nav.home — never T
// directly.
//
// heroTitles below is separate from T because Hero.jsx cycles through it as a list
// (see the rotating-title effect in Hero.jsx), not as a lookup by key.
//
// IMPORTANT: whenever you add a new displayable string, add it to BOTH the "en" and "ar"
// objects with the same key path — there's no fallback if one language is missing a key.
export const T = {
  en: {
    greeting: "Hello, I'm", name: 'Salem Saleh',
    tagline: 'I build web apps that work in Arabic and English, and I teach how they are made — in Arabic, on YouTube.',
    ctaProjects: 'See my work', ctaYoutube: 'Watch on YouTube',
    menuLabel: 'Menu', languageLabel: 'Language', themeLabel: 'Switch theme', themeDark: 'Dark mode', themeLight: 'Light mode',
    available: 'Taking new projects', busy: 'Fully booked right now', bookCall: 'Book a call', startProject: 'Start a project',
    process: { title: 'How a project goes', subtitle: 'Working together', steps: [
      { title: 'We talk', text: 'A short call about what you need, who will use it and by when. No cost.' },
      { title: 'You get a clear offer', text: 'Scope, timeline and a fixed price in writing — before any work starts.' },
      { title: 'I build, you watch', text: 'Weekly previews on a live link, so you can try it and change course early.' },
      { title: 'Launch and support', text: 'I put it online, hand over the access, and stay around for fixes.' },
    ] },
    nav: { home:'Home', about:'About', services:'Services', skills:'Skills', projects:'Projects', certificates:'Certificates', testimonials:'Reviews', blog:'Blog', courses:'Courses', youtube:'YouTube', contact:'Contact', products:'Products' },
    about: {
      title:'About me', subtitle:'Engineer and teacher',
      p1:"I'm a software engineer graduated from Borg Al-Arab Technological University with expertise in full-stack web development. I build elegant, high-performance web applications using modern tools and frameworks.",
      p2:"Beyond writing code, I create programming tutorials on YouTube in Arabic, helping developers learn web development from the ground up. I believe in continuous learning and sharing knowledge with the community.",
      edu:'Borg Al-Arab Technological University', location:'Alexandria, Egypt',
      interestsTitle:'Also Into', downloadCV:'Download CV',
      statProjects:'Projects', statSkills:'Technologies', statVideos:'Tutorials',
    },
    skills:{ title:'Tools I use', subtitle:'Skills',
      groups:{ languages:'Languages', frontend:'Frontend', backend:'Backend', mobile:'Mobile apps', desktop:'Desktop apps', databases:'Databases', tools:'Tools & Other' },
      tiers:{ core:'Core', regular:'Regular', working:'When needed' },
      coreLabel:'Core stack — what I build with right now', kitLabel:'Everything I work with, by area',
      alsoShipped:'Projects here also used' },
    projects:{ title:'Selected work', subtitle:'Projects', filterAll:'All', filterWeb:'Web Dev', filterYoutube:'YouTube', filterAuto:'Automation', viewCode:'Source Code', liveDemo:'Live Demo', details:'Read the case study', results:'Results', caseStudy:'Case study', problem:'The problem', solution:'The solution', result:'The result' },
    services:{ title:'What I can build for you', subtitle:'Services', cta:'Start a project like this' },
    certificates:{ title:'Certificates', subtitle:'Credentials', view:'Verify' },
    blog:{ title:'Latest articles', subtitle:'Blog', all:'All articles', readMore:'Read article →', minRead:'min read', empty:'No articles yet.', notFound:'This article does not exist or is no longer published.' },
    courses:{ title:'Courses & Content', subtitle:'Learn with me', open:'Start learning' },
    products:{ title:'Products', subtitle:'Ready-made software', view:'View product' },
    product:{ subscribe:'Subscribe', startNow:'Start now', demo:'Live demo', seePricing:'See pricing', contact:'Contact us',
      perMonth:'/ month', popular:'Most popular', askPrice:'Ask us', currency:'Currency', currencies:{ EGP:'EGP', USD:'USD' },
      readyTitle:'Ready to start?', readyText:'Subscribe today, or talk to us first — we will help you set it up.',
      notFound:'This product was not found', backHome:'Back to the website', draft:'Draft preview — only you can see this page.',
      titles:{ features:'Features', gallery:'Screenshots', video:'See it in action', pricing:'Pricing', faq:'Frequently asked questions', reviews:'What clients say' } },
    testimonials:{ title:'What clients say', subtitle:'Testimonials', rating:'{n} out of 5', about:'About' },
    youtube:{ title:'I teach on YouTube', subtitle:'YouTube', subscribe:'Subscribe', channelDesc:'Free programming courses in Arabic covering web development, Laravel, JavaScript, and more.' },
    notFound:{ eyebrow:'Error 404', title:'Nothing is connected to this address', text:'The link may be old, or a letter in it may be off. The page you were after is probably one of these:', address:'You asked for', home:'Back to the home page', blog:'Read the articles', contact:'Ask me directly' },
    contact:{ title:'Tell me about your project', subtitle:'Contact', name:'Your name', email:'Your email', message:'What do you want to build?', send:'Send message', sending:'Sending…', success:"Message sent! I'll get back to you soon.", error:'Something went wrong. Please try again.', connectTitle:'Other ways to reach me', locationLabel:'Location',
      need:'What do you need?', other:'Something else', when:'When do you need it?', budget:'Rough budget', optional:'optional', replyOn:'How should I reply?', byEmail:'Email', byWhatsapp:'WhatsApp', phone:'Your WhatsApp number',
      messageHint:'A few lines are enough: what it should do, who will use it, and anything you already have.', draftSaved:'Draft saved on this device',
      errName:'Write your name.', errEmail:'Write an email I can reply to.', errPhone:'Write a WhatsApp number, with the country code if you are outside Egypt.', errMessage:'Tell me a little about the project.',
      sentTitle:'Got it, {name}.', sentEmail:'I will reply by email within 24 hours.', sentWhatsapp:'I will message you on WhatsApp within 24 hours.', sendAnother:'Send another message',
      nextTitle:'What happens next', next:[['I reply within 24 hours','By email or on WhatsApp, the way you chose.'],['A short call, free','About 20 minutes to understand what you need and who will use it.'],['A written offer','Scope, timeline and a fixed price, before any work starts.']] },
    footer:{ rights:'© 2026 Salem Saleh', team:'Team login' },
    interests:['Content Creation','UI/UX Design','Product Management','Teaching','Open Source'],
  },
  ar: {
    greeting:'مرحباً، أنا', name:'سالم صالح',
    tagline:'أبني تطبيقات ويب بتشتغل بالعربي والإنجليزي، وبشرح إزاي بتتعمل — بالعربي على يوتيوب.',
    ctaProjects:'شوف شغلي', ctaYoutube:'شاهد على يوتيوب',
    menuLabel:'القائمة', languageLabel:'اللغة', themeLabel:'تغيير المظهر', themeDark:'الوضع الداكن', themeLight:'الوضع الفاتح',
    available:'متاح لمشاريع جديدة', busy:'مشغول حاليًا', bookCall:'احجز مكالمة', startProject:'ابدأ مشروعك',
    process:{ title:'المشروع بيمشي إزاي', subtitle:'طريقة الشغل', steps:[
      { title:'نتكلم', text:'مكالمة قصيرة عن اللي محتاجه، ومين هيستخدمه، وعايزه إمتى. من غير أي تكلفة.' },
      { title:'عرض واضح', text:'المطلوب والمدة والسعر مكتوبين — قبل ما نبدأ أي شغل.' },
      { title:'أبني وإنت متابع', text:'كل أسبوع نسخة تجربها على لينك حقيقي، فتعدّل بدري لو محتاج.' },
      { title:'إطلاق ودعم', text:'أرفعه أونلاين، وأسلّمك كل الحسابات، وأفضل موجود لأي تصليح.' },
    ] },
    nav:{ home:'الرئيسية', about:'عني', services:'الخدمات', skills:'المهارات', projects:'المشاريع', certificates:'الشهادات', testimonials:'الآراء', blog:'المدونة', courses:'الكورسات', youtube:'يوتيوب', contact:'تواصل', products:'المنتجات' },
    about:{
      title:'عني', subtitle:'مهندس ومُعلّم',
      p1:'أنا مهندس برمجيات متخرج من جامعة برج العرب التكنولوجية، متخصص في تطوير الويب الشامل. أبني تطبيقات ويب أنيقة وعالية الأداء باستخدام أحدث الأدوات.',
      p2:'إلى جانب الكود، أُنشئ دروساً برمجية على يوتيوب باللغة العربية، مساعداً المطورين على تعلم تطوير الويب من الصفر. أؤمن بالتعلم المستمر ومشاركة المعرفة مع المجتمع.',
      edu:'جامعة برج العرب التكنولوجية', location:'الإسكندرية، مصر',
      interestsTitle:'اهتمامات أخرى', downloadCV:'تحميل السيرة الذاتية',
      statProjects:'مشروع', statSkills:'تقنية', statVideos:'درس',
    },
    skills:{ title:'الأدوات اللي بستخدمها', subtitle:'المهارات',
      groups:{ languages:'لغات البرمجة', frontend:'الواجهة الأمامية', backend:'الباك إند', mobile:'تطبيقات الموبايل', desktop:'تطبيقات الديسكتوب', databases:'قواعد البيانات', tools:'الأدوات وأخرى' },
      tiers:{ core:'أساسي', regular:'منتظم', working:'عند الحاجة' },
      coreLabel:'الأساس — اللي ببني بيه دلوقتي', kitLabel:'كل اللي بشتغل بيه، متقسّم حسب المجال',
      alsoShipped:'المشاريع هنا اتعملت كمان بـ' },
    projects:{ title:'من شغلي', subtitle:'المشاريع', filterAll:'الكل', filterWeb:'تطوير ويب', filterYoutube:'يوتيوب', filterAuto:'أتمتة', viewCode:'الكود المصدري', liveDemo:'العرض المباشر', details:'اقرأ دراسة الحالة', results:'النتائج', caseStudy:'دراسة حالة', problem:'المشكلة', solution:'الحل', result:'النتيجة' },
    services:{ title:'أقدر أبنيلك إيه', subtitle:'الخدمات', cta:'ابدأ مشروع زي ده' },
    certificates:{ title:'الشهادات', subtitle:'الاعتمادات', view:'تحقق من الشهادة' },
    blog:{ title:'أحدث المقالات', subtitle:'المدونة', all:'كل المقالات', readMore:'اقرأ المقال ←', minRead:'دقائق قراءة', empty:'لا توجد مقالات بعد.', notFound:'هذا المقال غير موجود أو لم يعد منشورًا.' },
    courses:{ title:'الكورسات والمحتوى', subtitle:'تعلّم معي', open:'ابدأ التعلّم' },
    products:{ title:'المنتجات', subtitle:'برامج جاهزة', view:'عرض المنتج' },
    product:{ subscribe:'اشترك', startNow:'ابدأ الآن', demo:'تجربة مباشرة', seePricing:'الأسعار', contact:'تواصل معنا',
      perMonth:'/ شهريًا', popular:'الأكثر طلبًا', askPrice:'تواصل معنا', currency:'العملة', currencies:{ EGP:'جنيه', USD:'دولار' },
      readyTitle:'جاهز تبدأ؟', readyText:'اشترك اليوم، أو كلّمنا الأول — وهنساعدك في التجهيز.',
      notFound:'لم يتم العثور على هذا المنتج', backHome:'العودة إلى الموقع', draft:'معاينة مسودة — هذه الصفحة تظهر لك فقط.',
      titles:{ features:'المميزات', gallery:'صور من البرنامج', video:'شاهده وهو يعمل', pricing:'الأسعار', faq:'أسئلة شائعة', reviews:'آراء العملاء' } },
    testimonials:{ title:'آراء العملاء', subtitle:'ماذا يقول عملائي', rating:'{n} من 5', about:'عن مشروع' },
    youtube:{ title:'بعلّم على يوتيوب', subtitle:'يوتيوب', subscribe:'اشترك', channelDesc:'دورات برمجة مجانية باللغة العربية تغطي تطوير الويب و Laravel و JavaScript والمزيد.' },
    notFound:{ eyebrow:'خطأ 404', title:'مفيش حاجة متوصلة بالعنوان ده', text:'ممكن اللينك يكون قديم، أو فيه حرف غلط. اللي بتدور عليه غالبًا في مكان من دول:', address:'العنوان اللي طلبته', home:'ارجع للصفحة الرئيسية', blog:'اقرا المقالات', contact:'اسألني على طول' },
    contact:{ title:'احكيلي عن مشروعك', subtitle:'تواصل', name:'اسمك', email:'بريدك الإلكتروني', message:'عايز تبني إيه؟', send:'ابعت الرسالة', sending:'بيتبعت…', success:'وصلت! هرد عليك قريب.', error:'حصلت مشكلة. جرّب تاني.', connectTitle:'طرق تانية للتواصل', locationLabel:'الموقع',
      need:'محتاج إيه؟', other:'حاجة تانية', when:'محتاجه إمتى؟', budget:'الميزانية التقريبية', optional:'اختياري', replyOn:'أرد عليك إزاي؟', byEmail:'إيميل', byWhatsapp:'واتساب', phone:'رقم الواتساب بتاعك',
      messageHint:'كام سطر كفاية: المفروض يعمل إيه، مين هيستخدمه، وإيه اللي عندك جاهز.', draftSaved:'المسودة محفوظة على جهازك',
      errName:'اكتب اسمك.', errEmail:'اكتب إيميل أقدر أرد عليه.', errPhone:'اكتب رقم الواتساب، ومعاه كود الدولة لو إنت برة مصر.', errMessage:'احكيلي شوية عن المشروع.',
      sentTitle:'وصلت يا {name}.', sentEmail:'هرد عليك على الإيميل خلال 24 ساعة.', sentWhatsapp:'هكلمك على الواتساب خلال 24 ساعة.', sendAnother:'ابعت رسالة تانية',
      nextTitle:'إيه اللي هيحصل بعد كده', next:[['هرد عليك خلال 24 ساعة','على الإيميل أو الواتساب، زي ما اخترت.'],['مكالمة قصيرة ومجانية','حوالي 20 دقيقة أفهم فيها محتاج إيه ومين هيستخدمه.'],['عرض مكتوب','المطلوب والمدة وسعر ثابت، قبل ما نبدأ أي شغل.']] },
    footer:{ rights:'© 2026 سالم صالح', team:'دخول فريق العمل' },
    interests:['إنشاء المحتوى','تصميم UI/UX','إدارة المنتج','التعليم','المصدر المفتوح'],
  },
};

export const heroTitles = {
  en: ['Software Engineer','Full-Stack Developer','Content Creator'],
  ar: ['مهندس برمجيات','مطور متكامل','صانع محتوى'],
};
