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
async function connectMongo() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/salem_portfolio";
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");
}

// A portfolio project (Projects section + its details popup). `tags` feed the technology filter
// buttons, `gradient` is the CSS background of the card, `order` sorts the cards.
const projectSchema = new mongoose.Schema(
  {
    titleEn: { type: String, required: true },
    titleAr: { type: String, default: "" },
    descEn: { type: String, default: "" },
    descAr: { type: String, default: "" },
    tags: { type: [String], default: [] },
    category: { type: String, default: "web" },
    githubUrl: { type: String, default: "" },
    demoUrl: { type: String, default: "" },
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

// A skill bar in the Skills section: `percentage` = bar width, `group` = which tab it's under
// (frontend / backend / tools), `color` / `textColor` = the small badge with `abbr`.
const skillSchema = new mongoose.Schema({
  name: { type: String, required: true },
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
  url: { type: String, default: "" },
  order: { type: Number, default: 0 },
});

// A message sent through the contact form; `read` is toggled in Admin → Messages.
const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
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
  },
  { timestamps: true }
);

// Site-wide profile content, edited from /admin/settings ("Profile & Links"): the Hero (greeting,
// name, rotating titles, tagline, USP line), the contact links (email, GitHub, LinkedIn, YouTube),
// the location, the footer role and the YouTube channel description. One single document; if
// none exists the site uses the defaults in client/src/lib/siteDefaults.js.
// Links are validated to start with http(s):// — never let a "javascript:" URL into an href.
const httpUrl = {
  type: String,
  default: "",
  maxlength: 300,
  validate: { validator: (v) => v === "" || /^https?:\/\/\S+$/i.test(v), message: "Links must start with http:// or https://" },
};
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
// without deleting anything.
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
    lastLoginAt: { type: Date, default: null },
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
const TASK_STATUSES = ["todo", "doing", "review", "done"];
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
    submittedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
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
    body: { type: String, required: [true, "Write a comment first"], trim: true, maxlength: 2000 },
  },
  { timestamps: true }
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
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
teamNotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

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
  FormResponse: mongoose.models.FormResponse || mongoose.model("FormResponse", formResponseSchema),
  TeamMember: mongoose.models.TeamMember || mongoose.model("TeamMember", teamMemberSchema),
  TeamProject: mongoose.models.TeamProject || mongoose.model("TeamProject", teamProjectSchema),
  TeamTask: mongoose.models.TeamTask || mongoose.model("TeamTask", teamTaskSchema),
  TeamActivity: mongoose.models.TeamActivity || mongoose.model("TeamActivity", teamActivitySchema),
  TeamComment: mongoose.models.TeamComment || mongoose.model("TeamComment", teamCommentSchema),
  TeamNotification: mongoose.models.TeamNotification || mongoose.model("TeamNotification", teamNotificationSchema),
  TeamStandup: mongoose.models.TeamStandup || mongoose.model("TeamStandup", teamStandupSchema),
};

// When a document is sent as JSON (res.json), rename MongoDB's `_id` to a plain `id` string and
// drop the internal `__v` version field — so the client always works with `item.id`.
for (const model of Object.values(models)) {
  model.schema.set("toJSON", {
    transform: (_document, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  });
}

// Projects, certificates and courses: same as above, plus never send the image itself in JSON —
// just `hasImage`. The picture is fetched separately from GET /api/<resource>/:id/image.
for (const model of [models.Project, models.Certificate, models.Course]) {
  model.schema.set("toJSON", {
    transform: (_document, ret) => {
      ret.id = ret._id.toString();
      ret.hasImage = Boolean(ret.image && ret.image.size);
      delete ret._id;
      delete ret.__v;
      delete ret.image;
      return ret;
    },
  });
}

// Team members: never send the password hash, even when a route loaded it to check a password.
models.TeamMember.schema.set("toJSON", {
  transform: (_document, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  },
});

// Blog posts: the cover picture becomes `hasCover` (fetched from GET /api/posts/:slug/cover).
models.Post.schema.set("toJSON", {
  transform: (_document, ret) => {
    ret.id = ret._id.toString();
    ret.hasCover = Boolean(ret.cover && ret.cover.size);
    delete ret._id;
    delete ret.__v;
    delete ret.cover;
    return ret;
  },
});

module.exports = { connectMongo, ...models };