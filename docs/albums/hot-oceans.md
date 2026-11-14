# The Hurricane's Heartbeat (Hot Oceans Album)

Issue #21, branch `feat/#21`. Four Atlantic hurricanes that come ashore and die on land (Katrina 2005, Felix 2007, Laura 2020, Helene 2024), each heard as the speed of its drums, from its birth to its last record. EIC page: [5072 Atlantic Hurricane Wind Speed Plots](https://svs.gsfc.nasa.gov/5072/). Analysis: [`notebooks/hot_oceans_album.ipynb`](../../notebooks/hot_oceans_album.ipynb). Sources: [`data/hot_oceans/sources.md`](../../data/hot_oceans/sources.md).

Status (2026-11-14): implemented. Tracks exported (notebook section 12), album in [`albums.js`](../../src/features/album/data/albums.js), sound and globe as below.

## Message

5072 plots each storm's wind speed over its life, against the category lines:

> "These simple visualizations are plots of time vs. wind speed for each tropical storm/hurricane of Atlantic Hurricane seasons from 1950 to the present. Horizontal lines indicate wind speed category thresholds."

The album plays that curve as speed: the drums race as the storm grows, peak once, and slow to a stop as the land kills it.

The notebook's sections 2–8 study EIC page 5097 (storms and the warm water under them). That analysis is kept for reference; the album no longer uses it or its datasets.

## Decisions (user, 2026-11-14)

- **EIC page: 5072.** The tracks use only the dataset it cites, HURDAT2. The sea surface temperature (MUR, cited by 5097) is neither played, drawn nor used to choose the storms.
- **One storm per track.** Storms moving as a flock go to a **separate album**.
- **Tracks: storms that die on land.** From its last landfall to its last record, the storm's wind never rises again (notebook section 9.2): a storm that leaves the coast and strengthens at sea does not qualify. Of the 163 such Atlantic hurricanes of 1950–2025, the user chose Katrina 2005, Felix 2007, Laura 2020 and Helene 2024. Michael 2018 was dropped: it goes back out to sea and grows to 65 kt as an extratropical storm.
- **The track plays the storm's death too**: from its birth to its last HURDAT2 record, where it dissipates, so the tracks differ in length (below).
- **The sound is the earlier single-storm album's** (`nell-v2`, "Chasing the Rising Storm", see Reference below) **without its melody**, the speed carried by the drums alone:
  - the tempo follows the wind on **one straight line**, from 60 BPM at the album's weakest wind to 200 BPM at its strongest, not in steps;
  - each kit plays **one beat** all track long, playable by a drummer up to 200 BPM;
  - **one fill, at the storm's peak**, and nowhere else.
- **No sound at landfall.** The gong tried before was removed.
- **Each track has its own percussion family**: Katrina drum set, Felix marching drumline, Laura Latin, Helene orchestral timpani and snare.
- **Title**: "The Hurricane's Heartbeat". A heartbeat is counted in beats a minute, as the drums' tempo is; it quickens as the storm grows and fades to a stop on land. It replaced "Hurricanes over Warm Water", chosen when the water was part of the album.

## Tracks

| Track | Life | Dying on land | Peak | Last landfall | Length | Kit |
| --- | --- | --- | --- | --- | --- | --- |
| Katrina 2005 (`AL122005`) | 23 Aug 18 UTC – 30 Aug 12 UTC | to 31 Aug 06 UTC, over the Ohio Valley | 150 kt | 105 kt, Mississippi, 29 Aug 14:45 UTC | 33.3 s | Drum set |
| Felix 2007 (`AL062007`) | 31 Aug 12 UTC – 5 Sep 06 UTC | to 6 Sep 18 UTC, over southern Mexico | 150 kt | 140 kt, Nicaragua, 4 Sep 12 UTC | 39.5 s | Marching drumline |
| Laura 2020 (`AL132020`) | 20 Aug 00 UTC – 28 Aug 06 UTC | to 29 Aug 06 UTC, over Kentucky | 130 kt | 130 kt, Louisiana, 27 Aug 06 UTC | 33.6 s | Latin |
| Helene 2024 (`AL092024`) | 24 Sep 12 UTC – 27 Sep 18 UTC | to 28 Sep 18 UTC, over Kentucky | 120 kt | 120 kt, Florida Big Bend, 27 Sep 03:10 UTC | 39.2 s | Orchestral |

"Life" ends at the first record after the peak below 34 kt or no longer tropical. Felix's remnant low crosses the Gulf of Honduras for one record (20 kt) before going inland again; its wind does not rise.

## Time

Each track plays its storm's life in 30 s and its dying on land on at the same pace, so it lasts 33–40 s (notebook section 12, `durationSec` in `albums.js`). Felix and Helene, whose remnants linger longest, run past the album guide's 25–35 s (user, 2026-11-14: the dying matters more than the length). The storm fades in over the track's first 2.5 s and out over its last.

## Sound

[`composers/hurricane.js`](../../src/features/music/domain/composers/hurricane.js), on the app's SoundFont (GeneralUser GS).

| Layer | Data | Sound |
| --- | --- | --- |
| Wind | Maximum sustained wind | The tempo, set at each bar: `tempoOf`, 60 BPM at the album's weakest wind (15 kt, Felix's last record) to 200 BPM at its strongest (150 kt, Katrina and Felix), on one straight line. The album's range is read from all its tracks when they load. The track's kit plays one beat throughout, its ringing drums panned round the listener with the storm's spin |
| Peak | The storm's first record at its strongest wind | The bar it falls in is the kit's fill, once |
| Band | Wind category | Behind the drums a double bass and a pad strike each bar, cello, viola and violin circle the chord (from tropical storm, category 1 and 2) in the finest notes at least 0.1 s apart, a choir joins from category 3, as in the earlier album |

The beats are the earlier album's major-hurricane grooves, written so a drummer can play them at 200 BPM (no sixteenth-note hi-hat; the drumline on eighths only); the fills are its category 5 fills:

| Kit | Beat | Peak fill |
| --- | --- | --- |
| Drum set | Ride in eighths, kick on 3 + 3 + 2, flams on the backbeat, ghost notes | Down the toms into a snare roll |
| Latin | 3-2 son clave, the conga's tumbao with a flam on the slap, the bell in eighths | Timbales and congas down into a timbale roll |
| Marching drumline | Basses' pulse and splits, snare flams, tenors sweeping, all on eighths | Tenors sweep the whole bar under the cymbals |
| Orchestra | Timpani rocking D–A in eighths under the snare's flams and ghost strokes | Timpani down D, C, A, G into a timpani and snare roll |

- Harmony: D minor, i – VI – III – VII, a chord at least 2 s long.
- In an offline render the tempo runs, bar by bar: Katrina 76 → 197 → 76 BPM, Felix 70 → 200 → 65, Laura 76 → 176 → 66, Helene 86 → 169 → 71, each with one fill.

## Globe

- **The storm** ([`storm-view.js`](../../src/features/globe/presentation/storm-view.js)): a cloud spiral drawn by a shader on the globe, turning anticlockwise. Its wind grows it, spins it faster, clears its eye and tints its thin cloud from sea blue through yellow to magenta. The globe keeps it in the middle; the glow around the globe takes its colour.
- **Below the storm**: its wind in km/h, in its category's colour.
- **The date** at 6 o'clock (UTC).

## Credits

- Covers: each storm near its peak, public domain, from Wikimedia Commons: [Katrina, MODIS, 28 August 2005](https://commons.wikimedia.org/wiki/File:Katrina_2005-08-28_1702Z.jpg) (NASA/GSFC), also the album cover; [Felix from the International Space Station, 3 September 2007](https://commons.wikimedia.org/wiki/File:Felix_2007-09-03_1138Z.jpg) (NASA); [Laura, VIIRS, 26 August 2020](https://commons.wikimedia.org/wiki/File:Laura_2020-08-26_1925Z.jpg) (NASA LANCE); [Helene, MODIS on Aqua, 26 September 2024](https://commons.wikimedia.org/wiki/File:Helene_2024-09-26_1945Z.jpg) (NASA Worldview).
- Data, on the sleeve: NASA SVS 5072 · HURDAT2 (NOAA/NHC). Details in [`sources.md`](../../data/hot_oceans/sources.md).

## Not Done Yet

- Listening check in the app: the mix has been rendered offline only, not heard. The kits' volumes are the earlier album's.

## Reference: the Earlier Single-Storm Album

Project `nell-v2` (`/Users/nell/Projects/nasa/nell-v2`), album "Chasing the Rising Storm". Its percussion families, beats, fills, accompaniment and storm view are the base of this album's sound and globe.

- Spec: `docs/albums/hurricane.md`
- Catalog: `src/features/album/data/catalog/hurricane.js`
- Composer: `src/features/music/domain/composers/hurricane.js`
- Storm view: `src/features/globe/presentation/storm-view.js`
