// helpers.js — shared setup for the API tests in this folder (run with `npm test`).
// Each test file gets its own throwaway database on a LOCAL MongoDB and drops it at the end.
// Safety: the tests refuse to run against anything that is not localhost / 127.0.0.1 or whose
// database name doesn't end in "_test", so a production MONGODB_URI can never be wiped.
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const MONGO_HOST = process.env.TEST_MONGODB_HOST || "mongodb://127.0.0.1:27017";

function useTestDb(name) {
  const uri = `${MONGO_HOST}/${name}`;
  if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(uri) || !name.endsWith("_test")) {
    throw new Error(`Refusing to run tests against ${uri} — local *_test databases only`);
  }
  process.env.MONGODB_URI = uri;
  process.env.JWT_SECRET = "test-secret";
  process.env.CIRCLE_REMINDERS = "off";
}

// Starts the app on a free port; returns helpers bound to it.
async function start() {
  const { connectMongo } = require("../src/lib/mongo");
  const app = require("../src/app");
  await connectMongo();
  await mongoose.connection.db.dropDatabase();
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const adminToken = jwt.sign({ sub: "owner" }, process.env.JWT_SECRET, { expiresIn: "1h" });
  const call = async (method, path, body, token = adminToken) => {
    const r = await fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: r.status, data, headers: r.headers };
  };
  let pass = 0;
  let fail = 0;
  const check = (name, ok, extra = "") => {
    if (ok) pass += 1; else fail += 1;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  ${String(extra).slice(0, 300)}`}`);
  };
  const finish = async () => {
    console.log(`\n${pass} passed, ${fail} failed`);
    await mongoose.connection.db.dropDatabase();
    server.close();
    await mongoose.disconnect();
    process.exitCode = fail ? 1 : 0;
  };
  return { base, adminToken, call, check, finish };
}

// Notifications and logs are written after the response is sent (they never slow a request
// down), so a test counting them polls for up to a second instead of reading once.
async function eventually(read, expected, ms = 1000) {
  const until = Date.now() + ms;
  let value = await read();
  while (value !== expected && Date.now() < until) {
    await new Promise((r) => setTimeout(r, 50));
    value = await read();
  }
  return value === expected;
}

module.exports = { useTestDb, start, eventually };
