// analytics.js — the visitor counters: how routes/analytics.js stores a referrer in a day's
// DailyStat document, and how the dashboard's report (GET /api/admin/analytics) adds the days up.
const { DailyStat, Project, Post } = require("./mongo");
const { cairoDate } = require("./dates");

// Mongoose map keys can't contain "." — store "linkedin.com" as "linkedin．com" (full-width dot).
const toKey = (host) => host.replace(/\./g, "．");
const fromKey = (key) => key.replace(/．/g, ".");

// Adds every { key: count } of `map` into `total`.
function addCounts(total, map) {
  for (const [key, count] of Object.entries(map || {})) total[key] = (total[key] || 0) + count;
}
const topList = (counts, limit = 10) =>
  Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit);

// The last `days` days (today included) summed into: one row per day (for the chart), totals,
// and the top sections / projects / referrers / posts.
async function analyticsReport(days) {
  const dates = [];
  for (let i = days - 1; i >= 0; i--) dates.push(cairoDate(new Date(Date.now() - i * 24 * 60 * 60 * 1000)));
  const docs = await DailyStat.find({ date: { $in: dates } }).lean();
  const byDate = Object.fromEntries(docs.map((d) => [d.date, d]));

  const totals = { visits: 0, mobile: 0, desktop: 0, langEn: 0, langAr: 0, cvDownloads: 0, whatsappClicks: 0 };
  const sections = {}, projects = {}, referrers = {}, posts = {};
  for (const doc of docs) {
    for (const field of Object.keys(totals)) totals[field] += doc[field] || 0;
    addCounts(sections, doc.sections);
    addCounts(projects, doc.projects);
    addCounts(referrers, doc.referrers);
    addCounts(posts, doc.posts);
  }

  // Blog post slugs -> current titles.
  const topPosts = topList(posts);
  const foundPosts = await Post.find({ slug: { $in: topPosts.map(([slug]) => slug) } }).select("slug titleEn titleAr").lean();
  const postTitles = Object.fromEntries(foundPosts.map((p) => [p.slug, p.titleEn || p.titleAr]));

  // Project ids -> current titles (a deleted project shows as "(deleted project)").
  const topProjects = topList(projects);
  const found = await Project.find({ _id: { $in: topProjects.map(([id]) => id) } }).select("titleEn titleAr").lean();
  const titles = Object.fromEntries(found.map((p) => [String(p._id), p.titleEn || p.titleAr]));

  return {
    days,
    daily: dates.map((date) => ({ date, visits: (byDate[date] && byDate[date].visits) || 0 })),
    totals,
    sections: topList(sections).map(([name, count]) => ({ name, count })),
    projects: topProjects.map(([id, count]) => ({ id, title: titles[id] || "(deleted project)", count })),
    referrers: topList(referrers).map(([key, count]) => ({ host: fromKey(key), count })),
    posts: topPosts.map(([slug, count]) => ({ slug, title: postTitles[slug] || "(deleted post)", count })),
  };
}

module.exports = { toKey, analyticsReport };
