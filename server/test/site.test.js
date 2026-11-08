// site.test.js — the dashboard's picture routes (one helper, pictureRoutes(), serves projects,
// certificates, courses, blog covers and products) and the shared rules endpoint.
const { useTestDb, start } = require("./helpers");
useTestDb("site_api_test");

const { Certificate } = require("../src/lib/mongo");

(async () => {
  const { call, check, finish } = await start();
  const png = Buffer.concat([Buffer.from([0x89]), Buffer.from("PNG\r\n"), Buffer.alloc(40)]).toString("base64");

  const cert = await Certificate.create({ titleEn: "Cert", titleAr: "شهادة" });
  const put = await call("PUT", `/admin/certificates/${cert.id}/image`, { data: png });
  check("set a picture", put.status === 200 && put.data.hasImage === true, JSON.stringify(put.data));
  check("refuse a non-picture", (await call("PUT", `/admin/certificates/${cert.id}/image`, { data: Buffer.from("hello world!").toString("base64") })).status === 400);
  const del = await call("DELETE", `/admin/certificates/${cert.id}/image`);
  check("remove the picture", del.status === 200 && del.data.hasImage === false, JSON.stringify(del.data));
  check("unknown id → 404", (await call("PUT", "/admin/certificates/64b000000000000000000000/image", { data: png })).status === 404);
  check("malformed id → 400", (await call("DELETE", "/admin/certificates/not-an-id/image")).status === 400);
  check("needs the admin login", (await call("PUT", `/admin/certificates/${cert.id}/image`, { data: png }, null)).status === 401);
  check("blog cover route still answers", (await call("DELETE", "/admin/posts/64b000000000000000000000/cover")).status === 404);
  check("product cover route still answers", (await call("DELETE", "/admin/products/64b000000000000000000000/cover")).status === 404);

  await finish();
})().catch((err) => { console.error(err); process.exit(1); });
