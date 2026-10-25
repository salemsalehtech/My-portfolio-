const mongoose = require("mongoose");

async function connectMongo() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/salem_portfolio";
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");
}

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
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

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

const youtubeVideoSchema = new mongoose.Schema({
  titleEn: { type: String, required: true },
  titleAr: { type: String, default: "" },
  subEn: { type: String, default: "" },
  subAr: { type: String, default: "" },
  gradient: { type: String, default: "" },
  url: { type: String, default: "" },
  order: { type: Number, default: 0 },
});

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

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
};

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

module.exports = { connectMongo, ...models };