# Smog Album: The Wind That Sweeps the Smog

The album's story, data and mappings. It follows [album-guide.md](../album-guide.md). Its sound and fog are nell-v2's album of the same name, written fresh here (user, 2026-11-15); its places are three cities of three regions, picked by `notebooks/smog_album.ipynb` (issue #49).

## Message

> "Though small particles typically remain in the atmosphere for only a few days, they can be transported far away from source regions by large scale weather systems." ([SVS 5151](https://svs.gsfc.nasa.gov/5151/), Particulate Matter (PM) 2.5)

Smoke from fires, dust from the desert and winter smog all arrive with the weather, sit for a day or two and leave again. The aim is not a new fact but a feeling anyone can follow by eye and ear at once: as much as the map is hidden by smog, the music is muffled; when the air clears, both open together.

- Main information: how thick the smog around the city is (each cell's PM2.5, and their mean).
- Supporting information: the moments the air turns (the smog rolling in, the air clearing), and how fast the fog thins.

## Tracks

| # | Track | Region | Smog | Stretch (local time) | Smog rolls in | Clears | Loop | Length |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Portland | Northern America | Wildfire smoke | 2020-09-10 18:30 to 09-14 18:30 (97 h) | 0:16 | 0:46 | Synth-pop, D minor | 0:54 |
| 2 | Beijing | Eastern Asia | Winter smog | 2025-01-31 17:30 to 02-02 17:30 (49 h) | 0:08 | 0:46 | House, A minor | 0:54 |
| 3 | Dakar | Western Africa | Saharan dust | 2025-03-23 20:30 to 03-26 18:30 (71 h) | 0:20 | 0:46 | Breakbeat, E minor | 0:54 |

How they were picked (notebook, sections 3–5; ours):

- 25 candidate episodes of heavy PM2.5 in 10 regions, 2019–2025: the 2025 cities whose own cell rose into heavy smog for two days or more, and well-known episodes elsewhere (wildfire smoke, South Asia's winter smog).
- A song must sound like nell-v2's: clear air, then smog that stays, then clear air, each once, by the app's own haze and turns (user, 2026-11-15: not flickering, each stretch long enough to notice). It starts and ends in clear air, with 6–36 clear hours before the smog and 6–24 after; the longest smog wins.
- Six candidates pass; one per region, three regions. Eastern Asia had three (Beijing in January and October, Pyongyang in November); the user chose Beijing in January. South Asia's winter smog fails: it thins every afternoon and returns every night, so it flickers.

Data files: `data/smog/tracks/` (see `tracks.json` for the source, version, credit, city, box and time zone).

- GEOS-CF v1 (NASA GMAO), surface PM2.5 (`pm25_rh35_gcc`), hourly means on the 0.25° grid. 5151 links v2, which starts on 2025-08-04; v1 holds every song.
- The box: the city's cell and 16 cells each way, 33 × 33 cells (±4°), every hour of each stretch, rounded to whole µg/m³.
- The values are the model's and may differ from what was measured; the map and the music follow them as they are.

## Time

120 BPM in 4/4: a bar is 2 s, a step a sixteenth note (0.125 s). Songs are timed in playback ms, and each sets the pace of its own hours (`paceOf` in [`tracks/domain/smog.js`](../../src/features/tracks/domain/smog.js)), as nell-v2:

- The 12 hours before the air clears play for eight bars (16 s), the 6 hours before the smog rolls in for three bars, and the clear air after for four bars.
- The rest of the song shares out what is left of 54 s; within it, the hours in which the haze changes fast pass more slowly (an hour weighs 1 + 8 · |change in haze| / 0.05).
- Every turn lands on a downbeat. The bar and step are read from the playback time, so the loop stays in place wherever the needle is set down.

The date on the label is the city's local time by the hour.

## Sound

nell-v2's, unchanged. Each song plays its own bright dance loop from start to end, heard through the air ([`composers/smog.js`](../../src/features/music/domain/composers/smog.js)). The loop never changes with the data; only how it comes through does, the same way in every song.

| Song | Loop | Chords | Lead and backing | Drums |
| --- | --- | --- | --- | --- |
| Portland | `SYNTH_POP` | D minor: Dm, B♭, F, C | Square-wave arpeggio (`PULSE`), halo pad, syncopated bass | Kick on every beat, snare on 2 and 4, eighth-note hats, sixteenth ghosts |
| Beijing | `HOUSE` | A minor: Am, F, C, G | Saw chord stabs off the beat (`STAB`), offbeat bass | Kick on every beat, snare on 2 and 4, offbeat hats, sixteenth ghosts |
| Dakar | `BREAKS` | E minor: Em, C, G, D | Dulcimer hook, warm pad, held bass | Broken kick, snare on 2 and 4, eighth-note hats and ghosts |

Shared: the bass is the analog synth's `CAVE`, the drums the standard kit. Clear air plays dry (reverb 0.12); the thicker the smog, the more reverb (up to 0.6) and overdrive (up to 0.3).

## Mapping

| Data | Screen | Sound | Updated |
| --- | --- | --- | --- |
| Each cell's pollution (`pollutionOf`: PM2.5 in multiples of 15 µg/m³ on a log scale to 600, 0 to 1) | The fog (`fogOf`): clear below about 40 µg/m³, so the map shows; thicker and browner as it rises. Smooth between cells (bicubic) and between hours, billowing and drifting | (screen only) | Frame |
| The haze (the mean fog over the box's cells) | The colour of the glow round the globe | The whole mix's low-pass: 18 kHz at haze 0.05 or less, down to 220 Hz from 0.8, as if through a wall (exponential); reverb and overdrive rise with it | Sixteenth note |
| How fast the fog thins (the fog each cell loses by the next hour) | A cold sheen where it thins | While the box loses 0.008 or more an hour, a gust on each beat (noise falling from 6 kHz to 700 Hz), loudest at 0.06 | Frame, beat |
| The turns (`turnsOf`: the haze rising past 0.5 is the smog rolling in, falling below 0.3 the air clearing; in between it stays as it was) | Rolling in: the map darkens for a moment. Clearing: the clear places flash bright. Both fade over 1.2 s | Rolling in: a deep boom (`CAVE` at D1 and a low noise hit). Clearing: a riser from two bars before, a silent beat, then a crash and an impact | The downbeat |

## Globe

The globe keeps the city's cell in the middle, as close as nell-v2's: the globe eleven times the label's size, so the label's edge is asin(1/11) ≈ 5.2° of arc from the city. It can be turned and zoomed by hand, and glides back to the city a moment after it is let go (user, 2026-11-15).

The fog is one patch of the globe over the box, drawn by nell-v2's shader in [`smog-layer.js`](../../src/features/globe/presentation/smog-layer.js); the textures are uploaded only when the hour changes. It fades in over the song's first 1.5 s and out over its last.

Where the data ends, the fog fades out instead of being cut (user, 2026-11-15): by distance from the box's middle on the ground, 1 at its nearer sides, the fog is whole up to 0.45 and gone by 0.85, that distance pushed in and out by the billows (±0.125), so the fog's edge is round and ragged and nothing is left at the box's sides. Turned away, the rest of the globe is clear. The haze the music hears is still the mean over the whole box.

The city is marked with a dot and its name.

## Covers

From Wikimedia Commons (credits in [`albums.js`](../../src/features/album/data/albums.js)): Portland's skyline in the smoke of September 10, 2020 (during its song); the Jade Peak Pagoda in Beijing's smog (also the album's cover); Dakar in harmattan dust, January 2015 (596 × 340, the only Commons photo of Dakar in dust found).

## Checks

| Check | Result |
| --- | --- |
| Length | 54 s each; the turns land on 0:16 / 0:46, 0:08 / 0:46 and 0:20 / 0:46 |
| Muffling | The low-pass reaches 884 Hz (Portland), 1,073 Hz (Beijing) and 987 Hz (Dakar) at their thickest (mock run of the composer), against 220–247 Hz on nell-v2's plain: these boxes' haze peaks at 0.53–0.56, the plain's at 0.78–0.85 |
| Listening, screen | Not yet done: needs the user |
