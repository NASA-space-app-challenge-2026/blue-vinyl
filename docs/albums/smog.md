# Smog Album: The Wind That Sweeps the Smog

The album's story, data and mappings. It follows [album-guide.md](../album-guide.md). Its sound and fog are nell-v2's album of the same name, written fresh here (user, 2026-11-15); its places are three cities of three regions, picked by `notebooks/smog_album.ipynb` (issue #49).

## Message

> "Though small particles typically remain in the atmosphere for only a few days, they can be transported far away from source regions by large scale weather systems." ([SVS 5151](https://svs.gsfc.nasa.gov/5151/), Particulate Matter (PM) 2.5)

Smoke from fires, dust from the desert and winter smog all arrive with the weather, sit for a day or two and leave again. The aim is not a new fact but a feeling anyone can follow by eye and ear at once: as much as the map is hidden by smog, the music is muffled; when the air clears, both open together.

- Main information: how thick the smog around the city is (each cell's PM2.5, and their mean).
- Supporting information: the moments the air turns (the smog rolling in, the air clearing), and how fast the fog thins.

## Tracks

| # | Track | Region | Smog | Stretch (local time) | Rounds of smog (in / clear) | Loop | Length |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Canberra | Australia and New Zealand | Bushfire smoke | 2019-12-26 02:30 to 12-31 14:30 (133 h) | 3 (0:06 / 0:14, 0:18 / 0:28, 0:36 / 0:46) | Synth-pop, D minor | 0:54 |
| 2 | Seattle | Northern America | Wildfire smoke | 2020-09-06 09:30 to 09-11 01:30 (113 h) | 2 (0:08 / 0:16, 0:28 / 0:46) | House, A minor | 0:54 |
| 3 | Beijing | Eastern Asia | Autumn smog | 2025-10-21 02:30 to 10-26 22:30 (141 h) | 1 (0:10 / 0:48) | Breakbeat, E minor | 0:54 |

The air the music hears is the air right over the city: the city's own 0.25° cell, the middle of the label (user, 2026-11-15). nell-v2 heard the mean over its whole plain.

How they were picked (notebook, sections 3–5; ours):

- 25 candidate episodes of heavy PM2.5 in 10 regions, 2019–2025: the 2025 cities whose own cell rose into heavy smog for two days or more, and well-known episodes elsewhere (wildfire smoke, South Asia's winter smog, Saharan dust).
- The air changing is the point of the album (user, 2026-11-15): a song lasts 100–170 hours, as nell-v2's (103–173), from clear air to clear air (6–36 clear hours before the first smog, 6–24 after the last), with one to three rounds of smog rolling in and clearing (user: up to three), no stretch between two turns under 8 hours, so it does not flicker.
- The song whose city's pollution level changes most (the sum of its hour-to-hour changes) wins in each candidate, and the three regions that change most are kept.

Data files: `data/smog/tracks/` (see `tracks.json` for the source, version, credit, city, box and time zone).

- GEOS-CF v1 (NASA GMAO), surface PM2.5 (`pm25_rh35_gcc`), hourly means on the 0.25° grid. 5151 links v2, which starts on 2025-08-04; v1 holds every song.
- The box: the city's cell and 16 cells each way, 33 × 33 cells (±4°), every hour of each stretch, rounded to whole µg/m³. The map draws the box; the music hears its middle cell.
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
| Canberra | `SYNTH_POP` | D minor: Dm, B♭, F, C | Square-wave arpeggio (`PULSE`), halo pad, syncopated bass | Kick on every beat, snare on 2 and 4, eighth-note hats, sixteenth ghosts |
| Seattle | `HOUSE` | A minor: Am, F, C, G | Saw chord stabs off the beat (`STAB`), offbeat bass | Kick on every beat, snare on 2 and 4, offbeat hats, sixteenth ghosts |
| Beijing | `BREAKS` | E minor: Em, C, G, D | Dulcimer hook, warm pad, held bass | Broken kick, snare on 2 and 4, eighth-note hats and ghosts |

Shared: the bass is the analog synth's `CAVE`, the drums the standard kit. Clear air plays dry (reverb 0.12); the thicker the smog, the more reverb (up to 0.6) and overdrive (up to 0.3).

## Mapping

| Data | Screen | Sound | Updated |
| --- | --- | --- | --- |
| Each cell's pollution (`pollutionOf`: PM2.5 in multiples of 15 µg/m³ on a log scale to 600, 0 to 1) | The fog (`fogOf`): clear below about 40 µg/m³, so the map shows; thicker and browner as it rises. Smooth between cells (bicubic) and between hours, billowing and drifting | (screen only) | Frame |
| The air over the city (its cell's pollution level) | The colour of the glow round the globe (from its fog) | The whole mix's low-pass, following the air hour by hour: 18 kHz while it is clear (below about 88 µg/m³, where the city's fog is 0.3), down to 220 Hz at 600 µg/m³ (the map's thickest, brownest fog), exponential between; reverb and overdrive rise with it (user, 2026-11-15: the change in concentration is the point). nell-v2 ran it on its plain's haze from 0.05 to 0.8 | Sixteenth note |
| How fast the fog thins (the fog each cell loses by the next hour) | A cold sheen where it thins | While the city's cell loses 0.008 or more an hour, a gust on each beat (noise falling from 6 kHz to 700 Hz), loudest at 0.06 | Frame, beat |
| The turns (`turnsOf`: the haze rising past 0.5 is the smog rolling in, falling below 0.3 the air clearing; in between it stays as it was) | Rolling in: the map darkens for a moment. Clearing: the clear places flash bright. Both fade over 1.2 s | Rolling in: a deep boom (`CAVE` at D1 and a low noise hit). Clearing: a riser from two bars before, a silent beat, then a crash and an impact | The downbeat |

## Globe

The globe keeps the city's cell in the middle, close enough that the fog fills the label: the label's edge is where the fog has faded out (0.85 of the way to the box's nearer sides on the ground): 2.9° of arc in Canberra, 2.4° in Seattle, 2.7° in Beijing (user, 2026-11-15). It can be turned and zoomed by hand, and glides back to the city a moment after it is let go (user, 2026-11-15).

The fog is one patch of the globe over the box, drawn by nell-v2's shader in [`smog-layer.js`](../../src/features/globe/presentation/smog-layer.js); the textures are uploaded only when the hour changes. It fades in over the song's first 1.5 s and out over its last.

Where the data ends, the fog fades out instead of being cut (user, 2026-11-15): by distance from the box's middle on the ground, 1 at its nearer sides, the fog is whole up to 0.45 and gone by 0.85, that distance pushed in and out by the billows (±0.125), so the fog's edge is round and ragged and nothing is left at the box's sides. Turned away, the rest of the globe is clear.

The city is marked with a dot and its name.

## Covers

From Wikimedia Commons (credits in [`albums.js`](../../src/features/album/data/albums.js)): bushfire smoke over Lyneham, Canberra, January 1, 2020 (the day after its song); Seattle's skyline in wildfire smoke, September 11, 2020 (the day its song ends); the Jade Peak Pagoda in Beijing's smog (also the album's cover).

## Checks

| Check | Result |
| --- | --- |
| Length | 54 s each |
| Muffling | Mock run of the composer: the low-pass rises and falls with each round; it reaches 220 Hz in Canberra and Beijing, but only about 2 kHz in Seattle, whose smog is thinner over the city |
| Listening, screen | Not yet done: needs the user |
