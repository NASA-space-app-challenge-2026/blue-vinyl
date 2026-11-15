# Smog Album: The Wind That Sweeps the Smog

The album's story, data and mappings. It follows [album-guide.md](../album-guide.md) and reproduces nell-v2's album of the same name as it is (user, 2026-11-15): its region, songs, sound, globe and numbers, written fresh here; the data is downloaded again by `notebooks/smog_album.ipynb` (issue #49).

## Message

> "Though small particles typically remain in the atmosphere for only a few days, they can be transported far away from source regions by large scale weather systems." ([SVS 5151](https://svs.gsfc.nasa.gov/5151/), Particulate Matter (PM) 2.5)

In winter the North China Plain fills with smog for days under still air, until a cold front from the north sweeps it away within hours. The aim is not a new fact but a feeling anyone can follow by eye and ear at once: as much as the map is hidden by smog, the music is muffled; when the air clears, both open together.

- Main information: how thick the smog over the plain is (each cell's PM2.5, and their mean).
- Supporting information: the moments the air turns (the smog rolling in, the front sweeping it out), and how fast the fog thins.

## Tracks

| # | Track | Stretch (local time) | Smog rolls in | Front sweeps it out | Loop | Length |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Morning, December 23 | 2018-12-17 12:30 to 12-23 18:30 (151 h) | 0:08 | 0:46 | Synth-pop, D minor | 0:54 |
| 2 | Dawn, January 15 | 2019-01-08 12:30 to 01-15 16:30 (173 h) | 0:10 | 0:46 | House, A minor | 0:54 |
| 3 | Midday, January 20 | 2019-01-16 12:30 to 01-20 18:30 (103 h) | 0:08 | 0:46 | Breakbeat, E minor | 0:54 |

Data files: `data/smog/tracks/` (see `tracks.json` for the source, version, credit, box and time zone).

- GEOS-CF v1 (NASA GMAO), surface PM2.5 (`pm25_rh35_gcc`), hourly means on the 0.25° grid. 5151 links v2, which starts on 2025-08-04; the winter of 2018-19 is only in v1.
- The box: 34–42° N, 112–121° E, 33 × 37 cells, every hour of each stretch, rounded to whole µg/m³. The values differ from nell-v2's files by at most 1 µg/m³ in under 1 % of the values, as nell-v2 rounded its cache to four significant digits before rounding again.
- The values are the model's and may differ from what was measured; the map and the music follow them as they are.

## Time

120 BPM in 4/4: a bar is 2 s, a step a sixteenth note (0.125 s). Songs are timed in playback ms, and each sets the pace of its own hours (`paceOf` in [`tracks/domain/smog.js`](../../src/features/tracks/domain/smog.js)):

- The 12 hours before the front sweeps the smog out play for eight bars (16 s), the 6 hours before the smog rolls in for three bars, and the clear air after the last sweep for four bars.
- The rest of the song shares out what is left of 54 s; within it, the hours in which the haze changes fast pass more slowly (an hour weighs 1 + 8 · |change in haze| / 0.05).
- Every turn lands on a downbeat. The bar and step are read from the playback time, so the loop stays in place wherever the needle is set down.

The date on the label is the real local time (China Standard Time) by the hour.

## Sound

Each song plays its own bright dance loop from start to end, heard through the air ([`composers/smog.js`](../../src/features/music/domain/composers/smog.js)). The loop never changes with the data; only how it comes through does, the same way in every song.

| Song | Loop | Chords | Lead and backing | Drums |
| --- | --- | --- | --- | --- |
| Morning, December 23 | `SYNTH_POP` | D minor: Dm, B♭, F, C | Square-wave arpeggio (`PULSE`), halo pad, syncopated bass | Kick on every beat, snare on 2 and 4, eighth-note hats, sixteenth ghosts |
| Dawn, January 15 | `HOUSE` | A minor: Am, F, C, G | Saw chord stabs off the beat (`STAB`), offbeat bass | Kick on every beat, snare on 2 and 4, offbeat hats, sixteenth ghosts |
| Midday, January 20 | `BREAKS` | E minor: Em, C, G, D | Dulcimer hook, warm pad, held bass | Broken kick, snare on 2 and 4, eighth-note hats and ghosts |

Shared: the bass is the analog synth's `CAVE`, the drums the standard kit. Clear air plays dry (reverb 0.12); the thicker the smog, the more reverb (up to 0.6) and overdrive (up to 0.3).

## Mapping

| Data | Screen | Sound | Updated |
| --- | --- | --- | --- |
| Each cell's pollution (`pollutionOf`: PM2.5 in multiples of 15 µg/m³ on a log scale to 600, 0 to 1) | The fog (`fogOf`): clear below about 40 µg/m³, so the map shows; thicker and browner as it rises. Smooth between cells (bicubic) and between hours, billowing and drifting | (screen only) | Frame |
| The plain's haze (the mean fog over its cells) | The colour of the glow round the globe | The whole mix's low-pass: 18 kHz at haze 0.05 or less, down to 220 Hz from 0.8, as if through a wall (exponential); reverb and overdrive rise with it | Sixteenth note |
| How fast the fog thins (the fog each cell loses by the next hour) | A cold sheen where it thins | While the plain loses 0.008 or more an hour, a gust on each beat (noise falling from 6 kHz to 700 Hz), loudest at 0.06 | Frame, beat |
| The turns (`turnsOf`: the haze rising past 0.5 is the smog rolling in, falling below 0.3 the front sweeping it out; in between it stays as it was) | Rolling in: the map darkens for a moment. Swept out: the clear places flash bright. Both fade over 1.2 s | Rolling in: a deep boom (`CAVE` at D1 and a low noise hit). Swept out: a riser from two bars before, a silent beat, then a crash and an impact | The downbeat |

## Globe

The globe holds still over the plain's middle (38° N, 116.5° E): it cannot be turned or zoomed by hand, as there is no smog drawn beyond the box (user, 2026-11-15; nell-v2 let it be turned). It is drawn as close as nell-v2's, the globe eleven times the label's size, so the label's edge is asin(1/11) ≈ 5.2° of arc from the middle.

The fog is one patch of the globe over the box, drawn by nell-v2's shader in [`smog-layer.js`](../../src/features/globe/presentation/smog-layer.js); the textures are uploaded only when the hour changes. It fades in over the song's first 1.5 s and out over its last. Nine cities are named on the map, north to south: Beijing, Tangshan, Tianjin, Baoding, Cangzhou, Shijiazhuang, Hengshui, Jinan and Handan.

## Cover

The Jade Peak Pagoda in smog, from Longevity Hill, Beijing (Daniel Case, CC BY-SA 3.0, Wikimedia Commons), on every track, as in nell-v2.

## Checks

| Check | Result |
| --- | --- |
| Length | 54 s each; the turns land on 0:08 / 0:46, 0:10 / 0:46 and 0:08 / 0:46, as in nell-v2 |
| Muffling | The low-pass reaches 247 Hz, 220 Hz and 236 Hz (mock run of the composer over each song) |
| Listening, screen | Not yet done: needs the user |
