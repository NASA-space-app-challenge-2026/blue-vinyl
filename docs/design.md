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
- Each album's sleeve has its own angle between -3deg and -1deg, picked from its place in the catalog, so the sleeves differ but each always looks the same. A sleeve never stands straight.
- Hovering the mouse over the sleeve leans it a few degrees in 3D toward the pointer, like a card in the hand; it eases back when the mouse leaves.
- The sleeve's corners are rounded by 2px, just off sharp.
- The sleeve's text is sized with the sleeve, as print on a sleeve is. It sits on a dark gradient at the bottom, and every line has a soft dark shadow, so the title and track list stay readable over any cover photo.
- The sleeve shows the current track's cover when the track has one, else the album's; it fades from one to the next as the tracks change.
- Top right: a glass capsule with the fullscreen and settings buttons. Bottom left: a glass capsule with play/pause and volume, and next to it a capsule with the previous/next album chevrons (left/right). Bottom center: the play hint. The credits of the cover shown, the album's data, the instruments and the globe's map/imagery run round the record's rim, outside the grooves, turning with the record (centred at 12 o'clock at rest) and shrunk to fit if long.
- Always landscape: the screen maintains the horizontal sleeve-and-turntable layout on all viewports without vertical stacking. In portrait orientation (e.g. mobile phones held vertically), the screen is rotated 90 degrees via CSS transform so it completely fills the viewport in a forced landscape layout.

## Record

Geometry is defined once in `src/features/turntable/domain/geometry.js`, in vinyl radii (record centre at the origin, edge at 1), and shared by drawing and tonearm math. Drawing sizes and colors live in `src/features/turntable/presentation/turntable-view.js`.

- **Grooves** run from the outer edge (start of the album) to the inner edge (end of the album), evenly pitched, so the needle's radius falls linearly with progress.
- **Track boundaries** are drawn as brighter grooves. The width of each band is proportional to the track's duration.
- **Glints**: faint bright arcs scattered over the grooves. They turn with the record, which makes the spin visible.
- **Sheen**: two opposite reflections of a light at the upper left (a wide soft wedge and a narrow bright one each). They stay still while the record spins under them.
- **Platter** runs at 33⅓ rpm. It spins up when the needle sets down and coasts to a stop when it lifts.
- **Label** is a large center area that hosts the globe. It starts exactly at the innermost groove, with no gap. It is an HTML layer between the vinyl (SVG) and the tonearm (SVG), clipped to a circle, so features can mount canvases into the label slot.
- **Progress ring** runs round the label rim: one full turn per track, from 12 o'clock clockwise. A faint rail is filled in white as far as the track has played, with a white handle (with a soft shadow) at the head. Clicking the ring plays the current track from that point; the fill and handle glide there rather than jump. A new track starts the ring at once.
- **Globe** is rendered with [globe.gl](https://github.com/vasturiano/globe.gl) (MIT, no API key), loaded as the pinned UMD bundle in `index.html`. It is lit flat (ambient light only) like a printed map, has no atmosphere and does not spin with the record. By default it is seen through a narrow lens (5°) from far away, so it draws as a near-orthographic disc and shows a whole hemisphere; an album may pick globe.gl's own wide lens (50°) instead to draw the middle larger, as the glacier album does (`GlobeLens`). Its fitted size fills the label edge to edge, and the map tiles are fetched at the level the globe's size on screen needs. Drag rotates it, the grabbed point staying under the pointer; scrolling zooms in, up to 9 times the fitted size, and zooming out stops at the fitted size so no gap opens between the globe and the grooves.

## Data on the Globe

An album whose tracks have data draws each year of the playing track on the globe, in step with its music (the sound sets the clock while it plays). See [albums/glacier.md](albums/glacier.md) for what the glacier album shows.

| Element | Look | Changes |
| --- | --- | --- |
| Camera | Looks down on the track's pole | Turns there in 1.2 s when the track changes; back to the start view for an album without data |
| Ice | Pale, soft-edged layer (`232, 244, 255` at 85%) just above the surface, on a 256 × 256 grid over the pole (about 31 km a cell) | Morphs from last year's shape into this year's over the beat: it starts on the note and settles into the shape. The edge slides (blended signed distance fields); pieces too thin to slide fade in |
| Falling ice | Small soft lumps of snow, white with a pale blue rim, and a ring spreading on the water where each goes in | When a year loses ice, pieces fall from where it was lost into the water over the year's bar (as long as its chord rings), one per 20 cells of net loss (about 20,000 km²: ice lost less ice gained), at most 90. None fall when the ice grows, when the record is scrubbed, or with reduced motion |
| Ice trail | Earlier years stay behind in blue (`95, 165, 240`), blurred, at up to 60% | Each year fades with age (time constant 2.5 years, the last 6 years drawn), so the lost ice builds up around the ice that is left |
| Year | Year in bold at the top, in white with a thin black outline so it shows on ice, map and water alike | Each year |
| Sea level | The porthole of SVS 5235: water and its sliding wave drawn as one shape of one colour, a paler swell behind it that shows only above the water, and light rays | The water rises from last year's level to this year's over the bar, from the downbeat where the sea's string note sounds |

Before a track plays, the globe shows its first year. The text and water never take pointer events, so the globe stays draggable.

The forest album draws the noon line instead (see [albums/forest.md](albums/forest.md)):

| Element | Look | Changes |
| --- | --- | --- |
| Camera | Keeps the noon meridian facing the listener on the equator (fitted view) | Turns with a time constant of 0.5 s, aiming 0.5 s of travel ahead while playing so it settles on the line instead of trailing it; turned by hand, it glides back a moment after release |
| Noon meridian | A bright ribbon from 52° S to 52° N in the track's colour | Moves west a degree (0.125 s) at a time from step 0 (the legend does not hold it) |
| Notes of light | Soft round lights with a warm heart, in the colour of the voice that plays: north (flute) sky blue `#7fd0ff`, tropics (lead) gold `#ffc94d`, south (pizzicato) rose `#ff8fb1` | Each forest note lights as it sounds (only while playing), at the height-weighted heart of the forest its band plays in the degree just crossed: a glow, bigger the higher the note, that dies away in 0.9 s, and 2–5 motes of pollen that rise from that forest's cells and fade over 2–3 s. They stay where they were struck |
| Forest | Columns on 0.25° cells of the canopy map (52° S–52° N), mild relief (~5 units at 45 m), coloured after SVS 4950: bare ground tan, scrub olive, forest green to deep pine, the tallest bright leaf with pale tips; tops lighter than sides | The full map stands from the start, lit by the noon sun over the line: full light under it, dimming toward dusk a quarter of the way round. Columns under the meridian catch warm noon light |
| CO₂ field | A faint veil of soft additive tiles of the window's mean XCO2 (1°, April 2019 to March 2023), cool blue thin to warm rose thick, lifted above the surface | Whole globe; higher where ppm is higher, warming and thickening as the month's global CO₂ rises over the turn, always thin enough to see the forest through. The rim halo thickens with it |
| Month and CO₂ | At 6 o'clock, such as `Aug 2020 · 411.3 ppm` | Every month (7.5 steps) |

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
- The record sits a little higher (`RECORD_RAISE`, 0.07 radii) than where it was first laid out with the arm; the arm stays where it was mounted, so its pivot is a little closer to the record and its angles follow from that.
- It casts a soft drop shadow down and to the right onto the record, falling a little away from it as it stands above the record.
- It eases (exponentially) between positions instead of jumping: onto the groove when cued, back to rest when lifted. While playing it follows the groove for the current position.
- The listener can grab and drag it. While held, the clock stops and the needle position scrubs the album; released over the record, playback resumes from there; released off it, the arm returns to rest.

## Interaction

| Input | Action |
| --- | --- |
| Space | Play / pause |
| Up / down arrow keys | Volume up / down by 10 (of 100); holding the key keeps turning it. The volume slider opens to show the level and folds back after the same idle time |
| Click on the record grooves | Play / pause |
| Click on the progress ring | Play the current track from that point; sets the arm down first when stopped |
| Drag the tonearm | Scrub; drop on the record to play from there, off it to stop |
| Hold the record | Stops it under the hand. While playing, the music pauses until it is let go, then plays on. A press shorter than 300 ms that doesn't turn it is a click |
| Turn the record by hand | It follows the pointer round its centre. While playing, the position moves forward or back as far as it is turned (one turn is one turn's worth of music, 1.8 s), the needle following, and letting go plays on from there. Let go while moving, the record keeps the hand's speed and eases back to the motor's (or coasts to a stop) |
| Drag on the globe | Rotate the globe |
| Scroll on the globe | Zoom in / out (out to the fitted size) |
| Play button (bottom left) | Play / pause, same as Space |
| Volume button (bottom left) | First click expands it into a slider; while expanded, the speaker toggles mute. It folds back into one button after a short idle time without the mouse or keyboard focus on it |
| Left / right chevrons (bottom left) | Previous / next album; wraps around at either end. Switching lifts the arm and resets the position to the start. Clicks during the change add more steps |
| Fullscreen button (top right) | Enter / exit fullscreen; hidden where the browser has no fullscreen support |
| Settings button (top right) | Open the settings menu; Escape or a click outside closes it |

Playback states (`PlaybackState`): `stopped` → `cueing` (arm eases on) → `playing` (record spins, arm tracks progress). Pausing lifts the arm back to rest and keeps the position. Grabbing the arm enters `scrubbing` from any state. Holding the playing record enters `held`, where turning it moves the position; letting go returns to `playing`.

Volume sets the level of the music (see the album docs in [albums/](albums/) for what plays). Language, view options and notes will be added in later issues. Albums other than the first are placeholders.

## Changing Albums

The sleeves stand in a vertical column in catalog order, like pages: the previous album above the current one and the next below, each a viewport height away. Changing records plays in order (`record-swap.js`):

1. The record (vinyl and globe label, not the tonearm) shrinks and lifts off the platter clear of the sleeve, then slides into it.
2. The column moves one place, carrying the record off with its sleeve: up for the next album, down for the previous one. It moves like a toss, fast off the mark and slowing to land: the leaving sleeve spins away, and the new sleeve spins in, swings a little past its own album's angle and settles on it.
3. The albums shift back by one at once, so the record is now in the new sleeve, and it is drawn back out onto the platter.

Every change asked for meanwhile moves the column on one more place once it is there. One asked while the record is being drawn out turns it straight back into the sleeve, which the column then carries off, so pressing again and again never waits for the record to land.

Only CSS `translate` and `scale` animate, so the layout and the sleeve's tilt stay put. The stage cannot be touched while it plays.

## Controls

The on-screen buttons are segments of liquid-glass capsules (`src/features/controls/presentation/glass.css`), split by faint hairlines: a translucent white gradient over a blurred, saturated backdrop, with a bright inner top edge. The bottom-left capsule grows to the right when the volume slider opens. The glass is static; it does not react to the pointer. Icons are defined once in `ControlIcon` (`control-icons.js`).
