# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A bilingual (English/Arabic) personal portfolio site for Salem Saleh, split into two apps:

- `client/` — React 18 + Vite SPA (the public portfolio + an admin dashboard), served on port 5173 in dev.
- `server/` — Express + Prisma REST API backed by PostgreSQL, served on port 4000 in dev.

The client's dev server proxies `/api/*` to the server (see `client/vite.config.js`), so in development both must be running.

## Commands

Client (run from `client/`):
- `npm run dev` — start Vite dev server (port 5173)
- `npm run build` — production build
- `npm run preview` — preview a production build

Server (run from `server/`):
- `npm run dev` — start API with nodemon (port 4000)
- `npm start` — start API without nodemon
- `npm run prisma:migrate` — run Prisma migrations in dev
- `npm run prisma:generate` — regenerate the Prisma client after schema changes
- `npm run seed` — run `prisma/seed.js` to seed the database

There is no test suite or lint config in either app currently.

Server requires a `.env` file (see `server/.env.example` for required vars: `DATABASE_URL`, `PORT`, `CLIENT_ORIGIN`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `NOTIFY_EMAIL`, `SMTP_*`).

## Architecture

### Server (`server/src`)

- `app.js` builds the Express app: CORS restricted to `CLIENT_ORIGIN`, JSON body parsing, and mounts one router per resource under `/api/*` (`projects`, `skills`, `youtube`, `contact`, `auth`, `admin`). A catch-all error handler returns `{ error }` JSON.
- `server.js` loads `.env` and starts the HTTP listener — keep environment/bootstrap concerns here, not in `app.js`.
- `routes/admin.js` is the single router for all authenticated CRUD (projects, skills, youtube, contact messages) — it applies `requireAuth` to the whole router via `router.use(requireAuth)`, not per-route. Public read-only versions of the same resources live in their own top-level routers (`routes/projects.js`, `routes/skills.js`, `routes/youtube.js`).
- `middleware/auth.js` — `requireAuth` validates a `Bearer` JWT (signed with `JWT_SECRET`) and attaches `req.admin`.
- `routes/auth.js` — single `POST /login` endpoint checking `AdminUser` via bcrypt and issuing a 7-day JWT.
- `lib/prisma.js` — shared Prisma client instance; `lib/mailer.js` — nodemailer wrapper used by `routes/contact.js` to notify `NOTIFY_EMAIL` on new messages (failure to send is logged, not fatal — the message is still saved).
- `express-async-errors` is required in `app.js`, so async route handlers can throw/reject without manual try/catch — errors flow to the error-handling middleware automatically.

### Data model (`server/prisma/schema.prisma`)

Five models: `Project`, `Skill`, `YoutubeVideo`, `ContactMessage`, `AdminUser`. Content models (`Project`, `Skill`, `YoutubeVideo`) each store **both** English and Arabic copy on the same row (e.g. `titleEn`/`titleAr`, `descEn`/`descAr`) plus an `order` int for manual display ordering — there's no separate translations table. When adding a new displayable field, add both language variants.

### Client (`client/src`)

- `App.jsx` defines all routing: `/` is the public `Portfolio` page; `/admin/*` is a nested layout (`AdminLayout`) guarding `AdminProjects`, `AdminSkills`, `AdminYoutube`, `AdminMessages`, with `/admin` redirecting to `/admin/projects`.
- Two React contexts drive global state: `context/SiteContext.jsx` (theme light/dark + language en/ar, persisted onto `<html>`/`<body>` classes and `document.title`) and `context/AdminContext.jsx` (admin auth state). Any component needing translated strings or theme/lang toggles should consume `useSite()`, not prop-drill.
- `i18n/translations.js` holds the `T` dictionary (`T.en`, `T.ar`) consumed via `useSite().t` — this is the only translation mechanism, there's no i18n library.
- `lib/api.js` is the sole HTTP client: a `request()` wrapper that reads `adminToken` from `localStorage`, injects it as a Bearer header when present, and throws on non-OK responses. All API calls should go through the exported `api.{get,post,put,patch,del}`, not raw `fetch`.
- `hooks/useCollection.js` is the shared data-fetching hook used by the admin pages for list+CRUD against a given `/api/admin/...` resource — check it before writing new fetch logic for an admin page.
- Public-facing sections of the portfolio (`Hero`, `About`, `Skills`, `Projects`, `Contact`, `YouTube`, etc.) live under `components/`; admin screens live under `pages/admin/`.

### Cross-cutting

- Bilingual content is doubled at the data layer (Prisma columns) and re-doubled at the UI layer (`translations.js`) — these are two independent systems; don't assume adding a language works by touching only one.
- The admin dashboard and public site are both served by the one `client` SPA and one `server` API — there's no separate admin build/deploy.
