# Hemispheres Album: Mirror Storms

The album's story, data and mappings. It follows [album-guide.md](../album-guide.md); the data comes from `notebooks/hemispheres_album.ipynb` (issue #26).

## Message

- Question: in the year the oceans ran hottest, how often and how hard did storms come, and how did they move?
- Main information: when storms formed over a season, and how many at once.
- Supporting information: which way each storm went from where it formed and the curve it drew, and when in the season it formed.
- Story: 2023 was the hottest year the oceans had on record. In an El Niño year the Atlantic is usually quiet, but in 2023 it had 20 storms. In the southern summer of 2023 Freddy formed northwest of Australia, crossed the whole Indian Ocean to Madagascar and Mozambique, and became the longest-lived tropical cyclone on record.
- The sleeve says only that one track is northern and one southern, and to listen to how the storms move (north higher, west to the left). It does not claim the hemispheres curve opposite ways: over all storms the south is close to even (see the notebook, section 6).

The sound, the time and the globe follow nell-v2's "The Year the Oceans Ran Hot" (decided 2026-11-15): the same analog leads and sea, the same pace and the same storm sign.

EIC page: [SVS 5097 2022 Hurricane Season](https://svs.gsfc.nasa.gov/5097/), which draws storm tracks from the ATCF best track. The South Indian track also credits an SVS page outside the EIC gallery about the same season (decided 2026-11-14).

## Tracks

| # | Track | Basin and time played | Storms (tracks) | Lead | Length | SVS |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | North Atlantic 2023 | North Atlantic, Jun 1 12:00 – Oct 28 18:00, 2023 | 20 (21) | Whistle | 0:50 | 5097 |
| 2 | South Indian 2023 | South Indian, Jan 1 – Apr 15, 2023 | 7 (11) | Bowed string | 0:45 | 5097, [14312](https://svs.gsfc.nasa.gov/14312/) |

Data files: `data/hemispheres/tracks/` (see `tracks.json` for every source and credit). They come from IBTrACS v04r01's US agency columns (NHC and JTWC best tracks), every 6 hours, while a storm is in a tropical or subtropical stage; a storm that weakened and came back is two tracks. IBTrACS stands in for the ATCF best track 5097 cites (decided 2026-11-14). The Atlantic keeps every system.

## Time

Each track plays from its file's first record to its last, evenly, three days a second, held to 45–60 s: the Atlantic 49.75 s and the South Indian 45 s (stretched from 34.75 s). About half of each season has no storm; that time is not skipped, the sea plays on.

## Sound

72 BPM, 4/4, a step a sixteenth note. D major. The pad plays from the app's SoundFont (GeneralUser GS, see `src/features/music/data/soundfonts/CREDITS.md`); the drone and the storm voices play on an analog synth in Web Audio (`src/features/music/data/analog-synth.js`), an exception to the album guide's SoundFont rule decided 2026-11-15, as in nell-v2. The whole mix rings in a large room (reverb send 0.4) and echoes three steps behind (send 0.18, feedback 0.4).

| Part | Instrument | Data | Mapping |
| --- | --- | --- | --- |
| Sea | Halo pad (SoundFont), cave drone (analog) | none | Dmaj7 over D2, then Gmaj7 over G2, two bars each, from start to end |
| Storm voice | The track's lead (analog, held and gliding) | a storm exists | a voice swells in over 0.12 s as the storm forms and fades over 0.8 s as it ends |
| | | latitude | pitch, north higher, about a note every 2°: northern tracks 5°N–47°N over three octaves of D major from D3, southern tracks 35°S–5°S over two octaves from D2, so southern storms sing lower and sink as they head for the pole; it glides to each new note over 0.15 s |
| | | degrees east of where it formed | place around the listener on an HRTF panner: every storm starts straight ahead, west to the left, east to the right, fully to the side 20° of longitude away |
| | | distance from the globe's centre | loudness: full within half way to the label's edge, then down to silence at the edge (squared cosine) |
| | | wind (intensity, kt / 160) | loudness (0.35 when calm to 1) and brightness (the filter's cutoff 1 to 4 octaves above the note) |

The leads:

| Track | Lead | Sound |
| --- | --- | --- |
| North Atlantic 2023 | Whistle | one sine, quick vibrato (5.5 Hz, ±18 cents) |
| South Indian 2023 | Bowed string | a sawtooth over a triangle an octave down, slow narrow vibrato (4.5 Hz, ±12 cents), filter Q 2 |

Every storm on the globe sings, one voice each.

## Globe

- The globe is held over each ocean's centre: 24°N 59°W and 18°S 80°E. The label's edge is 41.8° of arc from the centre for the northern ocean (the globe 1.5 times the label) and 56.4° for the southern one (1.2 times), whose storms spread over a hundred degrees of longitude.
- Each storm alive is the weather map's hurricane sign, a dark eye ringed in its colour with two trailing arms, turning counterclockwise once every 1.6 s, mirrored to clockwise in the south. It is turned the way the storm goes, with its name upright beside it, and a 30-day comet tail in the track's colour behind it. Its colour follows its intensity (kt / 160): sea blue, green, yellow, orange, red, then magenta; its size grows from 0.7 to 1.8 times.
- Each storm that has formed leaves its path, 3 px wide, brightening from 0.11 opaque where it formed to 0.75 where it is, so the way it went shows. The path is coloured by when in its hemisphere's seven-month storm season it formed (from May 1 in the north, Nov 1 in the south): pale mint, periwinkle, then deep pink; a storm up to two months early counts as the season's start. Paths stay until the track ends, so the season's map builds up.
- The date shows at 6 o'clock.

## Credits

- Data: IBTrACS v04r01 (NOAA/NCEI), NHC and JTWC best tracks · NASA SVS 5097, plus the track's own SVS page.
- Covers, all public domain via Wikimedia Commons: [Hurricane Lee](https://commons.wikimedia.org/wiki/File:Powerful_Hurricane_Lee_over_the_Atlantic_Ocean_(MODIS).jpg) (MODIS, NASA GSFC), [Cyclone Freddy](https://commons.wikimedia.org/wiki/File:Freddy_2023-02-19_0900Z.jpg) (Suomi NPP VIIRS).

## Not Done Yet

- Listening: the music has not been heard since it was moved to the analog synth (2026-11-15). The composer was only run against the data with a stand-in for the engine.
