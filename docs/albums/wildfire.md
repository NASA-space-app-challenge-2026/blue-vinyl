# Wildfire Album: As the Season Burns

Issue #29. Follows [album-guide.md](../album-guide.md). Data from `notebooks/wildfire_album.ipynb`.

## Message

> "Climate change continues to cause longer fire seasons and more severe wildfires." ([SVS 40531](https://svs.gsfc.nasa.gov/40531/), Wildland Fires Dashboard)

> "The extent of area burned by wildfires each year appears to have increased since the 1980s. … of the 10 years with the largest acreage burned, all have occurred since 2004, including the peak years in 2015 and 2020." ([SVS 5453](https://svs.gsfc.nasa.gov/5453/))

Track 1 plays the national graph, with each year's large fires on the globe where they burned. Track 2 opens 2020, one of those peak years, as large FEDS fires on the CONUS globe.

## Tracks

| # | Track | Data | Length |
| --- | --- | --- | --- |
| 1 | Burned Acres | NIFC annual acres 1983–2024 (42 years); MTBS large fires 1984–2024 on the globe | 0:30 |
| 2 | 2020 Fire Season | FEDS large fires (`farea > 50` km²), daily Jun 1 – Dec 31 (214 days) | 0:29 |

Files: `data/wildfire/tracks/` (`tracks.json` for sources and credit). `mtbs_large_fires.csv` holds each year's MTBS large fires: ignition date, acres and a point inside the burned area. `feds_2020_fire_days.csv` holds each large fire per day: its area and the newly burning pixels FEDS saw. Every source: [data/wildfire/sources.md](../../data/wildfire/sources.md).

NIFC marks 2004 with a footnote (state lands in North Carolina are not included); the year is kept as published.

## Time

- Track 1: one year a bar of 0.68 s, then a 1.3 s tail: 29.9 s (`WILDFIRE_YEAR_TIMELINE`).
- Track 2: one day a beat of 0.13 s over the 2020 large-fire season, then a 1.2 s tail: 29.0 s (`WILDFIRE_DAY_TIMELINE`, read with the year timeline's functions).

## Sound

C minor, FluidR3_GM (CC BY 3.0). Dark register: bad news must not sound bright ([album-guide](../album-guide.md)).

The main instrument says how big the fire is the same way in both tracks: higher and louder is bigger. Around it the fire itself is heard, so a listener who cannot see the globe hears its size too:

- **Roar**: FluidR3 `seashore`, low, louder (24 dB) and brighter (an octave) as the fire grows, in two voices a scale step apart that stand wider apart.
- **Ignition** (Track 1): the year's large MTBS fires plucked as they start, so a big year crackles and a small one barely does. The breath after a blast silences the roar, not these plucks: in 2015 and 2020 the year's fires go on starting through it.
- **Blast**: into each track's peak, an accelerating timpani roll (gaps 0.16 s down to 0.035 s, soft to loud), a harp run rising three octaves and a reverse cymbal build for 1.8 s. On the peak every section stabs a C minor chord at once, then everything rests for a breath (0.45 s) while it rings, and the fire comes back.

| Track | Part | Data | Mapping |
| --- | --- | --- | --- |
| 1 | French horn (main) | Annual burned acres | Pitch and loudness rise with acres (literal 5453 graph) |
| 1 | Roar | Annual burned acres | Louder, brighter and wider in bigger years |
| 1 | Cello | 10-year mean acres | Low floor that climbs with the long-term rise |
| 1 | Timpani | Top-10 acre years | Stroke on each of the ten largest years (all since 2004) |
| 1 | Pizzicato strings | MTBS fires of 50,000 acres or more (1–46 a year) | A pluck as each starts, as far into the bar as it started into its year (when the globe lights it); higher and louder the larger (log of area, up to 1,000,000 acres), panned west left to east right; fires within about five days pluck together, the largest three at once, and crowded plucks share one pluck's loudness |
| 1 | Blast | Largest years | 2015, and 2020 within 1% of it |
| 2 | Trombone (main, + tuba as weight when heavy) | Daily active large-fire area | Higher and louder as area grows; held while the pitch stays |
| 2 | Roar | Daily active large-fire area | Centred toward where the fires burn (west left, east right) |
| 2 | Cello | Fireline length | Quiet secondary line, every 4 days |
| 2 | Timpani | Season area records | Stroke when active area beats the last stroke's by 15%, at most every 1.5 s, not during the build |
| 2 | Blast | Largest active area | 16 September 2020 |

Checked on an offline render of each track (same mix bus and limiter as the player): loudness per beat follows the fire's size (correlation 0.88 in Track 1, 0.81 in Track 2), about 18 dB between the smallest and largest tenth of years and 29 dB across the season. At each blast the hit stands about 7 dB over the build, and the breath after it drops 14 to 18 dB. The build makes the year or days just before a peak louder than their data alone would.

Track 1's plucks, checked on an offline render in the browser (FluidR3 samples, no reverb): 534 plucks; per year their count follows NIFC acres (correlation 0.91) and so does their loudness (0.78). Over a year they sit 6 to 16 dB under the horn; their loudest 50 ms is just after 2020's blast, in the breath.

Code: [`wildfire-score.js`](../../src/features/music/domain/wildfire-score.js).

## Globe

The globe looks at the contiguous United States. Fire is drawn as it looks from orbit at night, by a shader in [`fires-layer.js`](../../src/features/globe/presentation/fires-layer.js) like the hurricane's: burned ground near black, a front glowing yellow to red along its edge with flames licking out past it and the heat's glow ahead of it, embers just behind it and, while a fire burns hard, grey smoke lit orange from below and sparks streaming east.

- **Track 1:** NIFC has no coordinates, so the globe shows each year's large fires from MTBS (USGS, USDA Forest Service) where they burned: every fire MTBS types as `Wildfire` or `Wildland Fire Use`, at least 1,000 acres in the West and 500 in the East. On the year's first beat, with its horn note (and the blast in 2015 and 2020), all its scars show in full, sized like Track 2's (radius 5× a circle of its area), so the year's area is seen when it is heard. Through the bar each fire then flares as far in as it started into its year, with its pluck, as hot as its size (full at 300,000 acres), and burns back down to its scar. The next year's fires replace them. MTBS holds a median 81% of NIFC's acres a year (correlation 0.98 across 1984–2024; 9 of the 10 largest years match), since it leaves out small fires. It starts in 1984, so 1983 shows no fires and the read-out says so. The music and the acres in the read-out stay NIFC's; the read-out also gives the count of mapped fires.
- **Track 2:** each large FEDS fire burns where its largest perimeter lies. Its scar grows with its area (radius 5× a circle of that area, so it reads on the label); its front, embers and smoke are as bright as the VIIRS pixels newly burning that day (full at 3,000 a day), so a fire that has gone out stays as a dark scar. The date label shows the day; the read-out above shows active km² and the fire count.

## Credits

- Covers, from Wikimedia Commons, chosen so the backdrop taken from them stays fire red: [Creek Fire, California, 8 September 2020](https://commons.wikimedia.org/wiki/File:2020_Creek_Fire_on_2020-09-08_1.jpg) (CAL FIRE, public domain), the album cover and Track 1; [Orange Skies Day, Market Street, San Francisco, 9 September 2020](https://commons.wikimedia.org/wiki/File:Market_St_during_Orange_Skies_Day_dllu.jpg) (Dllu, CC BY-SA 4.0), Track 2.
- Data: NIFC / NICC wildfires and acres; MTBS (USGS EROS, USDA Forest Service) fire occurrence points; NASA FEDS perimeter archive via VEDA (cited on EIC pages such as [5639](https://svs.gsfc.nasa.gov/5639/))
- Instruments: FluidR3_GM SoundFont (CC BY 3.0)

## Not Done Yet

- Docent narration for screen readers
- WebGL edge shader (album guide, Globe)
- Cover-derived backdrop colour
- Smaller fires (`farea ≤ 50`) if a denser globe is wanted later
