// run.js — `npm test`: runs every *.test.js in this folder, one process each (each one owns its
// throwaway database), and fails if any of them fails. Needs a local MongoDB on 127.0.0.1:27017
// (or TEST_MONGODB_HOST). The app's error log of expected 400s is hidden; PASS / FAIL lines show.
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const files = fs.readdirSync(__dirname).filter((f) => f.endsWith(".test.js")).sort();
let failed = 0;
for (const file of files) {
  console.log(`\n=== ${file}`);
  const r = spawnSync(process.execPath, [path.join(__dirname, file)], { encoding: "utf8" });
  const lines = `${r.stdout}`.split("\n").filter((l) => /^(PASS|FAIL)|passed,/.test(l));
  console.log(lines.join("\n"));
  if (r.status !== 0) {
    failed += 1;
    if (!lines.length) console.log(r.stderr.slice(0, 2000));
  }
}
console.log(failed ? `\n${failed} test file(s) failed` : "\nAll test files passed");
process.exitCode = failed ? 1 : 0;
