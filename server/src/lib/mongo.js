// mongo.js — the database layer: connects to MongoDB and defines every "model" (the shape of
// one kind of document, like a table definition in SQL).
//
// Basics:
//   - A Schema lists the fields of a document and their rules (type, default, required,
//     maxlength, enum, custom validate…). Mongoose refuses to save data that breaks them.
//   - A Model (mongoose.model("Project", projectSchema)) is what the routes use to read and
//     write: Project.find(), Project.create(…), Project.findByIdAndUpdate(…), …
//   - Each model is stored in its own MongoDB "collection" (projects, skills, …), so adding a
//     new feature = a new schema + model, without touching the existing ones.
//   - Displayed texts exist twice, …En and …Ar, for the bilingual site.
//   - { timestamps: true } adds createdAt / updatedAt automatically.
const mongoose = require("mongoose");

// Opens the connection (called once by server.js before the server starts listening).
// MONGODB_URI comes from .env locally (local MongoDB) or from Render's settings (MongoDB Atlas).
const httpUrl = {
  type: String,
  default: "",
  maxlength: 300,
  validate: { validator: (v) => v === "" || /^https?:\/\/\S+$/i.test(v), message: "Links must start with http:// or https://" },
};
// (Every link that ends up in an href goes through httpUrl, so a "javascript:" link can never be saved.)

async function connectMongo() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/salem_portfolio";
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");
}

// A portfolio project (Projects section + its case-study page at /#/work/<slug>). `tags` feed the
// technology filter buttons, `gradient` is the CSS background of the card, `order` sorts the cards.
const projectSchema = new mongoose.Schema(
  {
    titleEn: { type: String, required: true },
    // The readable part of the page address. Made from the English title when left empty, and kept
    // unique by routes/admin.js (projectSlug). Projects saved before it existed open by their id.
    slug: { type: String, default: "", maxlength: 80, index: true, match: [/^([a-z0-9]+(-[a-z0-9]+)*)?$/, "The link name may only use a-z, 0-9 and single dashes"] },
    titleAr: { type: String, default: "" },
    descEn: { type: String, default: "" },
    descAr: { type: String, default: "" },
    tags: { type: [String], default: [] },
    category: { type: String, default: "web" },
    githubUrl: httpUrl,
    demoUrl: httpUrl,
    gradient: { type: String, default: "" },
    catLabelEn: { type: String, default: "" },
    catLabelAr: { type: String, default: "" },
    // Optional case study, shown in the project's details popup as
    // "The problem → The solution → The result". Empty parts are simply not shown.
    problemEn: { type: String, default: "", maxlength: 1500 },
    problemAr: { type: String, default: "", maxlength: 1500 },
    solutionEn: { type: String, default: "", maxlength: 1500 },
    solutionAr: { type: String, default: "", maxlength: 1500 },
    resultEn: { type: String, default: "", maxlength: 1500 },
    resultAr: { type: String, default: "", maxlength: 1500 },
    // The case-study page's facts line ("2025" · "Design and full-stack build") and an optional
    // longer story in Markdown (screens, decisions, what was learned), rendered like a blog post.
    year: { type: String, default: "", maxlength: 20 },
    roleEn: { type: String, default: "", maxlength: 120 },
    roleAr: { type: String, default: "", maxlength: 120 },
    storyEn: { type: String, default: "", maxlength: 20000 },
    storyAr: { type: String, default: "", maxlength: 20000 },
    // Up to 4 results with numbers ("40%" — "fewer missed appointments"), shown on the card and
    // in the case study. Only real, measured numbers belong here.
    metrics: {
      type: [{ _id: false, value: { type: String, default: "", maxlength: 20 }, labelEn: { type: String, default: "", maxlength: 60 }, labelAr: { type: String, default: "", maxlength: 60 } }],
      default: [],
    },
    // Optional screenshot / cover picture (like the certificate picture: stored in the document,
    // never sent in JSON — the site reads `hasImage` and loads GET /api/projects/:id/image).
    image: {
      data: { type: Buffer, select: false },
      contentType: { type: String, default: "" },
      size: { type: Number, default: 0 },
    },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// A tool in the Skills section: `group` = its area (languages / frontend / backend / mobile / desktop /
// databases / tools — client/src/lib/skillGroups.js), `tier` = how central it is
// (core / regular / working; empty → worked out from `levelEn`, then `percentage`), `icon` = a key of
// client/src/lib/toolIcons.js ("" → guessed from the name, "none" → show `abbr`), `noteEn`/`noteAr` =
// one short line on what it's used for. `color`, `textColor`, `percentage` and the levels are from
// the old progress-bar design and are no longer shown.
const skillSchema = new mongoose.Schema({
  name: { type: String, required: true },
  tier: { type: String, enum: ["", "core", "regular", "working"], default: "" },
  icon: { type: String, default: "", maxlength: 40 },
  noteEn: { type: String, default: "", maxlength: 120 },
  noteAr: { type: String, default: "", maxlength: 120 },
  abbr: { type: String, default: "" },
  color: { type: String, default: "#ffffff" },
  textColor: { type: String, default: "#1a1a1a" },
  percentage: { type: Number, default: 0 },
  levelEn: { type: String, default: "" },
  levelAr: { type: String, default: "" },
  group: { type: String, default: "frontend" },
  order: { type: Number, default: 0 },
});

// A video card in the YouTube section (`url` opens the video on YouTube).
const youtubeVideoSchema = new mongoose.Schema({
  titleEn: { type: String, required: true },
  titleAr: { type: String, default: "" },
  subEn: { type: String, default: "" },
  subAr: { type: String, default: "" },
  gradient: { type: String, default: "" },
  url: httpUrl,
  order: { type: Number, default: 0 },
});

// A message sent through the contact form; `read` is toggled in Admin → Messages.
// A message from the contact form ("Tell me about your project"). Besides the text, the visitor
// picks what they need (one of the site's services, or "something else"), when, a rough budget
// (optional), and how to be answered: by email, or on WhatsApp (then the phone is required and
// the email optional).
const CONTACT_TIMELINES = ["", "asap", "month", "quarter", "flexible"];
const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, default: "", trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    projectType: { type: String, default: "", trim: true, maxlength: 120 },
    timeline: { type: String, enum: CONTACT_TIMELINES, default: "" },
    budget: { type: String, default: "", trim: true, maxlength: 60 },
    channel: { type: String, enum: ["email", "whatsapp"], default: "email" },
    phone: { type: String, default: "", trim: true, maxlength: 20 },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// The dashboard login. Only a bcrypt HASH of the password is stored, never the password itself
// (created/updated by `npm run seed` from ADMIN_EMAIL / ADMIN_PASSWORD).
const adminUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
});

// The CV PDF is stored right inside MongoDB (a single document, replaced on every upload)
// instead of on disk: Render's free tier wipes the filesystem on every deploy, the database
// is the only storage that survives. A CV is a few hundred KB, far below Mongo's 16 MB limit.
const cvFileSchema = new mongoose.Schema(
  {
    filename: { type: String, default: "cv.pdf" },
    contentType: { type: String, default: "application/pdf" },
    size: { type: Number, default: 0 },
    data: { type: Buffer, required: true },
  },
  { timestamps: true }
);

// Content of the public "About" section — one single document, edited from /admin/about.
// Every visible text exists in English (…En) and Arabic (…Ar), like the other content models.
// Lists (info rows, stats, interests) are arrays so the owner can add, remove and reorder
// items. If no document exists the site falls back to the defaults in client/src/lib/aboutDefaults.js.
const aboutSchema = new mongoose.Schema(
  {
    badgeEn: { type: String, default: "", maxlength: 200 },
    badgeAr: { type: String, default: "", maxlength: 200 },
    titleEn: { type: String, default: "", maxlength: 200 },
    titleAr: { type: String, default: "", maxlength: 200 },
    p1En: { type: String, default: "", maxlength: 3000 },
    p1Ar: { type: String, default: "", maxlength: 3000 },
    p2En: { type: String, default: "", maxlength: 3000 },
    p2Ar: { type: String, default: "", maxlength: 3000 },
    infoItems: [
      {
        _id: false,
        icon: { type: String, enum: ["education", "location", "language", "other"], default: "other" },
        textEn: { type: String, default: "", maxlength: 300 },
        textAr: { type: String, default: "", maxlength: 300 },
      },
    ],
    stats: [
      {
        _id: false,
        number: { type: String, default: "", maxlength: 20 },
        labelEn: { type: String, default: "", maxlength: 100 },
        labelAr: { type: String, default: "", maxlength: 100 },
      },
    ],
    interestsTitleEn: { type: String, default: "", maxlength: 200 },
    interestsTitleAr: { type: String, default: "", maxlength: 200 },
    // Optional "about me" video: a YouTube link, embedded in the About section. Only YouTube
    // video links are accepted (same formats as client/src/lib/youtube.js).
    videoUrl: {
      type: String,
      default: "",
      maxlength: 300,
      validate: {
        validator: (v) => v === "" || /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)[\w-]{11}/i.test(v),
        message: "The video must be a YouTube link (youtube.com/watch?v=…, youtu.be/…, or /shorts/…)",
      },
    },
    interests: [
      {
        _id: false,
        en: { type: String, default: "", maxlength: 100 },
        ar: { type: String, default: "", maxlength: 100 },
      },
    ],
  },
  { timestamps: true }
);

// A client testimonial shown in the public "Testimonials" section. Managed from /admin/testimonials.
// Texts exist in English and Arabic like the other content models; `visible` lets the owner
// keep a testimonial saved but hidden (useful later, when clients can submit their own and
// each one waits for approval).
const testimonialSchema = new mongoose.Schema(
  {
    authorName: { type: String, required: true, maxlength: 120 },
    roleEn: { type: String, default: "", maxlength: 160 },
    roleAr: { type: String, default: "", maxlength: 160 },
    // A testimonial has ONE language when a client wrote it in the form for their language,
    // so neither text is required on its own — at least one of them is (see the hook below).
    textEn: { type: String, default: "", maxlength: 1500 },
    textAr: { type: String, default: "", maxlength: 1500 },
    rating: { type: Number, default: 5, min: 1, max: 5 },
    visible: { type: Boolean, default: true },
    // true while a testimonial sent by a client through the public feedback form waits for the
    // owner's review (it is also hidden). "Approve" in the dashboard sets visible:true, pending:false.
    pending: { type: Boolean, default: false },
    submittedLang: { type: String, enum: ["", "en", "ar"], default: "" },
    order: { type: Number, default: 0 },
    // The project this review is about (optional, chosen in Admin → Testimonials): the card on the
    // site links to that project's case study.
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
  },
  { timestamps: true }
);

// Site-wide profile content, edited from /admin/settings ("Profile & Links"): the Hero (greeting,
// name, rotating titles, tagline, USP line), the contact links (email, GitHub, LinkedIn, YouTube),
// the location, the footer role and the YouTube channel description. One single document; if
// none exists the site uses the defaults in client/src/lib/siteDefaults.js.
// Links are validated to start with http(s):// — never let a "javascript:" URL into an href.
const shortText = { type: String, default: "", maxlength: 160 };
const siteSettingsSchema = new mongoose.Schema(
  {
    greetingEn: shortText, greetingAr: shortText,
    nameEn: shortText, nameAr: shortText,
    titles: [{ _id: false, en: { type: String, default: "", maxlength: 80 }, ar: { type: String, default: "", maxlength: 80 } }],
    taglineEn: { type: String, default: "", maxlength: 300 }, taglineAr: { type: String, default: "", maxlength: 300 },
    uspEn: { type: String, default: "", maxlength: 300 }, uspAr: { type: String, default: "", maxlength: 300 },
    email: {
      type: String,
      default: "",
      maxlength: 200,
      validate: { validator: (v) => v === "" || /^\S+@\S+\.\S+$/.test(v), message: "Please enter a valid email address" },
    },
    githubUrl: httpUrl,
    linkedinUrl: httpUrl,
    youtubeUrl: httpUrl,
    locationEn: shortText, locationAr: shortText,
    roleEn: shortText, roleAr: shortText,
    channelDescEn: { type: String, default: "", maxlength: 500 }, channelDescAr: { type: String, default: "", maxlength: 500 },
    // "Taking new projects" / "Fully booked" next to the photo, with an optional text of your own
    // and a link to book a call (Calendly, WhatsApp, a Form Builder form…).
    availableForWork: { type: Boolean, default: true },
    availabilityEn: shortText, availabilityAr: shortText,
    bookingUrl: httpUrl,
    // A WhatsApp number for the floating chat button and the "Let's talk" band (empty = no button).
    whatsapp: {
      type: String,
      default: "",
      maxlength: 20,
      validate: { validator: (v) => v === "" || /^\+?\d{8,15}$/.test(v), message: "Write the WhatsApp number with digits only, e.g. 01012345678 or +201012345678" },
    },
    // "How a project goes": up to 6 steps, shown in order (empty = the built-in 4 steps).
    process: {
      type: [{ _id: false, titleEn: shortText, titleAr: shortText, textEn: { type: String, default: "", maxlength: 300 }, textAr: { type: String, default: "", maxlength: 300 } }],
      default: [],
    },
    // The portrait in the hero (served by GET /api/settings/photo; JSON only says hasPhoto).
    photo: {
      data: { type: Buffer, select: false },
      contentType: { type: String, default: "" },
      size: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// A service card in the public "What I Offer" section, managed from /admin/services.
// `icon` picks one of the built-in icons (client/src/lib/serviceIcons.jsx); keep both lists in sync.
const SERVICE_ICONS = ["web", "mobile", "backend", "code", "design", "teaching", "automation", "database", "consulting"];
const serviceSchema = new mongoose.Schema(
  {
    titleEn: { type: String, default: "", maxlength: 120 },
    titleAr: { type: String, default: "", maxlength: 120 },
    descEn: { type: String, default: "", maxlength: 600 },
    descAr: { type: String, default: "", maxlength: 600 },
    icon: { type: String, enum: SERVICE_ICONS, default: "web" },
    visible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);
serviceSchema.pre("validate", function () {
  if (!this.titleEn && !this.titleAr) this.invalidate("titleEn", "A service title is required");
});

testimonialSchema.pre("validate", function () {
  if (!this.textEn && !this.textAr) this.invalidate("textEn", "The testimonial text is required");
});

// A certificate / achievement card (Certificates section), managed from /admin/certificates.
// The certificate picture is stored inside the document (like the CV — Render's disk is wiped on
// every deploy). `image.data` has `select: false`, so lists never load the image bytes; only the
// image route asks for them explicitly. In JSON the image is replaced by `hasImage` (see below).
const certificateSchema = new mongoose.Schema(
  {
    titleEn: { type: String, default: "", maxlength: 160 },
    titleAr: { type: String, default: "", maxlength: 160 },
    issuerEn: { type: String, default: "", maxlength: 120 },
    issuerAr: { type: String, default: "", maxlength: 120 },
    date: { type: String, default: "", maxlength: 40 }, // free text, e.g. "2025" or "Jun 2025"
    credentialUrl: httpUrl, // optional "verify" link — must be http(s)
    image: {
      data: { type: Buffer, select: false },
      contentType: { type: String, default: "" },
      size: { type: Number, default: 0 },
    },
    visible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);
// Visitor analytics — ONE document per day holding counters only (no IPs, no cookies, no
// per-visitor records). The public site sends small events (routes/analytics.js) and the server
// adds +1 to the matching counter with $inc. `date` is the day in Cairo time, "YYYY-MM-DD".
// Map keys are section ids, project ids and referrer hosts (dots stored as "．", see analytics.js).
const dailyStatSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true },
    visits: { type: Number, default: 0 },
    mobile: { type: Number, default: 0 },
    desktop: { type: Number, default: 0 },
    langEn: { type: Number, default: 0 },
    langAr: { type: Number, default: 0 },
    cvDownloads: { type: Number, default: 0 },
    whatsappClicks: { type: Number, default: 0 }, // the WhatsApp chat button / band
    sections: { type: Map, of: Number, default: {} },
    projects: { type: Map, of: Number, default: {} },
    referrers: { type: Map, of: Number, default: {} },
    posts: { type: Map, of: Number, default: {} }, // blog post slug -> times read
  },
  { timestamps: true }
);

// A blog article, managed from /admin/posts. The text is Markdown (bodyEn / bodyAr), turned into
// HTML in the browser and sanitized there (client/src/lib/markdown.js). `slug` is the readable
// part of the address: /#/blog/<slug>. A post stays a private draft until `published` is true;
// `publishedAt` is set the first time it is published. The cover picture works like the
// certificate picture (stored in the document, `select: false`, never in JSON lists).
const postSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: [true, "A link name (slug) is required"],
      unique: true,
      maxlength: 80,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "The link name may only use a-z, 0-9 and single dashes"],
    },
    titleEn: { type: String, default: "", maxlength: 200 },
    titleAr: { type: String, default: "", maxlength: 200 },
    excerptEn: { type: String, default: "", maxlength: 400 },
    excerptAr: { type: String, default: "", maxlength: 400 },
    bodyEn: { type: String, default: "", maxlength: 60000 },
    bodyAr: { type: String, default: "", maxlength: 60000 },
    tags: {
      type: [String],
      default: [],
      validate: { validator: (tags) => tags.length <= 8 && tags.every((t) => t.length <= 30), message: "Up to 8 tags, 30 characters each" },
    },
    published: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    cover: {
      data: { type: Buffer, select: false },
      contentType: { type: String, default: "" },
      size: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);
postSchema.pre("validate", function () {
  if (!this.titleEn && !this.titleAr) this.invalidate("titleEn", "A post title is required");
});

certificateSchema.pre("validate", function () {
  if (!this.titleEn && !this.titleAr) this.invalidate("titleEn", "A certificate title is required");
});

// A course or content series (Courses section) — e.g. a YouTube playlist, a Udemy course or a
// Facebook series — managed from /admin/courses. Each card links out to `url`. The cover picture
// works exactly like the certificate picture (`hasImage` in JSON, served by GET /api/courses/:id/image).
const courseSchema = new mongoose.Schema(
  {
    titleEn: { type: String, default: "", maxlength: 160 },
    titleAr: { type: String, default: "", maxlength: 160 },
    descEn: { type: String, default: "", maxlength: 500 },
    descAr: { type: String, default: "", maxlength: 500 },
    platform: { type: String, default: "", maxlength: 40 }, // free text, e.g. "YouTube" or "Udemy"
    detailsEn: { type: String, default: "", maxlength: 80 }, // short line, e.g. "12 lessons · Free"
    detailsAr: { type: String, default: "", maxlength: 80 },
    url: httpUrl,
    image: {
      data: { type: Buffer, select: false },
      contentType: { type: String, default: "" },
      size: { type: Number, default: 0 },
    },
    visible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);
courseSchema.pre("validate", function () {
  if (!this.titleEn && !this.titleAr) this.invalidate("titleEn", "A course title is required");
});

// ---- Products (landing pages at /#/p/<slug>, ROADMAP.md → Wave D step 2) ----
// A product the team built and sells as a monthly subscription. Its landing page is made of
// `blocks` the owner arranges in Admin → Products. Every block uses the same shape: a title, a
// Markdown body and a list of `items`; what an item's fields mean depends on the block type:
//   text      — title + Markdown body (problem, solution, tech…)
//   features  — items: title + short text
//   gallery   — items: image (ProductImage id) + caption (title)
//   video     — url (YouTube)
//   pricing   — items: plan name (title), one feature per line (text), priceEgp / priceUsd per
//               month, highlight = "most popular"
//   faq       — items: question (title) + answer (text)
//   reviews   — items: person (title), their role (subtitle), the review (text)
// "Subscribe" buttons open a Form Builder form (`formSlug`) until real payments arrive.
const PRODUCT_BLOCK_TYPES = ["text", "features", "gallery", "video", "pricing", "faq", "reviews"];
const productItemSchema = new mongoose.Schema(
  {
    titleEn: { type: String, default: "", maxlength: 160 },
    titleAr: { type: String, default: "", maxlength: 160 },
    subtitleEn: { type: String, default: "", maxlength: 120 },
    subtitleAr: { type: String, default: "", maxlength: 120 },
    textEn: { type: String, default: "", maxlength: 1500 },
    textAr: { type: String, default: "", maxlength: 1500 },
    priceEgp: { type: Number, default: 0, min: 0, max: 10000000 },
    priceUsd: { type: Number, default: 0, min: 0, max: 1000000 },
    highlight: { type: Boolean, default: false },
    image: { type: mongoose.Schema.Types.ObjectId, ref: "ProductImage", default: null },
  },
  { _id: false }
);
const productBlockSchema = new mongoose.Schema({
  type: { type: String, enum: PRODUCT_BLOCK_TYPES, required: true },
  titleEn: { type: String, default: "", maxlength: 160 },
  titleAr: { type: String, default: "", maxlength: 160 },
  bodyEn: { type: String, default: "", maxlength: 8000 }, // Markdown
  bodyAr: { type: String, default: "", maxlength: 8000 },
  url: httpUrl,
  items: {
    type: [productItemSchema],
    default: [],
    validate: { validator: (v) => v.length <= 24, message: "Up to 24 items per block" },
  },
});
const productSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: [true, "A link name is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(-[a-z0-9]+)*$/, "Link name: a-z, 0-9 and single dashes only"],
      maxlength: 60,
    },
    published: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    accent: { type: String, default: "#D4A017", match: [/^#[0-9a-fA-F]{6}$/, "The colour must look like #D4A017"] },
    nameEn: { type: String, default: "", trim: true, maxlength: 80 },
    nameAr: { type: String, default: "", trim: true, maxlength: 80 },
    taglineEn: { type: String, default: "", maxlength: 200 },
    taglineAr: { type: String, default: "", maxlength: 200 },
    summaryEn: { type: String, default: "", maxlength: 400 }, // the card on the home page
    summaryAr: { type: String, default: "", maxlength: 400 },
    demoUrl: httpUrl,
    formSlug: { type: String, default: "", trim: true, maxlength: 80 }, // the "Subscribe" form
    sourceProject: { type: mongoose.Schema.Types.ObjectId, ref: "TeamProject", default: null },
    image: {
      data: { type: Buffer, select: false },
      contentType: { type: String, default: "" },
      size: { type: Number, default: 0 },
    },
    blocks: {
      type: [productBlockSchema],
      default: [],
      validate: { validator: (v) => v.length <= 20, message: "Up to 20 blocks per page" },
    },
  },
  { timestamps: true }
);
productSchema.pre("validate", function () {
  if (!this.nameEn && !this.nameAr) this.invalidate("nameEn", "A product name is required");
});

// A picture used inside a product page (gallery block). Kept apart from the product so the
// product document stays small; served by GET /api/products/images/:id.
const productImageSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    data: { type: Buffer, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// A custom form built in /admin/forms (Form Builder). Anyone with the link /#/form/<slug> can
// fill it in while `open` is true; each submission is saved as a FormResponse (below) and shown
// in the dashboard as a sheet that can be downloaded as an Excel file.
// Every field has a stable `key` (made by the dashboard when the field is added) — answers are
// stored under that key, so renaming a field's label never loses its answers.
const FORM_FIELD_TYPES = ["text", "email", "phone", "number", "textarea", "select", "date"];
const formFieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, match: [/^[a-z0-9_-]{1,40}$/, "Invalid field key"] },
    type: { type: String, enum: FORM_FIELD_TYPES, default: "text" },
    labelEn: { type: String, default: "", maxlength: 200 },
    labelAr: { type: String, default: "", maxlength: 200 },
    required: { type: Boolean, default: false },
    // Choices for a "select" field. Each choice is one text shown in both languages.
    options: {
      type: [String],
      default: [],
      validate: { validator: (o) => o.length <= 30 && o.every((t) => t.length <= 100), message: "Up to 30 choices, 100 characters each" },
    },
  },
  { _id: false }
);
const formSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: [true, "A link name (slug) is required"],
      unique: true,
      maxlength: 80,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "The link name may only use a-z, 0-9 and single dashes"],
    },
    titleEn: { type: String, default: "", maxlength: 200 },
    titleAr: { type: String, default: "", maxlength: 200 },
    descEn: { type: String, default: "", maxlength: 1000 },
    descAr: { type: String, default: "", maxlength: 1000 },
    fields: {
      type: [formFieldSchema],
      default: [],
      validate: [
        { validator: (f) => f.length <= 30, message: "A form can have up to 30 fields" },
        { validator: (f) => new Set(f.map((x) => x.key)).size === f.length, message: "Two fields have the same key" },
      ],
    },
    open: { type: Boolean, default: true }, // false = the link shows "this form is closed"
  },
  { timestamps: true }
);
formSchema.pre("validate", function () {
  if (!this.titleEn && !this.titleAr) this.invalidate("titleEn", "A form title is required");
  this.fields.forEach((f, i) => {
    if (!f.labelEn && !f.labelAr) this.invalidate(`fields.${i}.labelEn`, `Field ${i + 1} needs a label`);
    if (f.type === "select" && f.options.length === 0) this.invalidate(`fields.${i}.options`, `Field ${i + 1} (a list) needs at least one choice`);
  });
});

// ---- Team workspace (Admin → Team, member portal /#/team) ----
// A team member account, created by the owner. Members log in with username + password at
// /#/team (routes/team.js) — a login completely separate from the admin's. A new account (or a
// reset password) must choose a new password on first login. `active: false` blocks the login
// without deleting anything. Members can also sign up themselves through an invite link
// (TeamInvite); such an account is `pending` — it can't log in until the owner approves it.
const teamMemberSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "A username is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9._-]{3,30}$/, "Username: 3–30 characters, a-z, 0-9, dot, dash or underscore"],
    },
    name: { type: String, required: [true, "A name is required"], trim: true, maxlength: 80 },
    specialty: { type: String, default: "", trim: true, maxlength: 80 }, // e.g. "Frontend", "UI design"
    passwordHash: { type: String, required: true, select: false },
    mustChangePassword: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
    pending: { type: Boolean, default: false }, // signed up with an invite, waiting for the owner's approval
    invite: { type: mongoose.Schema.Types.ObjectId, ref: "TeamInvite", default: null }, // which invite they used
    lastLoginAt: { type: Date, default: null },
    rulesAgreed: { type: Number, default: 0 }, // the TeamSettings.rulesVersion this member agreed to
    tourDone: { type: Boolean, default: false }, // saw the first-login tour
    // Set by the member: free, busy (don't give me more now) or away (on leave) until a date, so
    // the owner sees who has room before assigning. `until` "" = no end date.
    availability: {
      status: { type: String, enum: ["available", "busy", "away"], default: "available" },
      until: { type: String, default: "", match: [/^(\d{4}-\d{2}-\d{2})?$/, "The date must be YYYY-MM-DD"] },
      note: { type: String, default: "", trim: true, maxlength: 120 },
    },
  },
  { timestamps: true }
);

// An invite link the owner sends to future members (/#/team/join/<token>). Only a SHA-256 hash of
// the token is stored — the link itself is shown to the owner once, when it is created.
// It works until it expires, is revoked, or has been used `maxUses` times.
const teamInviteSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true, select: false },
    label: { type: String, default: "", trim: true, maxlength: 80 }, // a note for the owner, e.g. "For Mona"
    maxUses: { type: Number, default: 1, min: 1, max: 50 },
    uses: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// An internal project the team works on (not the portfolio's Project model). `docs` is a
// Markdown page — how to run it, decisions, notes — shown to every member of the project.
const teamProjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "A project name is required"], trim: true, maxlength: 120 },
    summary: { type: String, default: "", maxlength: 500 },
    docs: { type: String, default: "", maxlength: 60000 },
    links: {
      type: [{ _id: false, label: { type: String, maxlength: 60, default: "" }, url: httpUrl }],
      default: [],
      validate: { validator: (l) => l.length <= 12, message: "Up to 12 links" },
    },
    dueDate: { type: String, default: "", match: [/^(\d{4}-\d{2}-\d{2})?$/, "The due date must be YYYY-MM-DD"] },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "TeamMember" }],
    status: { type: String, enum: ["active", "completed", "archived"], default: "active" },
  },
  { timestamps: true }
);

// One task. Members move their own tasks todo → doing → review; only the owner moves a task
// from review to done (approve) or back to doing with a `reviewNote` (send back).
// `steps` is the task's to-do list — the owner and the assigned member can both edit it.
const { TASK_STATUSES } = require("./rules");
const teamTaskSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "TeamProject", required: true, index: true },
    title: { type: String, required: [true, "A task title is required"], trim: true, maxlength: 200 },
    description: { type: String, default: "", maxlength: 20000 }, // Markdown
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: "TeamMember", default: null, index: true },
    priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal" },
    dueDate: { type: String, default: "", match: [/^(\d{4}-\d{2}-\d{2})?$/, "The due date must be YYYY-MM-DD"] },
    status: { type: String, enum: TASK_STATUSES, default: "todo" },
    steps: {
      type: [{ text: { type: String, required: true, trim: true, maxlength: 300 }, done: { type: Boolean, default: false } }],
      default: [],
      validate: { validator: (s) => s.length <= 50, message: "Up to 50 steps per task" },
    },
    reviewNote: { type: String, default: "", maxlength: 2000 }, // the owner's comment when sending it back
    // "I need help": the assignee says what blocks them; non-empty = the task shows a flag and the
    // owner is notified. Cleared by the member or the owner when it is solved.
    helpNote: { type: String, default: "", trim: true, maxlength: 500 },
    // "I need more time": the assignee asks for a new due date with a reason; the owner approves
    // (the due date changes) or declines. null = no open request.
    extensionRequest: {
      type: new mongoose.Schema({
        date: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, "The date must be YYYY-MM-DD"] },
        reason: { type: String, required: [true, "Write why you need more time"], trim: true, maxlength: 500 },
        at: { type: Date, default: Date.now },
      }, { _id: false }),
      default: null,
    },
    submittedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    order: { type: Number, default: 0 },
    // Unassigned + claimable = in the open pool: any member of the project may take it (first one wins).
    claimable: { type: Boolean, default: false },
    // Acceptance criteria — "done means…" — written by the owner, checked off at review.
    criteria: {
      type: [{ text: { type: String, required: true, trim: true, maxlength: 300 }, done: { type: Boolean, default: false } }],
      default: [],
      validate: { validator: (c) => c.length <= 30, message: "Up to 30 criteria per task" },
    },
    understoodAt: { type: Date, default: null }, // the assignee pressed "I understood what's needed"
    estimate: { type: String, enum: ["", "S", "M", "L"], default: "" }, // the assignee's size guess
    returnedCount: { type: Number, default: 0 }, // times sent back — "approved first time" counts for points
    // The owner's private rating, given when approving (never sent to members — routes/team.js strips it).
    rating: {
      type: new mongoose.Schema({
        quality: { type: Number, min: 1, max: 5, required: true },
        creativity: { type: Number, min: 1, max: 5, required: true },
        conduct: { type: Number, min: 1, max: 5, required: true }, // manners / communication
        bonus: { type: Number, min: 0, max: 3, default: 0 }, // went beyond the task
        note: { type: String, default: "", trim: true, maxlength: 500 },
      }, { _id: false }),
      default: null,
    },
  },
  { timestamps: true }
);
teamTaskSchema.index({ project: 1, order: 1, createdAt: 1 }); // a project's board
teamTaskSchema.index({ assignee: 1, status: 1 }); // "my tasks", workload
teamTaskSchema.index({ completedAt: -1 }); // scores per month

// A reusable task (Admin → Team → Templates): "New page", "Bug fix"… with its brief, steps and
// criteria ready. With `repeat` set it also makes a task by itself every week / month in
// `project` for `assignee` (lib/teamJobs.js). `lastRun` stops a second copy on the same day.
const teamTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "A template name is required"], trim: true, maxlength: 80 },
    title: { type: String, required: [true, "A task title is required"], trim: true, maxlength: 200 },
    description: { type: String, default: "", maxlength: 20000 },
    priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal" },
    steps: { type: [{ _id: false, text: { type: String, trim: true, maxlength: 300 } }], default: [] },
    criteria: { type: [{ _id: false, text: { type: String, trim: true, maxlength: 300 } }], default: [] },
    repeat: {
      every: { type: String, enum: ["none", "weekly", "monthly"], default: "none" },
      weekday: { type: Number, min: 0, max: 6, default: 0 }, // weekly: 0 = Sunday
      monthDay: { type: Number, min: 1, max: 28, default: 1 }, // monthly (28 max so every month has it)
      dueInDays: { type: Number, min: 0, max: 60, default: 3 },
      project: { type: mongoose.Schema.Types.ObjectId, ref: "TeamProject", default: null },
      assignee: { type: mongoose.Schema.Types.ObjectId, ref: "TeamMember", default: null },
      lastRun: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

// One settings document for the team: the rules page (bilingual Markdown + a version that goes up
// when the owner publishes a change, so everyone agrees again), the shared monthly goal, and the
// last weekly summary sent.
const teamSettingsSchema = new mongoose.Schema(
  {
    rulesEn: { type: String, default: "", maxlength: 30000 },
    rulesAr: { type: String, default: "", maxlength: 30000 },
    rulesVersion: { type: Number, default: 0 }, // 0 = no rules published yet
    goalTarget: { type: Number, min: 0, max: 1000, default: 0 }, // tasks to finish together this month, 0 = off
    goalLabel: { type: String, default: "", trim: true, maxlength: 120 },
    weeklySentOn: { type: String, default: "" },
  },
  { timestamps: true }
);

// A thank-you from the owner to a member ("Great work on the login page") — shown on the
// member's home page; members don't rate each other (owner decision 2026-11-08).
const teamKudosSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: "TeamMember", required: true, index: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: "TeamTask", default: null },
    message: { type: String, required: [true, "Write a message"], trim: true, maxlength: 500 },
    star: { type: Boolean, default: false }, // "star of the week"
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// What happened in the workspace, newest first ("Mona submitted 'Login page' for review").
const teamActivitySchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "TeamProject", index: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: "TeamTask", default: null },
    member: { type: mongoose.Schema.Types.ObjectId, ref: "TeamMember", default: null }, // null = the owner
    action: { type: String, required: true, maxlength: 40 },
    detail: { type: String, default: "", maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// A comment on a task — the owner and the project's members talk in the task itself.
// `member` is the member who wrote it; `byOwner` marks the owner's comments (a deleted member's
// comments stay, with member null and byOwner false).
const teamCommentSchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: "TeamTask", required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "TeamProject", required: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: "TeamMember", default: null },
    byOwner: { type: Boolean, default: false }, // written by the owner (member stays null)
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "TeamComment", default: null }, // answering this comment
    body: { type: String, required: [true, "Write a comment first"], trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

// A team-wide announcement from the owner ("Office closed Thursday", "New rule for code review"):
// Markdown text + optional files / voice notes (TeamAttachment with `announcement`), seen by every
// active member. Made as a draft (`publishedAt` null) so files can be attached first; publishing
// notifies everyone once. `readBy` = members who pressed "Got it" — the owner sees who read it.
const teamAnnouncementSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "A title is required"], trim: true, maxlength: 160 },
    body: { type: String, default: "", maxlength: 20000 },
    pinned: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null, index: true },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "TeamMember" }],
  },
  { timestamps: true }
);

// A file attached to a task (PDF, picture or voice note, max 5 MB — lib/attachments.js): the owner's
// brief or the assignee's result — or to an announcement (`announcement` set, `task` null). Kept in
// its own collection so loading a board never drags the file bytes along; `data` is never sent as
// JSON, only through GET …/attachments/:id.
const teamAttachmentSchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: "TeamTask", default: null, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "TeamProject", default: null, index: true },
    announcement: { type: mongoose.Schema.Types.ObjectId, ref: "TeamAnnouncement", default: null, index: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: "TeamMember", default: null }, // null = the owner
    filename: { type: String, required: true, maxlength: 120 },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// A notification for the bell 🔔. `recipient` is a member, or null for the owner. `kind` says
// what happened (assigned, approved, returned, submitted, comment, blocker); the client words it.
// Old notifications delete themselves after 60 days (TTL index).
const teamNotificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "TeamMember", default: null, index: true },
    kind: { type: String, required: true, maxlength: 30 },
    actor: { type: String, default: "", maxlength: 80 }, // the name of who did it
    task: { type: mongoose.Schema.Types.ObjectId, ref: "TeamTask", default: null },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "TeamProject", default: null },
    detail: { type: String, default: "", maxlength: 300 },
    read: { type: Boolean, default: false },
    pushed: { type: Boolean, default: true }, // false = made in quiet hours, waits for the summary push (lib/teamPush.js)
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
teamNotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });
// The bell reads "latest 30 for me" and "how many unread for me" on every poll (each member, every minute).
teamNotificationSchema.index({ recipient: 1, createdAt: -1 });
teamNotificationSchema.index({ recipient: 1, read: 1 });
teamNotificationSchema.index({ pushed: 1 }, { partialFilterExpression: { pushed: false } });

// A member's daily standup: what I did yesterday, what I'll do today, what blocks me.
// One per member per day (`date` is the Cairo date, "YYYY-MM-DD").
const teamStandupSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: "TeamMember", required: true },
    date: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, "The date must be YYYY-MM-DD"] },
    yesterday: { type: String, default: "", trim: true, maxlength: 2000 },
    today: { type: String, default: "", trim: true, maxlength: 2000 },
    blockers: { type: String, default: "", trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);
teamStandupSchema.index({ member: 1, date: 1 }, { unique: true });
teamStandupSchema.index({ date: 1 });

// ---- Savings circles — جمعيات (Admin → Circles, member portal /#/gam3eya) ----
// The app only RECORDS money: members transfer to the owner by InstaPay / Vodafone Cash / cash as
// usual, upload a screenshot, and the owner (or a helper) confirms it. Members log in with their
// phone number at /#/gam3eya (routes/circles.js) — a login separate from the admin's and the team's.
const objectId = mongoose.Schema.Types.ObjectId;

// A member account. `notes` and the guarantor are the owner's private notes (never sent to the
// member). `waitlist` = "I want to join the next circle".
const circleMemberSchema = new mongoose.Schema(
  {
    phone: { type: String, required: [true, "A phone number is required"], unique: true, trim: true, match: [/^\d{8,15}$/, "Write the phone number with digits only"] },
    name: { type: String, required: [true, "A name is required"], trim: true, maxlength: 80 },
    passwordHash: { type: String, required: true, select: false },
    mustChangePassword: { type: Boolean, default: false },
    pending: { type: Boolean, default: false }, // signed up with an invite, waiting for approval
    active: { type: Boolean, default: true },
    invite: { type: objectId, ref: "CircleInvite", default: null },
    goal: { type: String, default: "", trim: true, maxlength: 120 }, // what they are saving for
    waitlist: {
      on: { type: Boolean, default: false },
      note: { type: String, default: "", maxlength: 300 },
      at: { type: Date, default: null },
    },
    notes: { type: String, default: "", maxlength: 2000 },
    guarantorName: { type: String, default: "", trim: true, maxlength: 80 },
    guarantorPhone: { type: String, default: "", trim: true, maxlength: 20 },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Invite links for self sign-up (same idea as TeamInvite: only a hash of the token is stored).
const circleInviteSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true, select: false },
    label: { type: String, default: "", trim: true, maxlength: 80 },
    maxUses: { type: Number, default: 1, min: 1, max: 50 },
    uses: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// A circle. Each slot is one month's payout ("دور"): its holders share it — one holder with a full
// share, or several holders whose parts add up to one (½ + ½, ⅓ + ⅓ + ⅓, ½ + ¼ + ¼ …). A member with
// two shares holds two slots.
// The number of months = the number of slots; everyone pays shareAmount × their shares every
// month, and the slot of month i receives shareAmount × the number of slots.
const circleHolderSchema = new mongoose.Schema(
  {
    member: { type: objectId, ref: "CircleMember", required: true },
    share: { type: Number, min: 0.01, max: 1, default: 1 }, // this holder's part of the month
    handedAt: { type: Date, default: null }, // the owner handed the money over
    receivedAt: { type: Date, default: null }, // the member confirmed receiving it
  },
  { _id: false }
);
const circleSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "A name is required"], trim: true, maxlength: 80 },
    shareAmount: { type: Number, required: [true, "The monthly amount is required"], min: [1, "The monthly amount must be at least 1"], max: 10000000 },
    startMonth: { type: String, required: [true, "The first month is required"], match: [/^\d{4}-(0[1-9]|1[0-2])$/, "The first month must look like 2026-11"] },
    payDay: { type: Number, default: 1, min: 1, max: 28 }, // members pay by this day of each month
    payoutDay: { type: Number, default: 5, min: 1, max: 28 }, // the month's holder receives on this day
    status: { type: String, enum: ["draft", "active", "finished"], default: "draft" },
    slots: { type: [{ holders: { type: [circleHolderSchema], default: [] } }], default: [] },
    helpers: [{ type: objectId, ref: "CircleMember" }], // may confirm payments of this circle
    remindedAt: { type: Map, of: String, default: {} }, // "memberId:month:kind" -> date, so a push goes once
  },
  // No version key: the whole slots list is replaced on every save, and Mongoose's array version
  // check then refused a save after another one ("No matching document found … modifiedPaths slots").
  { timestamps: true, versionKey: false }
);

// One payment a member made (or the owner recorded). Several payments can cover one month
// (paying in two parts). Only `confirmed` payments count.
const circlePaymentSchema = new mongoose.Schema(
  {
    circle: { type: objectId, ref: "Circle", required: true, index: true },
    member: { type: objectId, ref: "CircleMember", required: true, index: true },
    month: { type: Number, required: true, min: 0, max: 600 },
    amount: { type: Number, required: [true, "Write the amount"], min: [1, "The amount must be at least 1"], max: 10000000 },
    method: { type: String, enum: ["instapay", "vodafone", "cash", "other"], default: "instapay" },
    note: { type: String, default: "", trim: true, maxlength: 500 }, // the member's comment
    proof: {
      data: { type: Buffer, select: false },
      contentType: { type: String, default: "" },
      size: { type: Number, default: 0 },
    },
    status: { type: String, enum: ["pending", "confirmed", "rejected"], default: "pending" },
    rejectReason: { type: String, default: "", maxlength: 300 },
    reviewedBy: { type: String, default: "" }, // "owner" or the helper's name
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// "I need my turn early" — the owner decides (and reorders the slots himself).
const circleRequestSchema = new mongoose.Schema(
  {
    circle: { type: objectId, ref: "Circle", required: true, index: true },
    member: { type: objectId, ref: "CircleMember", required: true },
    reason: { type: String, required: [true, "Write the reason"], trim: true, maxlength: 500 },
    status: { type: String, enum: ["open", "accepted", "declined"], default: "open" },
    reply: { type: String, default: "", maxlength: 500 },
  },
  { timestamps: true }
);

// Everything that happened in a circle, for settling any disagreement later.
const circleLogSchema = new mongoose.Schema(
  {
    circle: { type: objectId, ref: "Circle", index: true, default: null },
    actor: { type: String, default: "owner", maxlength: 80 }, // "owner" or a member's name
    action: { type: String, required: true, maxlength: 40 },
    detail: { type: String, default: "", maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Notifications for the bell 🔔 (recipient null = the owner); deleted after 60 days.
const circleNotificationSchema = new mongoose.Schema(
  {
    recipient: { type: objectId, ref: "CircleMember", default: null, index: true },
    kind: { type: String, required: true, maxlength: 30 },
    actor: { type: String, default: "", maxlength: 80 },
    circle: { type: objectId, ref: "Circle", default: null },
    detail: { type: String, default: "", maxlength: 300 },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
circleNotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

// Phone push subscriptions (Web Push) — one per device that turned notifications on.
const pushSubscriptionSchema = new mongoose.Schema(
  {
    member: { type: objectId, ref: "CircleMember", default: null, index: true }, // null = the owner
    endpoint: { type: String, required: true, unique: true, maxlength: 1000 },
    keys: { p256dh: { type: String, required: true }, auth: { type: String, required: true } },
  },
  { timestamps: true }
);

// Single-document settings: where members send money, and the Web Push keys (made once, on
// first use, so nothing has to be added to Render's environment).
const circleSettingsSchema = new mongoose.Schema(
  {
    instapay: { type: String, default: "", trim: true, maxlength: 120 }, // e.g. name@instapay
    instapayLink: { ...httpUrl, trim: true }, // ipn.eg/… link (shown as a QR code)
    vodafone: { type: String, default: "", trim: true, maxlength: 20 },
    payNote: { type: String, default: "", maxlength: 500 },
    vapidPublic: { type: String, default: "" },
    vapidPrivate: { type: String, default: "", select: false },
  },
  { timestamps: true }
);

// One submission of a Form: `answers` maps each field key to the text the person typed.
const formResponseSchema = new mongoose.Schema(
  {
    form: { type: mongoose.Schema.Types.ObjectId, ref: "Form", required: true, index: true },
    answers: { type: Map, of: String, default: {} },
    lang: { type: String, enum: ["en", "ar"], default: "en" }, // the language the form was filled in
  },
  { timestamps: true }
);

// Turn each schema into a model. `mongoose.models.X ||` reuses an existing model instead of
// redefining it if this file is loaded twice (which would throw an error).
const models = {
  Project: mongoose.models.Project || mongoose.model("Project", projectSchema),
  Skill: mongoose.models.Skill || mongoose.model("Skill", skillSchema),
  YoutubeVideo: mongoose.models.YoutubeVideo || mongoose.model("YoutubeVideo", youtubeVideoSchema),
  ContactMessage: mongoose.models.ContactMessage || mongoose.model("ContactMessage", contactMessageSchema),
  AdminUser: mongoose.models.AdminUser || mongoose.model("AdminUser", adminUserSchema),
  CvFile: mongoose.models.CvFile || mongoose.model("CvFile", cvFileSchema),
  About: mongoose.models.About || mongoose.model("About", aboutSchema),
  Testimonial: mongoose.models.Testimonial || mongoose.model("Testimonial", testimonialSchema),
  Service: mongoose.models.Service || mongoose.model("Service", serviceSchema),
  SiteSettings: mongoose.models.SiteSettings || mongoose.model("SiteSettings", siteSettingsSchema),
  Certificate: mongoose.models.Certificate || mongoose.model("Certificate", certificateSchema),
  DailyStat: mongoose.models.DailyStat || mongoose.model("DailyStat", dailyStatSchema),
  Post: mongoose.models.Post || mongoose.model("Post", postSchema),
  Course: mongoose.models.Course || mongoose.model("Course", courseSchema),
  Form: mongoose.models.Form || mongoose.model("Form", formSchema),
  Product: mongoose.models.Product || mongoose.model("Product", productSchema),
  ProductImage: mongoose.models.ProductImage || mongoose.model("ProductImage", productImageSchema),
  FormResponse: mongoose.models.FormResponse || mongoose.model("FormResponse", formResponseSchema),
  TeamMember: mongoose.models.TeamMember || mongoose.model("TeamMember", teamMemberSchema),
  TeamProject: mongoose.models.TeamProject || mongoose.model("TeamProject", teamProjectSchema),
  TeamTask: mongoose.models.TeamTask || mongoose.model("TeamTask", teamTaskSchema),
  TeamActivity: mongoose.models.TeamActivity || mongoose.model("TeamActivity", teamActivitySchema),
  CircleMember: mongoose.models.CircleMember || mongoose.model("CircleMember", circleMemberSchema),
  CircleInvite: mongoose.models.CircleInvite || mongoose.model("CircleInvite", circleInviteSchema),
  Circle: mongoose.models.Circle || mongoose.model("Circle", circleSchema),
  CirclePayment: mongoose.models.CirclePayment || mongoose.model("CirclePayment", circlePaymentSchema),
  CircleRequest: mongoose.models.CircleRequest || mongoose.model("CircleRequest", circleRequestSchema),
  CircleLog: mongoose.models.CircleLog || mongoose.model("CircleLog", circleLogSchema),
  CircleNotification: mongoose.models.CircleNotification || mongoose.model("CircleNotification", circleNotificationSchema),
  PushSubscription: mongoose.models.PushSubscription || mongoose.model("PushSubscription", pushSubscriptionSchema),
  CircleSettings: mongoose.models.CircleSettings || mongoose.model("CircleSettings", circleSettingsSchema),
  TeamInvite: mongoose.models.TeamInvite || mongoose.model("TeamInvite", teamInviteSchema),
  TeamComment: mongoose.models.TeamComment || mongoose.model("TeamComment", teamCommentSchema),
  TeamAttachment: mongoose.models.TeamAttachment || mongoose.model("TeamAttachment", teamAttachmentSchema),
  TeamNotification: mongoose.models.TeamNotification || mongoose.model("TeamNotification", teamNotificationSchema),
  TeamStandup: mongoose.models.TeamStandup || mongoose.model("TeamStandup", teamStandupSchema),
  TeamTemplate: mongoose.models.TeamTemplate || mongoose.model("TeamTemplate", teamTemplateSchema),
  TeamSettings: mongoose.models.TeamSettings || mongoose.model("TeamSettings", teamSettingsSchema),
  TeamKudos: mongoose.models.TeamKudos || mongoose.model("TeamKudos", teamKudosSchema),
  TeamAnnouncement: mongoose.models.TeamAnnouncement || mongoose.model("TeamAnnouncement", teamAnnouncementSchema),
};

// When a document is sent as JSON (res.json), rename MongoDB's `_id` to a plain `id` string and
// drop the internal `__v` version field — so the client always works with `item.id`.
// Some models also hide fields:
//   - `picture: { field: flag }` never sends a stored picture, only `flag` = "is there one?"
//     (the picture itself is fetched from its own route, e.g. GET /api/<resource>/:id/image),
//   - `secret` fields are never sent, even when a route loaded them to check a password.
function jsonOf(model, { picture = {}, secret = [] } = {}) {
  model.schema.set("toJSON", {
    transform: (_document, ret) => {
      if (ret._id) ret.id = ret._id.toString(); // (sub-documents without an _id, e.g. circle slot holders, have none)
      for (const [field, flag] of Object.entries(picture)) ret[flag] = Boolean(ret[field] && ret[field].size);
      delete ret._id;
      delete ret.__v;
      for (const field of [...Object.keys(picture), ...secret]) delete ret[field];
      return ret;
    },
  });
}

for (const model of Object.values(models)) jsonOf(model);
for (const model of [models.Project, models.Certificate, models.Course, models.Product]) jsonOf(model, { picture: { image: "hasImage" } });
jsonOf(models.SiteSettings, { picture: { photo: "hasPhoto" } });
jsonOf(models.Post, { picture: { cover: "hasCover" } });
jsonOf(models.CirclePayment, { picture: { proof: "hasProof" } });
jsonOf(models.TeamMember, { secret: ["passwordHash"] });
jsonOf(models.CircleMember, { secret: ["passwordHash"] });
jsonOf(models.TeamAttachment, { secret: ["data"] });
// The rating is the owner's private note; members never see it. The owner's routes add it back
// explicitly (task.toObject()) — see ownerTaskJSON() in routes/adminTeam.js.
jsonOf(models.TeamTask, { secret: ["rating"] });

module.exports = { connectMongo, ...models };