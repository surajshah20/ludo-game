# 🎲 Ludo

A fully playable Ludo game built with plain HTML, CSS, and JavaScript — no frameworks, no build step, no external assets. Open it and play.

**[Live demo](https://surajshah20.github.io/ludo-game/)** *(enable GitHub Pages in the repo settings to activate this link — see below)*

## Features

- **Real rules** — roll a 6 to leave base, exact-count finishing, capturing on unsafe cells, safe/star squares, an extra turn on a 6/capture/finish, and a forfeited turn on three sixes in a row.
- **2–4 players**, any mix of human and computer — play solo against the CPU or pass-and-play locally.
- **Simple AI** that prioritizes finishing a token, then capturing, then getting new tokens out, then general progress.
- **Animated board** — tokens slide, bounce on landing, and shake-and-flee back to base when captured.
- **A real 3D dice** — a CSS cube that tumbles and lands on the rolled face, no images required.
- **Generated sound effects** — every sound (roll, move, capture, finish, win) is synthesized on the fly with the Web Audio API, including a reverb tail. Nothing to download.
- **Fully responsive** — the board measures the available space and resizes to fit any screen without scrolling or clipping.

## Running it

No build step, no dependencies. Just open `index.html` in a browser, or serve the folder with any static server, e.g.:

```bash
npx serve .
# or
python3 -m http.server 5500
```

## Project structure

```
├── index.html   # markup + setup/game/win screens
├── style.css    # all styling, animations, board layout
├── script.js    # board data, game rules, AI, rendering, sound
└── dice_images/ # legacy pip images (not used by the current 3D dice, kept for reference)
```

## How the board works

The board is generated from coordinate data in `script.js` rather than hand-placed HTML: a 56-cell shared loop (`COMMON_PATH`), four 5-cell home stretches, and four yards. Positions are tracked as a single integer per token (`-1` = in base, `0–54` = on the shared loop, `55–59` = home stretch, `60` = finished), so movement, capturing, and win checks are all simple arithmetic on that number.

## License

Personal project — feel free to fork and adapt.