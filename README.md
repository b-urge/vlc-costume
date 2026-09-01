# VLC media player costume

The plan lives in `vlc-costume-build-plan.md`. Edit that file — on github.com with the pencil icon, or in VS Code — and commit.
Every commit to `main` rebuilds the web page from the markdown and publishes it to GitHub Pages automatically (see `.github/workflows/build.yml`).

- `vlc-costume-build-plan.md` — the plan (source of truth)
- `harness_diagram1.png`, `harness_diagram2.png` — the diagrams the plan references
- `md2html.js` — turns the markdown into the styled `index.html`; you never need to run it yourself

To preview locally (optional, needs Node): `node md2html.js vlc-costume-build-plan.md index.html`, then open `index.html`.
