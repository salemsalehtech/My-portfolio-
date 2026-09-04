require("dotenv").config();
const bcrypt = require("bcryptjs");
const { connectMongo, Project, Skill, YoutubeVideo, AdminUser } = require("../src/lib/mongo");

const projects = [
  { titleEn: "E-Commerce Platform", titleAr: "منصة التجارة الإلكترونية", descEn: "A full-stack e-commerce solution with product management, shopping cart, order tracking, and Stripe payment integration built with Laravel and Vue.js.", descAr: "منصة تجارة إلكترونية متكاملة مع إدارة المنتجات وعربة التسوق وتتبع الطلبات وتكامل Stripe، مبنية بـ Laravel و Vue.js.", tags: ["Laravel", "Vue.js", "MySQL", "Stripe"], category: "web", githubUrl: "https://github.com/solx4", demoUrl: "#", gradient: "linear-gradient(135deg,#1E3A5F,#2E5B9A)", catLabelEn: "Web Dev", catLabelAr: "تطوير ويب", order: 1 },
  { titleEn: "Admin Dashboard", titleAr: "لوحة التحكم", descEn: "A responsive admin panel with real-time charts, user management, role-based access control, and analytics — built with React and Node.js.", descAr: "لوحة تحكم متجاوبة مع مخططات فورية وإدارة مستخدمين وتحكم بالوصول وتحليلات، مبنية بـ React و Node.js.", tags: ["React", "Node.js", "MongoDB", "Chart.js"], category: "web", githubUrl: "https://github.com/solx4", demoUrl: "#", gradient: "linear-gradient(135deg,#142235,#2E5B9A)", catLabelEn: "Web Dev", catLabelAr: "تطوير ويب", order: 2 },
  { titleEn: "Programming Tutorials Series", titleAr: "سلسلة دروس البرمجة", descEn: "A comprehensive YouTube tutorial series in Arabic covering full-stack web development: HTML, CSS, JavaScript, PHP, Laravel, React, and Vue.js — all free.", descAr: "سلسلة يوتيوب شاملة باللغة العربية تغطي HTML و CSS و JavaScript و PHP و Laravel و React و Vue.js — كلها مجانية.", tags: ["JavaScript", "PHP", "Laravel", "YouTube"], category: "youtube", githubUrl: "https://github.com/solx4", demoUrl: "https://www.youtube.com/@SalemSaleh1", gradient: "linear-gradient(135deg,#7A0000,#CC0000)", catLabelEn: "YouTube", catLabelAr: "يوتيوب", order: 3 },
  { titleEn: "Task Automation Tool", titleAr: "أداة أتمتة المهام", descEn: "A Node.js tool for automating repetitive web tasks — data scraping, form submission, and scheduled workflows powered by Puppeteer.", descAr: "أداة Node.js لأتمتة مهام الويب المتكررة: جمع البيانات وإرسال النماذج وسير العمل المجدول باستخدام Puppeteer.", tags: ["JavaScript", "Node.js", "Puppeteer"], category: "automation", githubUrl: "https://github.com/solx4", demoUrl: "#", gradient: "linear-gradient(135deg,#0D3320,#1A5C3C)", catLabelEn: "Automation", catLabelAr: "أتمتة", order: 4 },
  { titleEn: "REST API Service", titleAr: "خدمة REST API", descEn: "A production-ready RESTful API with Laravel — JWT auth, rate limiting, API versioning, Swagger docs, and a comprehensive test suite.", descAr: "واجهة RESTful جاهزة للإنتاج بـ Laravel مع JWT وتحديد المعدل وتوثيق Swagger وأدوات اختبار شاملة.", tags: ["Laravel", "PHP", "JWT", "Swagger"], category: "web", githubUrl: "https://github.com/solx4", demoUrl: "#", gradient: "linear-gradient(135deg,#2A0A4A,#4A1A7A)", catLabelEn: "Web Dev", catLabelAr: "تطوير ويب", order: 5 },
  { titleEn: "Portfolio Website", titleAr: "موقع المحفظة", descEn: "This very portfolio — dark/light mode, bilingual AR/EN support, canvas particle animations, scroll-triggered reveals, and full mobile responsiveness.", descAr: "هذه المحفظة ذاتها — وضع داكن/فاتح، دعم عربي/إنجليزي، رسوم متحركة بالجسيمات، وكاملة التجاوب.", tags: ["React", "Node.js", "PostgreSQL"], category: "web", githubUrl: "https://github.com/solx4", demoUrl: "#", gradient: "linear-gradient(135deg,#4A3A0A,#7A5C1A)", catLabelEn: "Web Dev", catLabelAr: "تطوير ويب", order: 6 },
];

const skills = [
  // frontend
  { name: "HTML5", abbr: "HTML", color: "#E44D26", textColor: "#fff", percentage: 95, levelEn: "Expert", levelAr: "خبير", group: "frontend", order: 1 },
  { name: "CSS3", abbr: "CSS", color: "#1572B6", textColor: "#fff", percentage: 90, levelEn: "Expert", levelAr: "خبير", group: "frontend", order: 2 },
  { name: "JavaScript", abbr: "JS", color: "#F7DF1E", textColor: "#1a1a1a", percentage: 88, levelEn: "Advanced", levelAr: "متقدم", group: "frontend", order: 3 },
  { name: "React", abbr: "Re", color: "#61DAFB", textColor: "#1a1a1a", percentage: 82, levelEn: "Advanced", levelAr: "متقدم", group: "frontend", order: 4 },
  { name: "Vue.js", abbr: "Vue", color: "#42B883", textColor: "#fff", percentage: 78, levelEn: "Proficient", levelAr: "متمكن", group: "frontend", order: 5 },
  // backend
  { name: "PHP", abbr: "PHP", color: "#777BB4", textColor: "#fff", percentage: 87, levelEn: "Advanced", levelAr: "متقدم", group: "backend", order: 1 },
  { name: "Laravel", abbr: "Lv", color: "#FF2D20", textColor: "#fff", percentage: 90, levelEn: "Expert", levelAr: "خبير", group: "backend", order: 2 },
  { name: "Node.js", abbr: "No", color: "#339933", textColor: "#fff", percentage: 75, levelEn: "Proficient", levelAr: "متمكن", group: "backend", order: 3 },
  { name: "MySQL", abbr: "SQL", color: "#4479A1", textColor: "#fff", percentage: 80, levelEn: "Advanced", levelAr: "متقدم", group: "backend", order: 4 },
  // tools
  { name: "Git / GitHub", abbr: "Git", color: "#F05032", textColor: "#fff", percentage: 85, levelEn: "Advanced", levelAr: "متقدم", group: "tools", order: 1 },
  { name: "UI/UX Design", abbr: "UX", color: "#E8A020", textColor: "#1a1a1a", percentage: 75, levelEn: "Proficient", levelAr: "متمكن", group: "tools", order: 2 },
  { name: "Automation", abbr: "Auto", color: "#2E5B9A", textColor: "#fff", percentage: 72, levelEn: "Proficient", levelAr: "متمكن", group: "tools", order: 3 },
  { name: "Content Creation", abbr: "YT", color: "#FF0000", textColor: "#fff", percentage: 82, levelEn: "Advanced", levelAr: "متقدم", group: "tools", order: 4 },
];

const ytVideos = [
  { titleEn: "Complete Laravel Course", titleAr: "دورة Laravel الكاملة", subEn: "Web Dev · Tutorial Series", subAr: "تطوير الويب · سلسلة دروس", gradient: "linear-gradient(135deg,#7A0000,#CC0000)", url: "https://www.youtube.com/@SalemSaleh1", order: 1 },
  { titleEn: "JavaScript From Scratch", titleAr: "JavaScript من الصفر", subEn: "Frontend · Beginner Course", subAr: "الواجهة الأمامية · للمبتدئين", gradient: "linear-gradient(135deg,#0D3320,#1A5C3C)", url: "https://www.youtube.com/@SalemSaleh1", order: 2 },
  { titleEn: "Practical React Project", titleAr: "مشروع React عملي", subEn: "React.js · Project Tutorial", subAr: "React.js · مشروع تعليمي", gradient: "linear-gradient(135deg,#142235,#2E5B9A)", url: "https://www.youtube.com/@SalemSaleh1", order: 3 },
];

async function main() {
  await connectMongo();
  await Project.deleteMany({});
  await Skill.deleteMany({});
  await YoutubeVideo.deleteMany({});
  await Project.insertMany(projects);
  await Skill.insertMany(skills);
  await YoutubeVideo.insertMany(ytVideos);

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await AdminUser.findOneAndUpdate(
      { email: adminEmail.toLowerCase() },
      { email: adminEmail.toLowerCase(), passwordHash },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    const mongoose = require("mongoose");
    await mongoose.disconnect();
  });
