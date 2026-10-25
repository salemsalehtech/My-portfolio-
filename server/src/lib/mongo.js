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
  },
  { timestamps: true }
);

certificateSchema.pre("validate", function () {
  if (!this.titleEn && !this.titleAr) this.invalidate("titleEn", "A certificate title is required");
});

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

// Certificates: same as above, plus never send the image itself in JSON — just `hasImage`.
// The picture is fetched separately from GET /api/certificates/:id/image.
models.Certificate.schema.set("toJSON", {
  transform: (_document, ret) => {
    ret.id = ret._id.toString();
    ret.hasImage = Boolean(ret.image && ret.image.size);
    delete ret._id;
    delete ret.__v;
    delete ret.image;
    return ret;
  },
});

module.exports = { connectMongo, ...models };