/* ============ DATA ============ */
const T = {
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
    contact:{ title:'Get In Touch', subtitle:"Let's work together", name:'Your Name', email:'Your Email', message:'Your Message', send:'Send Message', sending:'Sending…', success:"Message sent! I'll get back to you soon.", connectTitle:'Connect With Me' },
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
    contact:{ title:'تواصل معي', subtitle:'لنعمل معاً', name:'اسمك', email:'بريدك الإلكتروني', message:'رسالتك', send:'إرسال الرسالة', sending:'جارٍ الإرسال…', success:'تم الإرسال! سأرد قريباً.', connectTitle:'تواصل معي' },
    footer:{ rights:'© 2025 سالم صالح · جميع الحقوق محفوظة.' },
    interests:['إنشاء المحتوى','تصميم UI/UX','إدارة المنتج','التعليم','المصدر المفتوح'],
  },
};

const heroTitles = {
  en: ['Software Engineer','Full-Stack Developer','Content Creator'],
  ar: ['مهندس برمجيات','مطور متكامل','صانع محتوى'],
};

const projects = [
  { id:1, title:{en:'E-Commerce Platform',ar:'منصة التجارة الإلكترونية'}, desc:{en:'A full-stack e-commerce solution with product management, shopping cart, order tracking, and Stripe payment integration built with Laravel and Vue.js.',ar:'منصة تجارة إلكترونية متكاملة مع إدارة المنتجات وعربة التسوق وتتبع الطلبات وتكامل Stripe، مبنية بـ Laravel و Vue.js.'}, tags:['Laravel','Vue.js','MySQL','Stripe'], category:'web', github:'https://github.com/solx4', demo:'#', gradient:'linear-gradient(135deg,#1E3A5F,#2E5B9A)', catLabel:{en:'Web Dev',ar:'تطوير ويب'} },
  { id:2, title:{en:'Admin Dashboard',ar:'لوحة التحكم'}, desc:{en:'A responsive admin panel with real-time charts, user management, role-based access control, and analytics — built with React and Node.js.',ar:'لوحة تحكم متجاوبة مع مخططات فورية وإدارة مستخدمين وتحكم بالوصول وتحليلات، مبنية بـ React و Node.js.'}, tags:['React','Node.js','MongoDB','Chart.js'], category:'web', github:'https://github.com/solx4', demo:'#', gradient:'linear-gradient(135deg,#142235,#2E5B9A)', catLabel:{en:'Web Dev',ar:'تطوير ويب'} },
  { id:3, title:{en:'Programming Tutorials Series',ar:'سلسلة دروس البرمجة'}, desc:{en:'A comprehensive YouTube tutorial series in Arabic covering full-stack web development: HTML, CSS, JavaScript, PHP, Laravel, React, and Vue.js — all free.',ar:'سلسلة يوتيوب شاملة باللغة العربية تغطي HTML و CSS و JavaScript و PHP و Laravel و React و Vue.js — كلها مجانية.'}, tags:['JavaScript','PHP','Laravel','YouTube'], category:'youtube', github:'https://github.com/solx4', demo:'https://www.youtube.com/@SalemSaleh1', gradient:'linear-gradient(135deg,#7A0000,#CC0000)', catLabel:{en:'YouTube',ar:'يوتيوب'} },
  { id:4, title:{en:'Task Automation Tool',ar:'أداة أتمتة المهام'}, desc:{en:'A Node.js tool for automating repetitive web tasks — data scraping, form submission, and scheduled workflows powered by Puppeteer.',ar:'أداة Node.js لأتمتة مهام الويب المتكررة: جمع البيانات وإرسال النماذج وسير العمل المجدول باستخدام Puppeteer.'}, tags:['JavaScript','Node.js','Puppeteer'], category:'automation', github:'https://github.com/solx4', demo:'#', gradient:'linear-gradient(135deg,#0D3320,#1A5C3C)', catLabel:{en:'Automation',ar:'أتمتة'} },
  { id:5, title:{en:'REST API Service',ar:'خدمة REST API'}, desc:{en:'A production-ready RESTful API with Laravel — JWT auth, rate limiting, API versioning, Swagger docs, and a comprehensive test suite.',ar:'واجهة RESTful جاهزة للإنتاج بـ Laravel مع JWT وتحديد المعدل وتوثيق Swagger وأدوات اختبار شاملة.'}, tags:['Laravel','PHP','JWT','Swagger'], category:'web', github:'https://github.com/solx4', demo:'#', gradient:'linear-gradient(135deg,#2A0A4A,#4A1A7A)', catLabel:{en:'Web Dev',ar:'تطوير ويب'} },
  { id:6, title:{en:'Portfolio Website',ar:'موقع المحفظة'}, desc:{en:'This very portfolio — dark/light mode, bilingual AR/EN support, canvas particle animations, scroll-triggered reveals, and full mobile responsiveness.',ar:'هذه المحفظة ذاتها — وضع داكن/فاتح، دعم عربي/إنجليزي، رسوم متحركة بالجسيمات، وكاملة التجاوب.'}, tags:['HTML','CSS','JavaScript'], category:'web', github:'https://github.com/solx4', demo:'#', gradient:'linear-gradient(135deg,#4A3A0A,#7A5C1A)', catLabel:{en:'Web Dev',ar:'تطوير ويب'} },
];

const skills = {
  frontend:[
    {name:'HTML5',abbr:'HTML',color:'#E44D26',tc:'#fff',pct:95,en:'Expert',ar:'خبير'},
    {name:'CSS3',abbr:'CSS',color:'#1572B6',tc:'#fff',pct:90,en:'Expert',ar:'خبير'},
    {name:'JavaScript',abbr:'JS',color:'#F7DF1E',tc:'#1a1a1a',pct:88,en:'Advanced',ar:'متقدم'},
    {name:'React',abbr:'Re',color:'#61DAFB',tc:'#1a1a1a',pct:82,en:'Advanced',ar:'متقدم'},
    {name:'Vue.js',abbr:'Vue',color:'#42B883',tc:'#fff',pct:78,en:'Proficient',ar:'متمكن'},
  ],
  backend:[
    {name:'PHP',abbr:'PHP',color:'#777BB4',tc:'#fff',pct:87,en:'Advanced',ar:'متقدم'},
    {name:'Laravel',abbr:'Lv',color:'#FF2D20',tc:'#fff',pct:90,en:'Expert',ar:'خبير'},
    {name:'Node.js',abbr:'No',color:'#339933',tc:'#fff',pct:75,en:'Proficient',ar:'متمكن'},
    {name:'MySQL',abbr:'SQL',color:'#4479A1',tc:'#fff',pct:80,en:'Advanced',ar:'متقدم'},
  ],
  tools:[
    {name:'Git / GitHub',abbr:'Git',color:'#F05032',tc:'#fff',pct:85,en:'Advanced',ar:'متقدم'},
    {name:'UI/UX Design',abbr:'UX',color:'#E8A020',tc:'#1a1a1a',pct:75,en:'Proficient',ar:'متمكن'},
    {name:'Automation',abbr:'Auto',color:'#2E5B9A',tc:'#fff',pct:72,en:'Proficient',ar:'متمكن'},
    {name:'Content Creation',abbr:'YT',color:'#FF0000',tc:'#fff',pct:82,en:'Advanced',ar:'متقدم'},
  ],
};

const ytVideos = [
  {en:'Complete Laravel Course',ar:'دورة Laravel الكاملة',sub:{en:'Web Dev · Tutorial Series',ar:'تطوير الويب · سلسلة دروس'},bg:'linear-gradient(135deg,#7A0000,#CC0000)'},
  {en:'JavaScript From Scratch',ar:'JavaScript من الصفر',sub:{en:'Frontend · Beginner Course',ar:'الواجهة الأمامية · للمبتدئين'},bg:'linear-gradient(135deg,#0D3320,#1A5C3C)'},
  {en:'Practical React Project',ar:'مشروع React عملي',sub:{en:'React.js · Project Tutorial',ar:'React.js · مشروع تعليمي'},bg:'linear-gradient(135deg,#142235,#2E5B9A)'},
];

/* ============ STATE ============ */
let state = { theme:'dark', lang:'en', activeSection:'home', activeTab:'frontend', filter:'all', heroIdx:0, menuOpen:false, skillsAnimated:false };
let heroTm = null; fadeTm = null;
let particles = [], animId = null, canvas, ctx;

/* ============ THEME ============ */
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.classList.toggle('light', state.theme === 'light');
  document.getElementById('themeBtn').textContent = state.theme === 'dark' ? '☀' : '☾';
  document.querySelectorAll('.mobile-footer .btn-theme').forEach(b => b.textContent = state.theme === 'dark' ? '☀' : '☾');
}

/* ============ LANGUAGE ============ */
function toggleLang() {
  state.lang = state.lang === 'en' ? 'ar' : 'en';
  applyLang();
}

function applyLang() {
  const lang = state.lang;
  const t = T[lang];
  document.documentElement.lang = lang;
  document.body.classList.toggle('ar', lang === 'ar');
  const langBtnLabel = lang === 'en' ? 'AR' : 'EN';
  document.querySelectorAll('.btn-lang').forEach(b => b.textContent = langBtnLabel);

  // All [data-en] elements
  document.querySelectorAll('[data-en]').forEach(el => {
    el.textContent = el.getAttribute('data-' + lang) || el.getAttribute('data-en');
  });
  // Placeholders
  document.querySelectorAll('[data-placeholder-en]').forEach(el => {
    el.placeholder = el.getAttribute('data-placeholder-' + lang) || el.getAttribute('data-placeholder-en');
  });
  // Hero title
  document.getElementById('heroSub').textContent = heroTitles[lang][state.heroIdx];
  // Re-render dynamic sections
  renderInterests();
  renderSkills();
  renderProjects();
  renderYoutube();
  // Update document title
  document.title = lang === 'ar' ? 'سالم صالح | بورتفوليو' : 'Salem Saleh | Portfolio';
}

/* ============ PARTICLES ============ */
function initParticles() {
  canvas = document.getElementById('particles');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const n = Math.min(80, Math.floor((canvas.width * canvas.height) / 14000));
    particles = Array.from({length: n}, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.8 + 0.4, dx: (Math.random()-.5)*.35, dy: (Math.random()-.5)*.35,
      o: Math.random()*.45+.08,
    }));
  }
  resize();
  window.addEventListener('resize', resize);
  function draw() {
    if (!canvas || !ctx) return;
    const {width:W, height:H} = canvas;
    ctx.clearRect(0, 0, W, H);
    const light = state.theme === 'light';
    particles.forEach(p => {
      p.x = (p.x + p.dx + W) % W; p.y = (p.y + p.dy + H) % H;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = light ? `rgba(30,58,95,${p.o*.4})` : `rgba(232,160,32,${p.o})`;
      ctx.fill();
    });
    for (let i=0; i<particles.length; i++) {
      for (let j=i+1; j<particles.length; j++) {
        const a=particles[i], b=particles[j], d=Math.hypot(a.x-b.x,a.y-b.y);
        if (d < 110) {
          const al = (1-d/110)*.12;
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
          ctx.strokeStyle = light ? `rgba(30,58,95,${al*.5})` : `rgba(232,160,32,${al})`;
          ctx.lineWidth = .6; ctx.stroke();
        }
      }
    }
    animId = requestAnimationFrame(draw);
  }
  draw();
}

/* ============ SCROLL & NAV ============ */
function handleScroll() {
  const y = window.scrollY;
  const navbar = document.getElementById('navbar');
  navbar.classList.toggle('scrolled', y > 60);
  document.querySelector('.scroll-top').classList.toggle('visible', y > 400);
  // Update active section
  const sections = document.querySelectorAll('section[id]');
  let current = 'home';
  sections.forEach(s => { if (window.scrollY >= s.offsetTop - 120) current = s.id; });
  if (current !== state.activeSection) {
    state.activeSection = current;
    document.querySelectorAll('.nav-link, .mobile-link').forEach(a => {
      a.classList.toggle('active', a.dataset.section === current);
    });
  }
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) window.scrollTo({top: el.getBoundingClientRect().top + window.scrollY - 70, behavior:'smooth'});
  closeMenu();
}

// Nav links click
document.querySelectorAll('.nav-link, .mobile-link').forEach(a => {
  a.addEventListener('click', e => { e.preventDefault(); scrollToSection(a.dataset.section); });
});

/* ============ MOBILE MENU ============ */
function toggleMenu() {
  state.menuOpen = !state.menuOpen;
  document.getElementById('mobilePanel').classList.toggle('open', state.menuOpen);
  document.getElementById('mobileOverlay').classList.toggle('open', state.menuOpen);
  document.getElementById('menuBtn').textContent = state.menuOpen ? '✕' : '☰';
}
function closeMenu() {
  state.menuOpen = false;
  document.getElementById('mobilePanel').classList.remove('open');
  document.getElementById('mobileOverlay').classList.remove('open');
  document.getElementById('menuBtn').textContent = '☰';
}

/* ============ HERO TITLE ROTATION ============ */
function scheduleNextTitle() {
  clearTimeout(heroTm);
  heroTm = setTimeout(() => {
    const el = document.getElementById('heroSub');
    el.style.opacity = '0';
    clearTimeout(fadeTm);
    fadeTm = setTimeout(() => {
      state.heroIdx = (state.heroIdx + 1) % 3;
      el.textContent = heroTitles[state.lang][state.heroIdx];
      el.style.opacity = '1';
      scheduleNextTitle();
    }, 380);
  }, 3200);
}

/* ============ INTERSECTION OBSERVERS ============ */
function initObservers() {
  // Scroll animations
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, {threshold: .12});
  document.querySelectorAll('[data-ao]').forEach(el => obs.observe(el));

  // Skills animation trigger
  const skillObs = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { state.skillsAnimated = true; animateBars(); skillObs.disconnect(); }
  }, {threshold: .2});
  const skillSec = document.getElementById('skills');
  if (skillSec) skillObs.observe(skillSec);
}

function animateBars() {
  document.querySelectorAll('.skill-fill[data-pct]').forEach((bar, i) => {
    setTimeout(() => { bar.style.width = bar.dataset.pct + '%'; }, i * 120);
  });
}

/* ============ RENDER: INTERESTS ============ */
function renderInterests() {
  const lang = state.lang;
  const container = document.getElementById('interests');
  if (!container) return;
  container.innerHTML = T[lang].interests.map(i => `<span class="interest-tag">${i}</span>`).join('');
}

/* ============ RENDER: SKILLS ============ */
function setSkillTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll('.skill-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  renderSkills();
}

function renderSkills() {
  const lang = state.lang;
  const list = document.getElementById('skillsList');
  if (!list) return;
  const data = skills[state.activeTab];
  list.innerHTML = data.map((s, i) => `
    <div class="skill-item">
      <div class="skill-header">
        <div class="skill-left">
          <div class="skill-abbr" style="background:${s.color};color:${s.tc}">${s.abbr}</div>
          <span class="skill-name">${s.name}</span>
        </div>
        <div class="skill-right">
          <span class="skill-level">${s[lang]}</span>
          <span class="skill-pct">${s.pct}%</span>
        </div>
      </div>
      <div class="skill-bar">
        <div class="skill-fill" data-pct="${s.pct}" style="background:linear-gradient(90deg,${s.color},var(--gold-light));width:${state.skillsAnimated ? s.pct+'%' : '0'}"></div>
      </div>
    </div>
  `).join('');
  // Update tab labels
  document.querySelectorAll('.skill-tab').forEach(btn => {
    const tabKey = btn.dataset.tab;
    btn.textContent = T[lang].skills[tabKey];
  });
}

/* ============ RENDER: PROJECTS ============ */
function setFilter(filter) {
  state.filter = filter;
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === filter));
  renderProjects();
}

function renderProjects() {
  const lang = state.lang;
  const grid = document.getElementById('projectsGrid');
  if (!grid) return;
  const filtered = state.filter === 'all' ? projects : projects.filter(p => p.category === state.filter);
  grid.innerHTML = filtered.map(p => `
    <div class="project-card" onclick="openModal(${p.id})">
      <div class="project-thumb" style="background:${p.gradient}">
        <div class="project-tags">${p.tags.map(t => `<span class="project-tag">${t}</span>`).join('')}</div>
      </div>
      <div class="project-body">
        <h3 class="project-title">${p.title[lang]}</h3>
        <p class="project-desc">${p.desc[lang]}</p>
        <div class="project-footer">
          <span class="project-cat">${p.catLabel[lang]}</span>
          <span class="project-more">Details →</span>
        </div>
      </div>
    </div>
  `).join('');
  // Update filter button labels
  const t = T[lang].projects;
  const labels = {all:t.filterAll,web:t.filterWeb,youtube:t.filterYoutube,automation:t.filterAuto};
  document.querySelectorAll('.filter-btn').forEach(btn => { btn.textContent = labels[btn.dataset.filter] || btn.dataset.filter; });
}

/* ============ PROJECT MODAL ============ */
function openModal(id) {
  const p = projects.find(x => x.id === id);
  if (!p) return;
  const lang = state.lang;
  const header = document.getElementById('modalHeader');
  header.style.background = p.gradient;
  document.getElementById('modalTags').innerHTML = p.tags.map(t => `<span class="modal-tag">${t}</span>`).join('');
  document.getElementById('modalTitle').textContent = p.title[lang];
  document.getElementById('modalDesc').textContent = p.desc[lang];
  document.getElementById('modalDemo').href = p.demo;
  document.getElementById('modalCode').href = p.github;
  const t = T[lang].projects;
  document.querySelector('#modalDemo span').textContent = t.liveDemo;
  document.querySelector('#modalCode span').textContent = t.viewCode;
  const overlay = document.getElementById('modalOverlay');
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  document.getElementById('modalOverlay').style.display = 'none';
  document.body.style.overflow = '';
}

/* ============ RENDER: YOUTUBE ============ */
function renderYoutube() {
  const lang = state.lang;
  const container = document.getElementById('ytVideos');
  if (!container) return;
  container.innerHTML = ytVideos.map(v => `
    <a href="https://www.youtube.com/@SalemSaleh1" target="_blank" rel="noopener" class="yt-video">
      <div class="yt-thumb" style="background:${v.bg}">
        <div class="yt-thumb-overlay"></div>
        <div class="yt-play">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="#CC0000"><polygon points="3,1 11,6 3,11"/></svg>
        </div>
      </div>
      <div class="yt-info">
        <div class="yt-title">${v[lang]}</div>
        <div class="yt-sub">${v.sub[lang]}</div>
      </div>
      <div class="yt-icon-btn">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="#FF0000"><polygon points="5,3 19,12 5,21"/></svg>
      </div>
    </a>
  `).join('');
}

/* ============ CONTACT FORM ============ */
function submitForm() {
  const name = document.getElementById('formName').value.trim();
  const email = document.getElementById('formEmail').value.trim();
  const message = document.getElementById('formMessage').value.trim();
  let valid = true;
  ['formName','formEmail','formMessage'].forEach(id => document.getElementById(id).classList.remove('error'));
  if (!name) { document.getElementById('formName').classList.add('error'); valid = false; }
  if (!email || !/\S+@\S+\.\S+/.test(email)) { document.getElementById('formEmail').classList.add('error'); valid = false; }
  if (!message) { document.getElementById('formMessage').classList.add('error'); valid = false; }
  if (!valid) return;
  const btn = document.getElementById('sendBtn');
  const spinner = document.getElementById('sendSpinner');
  const btnText = document.getElementById('sendBtnText');
  btn.disabled = true;
  spinner.style.display = 'block';
  btnText.textContent = T[state.lang].contact.sending;
  setTimeout(() => {
    document.getElementById('contactForm').style.display = 'none';
    const success = document.getElementById('formSuccess');
    success.style.display = 'flex';
    success.querySelector('p').textContent = T[state.lang].contact.success;
    setTimeout(() => {
      success.style.display = 'none';
      document.getElementById('contactForm').style.display = 'flex';
      btn.disabled = false; spinner.style.display = 'none';
      btnText.textContent = T[state.lang].contact.send;
      document.getElementById('formName').value = '';
      document.getElementById('formEmail').value = '';
      document.getElementById('formMessage').value = '';
    }, 5000);
  }, 1600);
}

/* ============ INIT ============ */
document.addEventListener('DOMContentLoaded', () => {
  // Initial render
  renderInterests();
  renderSkills();
  renderProjects();
  renderYoutube();
  initParticles();
  setTimeout(initObservers, 150);
  window.addEventListener('scroll', handleScroll, {passive:true});
  scheduleNextTitle();

  // Keyboard: close modal on Escape
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
});
