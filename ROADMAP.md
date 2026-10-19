# ROADMAP.md

Execution plan for this portfolio: standing rules, current status, timeline, and phased backlog. Technical architecture lives in [CLAUDE.md](CLAUDE.md) — this file covers *what to build next and how to work*, not how the code is structured.

> **Source of truth.** This file is the single authoritative plan. [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) is the original Arabic planning notes + archive of prompts already sent; if the two disagree, this file wins. Update task checkboxes here when a task is done.
>
> **Repo:** the git remote is `github.com/solx4/My-portfolio-` (GitHub Pages origin `https://solx4.github.io`, matching `CLIENT_ORIGIN` in `render.yaml`). Older prompts/PDFs reference `salemsalehtech/My-portfolio-` — if the repo moves, update `CLIENT_ORIGIN` too or CORS will block the live site.

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
| Deployment | Frontend auto-deploys to GitHub Pages on push to `main`. **Backend not deployed yet** — `client/.env.production` still holds a placeholder `VITE_API_URL`, so the live site currently shows no projects/skills/videos and Contact + admin login fail. |
| Known gap | About bio, education, location, interests, and hero tagline are hardcoded in `client/src/i18n/translations.js` — violates rule 1 (see Wave A, item A0). |
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
2. **2.4 Deploy backend** — highest value: the live site is broken until this ships.
3. **1.3 SEO + Open Graph** — small task, visible win.
4. **2.1 + 2.2 Backend comments.**
5. **1.2 + 2.5 PDFs** — write after the code they document is stable.
6. **Wave A**, starting with **A0**.
7. **2.6** whenever a custom domain is bought.

---

## Phase 1 — Frontend (cleanup & basics) · ~1–2 weeks

**Goal:** open any React file and understand it; site looks professional when shared.

- [x] **1.1 Reorganize/simplify `client/src`** for readability (beginner-friendly comments, split oversized files) **without** changing visual design or behavior. Done — see [FRONTEND_CLEANUP_NOTES.md](FRONTEND_CLEANUP_NOTES.md). Manual QA done 2026-10-19 (found + fixed: section headers/tabs stuck invisible — missing `useReveal` refs in Skills/Projects/YouTube/Contact).
  - *Deliverable:* commented code + `FRONTEND_CLEANUP_NOTES.md`.
  - *Learn:* Components / Props / State, React Router basics, component vs. hook, Git branch/commit.
- [ ] **1.2 Frontend PDF** — beginner-friendly PDF documenting every file and component.
  - *Deliverable:* reference PDF to return to while learning or adding features.
  - *Learn:* reading technical docs and mapping them line-by-line to real code.
- [ ] **1.3 Basic SEO + Open Graph** — meta title/description + OG tags in `client/index.html`.
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
- [ ] **2.4 Deploy backend to Render** — owner creates Render + MongoDB Atlas accounts; set environment variables together; update `VITE_API_URL` in `client/.env.production`; full Manual QA on the live site.
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

- **A0. Site content from dashboard** — move About bio/education/location/interests, hero tagline, and CV link out of `translations.js` into an admin-editable "site settings" resource (fixes the rule 1 gap).
- **Testimonials + post-project client feedback form** 🔒 — feedback shows as a testimonial after owner approval.
- **Offered Services section** — what services are offered.
- **USP statement + case studies** — one differentiating line; projects presented as problem → solution → result.
- **Filter projects by tag** — `Project.tags` already exists; mostly a UI change.
- **CV download button** — PDF link set from the dashboard.
- **"About me" video** — in About; video link set from the dashboard.

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
