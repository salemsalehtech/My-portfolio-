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
    tagline: 'Building digital experiences & educating the next generation of developers.',
    ctaProjects: 'View Projects', ctaYoutube: 'Watch on YouTube',
    nav: { home:'Home', about:'About', skills:'Skills', projects:'Projects', youtube:'YouTube', contact:'Contact' },
    about: {
      title:'About Me', subtitle:'Passionate Developer & Educator',
      p1:"I'm a software engineer graduated from Borg Al-Arab Technological University with expertise in full-stack web development. I build elegant, high-performance web applications using modern tools and frameworks.",
      p2:"Beyond writing code, I create programming tutorials on YouTube in Arabic, helping developers learn web development from the ground up. I believe in continuous learning and sharing knowledge with the community.",
      edu:'Borg Al-Arab Technological University', location:'Alexandria, Egypt',
      interestsTitle:'Also Into', downloadCV:'Download CV',
      statProjects:'Projects', statSkills:'Technologies', statVideos:'Tutorials',
    },
    skills:{ title:'Technical Skills', subtitle:'Technologies I work with', frontend:'Frontend', backend:'Backend', tools:'Tools & Other' },
    projects:{ title:'Featured Projects', subtitle:'Things I have built', filterAll:'All', filterWeb:'Web Dev', filterYoutube:'YouTube', filterAuto:'Automation', viewCode:'Source Code', liveDemo:'Live Demo' },
    youtube:{ title:'YouTube Channel', subtitle:'Educational content', subscribe:'Subscribe Now', channelDesc:'Free programming courses in Arabic covering web development, Laravel, JavaScript, and more.' },
    contact:{ title:'Get In Touch', subtitle:"Let's work together", name:'Your Name', email:'Your Email', message:'Your Message', send:'Send Message', sending:'Sending…', success:"Message sent! I'll get back to you soon.", error:'Something went wrong. Please try again.', connectTitle:'Connect With Me' },
    footer:{ rights:'© 2025 Salem Saleh · All rights reserved.' },
    interests:['Content Creation','UI/UX Design','Product Management','Teaching','Open Source'],
  },
  ar: {
    greeting:'مرحباً، أنا', name:'سالم صالح',
    tagline:'أبني تجارب رقمية وأُعلّم الجيل القادم من المطورين.',
    ctaProjects:'عرض المشاريع', ctaYoutube:'شاهد على يوتيوب',
    nav:{ home:'الرئيسية', about:'عني', skills:'المهارات', projects:'المشاريع', youtube:'يوتيوب', contact:'تواصل' },
    about:{
      title:'عني', subtitle:'مطور شغوف ومُعلّم',
      p1:'أنا مهندس برمجيات متخرج من جامعة برج العرب التكنولوجية، متخصص في تطوير الويب الشامل. أبني تطبيقات ويب أنيقة وعالية الأداء باستخدام أحدث الأدوات.',
      p2:'إلى جانب الكود، أُنشئ دروساً برمجية على يوتيوب باللغة العربية، مساعداً المطورين على تعلم تطوير الويب من الصفر. أؤمن بالتعلم المستمر ومشاركة المعرفة مع المجتمع.',
      edu:'جامعة برج العرب التكنولوجية', location:'الإسكندرية، مصر',
      interestsTitle:'اهتمامات أخرى', downloadCV:'تحميل السيرة الذاتية',
      statProjects:'مشروع', statSkills:'تقنية', statVideos:'درس',
    },
    skills:{ title:'المهارات التقنية', subtitle:'التقنيات التي أعمل بها', frontend:'الواجهة الأمامية', backend:'الخلفية', tools:'الأدوات وأخرى' },
    projects:{ title:'المشاريع المميزة', subtitle:'ما قمت ببنائه', filterAll:'الكل', filterWeb:'تطوير ويب', filterYoutube:'يوتيوب', filterAuto:'أتمتة', viewCode:'الكود المصدري', liveDemo:'العرض المباشر' },
    youtube:{ title:'قناة يوتيوب', subtitle:'محتوى تعليمي', subscribe:'اشترك الآن', channelDesc:'دورات برمجة مجانية باللغة العربية تغطي تطوير الويب و Laravel و JavaScript والمزيد.' },
    contact:{ title:'تواصل معي', subtitle:'لنعمل معاً', name:'اسمك', email:'بريدك الإلكتروني', message:'رسالتك', send:'إرسال الرسالة', sending:'جارٍ الإرسال…', success:'تم الإرسال! سأرد قريباً.', error:'حدث خطأ ما. حاول مرة أخرى.', connectTitle:'تواصل معي' },
    footer:{ rights:'© 2025 سالم صالح · جميع الحقوق محفوظة.' },
    interests:['إنشاء المحتوى','تصميم UI/UX','إدارة المنتج','التعليم','المصدر المفتوح'],
  },
};

export const heroTitles = {
  en: ['Software Engineer','Full-Stack Developer','Content Creator'],
  ar: ['مهندس برمجيات','مطور متكامل','صانع محتوى'],
};
