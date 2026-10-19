const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("express-async-errors");

const projectsRouter = require("./routes/projects");
const skillsRouter = require("./routes/skills");
const youtubeRouter = require("./routes/youtube");
const contactRouter = require("./routes/contact");
const cvRouter = require("./routes/cv");
const aboutRouter = require("./routes/about");
const authRouter = require("./routes/auth");
const adminRouter = require("./routes/admin");

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
// The CV upload sends the PDF as base64 inside JSON, which is bigger than the default 100 KB
// body limit — so this one path gets a higher limit. It must come BEFORE the global parser.
app.use("/api/admin/cv", express.json({ limit: "6mb" }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/projects", projectsRouter);
app.use("/api/skills", skillsRouter);
app.use("/api/youtube", youtubeRouter);
app.use("/api/contact", contactRouter);
app.use("/api/cv", cvRouter);
app.use("/api/about", aboutRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);

app.use((err, req, res, next) => {
  console.error(err);
  // A Mongoose validation failure (e.g. a text that is too long) is the client's mistake, not a server crash.
  const status = err.status || (err.name === "ValidationError" ? 400 : 500);
  res.status(status).json({ error: err.message || "Internal server error" });
});

module.exports = app;
