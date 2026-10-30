# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Plan & standing rules:** read [ROADMAP.md](ROADMAP.md) before starting any task — it holds the project constitution, current phase, and prioritized backlog.

## Project overview

A bilingual (English/Arabic) personal portfolio site for Salem Saleh, split into two apps:

- `client/` — React 18 + Vite SPA (the public portfolio + an admin dashboard), served on port 5173 in dev.
- `server/` — Express + Mongoose REST API backed by MongoDB, served on port 4000 in dev.

The client's dev server proxies `/api/*` to the server (see `client/vite.config.js`), so in development both must be running.

## Commands

Client (run from `client/`):
- `npm run dev` — start Vite dev server (port 5173)
- `npm run build` — production build
- `npm run preview` — preview a production build

Server (run from `server/`):
- `npm run dev` — start API with nodemon (port 4000)
- `npm start` — start API without nodemon
- `npm run seed` — run `prisma/seed.js` to wipe and reseed `Project`/`Skill`/`YoutubeVideo`, and upsert the `AdminUser` from `ADMIN_EMAIL`/`ADMIN_PASSWORD` (the script lives under `server/prisma/` for historical reasons — the project no longer uses Prisma)

There is no test suite or lint config in either app currently.

Server requires a `.env` file (see `server/.env.example` for required vars: `MONGODB_URI`, `PORT`, `CLIENT_ORIGIN`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `NOTIFY_EMAIL`, `SMTP_*`). `server.js` fails fast at boot if `MONGODB_URI` or `JWT_SECRET` is missing.

## Architecture

### Server (`server/src`)

- `app.js` builds the Express app: `trust proxy` (one hop — Render's proxy; needed so rate limiters see real visitor IPs), `helmet()` for security headers, CORS restricted to `CLIENT_ORIGIN`, JSON body parsing (6 MB limit only on `/api/admin/cv`), and mounts one router per resource under `/api/*` (`projects`, `skills`, `youtube`, `contact`, `cv`, `about`, `testimonials`, `services`, `auth`, `admin`). A catch-all error handler returns `{ error }` JSON (Mongoose `ValidationError` → 400).
- `server.js` loads `.env`, validates required env vars, installs `uncaughtException`/`unhandledRejection` handlers, and starts the HTTP listener — keep environment/bootstrap concerns here, not in `app.js`.
- `routes/admin.js` is the single router for all authenticated CRUD (projects, skills, youtube, services, testimonials, about, cv, contact messages) — it applies `requireAuth` to the whole router via `router.use(requireAuth)`, not per-route. Public read-only versions live in their own top-level routers (`routes/projects.js`, `skills.js`, `youtube.js`, `services.js`, `testimonials.js`, `about.js`, `cv.js`). Newer resources copy only whitelisted fields from `req.body` (see `pickService` / `pickTestimonial`) — follow that for new ones.
- `routes/testimonials.js` also has the one public write endpoint besides contact: `POST /submit` for the client feedback form (`/#/feedback/en|ar`), with its own rate limiter (`skipFailedRequests`) and a honeypot field; submissions are saved `visible:false, pending:true` until approved in the dashboard.
- `middleware/auth.js` — `requireAuth` validates a `Bearer` JWT (signed with `JWT_SECRET`) and attaches `req.admin`.
- `routes/auth.js` — single `POST /login` endpoint (rate-limited) checking `AdminUser` via bcrypt and issuing a 7-day JWT.
- `lib/mongo.js` — connects to MongoDB via Mongoose and exports all the Mongoose models (see Data model below); `lib/mailer.js` — nodemailer wrapper used by `routes/contact.js` to notify `NOTIFY_EMAIL` on new messages (failure to send is logged, not fatal — the message is still saved). User-supplied fields are HTML-escaped before being interpolated into the notification email body.
- `express-async-errors` is required in `app.js`, so async route handlers can throw/reject without manual try/catch — errors flow to the error-handling middleware automatically.

### Data model (`server/src/lib/mongo.js`)

All Mongoose models are defined in one file: `Project`, `Skill`, `YoutubeVideo`, `ContactMessage`, `AdminUser`, `CvFile` (the CV PDF as a Buffer — Render's disk is wiped on deploy), `About` (single document), `Testimonial`, `Service`, `Post` (blog: Markdown bodies EN/AR, unique `slug`, `published`/`publishedAt`, cover picture like certificates; the article page and editor are `React.lazy` chunks so `marked` + `DOMPurify` never load on the home page), `DailyStat` (analytics: one document of counters per Cairo day, written with `$inc` by `POST /api/analytics/event`; no personal data), `Certificate` (picture stored as a Buffer with `select: false`; served by `GET /api/certificates/:id/image`, which overrides helmet with `Cross-Origin-Resource-Policy: cross-origin` so the github.io site can show it), `Course` (Courses & Content cards linking out to a playlist/course; cover picture exactly like certificates, `GET /api/courses/:id/image`). `Project` also has an optional picture the same way (`GET /api/projects/:id/image`; the admin project routes strip any `image` field from the form body). Team workspace: `TeamMember` (username + bcrypt hash, `mustChangePassword`, `active`), `TeamProject` (Markdown `docs`, links, members), `TeamTask` (status todo/doing/review/done, to-do `steps`, `reviewNote`), `TeamActivity`. Members log in at `/#/team` via `routes/team.js`; their JWT is signed with `JWT_SECRET + ":team"` (`middleware/teamAuth.js`) so it can never pass the admin check and vice versa; the owner side is `routes/adminTeam.js` mounted at `/api/admin/team` behind `requireAuth`. `client/src/lib/api.js` sends `teamToken` for `/team/*` calls and `adminToken` otherwise. The portal (`pages/team/`) and the owner pages (`AdminTeam*.jsx`) are `React.lazy` chunks. `Form` + `FormResponse` (Form Builder: a form has a unique `slug` and a `fields` array whose stable `key`s index each response's `answers` Map; public `GET /api/forms/:slug` and rate-limited `POST /api/forms/:slug/submit` in `routes/forms.js` re-check every answer by field type; the admin sheet exports `.xlsx` via a lazy-loaded `write-excel-file` in `client/src/lib/forms.js`). All picture uploads go through `readImageUpload()` in `routes/admin.js` (PNG/JPEG/WebP by magic bytes, max 2 MB); the client side uses `lib/readAsBase64.js`. Content models each store **both** English and Arabic copy on the same document (e.g. `titleEn`/`titleAr`, `descEn`/`descAr`) plus an `order` number for manual display ordering — there's no separate translations collection. When adding a new displayable field, add both language variants. Every model's `toJSON` transform renames Mongo's `_id` to `id` and strips `__v`, so API responses use `id` rather than `_id`.

### Client (`client/src`)

- `App.jsx` defines all routing: `/` is the public `Portfolio` page; `/admin/*` is a nested layout (`AdminLayout`) guarding `AdminProjects`, `AdminSkills`, `AdminYoutube`, `AdminMessages`, with `/admin` redirecting to `/admin/projects`.
- Two React contexts drive global state: `context/SiteContext.jsx` (theme light/dark + language en/ar, persisted onto `<html>`/`<body>` classes and `document.title`) and `context/AdminContext.jsx` (admin auth state). Any component needing translated strings or theme/lang toggles should consume `useSite()`, not prop-drill.
- `i18n/translations.js` holds the `T` dictionary (`T.en`, `T.ar`) consumed via `useSite().t` — this is the only translation mechanism, there's no i18n library.
- `lib/api.js` is the sole HTTP client: a `request()` wrapper that reads `adminToken` from `localStorage`, injects it as a Bearer header when present, and throws on non-OK responses. All API calls should go through the exported `api.{get,post,put,patch,del}`, not raw `fetch`.
- The dashboard has its own English/Arabic switch: every admin page writes English text through `t()` from `useAdminT()` (`lib/adminI18n.jsx`), and `i18n/adminAr.js` maps each English string to Arabic (missing entries fall back to English). New admin text = wrap it in `t()` and add its Arabic line. `AdminLayout.jsx` is the shell: grouped sidebar (a drawer under 960px), top bar with View site / theme / language.
- `hooks/useCollection.js` is the shared read-only list-fetching hook used by the public sections (`Projects`, `Skills`, `YouTube`) against `/api/<resource>`. Admin pages don't use it — they call `api.*` directly against `/api/admin/...` with a local `load()` function.
- Public-facing sections of the portfolio (`Hero`, `About`, `Skills`, `Projects`, `Contact`, `YouTube`, etc.) live under `components/`; admin screens live under `pages/admin/`.

### Cross-cutting

- Bilingual content is doubled at the data layer (Mongoose schema fields) and re-doubled at the UI layer (`translations.js`) — these are two independent systems; don't assume adding a language works by touching only one.
- The admin dashboard and public site are both served by the one `client` SPA and one `server` API — there's no separate admin build/deploy.

## Deployment

- Client deploys to GitHub Pages via `.github/workflows/deploy-pages.yml` on every push to `main`. Server is meant to deploy to Render via `render.yaml` (not yet deployed as of this writing).
- `client/.env.production` sets `VITE_API_URL` — the absolute URL the production build calls for `/api/*` (the dev-only Vite proxy doesn't exist in the static GitHub Pages build). **This currently holds a placeholder value.** Once the server has a real Render URL, update this file to `https://<render-service>.onrender.com/api` before the next client deploy, or the live site's data fetching, contact form, and admin login will silently fail.
