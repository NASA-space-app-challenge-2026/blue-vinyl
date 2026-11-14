# Design

This document records the visual and interaction decisions for the player screen. Exact values (colors, sizes, geometry) live in code; this file names them and explains the intent. When a value changes, update the code first and this file only if the intent changes.

## Concept

One album is one LP record. The screen shows a single album at a time: the sleeve on the left, the record and tonearm on the right. Data plays from the globe in the center of the record.

## Typography

- Gowun Batang is the only typeface. Do not add another font family.
- Loaded from Google Fonts (weights 400 and 700) in `index.html`. Licensed under the SIL Open Font License 1.1.
- Referenced through the `--font` token in `src/app/app.css`. Every element inherits it from `body`; never set `font-family` elsewhere.
- Weights: 400 for body text, 700 for the album title and the active track.

| Role | Style |
| --- | --- |
| Album counter (`1 / 6`) | Regular, wide letter spacing |
| Category (`BIODIVERSITY`) | Small, uppercase, wide letter spacing |
| Album title | Largest text on screen, bold |
| Track list | Number, title and `m:ss` duration; the current track is bold and full-color, the rest muted |
| Play hint, credit | Small, muted |

## Color

Tokens are defined on `:root` in `src/app/app.css`.

| Token | Use |
| --- | --- |
| `--bg`, `--bg-deep` | Warm brown backdrop, drawn as a radial gradient from the center outward |
| `--ink` | Primary text |
| `--ink-muted` | Secondary text: inactive tracks, hint, credit |

The record, label and tonearm use fixed dark and silver tones in `src/features/turntable/presentation/turntable.css`; they depict physical materials and do not follow the page tokens.

## Layout

- Full-viewport stage; nothing scrolls on desktop.
- The sleeve is tilted by -3deg and tucked **behind** the record. The record overlaps the sleeve's right edge.
- The sleeve has a dark gradient at the bottom so the title and track list stay readable over any cover photo.
- Bottom center: the play hint. Bottom right: the cover photo credit.
- At 760px wide and below, the sleeve and the record stack vertically and the page scrolls.

## Record

Geometry is defined once in `src/features/turntable/domain/geometry.js` and shared by drawing and tonearm math.

- **Grooves** run from the outer edge (start of the album) to the inner edge (end of the album).
- **Track boundaries** are drawn as lighter rings in the grooves. The width of each band is proportional to the track's duration.
- **Label** is a large center area that hosts the globe. Features mount content into the label slot; it is clipped to a circle.
- **Progress dot** is a white dot on the label rim that travels one full turn over the album.
- **Sheen**: two soft light reflections stay still while the record spins under them.

## Tonearm

- Silver arm with counterweight, pivot cap, S-bend tube and headshell, mounted on a dark base at the top right.
- At rest it hangs straight down beside the record.
- When cued, it swings onto the groove for the current position. While playing, it moves inward with playback so the stylus always sits on the matching groove.

## Interaction

| Input | Action |
| --- | --- |
| Space | Play / pause |
| Click on the record or the tonearm | Play / pause |

Playback states (`PlaybackState`): `stopped` → `cueing` (arm swings on) → `playing` (record spins, arm tracks progress). Pausing lifts the arm back to rest and keeps the position.

There are no on-screen buttons for now. Language, view options, album switching and notes will be added in later issues.
