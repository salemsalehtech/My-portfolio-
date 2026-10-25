// server.js — the entry point (`npm start` / `npm run dev` run this file). It:
//   1. loads the settings from the .env file into process.env (locally; on Render they are set
//      in the dashboard and .env doesn't exist),
//   2. stops right away if a setting the app can't work without is missing,
//   3. connects to MongoDB, and only then starts listening for HTTP requests.
// Everything about routes and middleware lives in app.js.
require("dotenv").config();
const app = require("./app");
const { connectMongo } = require("./lib/mongo");
const { startKeepAlive } = require("./lib/keepAlive");

// Without a database address or the secret that signs login tokens, nothing would work —
// better to fail loudly at startup than to start "half working".
const REQUIRED_ENV_VARS = ["MONGODB_URI", "JWT_SECRET"];
const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required environment variable(s): ${missing.join(", ")}`);
  process.exit(1);
}

// Safety nets for errors that escape every try/catch: a forgotten promise rejection is only
// logged; a truly unexpected exception stops the process (Render then restarts it cleanly).
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

// Render tells the app which port to use through PORT; locally it's 4000 (the Vite dev server
// forwards /api calls there — see client/vite.config.js).
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
