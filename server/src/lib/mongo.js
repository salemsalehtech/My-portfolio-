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

const models = {
  Project: mongoose.models.Project || mongoose.model("Project", projectSchema),
  Skill: mongoose.models.Skill || mongoose.model("Skill", skillSchema),
  YoutubeVideo: mongoose.models.YoutubeVideo || mongoose.model("YoutubeVideo", youtubeVideoSchema),
  ContactMessage: mongoose.models.ContactMessage || mongoose.model("ContactMessage", contactMessageSchema),
  AdminUser: mongoose.models.AdminUser || mongoose.model("AdminUser", adminUserSchema),
  CvFile: mongoose.models.CvFile || mongoose.model("CvFile", cvFileSchema),
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