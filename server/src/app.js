// app.js — builds the Express application: the shared "middleware" every request passes
// through, then one router per resource. It does NOT start the server — server.js does that
// (after connecting to MongoDB), which keeps this file easy to read and to reuse in tests.
//
// A request travels top to bottom: trust proxy → helmet → cors → JSON body parser → the first
// router whose path matches → (if anything throws) the error handler at the very end.
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
// Lets `async` route handlers simply throw (or reject) — the error goes to the error handler at
// the bottom of this file instead of crashing the request. No try/catch needed in the routes.
require("express-async-errors");

const projectsRouter = require("./routes/projects");
const skillsRouter = require("./routes/skills");
const youtubeRouter = require("./routes/youtube");
const contactRouter = require("./routes/contact");
const cvRouter = require("./routes/cv");
const aboutRouter = require("./routes/about");
const testimonialsRouter = require("./routes/testimonials");
const servicesRouter = require("./routes/services");
const settingsRouter = require("./routes/settings");
const certificatesRouter = require("./routes/certificates");
const analyticsRouter = require("./routes/analytics");
const postsRouter = require("./routes/posts");
const coursesRouter = require("./routes/courses");
const formsRouter = require("./routes/forms");
const authRouter = require("./routes/auth");
const adminRouter = require("./routes/admin");

const app = express();

// Render (like most hosts) puts one reverse proxy in front of the app. Without this setting
// every request looks like it comes from the proxy's IP, so the rate limiters (login, contact,
// feedback form) would count ALL visitors together instead of one visitor at a time.
app.set("trust proxy", 1);

// SECURITY HEADERS (task 2.1). helmet() adds ~a dozen HTTP response headers that tell browsers
// to be stricter with our responses — e.g. don't guess file types (X-Content-Type-Options),
// don't let other sites put the API inside a frame (X-Frame-Options), only talk over HTTPS
// (Strict-Transport-Security), and hide "X-Powered-By: Express" so attackers learn less.
// It costs nothing and protects every route, so it stays ON.
app.use(helmet());
// CORS: browsers only let a web page call an API on another domain if that API says the page's
// origin is allowed. Our site (GitHub Pages) and our API (Render) live on different domains, so
// we allow exactly one origin: CLIENT_ORIGIN (https://salemsalehtech.github.io in production,
// the Vite dev server locally). Calls from any other website are refused by the browser.
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
// The CV upload sends the PDF as base64 inside JSON, which is bigger than the default 100 KB
// body limit — so this one path gets a higher limit. It must come BEFORE the global parser.
app.use("/api/admin/cv", express.json({ limit: "6mb" }));
// Same for certificate pictures (max 2 MB, ~2.7 MB once base64-encoded).
app.use("/api/admin/certificates", express.json({ limit: "4mb" }));
// Blog posts: long Markdown texts in two languages + cover pictures (max 2 MB).
app.use("/api/admin/posts", express.json({ limit: "4mb" }));
// Course and project pictures (max 2 MB).
app.use("/api/admin/courses", express.json({ limit: "4mb" }));
app.use("/api/admin/projects", express.json({ limit: "4mb" }));
// Reads JSON request bodies into req.body (max 100 KB by default — plenty for every form).
app.use(express.json());

// Health check: Render (and the keep-alive in lib/keepAlive.js) call this to see the app is up.
app.get("/api/health", (req, res) => res.json({ ok: true }));

// One router per resource. The public routers are read-only (plus the public forms: contact,
// the client feedback form and the Form Builder forms); everything that changes data lives under
// /api/admin, where routes/admin.js requires a valid login token for every request.
app.use("/api/projects", projectsRouter);
app.use("/api/skills", skillsRouter);
app.use("/api/youtube", youtubeRouter);
app.use("/api/contact", contactRouter);
app.use("/api/cv", cvRouter);
app.use("/api/about", aboutRouter);
app.use("/api/testimonials", testimonialsRouter);
app.use("/api/services", servicesRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/certificates", certificatesRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/posts", postsRouter);
app.use("/api/courses", coursesRouter);
app.use("/api/forms", formsRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);

// Error handler — Express recognises it by its 4 parameters (err, req, res, next). Any error
// thrown in a route ends up here: it is logged on the server (visible in Render's logs) and
// the client gets a JSON { error } message with a matching status code.
app.use((err, req, res, next) => {
  console.error(err);
  // A Mongoose validation failure (e.g. a text that is too long) is the client's mistake, not a server crash.
  // A malformed id in the URL (CastError) is too — e.g. PUT /api/admin/services/not-an-id.
  // A duplicate of a unique field (MongoDB error 11000, e.g. two blog posts with the same link
  // name) is a conflict the user can fix, so say so clearly.
  if (err.code === 11000) {
    return res.status(409).json({ error: `That ${Object.keys(err.keyValue || {})[0] || "value"} is already used — please choose another one` });
  }
  const status = err.status || (err.name === "ValidationError" || err.name === "CastError" ? 400 : 500);
  res.status(status).json({ error: err.message || "Internal server error" });
});

module.exports = app;
