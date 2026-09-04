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

const models = {
  Project: mongoose.models.Project || mongoose.model("Project", projectSchema),
  Skill: mongoose.models.Skill || mongoose.model("Skill", skillSchema),
  YoutubeVideo: mongoose.models.YoutubeVideo || mongoose.model("YoutubeVideo", youtubeVideoSchema),
  ContactMessage: mongoose.models.ContactMessage || mongoose.model("ContactMessage", contactMessageSchema),
  AdminUser: mongoose.models.AdminUser || mongoose.model("AdminUser", adminUserSchema),
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