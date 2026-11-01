## ملخص سريع

- **اللوجو:** حرفين SS مرسومين كخطوط دايرة إلكترونية (خطوط مستقيمة، زوايا 45°، ودايرة في آخر كل خط). أول دايرة دايمًا زعفراني.
- **الألوان:** حبر `#0F1215` + زعفراني `#E3A21A` + ورقي `#F3F5F7`. الزعفراني مساحة واحدة في التصميم، مش في كل حتة.
- **الخطوط:** Alexandria للعناوين (عربي وإنجليزي)، IBM Plex Sans Arabic للنص، IBM Plex Mono للعناوين الصغيرة والأرقام.
- **الشكل:** خلفية حبر عليها نقط خفيفة، لوحة زعفراني مقصوصة بزاوية 45°، وصورتك بالألوان من غير خلفية.
- **الكلام:** عربي مصري بسيط على السوشيال، وعربي واضح ومحترم في مستندات العملاء. من غير إيموجي.
- **الاستوديو:** كل الهوية في صفحة واحدة، وتنزّل منها اللوجو والصور والأغلفة والبوستات: https://claude.ai/artifact/YUftQZjsPtHCsWTbVtavgG

---

## Who this is

Salem Saleh is a software engineer who builds web apps that work in Arabic and English, and teaches how they are made, in Arabic, on YouTube. The identity has to work for both jobs: a client deciding whether to hire him, and a student deciding whether to watch. It reads as **precise and technical, but warm** — an engineer who explains.

The single idea behind everything: **a circuit trace**. Straight runs, 45° corners, a round pad where the trace ends. The SS mark is drawn from it; panels are cut at 45° like it; pads mark list items and chips.

## Logo

The mark is the letters SS drawn as two traces. The first pad (top of the first S) is `brand-saffron` in every colour version except the one-colour ones; it is where the signal starts.

| Asset | Use it on |
| --- | --- |
| `ss-mark.svg` | Light grounds (`brand-paper`, white). Ink traces, saffron first pad. |
| `ss-mark-on-dark.svg` | Ink grounds. Paper traces, saffron first pad. The default on social and video. |
| `ss-mark-saffron.svg` | Ink grounds, when the mark is a large graphic rather than a signature. |
| `ss-mark-mono-ink.svg` / `ss-mark-mono-white.svg` | One-colour printing, watermarks, embossing, on top of photos. |
| `lockup-horizontal(-on-dark).svg` | Mark + "Salem Saleh". Website header, document headers, email signature. |
| `lockup-bilingual(-on-dark).svg` | Mark + "Salem Saleh" over "سالم صالح" in saffron. Covers, title cards, the end of videos. |
| `lockup-stacked(-on-dark).svg` | Square-ish spaces: video end screens, merch, a slide's closing page. |
| `avatar-ink.svg` (default), `avatar-saffron.svg`, `avatar-paper.svg` | Profile pictures on every platform. The mark sits inside the centre 56%, so circle crops never cut it. Use the same one everywhere. |

Rules:
- Keep clear space of **one pad diameter** (about 12% of the mark's width) on every side.
- Smallest size: the mark **20px tall** on screens, **8mm wide** in print; the horizontal lockup **120px wide**.
- In Arabic layouts the lockup still reads left to right (mark, then the Latin name); place the whole lockup at the start edge (right).
- Never: stretch it, round the corners, recolour the traces saffron and the pad ink, add shadows or gradients, outline it, put it on saffron with the saffron pad (use `ss-mark-mono-ink` there), or set the name in another font.

## Colour

Three identity colours carry everything. Weight on any one design: about **70% `brand-ink` (or `brand-paper`), 20% neutrals, 10% `brand-saffron`**. Saffron is one area per composition — a panel, a chamfered corner, a highlighted word — never sprinkled.

- Social images, thumbnails and video frames: ground `brand-ink`, text `text` (dark), highlights `brand-saffron`.
- Documents and light pages: ground `brand-paper` or white, text `brand-ink-2`, rules and table header fills `brand-saffron` with `on-accent` text.
- Text on saffron is always `on-accent` (ink). Saffron as **text** only on ink grounds (`accent-text` dark, 8.5:1). On light grounds use `accent-text` light (`#A86C00`) and only at 19px bold or larger — it is 4.0:1.
- `text-muted` is below 4.5:1 in both themes: captions and repeated labels only.
- `success` green appears only as the availability dot, always next to its words.
- No other colours. Brand logos of tools (React, Python…) keep their own colours only inside skill lists.

## Typography

- **Display — Alexandria 700** (`display`): names, titles, numbers. Latin titles get tight tracking (`-0.03em`) and line height 1.02–1.1; Arabic titles get **no negative tracking** and line height 1.25–1.35.
- **Body — IBM Plex Sans Arabic 400/600** (`body`): all running text, both scripts.
- **Labels — IBM Plex Mono 500** (`mono`): eyebrows above titles ("Skills", "الحلقة ١"), counts, file names, document meta. Sentence case. Never all caps, never letter-spaced capitals.
- Set titles with `display-l` scaled to the format; body with `body`; eyebrows with `label`.
- Highlight **one** keyword per title in saffron. In the templates wrap it in `*stars*`.
- Latin words inside Arabic (Node.js, API, React) stay in Latin letters; never transliterate them.
- All three families are free on Google Fonts. For Word documents install them first, or send PDFs.

## Graphic elements

- **Traces:** strokes at 6.5% of the drawing's width with 45° corners and round pads (`trace-width`, `pad-radius`). Use the mark itself, scaled up and bleeding off an edge, as the large graphic.
- **The 45° cut:** panels and corners are cut, never rounded. A saffron panel with one diagonal edge, or a chamfered corner, is the brand's signature shape.
- **Dot grid:** 1.3px dots every 24–36px at 7% paper on ink (13% ink on saffron). Background texture only.
- **Pads:** a saffron dot before a label or list item replaces bullets and icons.
- **Photos:** the cut-out portrait, in colour, standing on a saffron panel with the mark behind it — exactly as in the website hero. No stock photos.
- **No emoji** anywhere: posts, documents, the site, video titles.

## Layout

- Start-aligned: left in English, right in Arabic. Centre only stacked lockups and single-line covers.
- Generous ink ground; text blocks max about 65 characters wide.
- One saffron area, one big graphic (mark or portrait), one title. If a design needs a second highlight, it needs fewer words instead.

## Social and video formats

Every template lives in `brand/templates/templates.html`; `render.ps1` exports them in Arabic and English into `brand/exports/`.

| Template | Size | Where |
| --- | --- | --- |
| `avatar-*` | 1080×1080 | Profile picture on YouTube, TikTok, Facebook, Instagram, LinkedIn, X, GitHub |
| `yt-banner` | 2560×1440 | YouTube channel art. Text stays inside the centre 1546×423 |
| `fb-cover` | 1640×624 | Facebook page cover. Keep the bottom-left 200px clear (profile picture) |
| `li-banner` | 1584×396 | LinkedIn |
| `x-header` | 1500×500 | X |
| `yt-thumb` | 1280×720 | YouTube thumbnails: title of six words or fewer, one saffron keyword, portrait on the panel |
| `vertical-cover` | 1080×1920 | TikTok, Reels and Shorts covers. Keep text out of the top 250px and bottom 300px of the app's UI zones |
| `post-tip`, `post-code`, `post-launch` | 1080×1350 | Feed posts on Instagram, Facebook, LinkedIn |
| `video-title` | 1920×1080 | Opening title card of a video |
| `lower-third` | 1920×1080, transparent | Name strap over footage |
| `video-end` | 1920×1080 | End screen; the dashed boxes are where YouTube's end-screen videos go |

Make a new one with your own words:
`render.ps1 -Only yt-thumb -Lang ar -Query "title=بناء *API* بـ Node.js&tag=الحلقة 4"`

## Client documents

Kickoff, mid-project check-in, completion summary and service contract use the same identity:
- Cover band in `brand-ink` with `lockup-horizontal-on-dark`, the document title in Alexandria 700 paper, a 3pt `brand-saffron` rule under the band.
- Headings Alexandria, body IBM Plex Sans Arabic (Arabic) or IBM Plex Sans (English), meta lines IBM Plex Mono in `text-muted`.
- Tables: header row `brand-ink` with paper text, hairlines `line` (light).
- Send PDFs to clients; keep the .docx for yourself.

## Voice

- **Social and video:** Egyptian Arabic, first person, short sentences, the way he talks on YouTube. "أبني تطبيقات ويب بتشتغل بالعربي والإنجليزي، وبشرح إزاي بتتعمل."
- **Client documents:** clear, polite Arabic close to Modern Standard, or plain English. State what will happen, by when, and what it costs.
- **English:** plain and active. "I build web apps that work in Arabic and English, and I teach how they are made."
- Name things by what people see ("your dashboard", "the booking page"), never by how they are built.
- No hype words ("revolutionary", "cutting-edge"), no emoji, no exclamation marks in titles.

## Iconography

- Tool and language logos come from Simple Icons (CC0), copied into `client/src/lib/toolIcons.js`; C# and Java are drawn there because Simple Icons has none.
- Interface icons are thin line icons (1.5px stroke, round caps) as in the dashboard sidebar.
- Never emoji as icons.

## Files

All masters live in the portfolio repository under `brand/`: `logo/` (SVG, text converted to outlines, so no font is needed to open them), `exports/` (PNG logos at several widths and every rendered template), `templates/` (the template page and its render script) and `tokens.json`. The website (`client/src/index.css`) is the reference for every value; change both together.
