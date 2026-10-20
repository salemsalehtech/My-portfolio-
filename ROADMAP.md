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
| Known gap | Hero name/tagline/rotating titles and the Contact/Footer social links are still hardcoded (`translations.js`, `Contact.jsx`, `Footer.jsx`) — violates rule 1. The About section is now fully dashboard-managed. |
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
4. **Unlock GitHub Actions** (billing lock) so deploys are automatic again; then set Pages source back to "GitHub Actions" and delete the `gh-pages` branch.
5. ~~1.3 SEO + Open Graph~~ — done (a landscape 1200×630 share image is still to make).
6. **Finish Wave A:** USP + case studies, "About me" video.
7. **Contact notification email** via an HTTP email API (Resend) — also notifies new pending testimonials.
8. **2.1 + 2.2 Backend comments.**
9. **1.2 + 2.5 PDFs** — write after the code they document is stable.
10. **2.6** whenever a custom domain is bought.

---

## Phase 1 — Frontend (cleanup & basics) · ~1–2 weeks

**Goal:** open any React file and understand it; site looks professional when shared.

- [x] **1.1 Reorganize/simplify `client/src`** for readability (beginner-friendly comments, split oversized files) **without** changing visual design or behavior. Done — see [FRONTEND_CLEANUP_NOTES.md](FRONTEND_CLEANUP_NOTES.md). Manual QA done 2026-10-19 (found + fixed: section headers/tabs stuck invisible — missing `useReveal` refs in Skills/Projects/YouTube/Contact).
  - *Deliverable:* commented code + `FRONTEND_CLEANUP_NOTES.md`.
  - *Learn:* Components / Props / State, React Router basics, component vs. hook, Git branch/commit.
- [ ] **1.2 Frontend PDF** — beginner-friendly PDF documenting every file and component.
  - *Deliverable:* reference PDF to return to while learning or adding features.
  - *Learn:* reading technical docs and mapping them line-by-line to real code.
- [x] **1.3 Basic SEO + Open Graph** *(done 2026-10-19)* — meta title/description + OG tags in `client/index.html`.
  - *Deliverable:* shared links on Facebook/LinkedIn show image, title, and description.
  - *Learn:* SEO basics, what Open Graph is and why it matters for a personal brand.

## Phase 2 — Backend, database, deployment · ~2–3 weeks

**Goal:** live site fully working end-to-end; understand how backend and database fit together.

- [ ] **2.1 Explain backend security middleware** — add clear comments above `helmet()` (`app.js`) and both rate limiters (`routes/auth.js`, `routes/contact.js`) explaining what each does and why it exists. **Do not disable them** (rule 6). JWT auth unchanged.
  - *Deliverable:* security layer readable by a beginner, protection still on.
  - *Learn:* Express middleware; authentication vs. rate limiting vs. security headers.
- [ ] **2.2 Comment every file in `server/src`** — explanation above every route and Mongoose model.
  - *Deliverable:* fully documented `server/src`.
  - *Learn:* REST API concepts; the routes / models / middleware pattern.
- [x] **2.3 Database decision: MongoDB** — done, no action needed.
  - *Learn:* SQL vs. NoSQL; Documents / Collections in MongoDB.
- [x] **2.4 Deploy backend to Render** *(done 2026-10-19)* — owner creates Render + MongoDB Atlas accounts; set environment variables together; update `VITE_API_URL` in `client/.env.production`; full Manual QA on the live site.
  - *Deliverable:* live site fully working — data display, Contact form, admin login.
  - *Learn:* environment variables, how frontend talks to backend over an API, deployment basics.
- [ ] **2.5 Backend PDF** — same idea as 1.2, for backend + database.
  - *Deliverable:* reference PDF for the backend.
  - *Learn:* connecting API docs to real usage from the frontend.
- [ ] **2.6 Custom domain** *(later, once purchased)* — DNS records, enable domain in GitHub Pages, set `base` in `vite.config.js` back to `"/"`, update `CLIENT_ORIGIN`.
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
- [ ] **USP statement + case studies** — one differentiating line; projects presented as problem → solution → result.
- [x] **Filter projects by tag** — buttons built from the projects' own tags (replaced the hardcoded category buttons). *Done 2026-10-19.*
- [x] **CV download button** — PDF uploaded at `/admin/cv`, stored in MongoDB; button shown only when a CV exists. *Done 2026-10-19.*
- [ ] **"About me" video** — in About; video link set from the dashboard.

### Wave B — medium (needs external integrations) · ~1–2 months after Wave A

- **Technical blog** — improves SEO and reputation as developer/teacher.
- **Certificates / achievements** — course certificates (e.g. DEPI) and achievements.
- **Newsletter signup** 🔒 — notify visitors of new course/product/article.
- **Course / social-media content section** — course summary + files + exercises.
- **Visitor analytics in admin** — visitor count and most-viewed pages inside `/admin`.
- **Lightweight visitor chat widget** 🔒 — very simple; fully separate from any other chat system (not UniConnect).

### Wave C — furthest (payments, scheduling, business logic) · 2+ months

- **Digital products store** 🔒 — purchase + download; needs payments and secure file storage.
- **Online booking / calendar** 🔒 — clients book a call directly.
- **Project intake form** 🔒 — captures requirements; may merge with booking later.
- **Services + pricing page** — idea not finalized yet.
- **Additional product listings** — details decided after the first store is stable.
