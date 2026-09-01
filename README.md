# VLC media player costume

For Halloween 2026 I'm going as VLC media player. The traffic cone is a foam hat. The player is real: a 7" touchscreen strapped to my chest, driven by a Raspberry Pi 4 hidden behind it, running an actual VLC window that plays a silent loop of short videos my friends sent me. The controls work — people can pause me.

This repository holds the build plan and publishes it as a web page:

**Live plan:** https://b-urge.github.io/vlc-costume/

## How the costume works

- **One rigid slab.** The display and the Pi are bolted together and sandwiched between a black bezel and a foam-lined rear plate, so the two fragile connections (the display ribbon and the power lead) never see any strain.
- **One cable.** A USB-C power bank in a pouch on the waist strap feeds the Pi through a short right-angle cable. The display draws its power from the Pi. There is nothing else to plug in.
- **Plug in, costume on.** The Pi boots straight into VLC — maximized, muted, looping, shuffled. The SD card is locked read-only, so pulling the plug at the end of the night can't hurt it.
- **Nothing touches skin but foam.** The Pi sits in a vented foam cavity behind the plate.
- **Worn like a sandwich board.** Two shoulder straps that cross on the back plus a waist strap, all anchored to the slab's own bolts.

Runtime on a 20,000 mAh bank is roughly seven hours. Budget for the whole thing is about $250 new, or around $150 if you already own a Pi and a battery.

## What's in this repo

| File | What it is |
|---|---|
| `vlc-costume-build-plan.md` | The plan itself: bill of materials, dimensions, and the step-by-step build in six phases. **This is the file to edit.** |
| `harness_diagram1.png` | Front and back views of the harness, referenced by the plan |
| `harness_diagram2.png` | Side cross-section of the chest slab, referenced by the plan |
| `md2html.js` | Turns the markdown into the styled web page. Runs automatically; you never need to touch it. |
| `.github/workflows/build.yml` | The GitHub Actions workflow that rebuilds and publishes the page on every commit |

The web page is generated, not hand-written. Edit the markdown, never the HTML.

## Editing the plan

1. Open `vlc-costume-build-plan.md` on github.com and click the pencil icon (or edit it in VS Code and push).
2. Make your change and commit it to `main`.
3. Wait about a minute. The **Actions** tab shows a run called "Build and publish the plan"; when it turns green, the live page has your change.

To preview a change on your own computer without committing (optional, needs Node): `node md2html.js vlc-costume-build-plan.md index.html`, then open `index.html` in a browser.

## Progress

- [ ] Phase 0 — parts ordered
- [ ] Phase 1 — Pi boots into VLC on the bench
- [ ] Phase 2 — runtime measured on the battery
- [ ] Phase 3 — chest slab built
- [ ] Phase 4 — harness and cable done
- [ ] Phase 5 — wear test passed
- [ ] Phase 6 — SD card locked read-only
- [ ] Cone hat
- [ ] Videos collected (15–20 clips, 1–3 minutes each)

## Dates

- **October 11** — friends' videos due (form link: _add here_)
- **October 24** — final playlist on the Pi, filesystem locked, no more software changes
- **October 31** — Halloween

## Notes

VLC and the cone logo belong to the VideoLAN project; this is a fan costume, not affiliated with them in any way. The plan was drafted with help from Claude and adjusted as the build went along. Use anything here for your own build.
