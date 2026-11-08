// auth.test.js — admin sessions: a token must match the admin account's current tokenVersion,
// "Sign out on all devices" ends every session, and a forged / old-style token is refused.
const { useTestDb, start } = require("./helpers");
useTestDb("auth_api_test");

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { AdminUser } = require("../src/lib/mongo");

(async () => {
  const { admin, adminToken, call, check, finish } = await start();
  const ping = (token) => call("GET", "/admin/team/members", null, token);

  check("current token works", (await ping(adminToken)).status === 200);
  const oldStyle = jwt.sign({ sub: admin.id, email: admin.email }, process.env.JWT_SECRET, { expiresIn: "1h" });
  check("token without a version is refused", (await ping(oldStyle)).status === 401);
  const ghost = jwt.sign({ sub: "64b000000000000000000000", v: 0 }, process.env.JWT_SECRET, { expiresIn: "1h" });
  check("token for a deleted admin is refused", (await ping(ghost)).status === 401);
  const forged = jwt.sign({ sub: admin.id, v: 0 }, "not-the-secret", { expiresIn: "1h" });
  check("forged signature is refused", (await ping(forged)).status === 401);

  await AdminUser.updateOne({ _id: admin._id }, { passwordHash: await bcrypt.hash("password123", 4) });
  const login = await call("POST", "/auth/login", { email: "owner@test.local", password: "password123" }, null);
  check("login returns a token that works", login.status === 200 && (await ping(login.data.token)).status === 200);
  check("sign out on all devices", (await call("POST", "/auth/logout-all", {}, login.data.token)).status === 204);
  check("every earlier token stops working", (await ping(login.data.token)).status === 401 && (await ping(adminToken)).status === 401);
  const again = await call("POST", "/auth/login", { email: "owner@test.local", password: "password123" }, null);
  check("a fresh login works again", (await ping(again.data.token)).status === 200);
  check("logout-all needs a login", (await call("POST", "/auth/logout-all", {}, null)).status === 401);

  await finish();
})().catch((err) => { console.error(err); process.exit(1); });
