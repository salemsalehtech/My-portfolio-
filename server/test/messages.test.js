// messages.test.js — the portals translate the server's error messages word for word
// (SERVER_AR in client/src/pages/team/teamCopy.js, CIRCLE_SERVER_AR in client/src/lib/circles.js).
// If a message is reworded on the server, its Arabic line silently stops matching and members see
// English. This test reads both maps and fails for any English key the server no longer says.
// (Messages the client itself produces — fetch errors like "Request failed (404)" — are allowed.)
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const serverText = (function all(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .map((e) => (e.isDirectory() ? all(path.join(dir, e.name)) : e.name.endsWith(".js") ? fs.readFileSync(path.join(dir, e.name), "utf8") : ""))
    .join("\n");
}(path.join(root, "server", "src")));
const CLIENT_SIDE = [/^Request failed \(\d+\)$/, /^Your login has expired/];

// The keys of `export const NAME = { "English": "…", … }` in a client file.
function keysOf(file, name) {
  const src = read(file);
  const start = src.indexOf(`export const ${name} = {`);
  if (start < 0) throw new Error(`${name} not found in ${file}`);
  const body = src.slice(start, src.indexOf("\n};", start));
  return [...body.matchAll(/^\s*"((?:[^"\\]|\\.)+)":/gm)].map((m) => JSON.parse(`"${m[1]}"`));
}

let pass = 0;
let fail = 0;
for (const [file, name] of [["client/src/pages/team/teamCopy.js", "SERVER_AR"], ["client/src/lib/circles.js", "CIRCLE_SERVER_AR"]]) {
  const stale = keysOf(file, name).filter((key) => !CLIENT_SIDE.some((re) => re.test(key)) && !serverText.includes(key));
  if (stale.length) {
    fail += 1;
    console.log(`FAIL  ${name}: ${stale.length} message(s) the server no longer sends:\n  - ${stale.join("\n  - ")}`);
  } else {
    pass += 1;
    console.log(`PASS  ${name}: every translated message still exists on the server`);
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
