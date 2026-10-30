# ROADMAP.md

Execution plan for this portfolio: standing rules, current status, timeline, and phased backlog. Technical architecture lives in [CLAUDE.md](CLAUDE.md) — this file covers *what to build next and how to work*, not how the code is structured.

> **Source of truth.** This file is the single authoritative plan. [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) is the original Arabic planning notes + archive of prompts already sent; if the two disagree, this file wins. Update task checkboxes here when a task is done.
>
> **Repo:** the live repo is `github.com/salemsalehtech/My-portfolio-` (the old `solx4` name redirects to it). GitHub Pages is served from `https://salemsalehtech.github.io/My-portfolio-/`, so `CLIENT_ORIGIN` in `render.yaml` must be `https://salemsalehtech.github.io` (origin only, no path) or CORS will block the live site. If the account/repo is renamed again, update `CLIENT_ORIGIN` too.

---

## Project Constitution

Standing rules that apply to **every** future task.

1. **Dashboard-only content.** Any current or future feature must be fully manageable from `/admin` (create/edit/delete) — never hardcoded in code. Every new resource follows:
   **model → public API route → admin CRUD route → admin page → display section.**
2. **Database.** Staying on MongoDB (already in place) — flexible enough to add any future feature as a separate collection without restructuring existing ones.
3. **Prompt format.** Every prompt written for Claude Code should be in English, structured as:
   **Role / Context / Task / Constraints / Output / Acceptance Criteria.**
4. **Safety checkpoint.** Any task touching already-working code starts with a Git branch or commit, so it's easy to roll back.
5. **Manual QA.** There is no automated test suite, so every significant task ends with a short manual checklist the owner runs before considering it done (all pages open, EN/AR toggle, light/dark toggle, admin login, test Contact submission).
6. **Security stays on.** Rate limiting (login + contact) and `helmet` are **not** disabled — the Contact form and admin login are already public, so turning them off would expose the live site to brute-force and spam. Task 2.1 explains them with comments instead. Every new public form (marked 🔒 below) must get its own rate limiter before it ships.

---

## Current Status

*Last verified 2026-10-18 — re-check before relying on it.*

| Area | State |
|---|---|
| Frontend | React 18 + Vite. Public portfolio (Hero / About / Skills / Projects / YouTube / Contact) + full admin dashboard (Projects, Skills, YouTube, Messages). Cleanup pass (1.1) done. |
| Backend | Express + Mongoose/MongoDB, JWT auth, rate limiting, helmet, nodemailer. |
| Language | Bilingual (EN/AR) throughout data and UI. |
| Deployment | **Live (2026-10-19).** Frontend: `https://salemsalehtech.github.io/My-portfolio-/`, served from the **`gh-pages` branch** (Pages source = "Deploy from a branch"). The Actions workflow `deploy-pages.yml` is blocked — GitHub account billing lock ("job was not started because your account is locked due to a billing issue", support ticket opened); until it clears, deploy by hand: `cd client && npm run build`, then push `client/dist` (+ `.nojekyll`) to `gh-pages`. Backend: Render free web service `https://salem-portfolio-server.onrender.com` (auto-deploys on push to `main`; sleeps after 15 min idle, first request ~1 min), database on MongoDB Atlas (M0, network access `0.0.0.0/0`). Production env vars live in Render, never in git (`.env.*` is git-ignored except `.env.example`/`.env.production`). |
| Known issues | Contact notification email is not delivered — Render's free tier blocks outbound SMTP (587) and `SMTP_USER`/`SMTP_PASS` are placeholders; messages are still saved and readable in `/admin` → Messages. Plan: switch to an HTTP email API (e.g. Resend). |
| Known gap | None for content: every displayed text and link is now edited from the dashboard (Profile & Links covers the Hero, links, location, footer and YouTube channel). Only UI labels (buttons, section titles) live in `translations.js`, by design. |
| Theme | Light theme by default; dark theme is neutral gray (`#141414`). The visitor's choice is remembered in `localStorage`. |
| Brand | Dark navy background `#07111E`; gold accents `#E8A020` / `#C8900A`. Fonts: Outfit (headings), DM Sans (body), Tajawal (Arabic). |

---

## Timeline

Estimates assume ~5–8 hours/week alongside coursework — adjust to real availability.

| Stage | Estimate | Starts |
|---|---|---|
| Phase 1 — Frontend | ~1–2 weeks | in progress |
| Phase 2 — Backend + deployment | ~2–3 weeks | after/alongside Phase 1 |
| Wave A | — | right after Phase 2 |
| Wave B | ~1–2 months | after Wave A |
| Wave C | 2+ months | after Wave B |

## Recommended Next Steps (in order)

1. ~~Manual QA for 1.1~~ — done.
2. ~~2.4 Deploy backend~~ — done 2026-10-19.
3. **Rotate leaked secrets** — Atlas DB password, Render `JWT_SECRET`, admin password (all were pasted in chat); delete `server/.env.render` and `server/.env.atlas`. *Owner decided (2026-10-19) to postpone this until the site grows — keep reminding before big releases.*
4. **Unlock GitHub Actions** (billing lock) — *owner action, GitHub account settings* so deploys are automatic again; then set Pages source back to "GitHub Actions" and delete the `gh-pages` branch.
5. ~~1.3 SEO + Open Graph~~ — done, incl. the 1200×630 share image `client/public/og-image.jpg` (2026-10-25).
6. ~~Finish Wave A~~ — done 2026-10-25 (Profile & Links + USP, case studies, About video).
7. **Contact notification email** via Resend — *postponed by the owner (2026-10-25)*. Code is ready on branch `feat/email-resend` (needs `RESEND_API_KEY` + `SITE_URL` in Render).
8. ~~2.1 + 2.2 Backend comments~~ — done 2026-10-25 (comment-only diff, verified).
9. ~~1.2 + 2.5 PDFs~~ — done 2026-10-25: `docs/guides/frontend-guide.pdf`, `docs/guides/backend-guide.pdf` (Arabic; rebuild with `bash docs/guides/build-pdfs.sh`).
10. **Wave B** — ~~certificates~~, ~~visitor analytics~~, ~~blog~~, ~~courses~~ done; next: newsletter 🔒 (needs the email), chat 🔒.
11. **2.6** whenever a custom domain is bought.
12. **Google Search visibility** — *postponed by the owner (2026-10-25)*. Add `client/public/robots.txt` (disallow `/admin`) + `sitemap.xml`, register the site in Google Search Console (URL-prefix property, HTML-tag verification — owner sends the meta tag), submit the sitemap, Request indexing; owner links the site from LinkedIn/GitHub/YouTube. Best done together with 2.6.
13. **Wave D** — team workspace (now) → product landing pages → SaaS subscriptions; see Wave D below.

---

## Phase 1 — Frontend (cleanup & basics) · ~1–2 weeks

**Goal:** open any React file and understand it; site looks professional when shared.

- [x] **1.1 Reorganize/simplify `client/src`** for readability (beginner-friendly comments, split oversized files) **without** changing visual design or behavior. Done — see [FRONTEND_CLEANUP_NOTES.md](FRONTEND_CLEANUP_NOTES.md). Manual QA done 2026-10-19 (found + fixed: section headers/tabs stuck invisible — missing `useReveal` refs in Skills/Projects/YouTube/Contact).
  - *Deliverable:* commented code + `FRONTEND_CLEANUP_NOTES.md`.
  - *Learn:* Components / Props / State, React Router basics, component vs. hook, Git branch/commit.
- [x] **1.2 Frontend PDF** *(done 2026-10-25 — `docs/guides/frontend-guide.pdf`)* — beginner-friendly PDF documenting every file and component.
  - *Deliverable:* reference PDF to return to while learning or adding features.
  - *Learn:* reading technical docs and mapping them line-by-line to real code.
- [x] **1.3 Basic SEO + Open Graph** *(done 2026-10-19)* — meta title/description + OG tags in `client/index.html`.
  - *Deliverable:* shared links on Facebook/LinkedIn show image, title, and description.
  - *Learn:* SEO basics, what Open Graph is and why it matters for a personal brand.

## Phase 2 — Backend, database, deployment · ~2–3 weeks

**Goal:** live site fully working end-to-end; understand how backend and database fit together.

- [x] **2.1 Explain backend security middleware** *(done 2026-10-25)* — add clear comments above `helmet()` (`app.js`) and both rate limiters (`routes/auth.js`, `routes/contact.js`) explaining what each does and why it exists. **Do not disable them** (rule 6). JWT auth unchanged.
  - *Deliverable:* security layer readable by a beginner, protection still on.
  - *Learn:* Express middleware; authentication vs. rate limiting vs. security headers.
- [x] **2.2 Comment every file in `server/src`** *(done 2026-10-25)* — explanation above every route and Mongoose model.
  - *Deliverable:* fully documented `server/src`.
  - *Learn:* REST API concepts; the routes / models / middleware pattern.
- [x] **2.3 Database decision: MongoDB** — done, no action needed.
  - *Learn:* SQL vs. NoSQL; Documents / Collections in MongoDB.
- [x] **2.4 Deploy backend to Render** *(done 2026-10-19)* — owner creates Render + MongoDB Atlas accounts; set environment variables together; update `VITE_API_URL` in `client/.env.production`; full Manual QA on the live site.
  - *Deliverable:* live site fully working — data display, Contact form, admin login.
  - *Learn:* environment variables, how frontend talks to backend over an API, deployment basics.
- [x] **2.5 Backend PDF** *(done 2026-10-25 — `docs/guides/backend-guide.pdf`)* — same idea as 1.2, for backend + database.
  - *Deliverable:* reference PDF for the backend.
  - *Learn:* connecting API docs to real usage from the frontend.
- [ ] **2.6 Custom domain** — and switch to clean URLs (BrowserRouter + GitHub Pages 404.html fallback) so blog posts can be indexed by Google; keep old `/#/…` links (feedback links already sent to clients) redirecting. *(later, once purchased)* — DNS records, enable domain in GitHub Pages, set `base` in `vite.config.js` back to `"/"`, update `CLIENT_ORIGIN`.
  - *Deliverable:* site on own domain instead of the GitHub URL.
  - *Learn:* DNS basics (A record / CNAME), how a domain points to hosting.

---

## Phase 3 — Future backlog (3 priority waves) · 3+ months

Every item follows rule 1 (dashboard-managed). Waves are ordered by proximity and ease, not by type.
🔒 = adds a public form → needs its own rate limiter before shipping (rule 6).

### Wave A — nearest (repeats an existing pattern) · right after Phase 2

- [x] **A0. About section from dashboard** — `/admin/about`: headings, bio, info rows, stat cards, interests (EN/AR, add/remove/reorder). *Done 2026-10-19.* Hero tagline still hardcoded (see Known gap).
- [x] **Testimonials** — `/admin/testimonials` (rating, visible/hidden, order). *Done 2026-10-19.*
- [x] **Client feedback form** 🔒 — links `/#/feedback/en` and `/#/feedback/ar` (copy them from Admin → Testimonials); submissions arrive hidden + "Pending" and go live on "Approve". Rate limited (5 successful/hour/IP), honeypot. *Done 2026-10-19.*
- [x] **Offered Services section** — `/admin/services` (built-in icons, EN/AR, visible/order); section "What I Offer" after About. *Done 2026-10-20.*
- [x] **USP statement + case studies** — USP line in Admin → Profile & Links (shown under the Hero tagline); per-project problem → solution → result in Admin → Projects, shown in the project popup. *Done 2026-10-25.*
- [x] **Profile & Links** — Hero greeting/name/rotating titles/tagline, email, GitHub/LinkedIn/YouTube links (http(s) only), location, footer role, YouTube channel text: `/admin/settings`. *Done 2026-10-25.*
- [x] **Filter projects by tag** — buttons built from the projects' own tags (replaced the hardcoded category buttons). *Done 2026-10-19.*
- [x] **CV download button** — PDF uploaded at `/admin/cv`, stored in MongoDB; button shown only when a CV exists. *Done 2026-10-19.*
- [x] **"About me" video** — YouTube link in Admin → About (YouTube links only), embedded via youtube-nocookie. *Done 2026-10-25.*

### Wave B — medium (needs external integrations) · ~1–2 months after Wave A

- [x] **Technical blog** — `/admin/posts` (+ editor with Markdown preview): EN/AR title/summary/body, unique slug, tags, draft/published, cover picture; site: "Latest articles" (3 newest) on the home page + navbar link, `/#/blog` (tag filter) and `/#/blog/:slug`. Markdown rendered with marked + sanitized by DOMPurify, both lazy-loaded (home page unaffected). Reads counted in Analytics. *Done 2026-10-25.* ⚠ SEO: hash URLs (`/#/blog/…`) are one page for Google — clean URLs are planned with the custom domain (2.6).
- [x] **Certificates / achievements** — `/admin/certificates`: EN/AR title + issuer, date, verify link (http(s) only), picture upload (PNG/JPEG/WebP ≤ 2 MB, stored in MongoDB, type checked by magic bytes), visible/order; section after Projects + navbar link when not empty. *Done 2026-10-25.*
- **Newsletter signup** 🔒 — notify visitors of new course/product/article.
- [x] **Course / social-media content section** — `/admin/courses`: EN/AR title, description and details line ("12 lessons · Free"), platform, link (http(s) only), cover picture (same rules as certificates), visible/order; "Courses & Content" section after the blog + navbar link when not empty. *Done 2026-10-25.* Files/exercises per course can come later if needed.
- [x] **Visitor analytics in admin** — `/admin/analytics`: visits per day (SVG bar chart + table), totals, mobile/Arabic share, CV downloads, top sections / projects / referrers, 7/30/90 days. Privacy-friendly: daily counters only (no IP, no cookies), whitelisted values, rate limited; the admin and Do-Not-Track browsers are not counted. *Done 2026-10-25.*
- **Lightweight visitor chat widget** 🔒 — very simple; fully separate from any other chat system (not UniConnect).

### Wave C — furthest (payments, scheduling, business logic) · 2+ months

- **Digital products store** 🔒 — purchase + download; needs payments and secure file storage.
- **Online booking / calendar** 🔒 — clients book a call directly.
- **Project intake form** 🔒 — captures requirements; may merge with booking later. *Partly covered by the Form Builder (2026-10-30): build a "Project request" form in /admin/forms; still missing an email alert on new answers (needs the email).*
- [x] **Form Builder** — `/admin/forms`: custom forms (EN/AR title + description, up to 30 fields: short text, paragraph, email, phone, number, list, date; required flag), open/closed, public link `/#/form/<slug>[/en|ar]`; answers shown as a sheet + **Download Excel** (.xlsx, lazy-loaded `write-excel-file`). Server re-validates every answer, honeypot, 10 submissions/hour per visitor. *Done 2026-10-30.*
- **Services + pricing page** — idea not finalized yet.
- **Additional product listings** — details decided after the first store is stable.

### Wave D — Team workspace → product landing pages → SaaS (owner request 2026-10-30)

The flow: the team **builds** a project in the workspace → it gets a **landing page** on the site → it is **sold as a monthly subscription (SaaS)**.

Owner decisions (2026-10-30):
- A team member sees the **whole board of their projects** but can edit only **their own** tasks.
- **Only the owner creates and assigns tasks**; a member can add **to-do steps** inside their own task.
- Team pages in **Arabic and English**.
- "Done" by a member goes to **Waiting for review**; the owner approves (→ Done) or sends it back with a comment.
- Products are sold as **monthly subscriptions (SaaS)**, priced in **EGP and USD**.

Build order:
1. [x] **Team workspace, phase 1** *(done 2026-10-30)* — member accounts created by the owner (username, temporary password changed on first login, specialty, can be disabled; a login fully separate from the admin token), internal projects with a Markdown docs page, tasks (description, assignee, priority, due date, status, to-do steps), member portal `/#/team` (my tasks + project board), owner Kanban board, progress per project / member, review queue, activity log.
2. **Product landing pages** — built from blocks in the dashboard (hero, problem/solution, features, screenshots, demo video, live demo, tech, pricing EGP/USD, FAQ, reviews), per-product accent color + share image, `/#/p/<slug>`, a "Products" section on the home page, "Publish as product" from a finished workspace project. First version: "Request / subscribe" goes to a Form Builder form.
3. **SaaS subscriptions** — needs a design pass first: how each customer gets their own instance or account, recurring billing (e.g. Paymob in Egypt, a merchant-of-record platform for USD — verify terms for Egyptian sellers before choosing), trial, renewal, suspension.
1b. [x] **Brand + portal redesign** *(done 2026-10-30)* — company name **Salem Saleh Tech** (`client/src/lib/brand.js`), logo / name link back to the website, split login screen, account menu, theme + language switches, "Needs attention" box, tasks grouped by status; small "Team login" link in the site footer.
1c. [x] **Dashboard redesign** *(done 2026-10-30)* — mobile-friendly admin layout (collapsible sidebar), theme + language switches, the **whole dashboard in Arabic and English**.
1d. **Workspace efficiency** *(owner picked 2026-10-30)* — drag & drop on the board + search / filters, task comments, notifications 🔔 + due-date reminders, daily standup.
4. **Workspace phase 2** — daily standup (yesterday / today / blocked), task comments, time logging + Excel, project templates, in-app notifications (email later), points / badges / "star of the week" (can be turned off), a client progress page (read-only link).

⚠ Only sell projects the owner has the rights to (not client work unless the contract or client allows it); each product gets license / terms of use.
