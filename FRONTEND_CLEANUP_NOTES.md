# Frontend Cleanup Notes

This documents a readability/documentation pass over `client/src` — no visual or
behavioral changes, no new features. The goal: every file should be understandable on its
own, and the two files that mixed unrelated concerns got split so each piece has one job.

Before this pass, **zero** of the 25 JS/JSX files under `client/src` had any comments.
`server/` was not touched. `index.css` was intentionally left untouched (see "What was
deliberately left alone" below).

Every change was verified with `npm run build` in `client/` after each step; the comment-only
commits produce a byte-identical JS bundle (same output hash), and diff review confirmed
those commits contain no deletions — only added comments.

## Structural changes (the only two files that were split)

### `components/Particles.jsx` → split into `components/Particles.jsx` + `lib/particles.js`

**Before:** the whole canvas particle-animation engine (spawning particles, drawing them,
detecting nearby pairs to draw connecting lines, handling window resize) lived inside the
component's `useEffect`, mixed in with React setup code.

**After:** the engine moved into `lib/particles.js` as one exported function,
`startParticleField(canvas, getTheme)`, which returns a cleanup function. `Particles.jsx`
is now just: get a canvas ref, call `startParticleField`, return its cleanup. This matches
the existing `lib/` convention (`lib/api.js` already holds shared non-React logic).

**Why:** a beginner opening `Particles.jsx` before this change had to read canvas physics
math to understand what is otherwise a simple "mount a canvas" component. Now the component
file explains itself in a few lines, and the animation math lives in its own clearly-named
file for whoever wants to tweak the animation later.

### `hooks/useScrollTracking.js` → `scrollToSection` moved to `lib/scrollToSection.js`

**Before:** this one file exported both a stateful React hook (`useScrollTracking`, used by
`pages/Portfolio.jsx`) and an unrelated plain function (`scrollToSection`, used by
`Hero.jsx` and `Navbar.jsx` to jump to a section on click) — a hook and a non-hook bundled
together.

**After:** `scrollToSection` now lives in `lib/scrollToSection.js`. `Hero.jsx` and
`Navbar.jsx` were updated to import it from its new location.

**Why:** in this codebase, `hooks/` = stateful React hooks, `lib/` = plain shared
utilities. Keeping that boundary consistent makes it obvious where to look for (or add)
each kind of code.

## Comment-only files

Every other file under `client/src` got a short top-of-file comment (what it renders/does,
what props or data it receives, and how it fits into the rest of the app), plus a line or
two above any genuinely non-obvious logic. No JSX, class names, strings, or logic changed
in these files — only comments were added.

| File | What the comment explains |
|---|---|
| `context/SiteContext.jsx` | Theme/language global state; who should call `useSite()` and why |
| `context/AdminContext.jsx` | Admin login state; how the JWT persists across page refresh via `localStorage` |
| `lib/api.js` | Why every HTTP call should go through `api.*` instead of raw `fetch` |
| `hooks/useReveal.js` | The scroll-reveal-on-view pattern (IntersectionObserver) |
| `hooks/useCollection.js` | The shared list-fetching hook, and why it guards against stale/late responses |
| `hooks/useScrollTracking.js` | What each returned value (`scrolled`, `activeSection`, `showScrollTop`) is used for |
| `components/About.jsx`, `Footer.jsx`, `ProjectModal.jsx`, `Projects.jsx`, `ScrollTop.jsx`, `Skills.jsx`, `YouTube.jsx` | What each section renders and where its data comes from (translations vs. the API) |
| `components/Contact.jsx` | The 4-state submit flow (`idle/sending/success/error`) |
| `components/Hero.jsx` | The rotating job-title fade timer |
| `components/Navbar.jsx` | Why there are two nav renders in one file (desktop + mobile panel) |
| `i18n/translations.js` | The `T.en`/`T.ar` + `heroTitles` structure, and the rule that new strings need both languages |
| `App.jsx` | The full route map, and why `HashRouter` is used (static GitHub Pages hosting) |
| `main.jsx` | Standard Vite/React entry point, nothing app-specific here |
| `pages/Portfolio.jsx` | Pure composition root — no logic of its own |
| `pages/admin/AdminLayout.jsx` | The auth-gate + sidebar + `<Outlet />` shell for all `/admin/*` pages |
| `pages/admin/AdminLogin.jsx` | The login form's flow into `AdminContext` |
| `pages/admin/AdminMessages.jsx` | The simplest admin page — table + two actions, no form |
| `pages/admin/AdminProjects.jsx`, `AdminSkills.jsx`, `AdminYoutube.jsx` | The shared table + modal-form CRUD pattern, with `// ---- SECTION ----` comments (STATE / DATA LOADING / FORM HANDLERS / RENDER) added inside each file so the table and the form are each easy to scan without jumping files |

## What was considered but deliberately NOT done

- **Splitting the 3 admin CRUD pages into separate table/form files** — considered, since
  each mixes a table view with a modal form. Decided against it: none exceeds ~125 lines,
  the form fields are just repetitive `<label><input/></label>` blocks (not complex logic),
  and the section comments above make each one scannable as a single file. Splitting further
  would mean more files to navigate for a beginner, for little added clarity at this size.
- **Extracting a shared `AdminTable`/`AdminModal` component** across the three CRUD pages —
  the three pages are structurally similar, but building a shared abstraction would introduce
  a new pattern not used anywhere else in the app, which risks over-engineering a small
  personal project. Kept as three independent, easy-to-read files instead.
- **Splitting `Navbar.jsx`'s desktop nav and mobile panel into separate components** — it's
  the same nav content rendered twice for two screen sizes, a very common and easily
  understood pattern at 66 lines; a comment now explains why both are in one file.
- **`index.css` (336 lines, the single largest file in `client/src`)** — left completely
  untouched. It wasn't part of the requested scope (components/pages/context/hooks/i18n/lib),
  and splitting or reordering CSS carries real risk of subtle visual regressions (CSS
  cascade order matters) for no readability benefit to the React code itself. If you want a
  follow-up pass on the CSS specifically, it's a good candidate for its own separate task.
- **`i18n/translations.js` content** — only a structural comment was added; no keys, values,
  or wording were changed in either language.
