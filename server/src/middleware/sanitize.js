// sanitize.js — removes MongoDB operator keys from what a visitor sends, before any route sees it.
//
// A query like `User.findOne({ email: req.body.email })` is safe only while `email` is a string.
// If someone sends { "email": { "$ne": null } }, an unchecked route would match the first user.
// The routes already turn every value they use into a string; this is the second lock: any key
// that starts with "$" or contains "." (how MongoDB operators and nested paths are written) is
// dropped from the body, the query string and the URL params, at any depth.
const unsafeKey = (key) => key.startsWith("$") || key.includes(".");

function clean(value, depth = 0) {
  if (!value || typeof value !== "object" || depth > 20) return value;
  if (Array.isArray(value)) { value.forEach((v) => clean(v, depth + 1)); return value; }
  for (const key of Object.keys(value)) {
    if (unsafeKey(key)) delete value[key];
    else clean(value[key], depth + 1);
  }
  return value;
}

function stripOperators(req, res, next) {
  clean(req.body);
  clean(req.params);
  // req.query is a getter in newer Express versions: clean the object it returns in place.
  clean(req.query);
  next();
}

module.exports = { stripOperators };
