# Hemispheres Album: The Year the Oceans Ran Hot

The album's story, data and mappings. It follows [album-guide.md](../album-guide.md); the data comes from `notebooks/hemispheres_album.ipynb` (issue #26).

## Message

- Question: in the year the oceans ran hottest, how often and how hard did storms come, and how did they move?
- Main information: when storms formed over a season, and how many at once.
- Supporting information: which way each storm went from where it formed and the curve it drew, and when in the season it formed.
- Story: 2023 was the hottest year the oceans had on record. In an El Niño year the Atlantic is usually quiet, but in 2023 it had 20 storms. In the southern summer of 2022–23 Freddy formed northwest of Australia, crossed the whole Indian Ocean to Madagascar and Mozambique, and became the longest-lived tropical cyclone on record. The South Pacific track is the basin's busiest season of any year, 1997–98, in the strongest El Niño measured until then: 21 storms, with Ron and Susan both category 5 in early January 1998.
- The sleeve says only that two tracks are northern and two southern, and to listen to how the storms move (north higher, west to the left). It does not claim the hemispheres curve opposite ways: over all storms the south is close to even (see the notebook, section 6).

EIC page: [SVS 5097 2022 Hurricane Season](https://svs.gsfc.nasa.gov/5097/), which draws storm tracks from the ATCF best track. Three tracks also credit an SVS page outside the EIC gallery about the same season (decided 2026-11-14).

## Tracks

| # | Track | Basin and days played | Storms (tracks) | Lead | Length | SVS |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Atlantic 2023 | North Atlantic, Jun 1 – Nov 30, 2023 | 20 (21) | Whistle | 0:40 | 5097 |
| 2 | Western Pacific 2023 | Western North Pacific, May 1 – Nov 30, 2023 | 17 (21) | Voice oohs | 0:45 | 5097, [5122](https://svs.gsfc.nasa.gov/5122/) |
| 3 | South Indian 2022–23 | South Indian, Dec 1, 2022 – Apr 30, 2023 | 8 (13) | Cello | 0:32 | 5097, [14312](https://svs.gsfc.nasa.gov/14312/) |
| 4 | South Pacific 1997–98 | South Pacific, Jul 1, 1997 – Jun 30, 1998 | 21 (21) | Trombone | 0:37 | 5097, [185](https://svs.gsfc.nasa.gov/185/) |

Data files: `data/hemispheres/tracks/` (see `tracks.json` for every source and credit). They come from IBTrACS v04r01's US agency columns (NHC and JTWC best tracks), every 6 hours, while a storm is in a tropical or subtropical stage; a storm that weakened and came back is two tracks. IBTrACS stands in for the ATCF best track 5097 cites (decided 2026-11-14). The Atlantic and the western Pacific keep every system; the South Pacific keeps the storms that reached 34 kt, the rule its season was picked by.

## Time

Each track plays its days evenly, from the first to the last. Lengths differ per track, between 30 and 45 s (decided 2026-11-14). About half of each season has no storm; that time is not skipped, the sea plays on. The South Pacific track plays the whole season from July, so its first storm comes about 10 s in.

## Sound

72 BPM, 4/4, a step a sixteenth note. D major. All parts play from the app's SoundFont (GeneralUser GS, see `src/features/music/data/soundfonts/CREDITS.md`).

| Part | Instrument | Data | Mapping |
| --- | --- | --- | --- |
| Sea | Halo pad, warm pad | none | Dmaj7 and Gmaj7 in turn every two bars over a drone on D and A, from start to end |
| Storm voice | The track's lead | a storm exists | a voice opens over 0.12 s as the storm forms and fades over 0.8 s as it ends |
| | | latitude | pitch, north higher, about a note every 2°: northern tracks 5°N–47°N on D3–D6, southern tracks 35°S–5°S on D2–D4, so southern storms sing lower and fall as they head for the pole; it glides to each new note over 0.15 s |
| | | degrees east of where it formed | pan: every storm starts in the middle, west to the left, east to the right, 20° of longitude to the side |
| | | distance from the globe's centre | loudness: full within half way to the label's edge, then down to silence at the edge |
| | | wind | loudness (a depression at 0.35) and how hard a new note is struck |

Every storm sings on the same lead within a track, up to 8 voices at once; the most storms at once is 4.

## Globe

- The globe is held over each ocean's centre: 24°N 59°W, 20°N 135°E, 18°S 80°E and 20°S 178°E. The label's edge is 42° of arc from the centre for the northern oceans and 56° for the southern ones, whose storms spread over a hundred degrees of longitude.
- Each storm alive is a storm symbol with its name. It spins counterclockwise in the north and clockwise in the south. Its colour and size follow its Saffir-Simpson category.
- Each storm that has formed leaves its path, 3 px wide, 0.11 opaque where it formed and 0.75 where it is, so the way it went shows. The path is coloured by when in its hemisphere's storm calendar it formed (May 1 – Nov 30 in the north, Nov 1 – May 31 in the south): pale mint, lilac, then deep pink. Paths stay until the track ends, so the season's map builds up.
- The date shows at 6 o'clock.

## Credits

- Data: IBTrACS v04r01 (NOAA/NCEI), NHC and JTWC best tracks · NASA SVS 5097, plus the track's own SVS page.
- Covers, all public domain via Wikimedia Commons: [Hurricane Lee](https://commons.wikimedia.org/wiki/File:Powerful_Hurricane_Lee_over_the_Atlantic_Ocean_(MODIS).jpg) (MODIS, NASA GSFC), [Typhoon Mawar](https://commons.wikimedia.org/wiki/File:Mawar_2023-05-26_0405Z.jpg) (Suomi NPP VIIRS), [Cyclone Freddy](https://commons.wikimedia.org/wiki/File:Freddy_2023-02-19_0900Z.jpg) (Suomi NPP VIIRS), [Cyclone Ron](https://commons.wikimedia.org/wiki/File:Ron_1998-01-06_0000Z.jpg) (GOES-9).

## Not Done Yet

- Listening: the music has been checked in Chrome only by screen and by the glow following it, not by ear.
