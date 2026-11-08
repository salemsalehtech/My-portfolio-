// announcements.test.js — owner announcements: draft, files, publish once, member read receipts,
// drafts and their files stay hidden from members.
const { useTestDb, start } = require("./helpers");
useTestDb("team_ann_test");

const mongoose = require("mongoose");
const { TeamMember, TeamNotification } = require("../src/lib/mongo");
const { signMemberToken } = require("../src/middleware/teamAuth");

(async () => {
  const { base, call, check, finish } = await start();
  const mona = await TeamMember.create({ username: "mona", name: "Mona", passwordHash: "x", mustChangePassword: false });
  await TeamMember.create({ username: "omar", name: "Omar", passwordHash: "x", mustChangePassword: false });
  const tm = signMemberToken(mona);
  const open = (id) => fetch(`${base}/team/attachments/${id}`, { headers: { Authorization: `Bearer ${tm}` } });

  const draft = await call("POST", "/admin/team/announcements", { title: "Office closed Thursday", body: "**No work** on Thursday.", pinned: true });
  check("create draft", draft.status === 201 && !draft.data.publishedAt, JSON.stringify(draft.data));
  const id = draft.data.id;
  check("title required", (await call("POST", "/admin/team/announcements", { body: "x" })).status === 400);
  const big = Buffer.concat([Buffer.from("%PDF-1.4 "), Buffer.alloc(3 * 1024 * 1024)]).toString("base64");
  const up = await call("POST", `/admin/team/announcements/${id}/attachments`, { name: "plan.pdf", data: big });
  check("attach a 3 MB pdf to the draft", up.status === 201, JSON.stringify(up.data).slice(0, 200));
  check("member can't see the draft", (await call("GET", "/team/announcements", null, tm)).data.items.length === 0);
  check("member can't open a draft's file", (await open(up.data.id)).status === 404);
  check("publish", Boolean((await call("POST", `/admin/team/announcements/${id}/publish`)).data.publishedAt));
  await call("POST", `/admin/team/announcements/${id}/publish`);
  check("everyone notified once (published twice)", (await TeamNotification.countDocuments({ kind: "announcement" })) === 2);
  const list = await call("GET", "/team/announcements", null, tm);
  check("member sees it unread, readBy not leaked", list.data.unread === 1 && list.data.items[0].read === false && !("readBy" in list.data.items[0]), JSON.stringify(list.data));
  check("member lists its files", (await call("GET", `/team/announcements/${id}/attachments`, null, tm)).data.length === 1);
  check("member opens the file", (await open(up.data.id)).status === 200);
  check("mark read", (await call("POST", `/team/announcements/${id}/read`, {}, tm)).status === 204);
  await call("POST", `/team/announcements/${id}/read`, {}, tm);
  check("unread 0 after reading", (await call("GET", "/team/announcements", null, tm)).data.unread === 0);
  const owner = await call("GET", "/admin/team/announcements");
  check("owner sees each reader once + team size", owner.data.items[0].readBy.length === 1 && owner.data.items[0].readBy[0].name === "Mona" && owner.data.team === 2, JSON.stringify(owner.data));
  check("member can't post an announcement", (await call("POST", "/admin/team/announcements", { title: "x" }, tm)).status === 401);
  check("delete removes its files",
    (await call("DELETE", `/admin/team/announcements/${id}`)).status === 204 && (await mongoose.connection.db.collection("teamattachments").countDocuments()) === 0);

  await finish();
})().catch((err) => { console.error(err); process.exit(1); });
