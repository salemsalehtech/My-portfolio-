// fields.js — copies only the allowed fields from a request body, so a route never passes
// arbitrary data to Mongoose: only({ a: 1, b: 2, admin: true }, ["a", "b"]) → { a: 1, b: 2 }.
// Fields missing from the body stay missing (an update then leaves them as they are).
const only = (body, fields) => Object.fromEntries(fields.filter((f) => body && f in body).map((f) => [f, body[f]]));

module.exports = { only };
