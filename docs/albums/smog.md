# Smog Album: The Wind That Sweeps the Smog

The album's story, data and mappings. It follows [album-guide.md](../album-guide.md). Its sound and fog are nell-v2's album of the same name, written fresh here (user, 2026-11-15); its places are three cities of three regions whose smog flows across the map, picked by `notebooks/smog_album.ipynb` (issue #49).

## Message

> "Though small particles typically remain in the atmosphere for only a few days, they can be transported far away from source regions by large scale weather systems." ([SVS 5151](https://svs.gsfc.nasa.gov/5151/), Particulate Matter (PM) 2.5)

Smoke from fires, dust from the desert and winter smog all arrive with the weather, sit for a day or two and leave again. The aim is not a new fact but a feeling anyone can follow by eye and ear at once: as much as the map is hidden by smog, the music is muffled; when the air clears, both open together.

- Main information: how thick the smog around the city is (each cell's aerosol optical depth, AOD, the haze of the whole column of air over it).
- Supporting information: the moments the air turns (the smog rolling in, the air clearing), and how fast the fog thins.

## Tracks

| # | Track | Region | Smog | Stretch (local time) | Rounds of smog (in / clear) | Loop | Length |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Portland | Northern America | Wildfire smoke | 2020-09-08 01:30 to 09-14 22:30 (166 h) | 1 (0:10 / 0:46) | Synth-pop, D minor | 0:54 |
| 2 | Seoul | Eastern Asia | Spring smog | 2025-03-22 19:30 to 03-29 00:30 (150 h) | 2 (0:08 / 0:22, 0:32 / 0:46) | House, A minor | 0:54 |
| 3 | Jakarta | South-Eastern Asia | Dry-season smog | 2025-07-10 03:30 to 07-17 03:30 (169 h) | 2 (0:06 / 0:18, 0:32 / 0:46) | Breakbeat, E minor | 0:54 |

The air the music hears is the air right over the city: the city's own 0.25° cell, the middle of the label (user, 2026-11-15). nell-v2 heard the mean over its whole plain.

How they were picked (notebook, sections 3–5; ours):

- 25 candidate episodes in 10 regions, 2019–2025, found by heavy surface PM2.5 (the album then follows their AOD): the 2025 cities whose own cell rose into heavy smog for two days or more, and well-known episodes elsewhere (wildfire smoke, South Asia's winter smog, Saharan dust).
- The air changing is the point of the album (user, 2026-11-15): a song lasts 100–170 hours, as nell-v2's (103–173), from clear air to clear air (6–36 clear hours before the first smog, 6–24 after the last), with one to three rounds of smog rolling in and clearing (user: up to three), no stretch between two turns under 8 hours, so it does not flicker.
- The song whose city's pollution level changes most (the sum of its hour-to-hour changes) wins in each candidate.
- The smog must flow, blown across the map without jumping (user, 2026-11-15). Surface PM2.5, 5151's quantity, did not: every morning the day's heat mixes the air near the ground upward and the smog vanished from the whole box within an hour or two, to form again in place at night. So the album follows the AOD of the same model, whose smog drifts on unbroken (the cost: it is not what 5151 shows).
- How fast the fog flows: each hour's fog over the middle of the box (±2°, about what the label shows) laid onto the fog three hours later at the shift (up to 2° each way) that fits best; the median of those shifts, in km/h. One song per region, the three regions whose song flows fastest: Seoul 21 km/h, Jakarta 13, Portland 9 (tied with Seattle in its region; Portland's air changes more). Only 9 of the 25 candidates pass the rules by AOD: in New Delhi the AOD never clears.

Data files: `data/smog/tracks/` (see `tracks.json` for the source, version, credit, city, box and time zone).

- GEOS-CF v1 (NASA GMAO), aerosol optical depth at 550 nm (`xgc_tavg_1hr_g1440x721_x1`: the sum of `aod550_bc`, `_oc`, `_sulfate`, `_dust`, `_sala` and `_salc`; its clouds' left out), hourly means on the 0.25° grid, the same hours and cells as the surface PM2.5 5151 shows. 5151 links v2, which starts on 2025-08-04; v1 holds every song.
- The box: the city's cell and 16 cells each way, 33 × 33 cells (±4°), every hour of each stretch, to three decimals. The map draws the box; the music hears its middle cell.
- The values are the model's and may differ from what was measured; the map and the music follow them as they are.

## Time

120 BPM in 4/4: a bar is 2 s, a step a sixteenth note (0.125 s). Songs are timed in playback ms, and each sets the pace of its own hours (`paceOf` in [`tracks/domain/smog.js`](../../src/features/tracks/domain/smog.js)), as nell-v2:

- The 12 hours before the air clears play for eight bars (16 s), the 6 hours before the smog rolls in for three bars, and the clear air after for four bars. With more than one round of smog, those bars are shared among the rounds (eight and three divided by the rounds, at least one bar; ours), so the song keeps its length.
- The rest of the song shares out what is left of 54 s, rounded to whole bars (each song comes to 54 s; the app checks it when a song loads); within it, the hours in which the haze changes fast pass more slowly (an hour weighs 1 + 8 · |change in haze| / 0.05).
- Every turn lands on a downbeat. The bar and step are read from the playback time, so the loop stays in place wherever the needle is set down.

The date on the label is the city's local time by the hour.

## Sound

nell-v2's, with its fog over the music widened (user, 2026-11-15: as muffled as it can be). Each song plays its own bright dance loop from start to end, heard through the air ([`composers/smog.js`](../../src/features/music/domain/composers/smog.js)). The loop never changes with the data; only how it comes through does, the same way in every song.

| Song | Loop | Chords | Lead and backing | Drums |
| --- | --- | --- | --- | --- |
| Portland | `SYNTH_POP` | D minor: Dm, B♭, F, C | Square-wave arpeggio (`PULSE`), halo pad, syncopated bass | Kick on every beat, snare on 2 and 4, eighth-note hats, sixteenth ghosts |
| Seoul | `HOUSE` | A minor: Am, F, C, G | Saw chord stabs off the beat (`STAB`), offbeat bass | Kick on every beat, snare on 2 and 4, offbeat hats, sixteenth ghosts |
| Jakarta | `BREAKS` | E minor: Em, C, G, D | Dulcimer hook, warm pad, held bass | Broken kick, snare on 2 and 4, eighth-note hats and ghosts |

Shared: the bass is the analog synth's `CAVE`, the drums the standard kit. Clear air plays dry (reverb 0.12); the thicker the smog, the more reverb (up to 0.6) and overdrive (up to 0.3).

## Mapping

| Data | Screen | Sound | Updated |
| --- | --- | --- | --- |
| Each cell's pollution (`pollutionOf`: AOD in multiples of a clear sky's 0.1 on a log scale to 5, 0 to 1) | The fog (`fogOf`): clear below an AOD of about 0.27, so the map shows; thicker and browner as it rises. Smooth between cells (bicubic) and between hours, billowing and drifting | (screen only) | Frame |
| The air over the city (its cell's pollution level) | The colour of the glow round the globe (from its fog) | The whole mix's low-pass, following the air hour by hour: 18 kHz while it is clear (below an AOD of about 0.67, where the city's fog is 0.3), down to 220 Hz at an AOD of 5 (the map's thickest, brownest fog), exponential between; reverb and overdrive rise with it (user, 2026-11-15: the change in concentration is the point). nell-v2 ran it on its plain's haze from 0.05 to 0.8 | Sixteenth note |
| How fast the fog thins (the fog each cell loses by the next hour) | A cold sheen where it thins | While the city's cell loses 0.008 or more an hour, a gust on each beat (noise falling from 6 kHz to 700 Hz), loudest at 0.06 | Frame, beat |
| The turns (`turnsOf`: the haze rising past 0.5 is the smog rolling in, falling below 0.3 the air clearing; in between it stays as it was) | Rolling in: the map darkens for a moment. Clearing: the clear places flash bright. Both fade over 1.2 s | Rolling in: a deep boom (`CAVE` at D1 and a low noise hit). Clearing: a riser from two bars before, a silent beat, then a crash and an impact | The downbeat |

## Globe

The globe keeps the city's cell in the middle, close enough that the fog fills the label: the label's edge is where the fog has faded out (0.85 of the way to the box's nearer sides on the ground): 2.5° of arc in Portland, 2.8° in Seoul, 3.5° in Jakarta (user, 2026-11-15). It can be turned and zoomed by hand, and glides back to the city a moment after it is let go (user, 2026-11-15).

The fog is one patch of the globe over the box, drawn by nell-v2's shader in [`smog-layer.js`](../../src/features/globe/presentation/smog-layer.js); the textures are uploaded only when the hour changes. It fades in over the song's first 1.5 s and out over its last.

Where the data ends, the fog fades out instead of being cut (user, 2026-11-15): by distance from the box's middle on the ground, 1 at its nearer sides, the fog is whole up to 0.45 and gone by 0.85, that distance pushed in and out by the billows (±0.125), so the fog's edge is round and ragged and nothing is left at the box's sides. Turned away, the rest of the globe is clear.

The city is marked with a dot and its name.

## Covers

From Wikimedia Commons (credits in [`albums.js`](../../src/features/album/data/albums.js)): downtown Portland in wildfire smoke, September 10, 2020 (in its song); Seoul in fine dust, May 7, 2021; the sun setting in smog above Jakarta, June 16, 2013 (also the album's cover). The photos are of other days than the songs, from the same kind of air.

## Checks

| Check | Result |
| --- | --- |
| Length | 54 s each |
| Muffling | From the city's peak AOD: Portland reaches 220 Hz (AOD 10.6), Seoul about 1.1 kHz (2.5), Jakarta only about 5 kHz (1.2) |
| Flow | Median shift of the fog in 3 hours: Portland 9 km/h, Seoul 21, Jakarta 13 (notebook, section 5) |
| Listening, screen | Not yet done: needs the user |
