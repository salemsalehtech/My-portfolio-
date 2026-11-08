// team.test.js — the team workspace API end to end: tasks, criteria, help / more time, comments
// with mentions and replies, attachments, review with a private rating, the open pool (concurrent
// claims), scores and badges, rules, availability, templates, weekly summary, AI switch, gzip.
const { useTestDb, start, eventually } = require("./helpers");
useTestDb("team_api_test");

const bcrypt = require("bcryptjs");
const { TeamMember, TeamNotification } = require("../src/lib/mongo");
const { signMemberToken } = require("../src/middleware/teamAuth");

(async () => {
  const { base, adminToken, call, check, finish } = await start();
  const hash = await bcrypt.hash("password123", 4);
  const mona = await TeamMember.create({ username: "mona", name: "Mona Adel", passwordHash: hash, mustChangePassword: false });
  const omar = await TeamMember.create({ username: "omar", name: "Omar Ali", passwordHash: hash, mustChangePassword: false });
  const tm = signMemberToken(mona);
  const to = signMemberToken(omar);

  const proj = await call("POST", "/admin/team/projects", { name: "Store", members: [mona.id, omar.id] });
  check("create project", proj.status === 201, JSON.stringify(proj.data));
  const pid = proj.data.id;

  const task = await call("POST", `/admin/team/projects/${pid}/tasks`, { title: "Login page", assignee: mona.id, criteria: [{ text: "Works on phone" }], dueDate: "2099-01-10" });
  check("create task with criteria", task.status === 201 && task.data.criteria.length === 1, JSON.stringify(task.data));
  const tid = task.data.id;

  const mine = await call("GET", "/team/tasks", null, tm);
  check("member sees task, no rating key", mine.status === 200 && mine.data.length === 1 && !("rating" in mine.data[0]), JSON.stringify(mine.data[0]));

  check("understood", Boolean((await call("POST", `/team/tasks/${tid}/understood`, {}, tm)).data.understoodAt));
  check("estimate M", (await call("PUT", `/team/tasks/${tid}/estimate`, { estimate: "M" }, tm)).data.estimate === "M");
  check("bad estimate rejected", (await call("PUT", `/team/tasks/${tid}/estimate`, { estimate: "XL" }, tm)).status === 400);
  const cid = task.data.criteria[0]._id;
  check("tick criterion", (await call("PATCH", `/team/tasks/${tid}/criteria/${cid}`, { done: true }, tm)).data.criteria[0].done === true);
  check("teammate cannot tick another's task", (await call("PATCH", `/team/tasks/${tid}/criteria/${cid}`, { done: false }, to)).status === 404);

  check("help needs a note", (await call("PUT", `/team/tasks/${tid}/help`, { note: " " }, tm)).status === 400);
  check("ask help", (await call("PUT", `/team/tasks/${tid}/help`, { note: "API returns 500" }, tm)).data.helpNote === "API returns 500");
  check("extension before due rejected", (await call("PUT", `/team/tasks/${tid}/extension`, { date: "2099-01-05", reason: "x" }, tm)).status === 400);
  check("ask extension", (await call("PUT", `/team/tasks/${tid}/extension`, { date: "2099-01-20", reason: "API blocked" }, tm)).data.extensionRequest?.date === "2099-01-20");
  const granted = await call("POST", `/admin/team/tasks/${tid}/extension`, { approve: true });
  check("owner grants extension, due date moves", granted.data.dueDate === "2099-01-20" && granted.data.extensionRequest === null, JSON.stringify(granted.data));

  const c1 = await call("POST", `/team/tasks/${tid}/comments`, { body: "@omar can you check? @lead fyi" }, tm);
  check("comment with mentions", c1.status === 201, JSON.stringify(c1.data));
  check("omar got mention", await eventually(() => TeamNotification.countDocuments({ recipient: omar._id, kind: "mention" }), 1));
  check("owner got mention, no duplicate comment note",
    await eventually(() => TeamNotification.countDocuments({ recipient: null, kind: "mention" }), 1) && await eventually(() => TeamNotification.countDocuments({ recipient: null, kind: "comment" }), 0));
  const c2 = await call("POST", `/team/tasks/${tid}/comments`, { body: "Looks fine", replyTo: c1.data.id }, to);
  check("reply populated", c2.data.replyTo?.body?.startsWith("@omar"), JSON.stringify(c2.data));
  check("author of the answered comment notified", await eventually(() => TeamNotification.countDocuments({ recipient: mona._id, kind: "reply" }), 1));

  const pdf = Buffer.from("%PDF-1.4 test").toString("base64");
  const up = await call("POST", `/team/tasks/${tid}/attachments`, { name: "result.pdf", data: pdf }, tm);
  check("member uploads pdf", up.status === 201 && up.data.member?.name === "Mona Adel", JSON.stringify(up.data));
  const webm = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(20)]).toString("base64");
  check("voice note accepted", (await call("POST", `/team/tasks/${tid}/attachments`, { name: "v.webm", data: webm }, tm)).data.contentType === "audio/webm");
  const png = Buffer.concat([Buffer.from([0x89]), Buffer.from("PNG\r\n"), Buffer.alloc(20)]).toString("base64");
  check("png accepted", (await call("POST", `/team/tasks/${tid}/attachments`, { name: "s.png", data: png }, tm)).data.contentType === "image/png");
  check("junk rejected", (await call("POST", `/team/tasks/${tid}/attachments`, { name: "x.exe", data: Buffer.from("MZ....").toString("base64") }, tm)).status === 400);
  check("teammate can't upload to another's task", (await call("POST", `/team/tasks/${tid}/attachments`, { name: "r.pdf", data: pdf }, to)).status === 404);
  check("teammate can't delete another's file", (await call("DELETE", `/team/attachments/${up.data.id}`, null, to)).status === 404);
  const file = await fetch(`${base}/team/attachments/${up.data.id}`, { headers: { Authorization: `Bearer ${to}` } });
  check("teammate can open file", file.status === 200 && (await file.text()).startsWith("%PDF"));

  await call("PATCH", `/team/tasks/${tid}/status`, { status: "review" }, tm);
  const approved = await call("POST", `/admin/team/tasks/${tid}/approve`, { rating: { quality: 5, creativity: 5, conduct: 4, bonus: 2, note: "great" } });
  check("approve with rating (owner sees it)", approved.data.status === "done" && approved.data.rating?.bonus === 2 && approved.data.helpNote === "", JSON.stringify(approved.data));
  const projMember = await call("GET", `/team/projects/${pid}`, null, tm);
  check("rating hidden from member board", projMember.data.tasks.every((x) => !("rating" in x)), JSON.stringify(projMember.data.tasks[0]));
  check("rating visible on owner board", (await call("GET", `/admin/team/projects/${pid}`)).data.tasks[0].rating?.quality === 5);

  const pool = await call("POST", `/admin/team/projects/${pid}/tasks`, { title: "Footer", claimable: true });
  const poolList = await call("GET", "/team/pool", null, to);
  check("pool lists claimable task", poolList.data.length === 1 && poolList.data[0].project.name === "Store", JSON.stringify(poolList.data));
  const [a, b] = await Promise.all([call("POST", `/team/tasks/${pool.data.id}/claim`, {}, tm), call("POST", `/team/tasks/${pool.data.id}/claim`, {}, to)]);
  check("exactly one concurrent claim wins", [a.status, b.status].sort().join() === "200,409", `${a.status},${b.status}`);

  const scores = await call("GET", "/admin/team/scores");
  const monaRow = scores.data.ranking.find((r) => r.member.id === mona.id);
  // 10 approved + 5 on time + 5 first time + rating 14 + bonus 10 = 44
  check("scores: 44 points", monaRow?.points === 44, JSON.stringify(monaRow));
  check("scores: badges", monaRow.badges.includes("first") && monaRow.badges.includes("extraMile"), JSON.stringify(monaRow.badges));
  check("star suggestion", scores.data.starSuggestion?.member.id === mona.id);
  check("member can't read scores", (await call("GET", "/admin/team/scores", null, tm)).status === 401);
  check("send star", (await call("POST", "/admin/team/kudos", { member: mona.id, star: true, message: "Star!" })).status === 201);
  const cheers = await call("GET", "/team/cheers", null, tm);
  check("cheers: notes + star badge, no points", cheers.data.kudos.length === 1 && cheers.data.badges.includes("star") && !("points" in cheers.data), JSON.stringify(cheers.data));

  await call("PUT", "/admin/team/settings", { goalTarget: 10, goalLabel: "Launch" });
  check("goal visible to member", (await call("GET", "/team/cheers", null, tm)).data.goal?.target === 10);
  const pub = await call("PUT", "/admin/team/settings", { rulesEn: "## Be kind", rulesAr: "## خليك لطيف", publish: true });
  check("rules published v1", pub.data.rulesVersion === 1);
  check("rules notification sent", await eventually(() => TeamNotification.countDocuments({ recipient: mona._id, kind: "rules" }), 1));
  check("agree to a stale version refused", (await call("POST", "/team/rules/agree", { version: 0 }, tm)).status === 409);
  check("agree v1", (await call("POST", "/team/rules/agree", { version: 1 }, tm)).data.rulesAgreed === 1);
  const sett = await call("GET", "/admin/team/settings");
  check("agreements list", sett.data.agreements.find((x) => x.id === mona.id)?.agreed === true && sett.data.agreements.find((x) => x.id === omar.id)?.agreed === false);
  const inv = await call("POST", "/admin/team/invites", { label: "x", maxUses: 2 });
  const signup = (agreeRules) => call("POST", "/team/signup", { token: inv.data.token, name: "New", username: "newbie", password: "password123", agreeRules }, null);
  check("signup without agreeing refused", (await signup(undefined)).status === 400);
  check("signup with agreement", (await signup(true)).status === 201);

  check("availability away", (await call("PUT", "/team/availability", { status: "away", until: "2099-02-01", note: "travel" }, tm)).data.availability.status === "away");
  check("bad availability rejected", (await call("PUT", "/team/availability", { status: "sleeping" }, tm)).status === 400);

  check("template created", (await call("POST", "/admin/team/templates", { name: "Weekly report", title: "Write report", repeat: { every: "weekly", weekday: 0, project: pid, assignee: omar.id } })).status === 201);
  check("repeat needs a project", (await call("POST", "/admin/team/templates", { name: "x", title: "y", repeat: { every: "weekly" } })).status === 400);

  const weekly = await call("GET", "/admin/team/weekly");
  check("weekly summary", weekly.status === 200 && weekly.data.done >= 1, JSON.stringify(weekly.data));
  check("AI off without key", (await call("GET", "/admin/team/ai")).data.enabled === false);
  check("AI brief 503 without key", (await call("POST", "/admin/team/ai/brief", { text: "x" })).status === 503);

  const gz = await fetch(`${base}/admin/team/projects/${pid}`, { headers: { Authorization: `Bearer ${adminToken}`, "Accept-Encoding": "gzip" } });
  check("gzip on", gz.headers.get("content-encoding") === "gzip" || Number(gz.headers.get("content-length") || 0) < 1024);

  const meta = await call("GET", "/meta", null, null);
  check("rules served to the browser", meta.data.timeZone === "Africa/Cairo" && meta.data.team.memberMoves.todo.includes("doing")
    && meta.data.uploads.attachment.maxFiles === 10 && meta.data.team.ownerHandle === "lead", JSON.stringify(meta.data));
  const t2 = await call("POST", `/admin/team/projects/${pid}/tasks`, { title: "Self approve?", assignee: mona.id });
  check("member can't move own task to done", (await call("PATCH", `/team/tasks/${t2.data.id}/status`, { status: "done" }, tm)).status === 400);

  await finish();
})().catch((err) => { console.error(err); process.exit(1); });
