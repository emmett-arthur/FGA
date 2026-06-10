# FGA — Francesca Arthur

Marketing site for **FGA** — underwater inspection and marine construction.
Static HTML/CSS/JS. No build step, no framework. Designed to be hosted on
**GitHub Pages** and easy to maintain.

---

## Structure

```
index.html            Main single-page site (hero → services → about → bridge → work → contact)
journal.html          Journal index (lists all posts)
entry.html            Renders a single journal post
css/style.css         All styles (shared across every page)
js/site.js            Tidal hero animation, theme-aware nav, mobile menu
js/journal.js         Loads + renders journal posts from Markdown
assets/urchin.svg     The urchin mark (logo + favicon)
journal/
  entries.json        The ordered list of posts (newest first)
  entries/            One Markdown file per post + its photos
    TEMPLATE.md       Copy this to start a new post
.nojekyll             Tells GitHub Pages to serve files as-is
```

---

## Adding a journal post

The journal is **Markdown-driven**, so a post is just a text file plus its
photos. Francesca can write the post in any plain-text/Markdown editor and
send it over with the images; dropping it in takes about a minute.

**1. Add the post file.** Put a new `.md` file in `journal/entries/`.
Name it `YYYY-MM-DD-short-title.md` (e.g. `2025-03-12-pier-9-survey.md`).
The easiest start is to copy `journal/entries/TEMPLATE.md`.

The top of the file is the "front matter":

```markdown
---
title: Pier 9 — spring survey
date: 2025-03-12
location: Hudson River, NYC
tag: Inspection
---

The post body goes here, in plain paragraphs.

![Optional photo caption](pier-9-east-face.jpg)
```

**2. Add the photos.** Drop the image files into the **same**
`journal/entries/` folder and reference them by filename only —
`![caption](pier-9-east-face.jpg)`. No paths needed.

**3. List it.** Open `journal/entries.json` and add the filename (without
`.md`) to the top of the list — top = newest = shown first:

```json
[
  "2025-03-12-pier-9-survey",
  "2024-11-14-pier-43-condition-report",
  ...
]
```

That's the whole process: **drop in the file, drop in the photos, add one
line to the list.** Commit and push, and it's live.

### Front-matter fields

| Field      | Required | Notes                                                        |
|------------|----------|--------------------------------------------------------------|
| `title`    | yes      | The headline                                                 |
| `date`     | yes      | `YYYY-MM-DD` — displayed as `2025.03.12`                      |
| `location` | no       | Shown in the metadata column                                 |
| `tag`      | no       | e.g. `Inspection`, `Field Note`, `Condition Report`          |
| `cover`    | no       | Thumbnail filename; defaults to the first photo in the post  |
| `excerpt`  | no       | Custom preview text; defaults to the first paragraph         |

---

## Editing the main page

All the homepage copy lives directly in `index.html` as plain HTML — edit
the text in place. A few things worth knowing:

- **Profile photo (About):** find the `.about-photo` block and follow the
  comment there — add your image to `assets/` and set it as the frame's
  background image.
- **Contact details:** the email, phone, Cal.com link and LinkedIn are in
  the `#contact` section near the bottom of `index.html`. The phone and
  LinkedIn are placeholders (`+1 (212) 000-0000`) — swap in the real ones.
- **Hero animation:** tuneable values (density, speed, trail length) are
  documented at the top of `js/site.js` in the `initTidalCanvas` function.

---

## Previewing locally

The journal loads files with `fetch`, which browsers block when you open
`index.html` straight from disk (`file://`). Run a tiny local server
instead, from this folder:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. (Any static server works.)

---

## Publishing on GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to *Deploy from a branch*,
   choose your branch (e.g. `main`) and the `/ (root)` folder, and save.
4. GitHub gives you the live URL. Every push updates the site.

To use a custom domain later, add a `CNAME` file containing the domain and
point the domain's DNS at GitHub Pages.

---

## Fonts & colours (for reference)

- **Wordmark:** Instrument Sans 500
- **Section headers:** Cormorant Garamond italic
- **Body:** EB Garamond
- **Data / labels:** Space Mono
- **Palette:** linen `#F5F2EC` · navy `#0E1B35` · sky `#6EA3D4`
