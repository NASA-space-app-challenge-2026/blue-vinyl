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
| `--bg`, `--bg-deep` | Backdrop, drawn as a radial gradient from the center outward. Warm brown by default; while a cover is shown, its main color darkened (see below) |
| `--ink` | Primary text |
| `--ink-muted` | Secondary text: inactive tracks, hint, credit |

The backdrop takes the main color of the cover the sleeve shows (`src/features/album/presentation/backdrop.js`): the cover is shrunk, its pixels grouped by like color, and the largest group averaged. That color is mixed with black until it is no lighter than the default backdrop, so the light text stays readable, and the rim darker still. It fades over about a second when the cover changes.

The record, label and tonearm use fixed dark and silver tones in `src/features/turntable/presentation/turntable.css`; they depict physical materials and do not follow the page tokens.

## Layout

- Full-viewport stage; nothing scrolls on desktop.
- The sleeve is tilted a little and tucked **behind** the record. The record overlaps the sleeve's right edge; the title and track list wrap before it so no text hides behind the record.
- Each album's sleeve has its own angle between -6deg and -2deg, picked from its place in the catalog, so the sleeves differ but each always looks the same. A sleeve never stands straight.
- Hovering the mouse over the sleeve leans it a few degrees in 3D toward the pointer, like a card in the hand; it eases back when the mouse leaves.
- The sleeve has a dark gradient at the bottom so the title and track list stay readable over any cover photo.
- The sleeve shows the current track's cover when the track has one, else the album's; it fades from one to the next as the tracks change.
- Top right: a glass capsule with the fullscreen and settings buttons. Bottom left: a glass capsule with play/pause and volume, and next to it a capsule with the previous/next album chevrons (left/right). Bottom center: the play hint. Bottom right: the credit of the cover shown and the globe's map/imagery attribution.
- At 760px wide and below, the sleeve and the record stack vertically and the page scrolls.

## Record

Geometry is defined once in `src/features/turntable/domain/geometry.js`, in vinyl radii (record centre at the origin, edge at 1), and shared by drawing and tonearm math. Drawing sizes and colors live in `src/features/turntable/presentation/turntable-view.js`.

- **Grooves** run from the outer edge (start of the album) to the inner edge (end of the album), evenly pitched, so the needle's radius falls linearly with progress.
- **Track boundaries** are drawn as brighter grooves. The width of each band is proportional to the track's duration.
- **Glints**: faint bright arcs scattered over the grooves. They turn with the record, which makes the spin visible.
- **Sheen**: two opposite reflections of a light at the upper left (a wide soft wedge and a narrow bright one each). They stay still while the record spins under them.
- **Platter** runs at 33⅓ rpm. It spins up when the needle sets down and coasts to a stop when it lifts.
- **Label** is a large center area that hosts the globe. It starts exactly at the innermost groove, with no gap. It is an HTML layer between the vinyl (SVG) and the tonearm (SVG), clipped to a circle, so features can mount canvases into the label slot.
- **Progress ring** runs round the label rim: one full turn per track, from 12 o'clock clockwise. A faint rail is filled in white as far as the track has played, with a white handle (with a soft shadow) at the head. Clicking the ring plays the current track from that point; the fill and handle glide there rather than jump. A new track starts the ring at once.
- **Globe** is rendered with [globe.gl](https://github.com/vasturiano/globe.gl) (MIT, no API key), loaded as the pinned UMD bundle in `index.html`. It is lit flat (ambient light only) like a printed map, has no atmosphere and does not spin with the record. Its fitted size fills the label edge to edge. Drag rotates it; scrolling zooms in, and zooming out stops at the fitted size so no gap opens between the globe and the grooves.

## Globe Themes

Chosen in the settings menu. Themes are listed in `GlobeTheme` (`src/features/globe/domain/globe-theme.js`) and their sources in `src/features/globe/data/globe-themes.js`.

| Theme | Source | Look |
| --- | --- | --- |
| Map (default) | Esri World Dark Gray Base tiles | Gray land with borders and country names on a dark sea |
| Satellite | NASA Blue Marble image | Desaturated with a CSS filter so it sits in the dark theme |

- The attribution of the active theme is always shown at the bottom right. Esri tiles require it.
- Neither source needs an API key.

## Tonearm

- Chrome arm pivoting at about 1 o'clock on a dark base: ringed counterweight, gimbal, pivot cap, a tube that runs straight and then bends, and a headshell turned toward the centre with a cartridge, needle and finger lift.
- It reads the right side of the record. At rest the needle sits just off the record's right edge.
- It eases (exponentially) between positions instead of jumping: onto the groove when cued, back to rest when lifted. While playing it follows the groove for the current position.
- The listener can grab and drag it. While held, the clock stops and the needle position scrubs the album; released over the record, playback resumes from there; released off it, the arm returns to rest.

## Interaction

| Input | Action |
| --- | --- |
| Space | Play / pause |
| Click on the record grooves | Play / pause |
| Click on the progress ring | Play the current track from that point; sets the arm down first when stopped |
| Drag the tonearm | Scrub; drop on the record to play from there, off it to stop |
| Drag on the globe | Rotate the globe |
| Scroll on the globe | Zoom in / out (out to the fitted size) |
| Play button (bottom left) | Play / pause, same as Space |
| Volume button (bottom left) | First click expands it into a slider; while expanded, the speaker toggles mute. It folds back into one button after a short idle time without the mouse or keyboard focus on it |
| Left / right chevrons (bottom left) | Previous / next album; wraps around at either end. Switching lifts the arm and resets the position to the start. Clicks during the change add more steps |
| Fullscreen button (top right) | Enter / exit fullscreen; hidden where the browser has no fullscreen support |
| Settings button (top right) | Open the settings menu; Escape or a click outside closes it |

Playback states (`PlaybackState`): `stopped` → `cueing` (arm eases on) → `playing` (record spins, arm tracks progress). Pausing lifts the arm back to rest and keeps the position. Grabbing the arm enters `scrubbing` from any state.

Volume sets the level of the music (see the album docs in [albums/](albums/) for what plays). Language, view options and notes will be added in later issues. Albums other than the first are placeholders.

## Changing Albums

The sleeves stand in a vertical column in catalog order, like pages: the previous album above the current one and the next below, each a viewport height away. Changing records plays in order (`record-swap.js`):

1. The record (vinyl and globe label, not the tonearm) shrinks and lifts off the platter clear of the sleeve, then slides into it.
2. The column moves one place, carrying the record off with its sleeve: up for the next album, down for the previous one. It moves like a toss, fast off the mark and slowing to land: the leaving sleeve spins away, and the new sleeve spins in, swings a little past its own album's angle and settles on it.
3. The albums shift back by one at once, so the record is now in the new sleeve, and it is drawn back out onto the platter.

Only CSS `translate` and `scale` animate, so the layout and the sleeve's tilt stay put. The stage cannot be touched while it plays.

## Controls

The on-screen buttons are segments of liquid-glass capsules (`src/features/controls/presentation/glass.css`), split by faint hairlines: a translucent white gradient over a blurred, saturated backdrop, with a bright inner top edge. The bottom-left capsule grows to the right when the volume slider opens. The glass is static; it does not react to the pointer. Icons are defined once in `ControlIcon` (`control-icons.js`).
