// passwords.js — the one password rule for every account the site creates: team members and
// savings-circle members, whether they choose it themselves or the owner sets a temporary one.
// The client translates the message word for word (pages/team/teamCopy.js, lib/circles.js),
// so change the wording there too.
const passwordProblem = (password) =>
  password.length < 8 || password.length > 100 ? "The password must be 8 to 100 characters" : null;

module.exports = { passwordProblem };
