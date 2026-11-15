# Smog Album: The Wind That Sweeps the Smog

The album's story, data and mappings. It follows [album-guide.md](../album-guide.md). Its music is nell-v2's album of the same name, written fresh here (user, 2026-11-15); its places are four cities whose smog flows in from outside the map, covers them and passes on, picked by `notebooks/smog_album.ipynb` (issue #49).

## Message

> "Though small particles typically remain in the atmosphere for only a few days, they can be transported far away from source regions by large scale weather systems." ([SVS 5151](https://svs.gsfc.nasa.gov/5151/), Particulate Matter (PM) 2.5)

Smoke from fires, dust from the desert and winter smog all arrive with the weather, sit for a day or two and leave again. The aim is not a new fact but a feeling anyone can follow by eye and ear at once: as much as the map is hidden by smog, the music is muffled; when the air clears, both open together.

- Main information: how thick the smog over the city is (its cell's aerosol optical depth, AOD, the haze of the whole column of air over it).
- Supporting information: where the smog comes from and goes to, which the map shows.

## Tracks

| # | Track | Region | Smog | Stretch (local time) | Length |
| --- | --- | --- | --- | --- | --- |
| 1 | New York | Northern America | Canadian wildfire smoke | 2023-06-05 04:30 to 06-08 19:30 (87 h) | 0:29 |
| 2 | Seoul | Eastern Asia | Early summer haze | 2025-06-15 02:30 to 06-17 17:30 (63 h) | 0:21 |
| 3 | Pyongyang | Eastern Asia | Late autumn smog | 2025-11-22 11:30 to 11-28 08:30 (141 h) | 0:47 |
| 4 | Shanghai | Eastern Asia | Winter smog | 2025-12-28 23:30 to 12-31 05:30 (54 h) | 0:18 |

The air the music hears is the air right over the city: the city's own 0.25° cell, the middle of the label (user, 2026-11-15). nell-v2 heard the mean over its whole plain.

What the user asked of the songs (2026-11-15): the air flows in from outside the box that is looked at, covers the city and passes on, so the concentration over the city changes gradually; no smog that sits still and nothing that pops out of nowhere inside the box (wildfire smoke that starts in the box); one fixed speed in time (below); only 2025, plus New York 2023 which the user asked for.

How they were picked (notebook, sections 3–5; ours):

- A worldwide screen of 2025 at 2° and every 6 hours finds events where the whole box is clear at both ends, the city's fog reaches 0.8 or more, the box's outer ring fogs before the city does, and almost nothing pops up inside (see the notebook for the rules): 23 events, in East Asia, Canada and Siberia and Bangladesh. The songs are then judged at the grid the map draws (0.25°, hourly): from a window of a few days, the stretch of the song's exact length that starts and ends in clear air, reaches a fog of 0.6 over the city, has fog in the box's outer rings, pops up in at most 25 cell-hours, and changes the city's pollution level most.
- Three of the four are in East Asia: no other region's 2025 air passed. Wildfire smoke that starts inside the box (Portland, Seattle, Canberra, Sydney, Edmonton) pops up 99 to 280 cell-hours and was dropped; New Delhi and Lahore never clear; Jakarta and Bangkok are a plume that keeps forming over the city.
- Pops (cell-hours of fog 0.15 above anything near it an hour before): New York 1, Seoul 20, Pyongyang 0, Shanghai 0. Seoul's is the most: at one point a patch of smoke appears over the city rather than arriving from its edge.
- How fast the fog flows (median shift of the middle ±2° in 3 hours, km/h): New York 33, Seoul 33, Pyongyang 21, Shanghai 19.
- Surface PM2.5, 5151's quantity, did not flow: every morning the day's heat mixes the air near the ground upward and the smog vanished from the whole box within an hour or two, to form again in place at night. So the album follows the AOD of the same model, whose smog drifts on unbroken (the cost: it is not what 5151 shows).

Data files: `data/smog/tracks/` (see `tracks.json` for the source, version, credit, city, box and time zone).

- GEOS-CF v1 (NASA GMAO), aerosol optical depth at 550 nm (`xgc_tavg_1hr_g1440x721_x1`: the sum of `aod550_bc`, `_oc`, `_sulfate`, `_dust`, `_sala` and `_salc`; its clouds' left out), hourly means on the 0.25° grid, the same hours and cells as the surface PM2.5 5151 shows. 5151 links v2, which starts on 2025-08-04; v1 holds every song.
- The box: the city's cell and 16 cells each way, 33 × 33 cells (±4°), every hour of each stretch, to three decimals. The map draws the box; the music hears its middle cell.
- The values are the model's and may differ from what was measured; the map and the music follow them as they are.

## Time

Time runs at one fixed speed in every song (user, 2026-11-15): 3 hours of the data a second, 6 hours a bar at 120 BPM (a bar is 2 s, a step a sixteenth note, 0.125 s). A song is as long as its hours divided by 3. Only the hours where the air changes play (user, 2026-11-15): 5 s of clear air (15 hours) before the city's fog first reaches 0.3 and after it last does, the clear days beyond cut away (the CSVs keep every hour; `buildSmogTrack` cuts them), the length rounded up to whole seconds: 29, 21, 47 and 18 s. The data's hours are never stretched or squeezed; `buildSmogTrack` in [`tracks/domain/smog.js`](../../src/features/tracks/domain/smog.js) places hour *i* at *i* / 3 s, and the app checks each song's length when it loads. The speed is the one number that sets how fast the air moves in the song (`HOURS_PER_BAR`).

The date on the label is the city's local time by the hour. Nothing marks the moment the smog arrives or leaves: the music goes on the same, and only its muffling follows. The label's hour is two digits (24 h) so the text keeps its width.

## Sound

nell-v2's loops (user, 2026-11-15: the music goes on the same, only the muffling follows the concentration). Each song plays one bright dance loop from start to end, heard through the air ([`composers/smog.js`](../../src/features/music/domain/composers/smog.js)). The loop never changes with the data; only how muffled it comes through does, the same way in every song.

| Song | Loop | Chords | Lead and backing | Drums |
| --- | --- | --- | --- | --- |
| New York | `SYNTH_POP` | D minor: Dm, B♭, F, C | Square-wave arpeggio (`PULSE`), halo pad, syncopated bass | Kick on every beat, snare on 2 and 4, eighth-note hats, sixteenth ghosts |
| Seoul | `HOUSE` | A minor: Am, F, C, G | Saw chord stabs off the beat (`STAB`), offbeat bass | Kick on every beat, snare on 2 and 4, offbeat hats, sixteenth ghosts |
| Pyongyang | `BREAKS` | E minor: Em, C, G, D | Dulcimer hook, warm pad, held bass | Broken kick, snare on 2 and 4, eighth-note hats and ghosts |
| Shanghai | `HOUSE` | A minor: Am, F, C, G | as Seoul | as Seoul |

Shared: the bass is the analog synth's `CAVE`, the drums the standard kit. Four songs share three loops, so Shanghai plays Seoul's. Reverb stays at its clear-air level (0.12) and there is no overdrive.

## Mapping

| Data | Screen | Sound | Updated |
| --- | --- | --- | --- |
| Each cell's pollution (`pollutionOf`: AOD in multiples of a clear sky's 0.1 on a log scale to 5, 0 to 1) | The fog (`fogOf`): clear below an AOD of about 0.27, so the map shows; thicker and browner as it rises. Smooth between cells (bicubic) and between hours, billowing and drifting | (screen only) | Frame |
| The air over the city (its cell's pollution level) | The colour of the glow round the globe (from its fog), the same colour on the city's dot and the shadow of its name (user, 2026-11-15) | The whole mix, against the song's own air (user, 2026-11-15: not absolute): from its cleanest hour (18 kHz, full volume) to its thickest (low-pass 220 Hz and volume 0.12, only a low hum), exponential low-pass and linear volume between. It also fades in and out over the song's first and last 1.5 s | Sixteenth note |
| How fast the fog thins (the fog each cell loses by the next hour) | A cold sheen where it thins | (screen only) | Frame |

## Globe

The globe keeps the city's cell in the middle, close enough that the fog fills the label: the label's edge is where the fog has faded out (0.85 of the way to the box's nearer sides on the ground), 2.5° to 3.5° of arc (user, 2026-11-15). Seoul's view instead holds all of South Korea (user, 2026-11-15): centred on 36° N 127.8° E, 5° of arc to the edge. It can be turned and zoomed by hand, and glides back to the city a moment after it is let go (user, 2026-11-15).

The fog is one patch of the globe over the box, drawn by nell-v2's shader in [`smog-layer.js`](../../src/features/globe/presentation/smog-layer.js); the textures are uploaded only when the hour changes. It fades in over the song's first 1.5 s and out over its last, as does the music.

Where the data ends, the fog fades out instead of being cut (user, 2026-11-15): by distance from the box's middle on the ground, 1 at its nearer sides, the fog is whole up to 0.45 and gone by 0.85, that distance pushed in and out by the billows (±0.125), so the fog's edge is round and ragged and nothing is left at the box's sides. Turned away, the rest of the globe is clear.

The city is marked with a dot and its name, the name white at 22 px with no outline, its shadow and the dot in the glow's colour (blue for clear air, through yellow and orange to red and purple as the haze thickens).

## Covers

From Wikimedia Commons (credits in [`albums.js`](../../src/features/album/data/albums.js)): Manhattan in the orange haze of Canadian wildfire smoke, June 7 2023 (New York, also the album's cover); Seoul in smog and dust seen from Namsan Tower, April 25 2008; the sun setting through haze in Pyongyang, April 4 2013; Lujiazui in the haze, Shanghai, May 28 2011. The photos are of other days than the songs, except New York's (four days after its song), from the same kind of air.

## Checks

| Check | Result |
| --- | --- |
| Length | 29, 21, 47 and 18 s: each song's played hours divided by 3 (the app checks it when a song loads) |
| Muffling | Each song's cleanest hour opens, its thickest hour is a low hum, whatever the AOD (peaks: New York 5, Pyongyang 4.4, Shanghai 2.3, Seoul 1.9; cleanest hours AOD 0.1 to 0.3) |
| Pops | New York 1, Seoul 20, Pyongyang 0, Shanghai 0 (cell-hours, notebook section 5) |
| Listening, screen | Not yet done: needs the user |
