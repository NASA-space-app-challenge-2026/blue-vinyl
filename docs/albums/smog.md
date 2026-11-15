# Smog Album: The Wind That Sweeps the Smog

The album's story, data and mappings. It follows [album-guide.md](../album-guide.md) and is built after nell-v2's album of the same name (its way of hearing smog, not its region or tracks); the data comes from `notebooks/smog_album.ipynb` (issue #49).

## Message

> "Though small particles typically remain in the atmosphere for only a few days, they can be transported far away from source regions by large scale weather systems." ([SVS 5151](https://svs.gsfc.nasa.gov/5151/), Particulate Matter (PM) 2.5)

PM2.5 comes and goes within days, carried by the weather. The album follows four cities through 2025: Seoul, and the three cities of other regions whose air swung most often between their own cleanest and dirtiest days (ours; EIC names no city). The listener hears the loop go muffled as the smog rolls in, and burst open as the air clears.

- Main information: how thick the city's air is each day (the fog over the map, how muffled the music is).
- Supporting information: the swings, the days the air crosses into the city's dirtiest tenth of days (the smog rolls in) or its cleanest tenth (it clears), and how fast the fog over the box thins.

## Tracks

| # | Track | Swings (smog / clear) | p10 – p90 (µg/m³) | Lead | Loop | Length |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Seoul | 6 (3 / 3) | 10.7 – 100.6 | Celesta | D minor | 0:40 |
| 2 | Pretoria | 20 (10 / 10) | 25.3 – 135.3 | Marimba | A minor | 0:40 |
| 3 | New York | 30 (15 / 15) | 13.7 – 55.5 | Electric piano | F minor | 0:40 |
| 4 | Lisbon | 32 (16 / 16) | 4.3 – 24.8 | Vibraphone | E minor | 0:40 |

Data files: `data/smog/tracks/` (see `tracks.json` for the source, version, credit, each city and its box).

- GEOS-CF v1 (NASA GMAO), surface PM2.5 (`pm25_rh35_gcc`). 5151 links v2, which starts on 2025-08-04; v1 holds all of 2025 (user, 2026-11-15).
- One hour a day, the mean of 00:00–01:00 UTC: morning in Seoul, night in Pretoria and Lisbon, the evening before in New York. A year plays in 40 s, a day in 0.11 s, so one value a day is all the music can carry.
- The cities were picked on a 1° grid (notebook, section 4). The tracks read the city's own 0.25° cell, and its swings are counted again there: Pretoria's fall from 38 to 20, the others stay close (section 6).
- The map: the box of 33 × 33 cells (0.25°, ±4°) around the city's cell, rounded to whole µg/m³.

## Time

136 BPM in 4/4, a day a sixteenth note (0.110 s), 365 days: 40.3 s a track. The steps are counted from January 1, so the bars stay in place wherever the needle is set down. The date on the label is the day playing.

## Sound

Dark deep house in a minor key (user, 2026-11-15): bad news does not sound bright ([album-guide](../album-guide.md)). Each track plays one four-bar loop from start to end; the air only changes how it comes through, the same way in every track (nell-v2).

| Part | What it plays |
| --- | --- |
| Lead (main) | The track's hook on keys or mallets (`SmogLead`), one or two octaves over the chords |
| Pad | Warm pad, the bar's chord |
| Bass | Synth bass 1, the chord's root on the off-beats |
| Drums | Standard kit: kick on every beat, clap on 2 and 4, closed hat off the beat, quiet hats on the sixteenths between |

| Data | Sound | Screen |
| --- | --- | --- |
| The city's PM2.5 that day, as fog: 0 at 15 µg/m³ (WHO 24-hour guideline), 1 from 125.5 µg/m³ (EPA "very unhealthy"), log-scaled, the same scale for every city (user, 2026-11-15) | The whole mix through a low-pass from 18 kHz (clear) down to 220 Hz (full fog), as if through a wall; reverb 0.12 to 0.6 and overdrive 0 to 0.3 with it (nell-v2) | The fog over each cell, on the same scale |
| A swing into the high band (the smog rolls in) | A deep boom (analog `CAVE` at D1 and a falling noise hit) | The map darkens and recovers over 1.2 s |
| A swing into the low band (it clears) | A noise riser over the beat before, the loop silent through it, then a crash and an impact | The clear places flash bright and fade over 1.2 s |
| The fog the box loses by the next day (mean over its cells) | A gust of noise on each beat, none below 0.1 and full at 0.3 of a whole fog (ours, not yet heard) | The fog thins |

Swings sound on their own day, not moved onto the beat: the air can swing back the very next day (New York, Lisbon and Pretoria all do), and moving them would drop one of the two.

Code: [`composers/smog.js`](../../src/features/music/domain/composers/smog.js), [`tracks/domain/smog.js`](../../src/features/tracks/domain/smog.js).

## Globe

The globe holds still over the city: it cannot be turned or zoomed by hand, as there is no smog drawn beyond the box (user, 2026-11-15). The label's edge is 90% of the way to the box's nearest edge (about 3° of arc).

The fog is one patch of the globe over the box, drawn by a shader in [`smog-layer.js`](../../src/features/globe/presentation/smog-layer.js): each cell's fog blended from one day to the next as the day passes, smooth between cells, stirred by slowly drifting noise, from a pale haze to a dirty brown as it thickens, fading out at the box's edge. A small white ring marks the city. Below the date, the read-out gives the city's PM2.5 that day.

## Covers

Each track's cover is its city in haze, from Wikimedia Commons (credits in [`albums.js`](../../src/features/album/data/albums.js)). New York's is the wildfire smoke of June 2023, not 2025.

## Checks

| Check | Result |
| --- | --- |
| Length | 40.3 s a track |
| Swings heard | Every swing gives one boom or one crash and riser (mock run of the composer over each year) |
| Muffling range | Low-pass reaches 220 Hz in Seoul and Pretoria, 249 Hz in New York, 1,122 Hz in Lisbon |
| Listening, volumes of the new instruments, screen | Not yet done: needs the user |
