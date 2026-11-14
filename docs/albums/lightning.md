# Lightning Album: Lightning Follows the Summer

The album's story, data and mappings. It follows [album-guide.md](../album-guide.md); the data comes from `notebooks/extreme_weather_album.ipynb` (issue #27).

## Message

> "A roving window of 10 days was used to visualize the seasonal patterns of lightning." ([SVS 5011](https://svs.gsfc.nasa.gov/5011/), Lightning Events Detected from the International Space Station (ISS) 2017-2023)

The question: why does lightning strike in different places as the seasons turn? Listening to the album, you hear the lightning move from the southern hemisphere to the northern one and back over a year, on two sides of the Earth: lightning goes to the hemisphere having its summer. The sun stands highest over the summer hemisphere, its land warms, and thunderstorms grow there (ours; EIC shows the seasonal pattern without saying why).

- Main information: how much lightning each hemisphere has (how full the southern and northern grooves are), and which hemisphere has more (minor or major).
- Supporting information: the latitude of each flash (further from the equator is higher in the north and lower in the south), and the different pace of the change on the two sides.

## Tracks

| # | Track | Globe looks at | Flashes in view | Drawn | South | North | Length |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | The Americas and Africa | 25° W on the equator | 539,419 | 59,879 | Taiko | Celesta | 1:00 |
| 2 | Asia and Australia | 110° E on the equator, flashes west of 52° E left out | 287,006 | 59,806 | Koto | Dulcimer | 1:00 |

Data files: `data/extreme_weather/tracks/` (see `tracks.json` for the source, version, credit and each track's `view`).

- Each track plays 2021, all 365 days, every orbit (5,634 listed, 5,490 with lightning). The browser has no orbits for July 20 to 22, and few on February 24, June 20 and July 19; a day's amounts are scaled to a full day's orbits (15.5), and a day without orbits is left out of the 7-day means.
- The view: 25° W holds 99% of the lightning of the busiest view (30° W). The opposite side (155° E) is mostly the Pacific, and a view nearer Europe has Africa below it, so the second track looks at 110° E (South and East Asia above, Australia below). Africa's east still reaches into it, so its flashes west of 52° E (just past Cape Hafun, 51.4° E) are left out.
- Only flashes within 70° of the centre of view are kept, clear of the squeezed edge of the disc.
- Time watched: the station hurries over the equator and lingers near 51.6°, so each flash is weighed by how long its latitude is watched.
- Each hemisphere's amount: the weighed flashes added up day by day, a 7-day mean, divided by the track's busiest hemisphere-day and square-rooted (loudness is heard that way).
- The flashes drawn and played: a sample of about 60,000 of the flashes in view, weighed by time watched.

The northern share of each side's lightning (notebook, section 5):

| Side | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| The Americas and Africa | 18% | 18% | 33% | 58% | 72% | 87% | 90% | 76% | 61% | 44% | 35% | 13% |
| Asia and Australia | 10% | 22% | 60% | 81% | 92% | 89% | 96% | 91% | 83% | 50% | 26% | 10% |

The lead changes hands (7-day means, held at least 10 days): the Americas and Africa on April 2 (north) and October 4 (south), Asia and Australia on March 14 (north) and October 16 (south).

## Time

A year in a minute, about six days a second, from January 1, 2021 to the midnight after December 31.

## Sound

| Element | Value |
| --- | --- |
| Genre | Ambient over a percussion groove: the south dark and heavy, the north bright and light |
| Tempo | 120 BPM, 4/4. A bar is about 12 days (2 s), a step (sixteenth note) about 18 hours |
| Key | Set by the hemisphere with more lightning: D minor while the south has more (pad Dm9 and B♭maj7, minor pentatonic), D major while the north has more (pad Dmaj9 and Gmaj7, major pentatonic). It turns on the bar the north overtakes the south, and back on the bar the south overtakes it |
| Instruments | Per track. South: taiko (the Americas and Africa) or koto (Asia and Australia), with a deep analog bass (D1) on the bar's first four strikes. North: celesta or dulcimer, with a noise hi-hat on every strike. Under them a halo pad. GeneralUser GS programs (`orchestra.sf2`); the bass and the hi-hat come from the analog synth |
| Space | Reverb 0.3, an echo three steps behind at 0.1 |

| Data | Role | Globe | Sound | Updated |
| --- | --- | --- | --- | --- |
| Each hemisphere's amount | Main | Many points in the hemisphere's colour | How full the hemisphere's groove is: amount × 12 steps (at least 1) filled in a set order. The south strong beats first (1, 3, 4, 2, off-beats…), the north off-beats first (eighth off-beats, beats, sixteenth off-beats…). No lightning leaves the hemisphere silent. The south's first four strikes add the bass, every northern strike the hi-hat | Bar |
| Each hemisphere's share (its pull) | Main | (as above) | Loudness: the share stretched so 25% or less is 0 and 75% or more is 1 (50:50 is 0.5 each) sets the strikes' velocity 40 to 120 (+7 on the beat), the channel's expression 40 to 127, and the bass and hi-hat. The bass is kept down (at most 75) so the south does not sound heavier at the same share. With the lightning centred on the equator the two musics are even; as it moves, the other side steps back | Bar |
| Which hemisphere has more | Main | Its colour fills the globe | Key: D minor or D major (pad and every strike) | Bar |
| Struck flashes | Main | Appear on the step that sounds them, flaring white at five times their size and settling over 0.45 s, then stay brighter (0.9). While the music is stopped they appear at their own time | Walking the drawn flashes in time order, 0.4 (quietest) to 2.4 (busiest) a day are struck, about 7 a second. Each waits for its hemisphere's next strike and takes its pitch; so none waits long on a sparse bar, a waiting flash may also strike the groove's first 4 steps. Flashes on the same step flare together. In simulation they wait at most 3 steps (0.375 s) | Step |
| Flash latitude | Supporting | Its place on the globe | The step's pitch: the waiting struck flash's latitude, or else the bar's flashes in that hemisphere in time order, picked as far through them as the step is through the bar. Further from the equator, the north climbs from D5 and the south falls from D3, on the key's pentatonic (8 steps at 45°) | Step |
| The lead changes hands | Supporting | The equator flares in the colour of the hemisphere taking the lead, four times as wide and bright, settling over 1.2 s | None (the key turns on its own bar) | Twice a year |
| Centre latitude of the lightning in view | Supporting | A line across that latitude (3 px, orange in the north, blue in the south): the mean latitude of the flashes drawn in the last 6 days | None | Frame |
| Hemisphere | Main | Flash colour: north orange (#ffb347), south blue (#5fb4ff). Flashes not struck brighten dimly (0.4) over 1.5 days and fade over 6, so nothing pops | Instrument and register | Frame |
| Latitude the noon sun stands over | Context | Light around it (full within 20°), shadow toward the poles (0.6 black beyond 70°): the summer hemisphere is lit | None | Frame |
| Equator and tropics | Context | Equator solid, tropics dashed | None | Fixed |

- The globe stays on the track's side of the equator and does not zoom. North is up and south down, so high sounds (north) and low sounds (south) match the screen.
- Steps are counted from the start of the track, so the bars stay in place wherever the needle is set down.
- Day and night are left out of the sunlight: at six days a second they would flicker.

The tempo, the two grooves' orders, the instruments, the two keys and the colours stay the same all year on both tracks. Only the data changes: each hemisphere's amount and latitudes, and the struck flashes.

What pops on screen is only the struck flashes, each first appearing on the step its hemisphere strikes and flaring white. A flare above (north, orange) is a bright, high sound; below (south, blue), a dark, low one. As orange points grow, the high sounds and the hi-hat fill in; as blue points grow, the low sounds and the bass. When orange overtakes blue the music turns to major, and back to minor when blue overtakes again, as the equator flares in the colour taking over.

## Checks

| Check | Result |
| --- | --- |
| Track length | Both 1:00 |
| Composer simulation (Node, the exported CSVs, 60 s each) | Struck flashes: 440 (the Americas and Africa) and 429 (Asia and Australia), all heard but the last of each, which is still waiting when the track ends. Wait: median 0 and 0.4 steps, at most 3 steps. Average strike velocity, south/north: the Americas and Africa January 111/53, April 78/90, July 47/123, October 84/82, December 115/50; Asia and Australia January 123/43, March 83/84, July 47/123, October 78/95, December 120/45. The two are even around April and October, and change places as the summer hemisphere does |
| Browser (Chrome, headless) | The globe on 25° W in early April with the centre line on the equator; at the end of June the orange centre line north of the equator and orange points over West Africa and the Caribbean. Asia and Australia in early April: orange points over South and East Asia, Africa out of view. Analyser level while playing: −17 to −31 dB. No console errors beyond the placeholder albums' missing covers |
| Listening | Not done yet |

## Credits

- Covers, one per track, thunderstorms seen from the International Space Station: NASA, public domain, via Wikimedia Commons
  - The Americas and Africa: [ISS-20 Thunderstorms on the Brazilian Horizon](https://commons.wikimedia.org/wiki/File:ISS-20_Thunderstorms_on_the_Brazilian_Horizon.jpg)
  - Asia and Australia: [ISS-49 Thunderstorms over South East Asia](https://commons.wikimedia.org/wiki/File:ISS-49_Thunderstorms_over_South_East_Asia.jpg), cropped to a square
- Data: Quality Controlled LIS on ISS Science Data V3.0 (NASA GHRC DAAC), through the ISS LIS browser of NASA MSFC. EIC cites V1, whose link no longer answers; V3.0 on GHRC needs an Earthdata login, and the browser prints the same quality-controlled flashes publicly.
- Instruments: GeneralUser GS v2.0.3 by S. Christian Collins (see `src/features/music/data/soundfonts/CREDITS.md`)

## Not Done Yet

- Listening, and the level against the other albums.
- Docent narration and text for screen readers.
