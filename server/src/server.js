require("dotenv").config();
const app = require("./app");
const { connectMongo } = require("./lib/mongo");
const { startKeepAlive } = require("./lib/keepAlive");

const REQUIRED_ENV_VARS = ["MONGODB_URI", "JWT_SECRET"];
const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required environment variable(s): ${missing.join(", ")}`);
  process.exit(1);
}

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

const PORT = process.env.PORT || 4000;

connectMongo()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API listening on http://localhost:${PORT}`);
      startKeepAlive(); // only does something on Render (see lib/keepAlive.js)
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
