# Forest Album: Forests Hold Carbon

The album's story, data and mappings. It follows [album-guide.md](../album-guide.md); the data comes from `notebooks/forest_album.ipynb` (issue #23).

## Message

> "Every year, about half of human caused carbon dioxide emissions are absorbed by oceans and the world's vegetation, including crops... and trees. ... Trees consume this carbon dioxide. They eat it as food and they store it as wood." ([SVS 14696](https://svs.gsfc.nasa.gov/14696/), NASA + Smithsonian and Greenhouse Gases, made for the Earth Information Center)

The album is fitted to the forest map. GEDI drew its map of the world's canopy from April 2019 to March 2023 (one composite; it does not show the forest changing), so the album has one track: the Earth turns once under the noon line (the meridian where the Sun stands highest) over that map. No year outside the window is played.

Pages and datasets (album guide Q4): 14696 is in the EIC gallery and its sources are [4950](https://svs.gsfc.nasa.gov/4950/) and [5095](https://svs.gsfc.nasa.gov/5095/) (Relative Height, GEDI RH100) and [5115](https://svs.gsfc.nasa.gov/5115/) and [5110](https://svs.gsfc.nasa.gov/5110/) (GEOS Carbon Dioxide).

## Tracks

| # | Track | Window | Colour |
| --- | --- | --- | --- |
| 1 | Under the Noon Sun · 2019–2023 | April 2019 to March 2023 (opens with the legend) | `#8ecf7a` |

The line runs from 52° S to 52° N and moves west a degree a step. It is read in three bands (north, tropics, south) for the forest's density, which the cello drone and the meridian follow.

Data files: `data/forest/tracks/` (see `tracks.json` for every source, version and credit): `forest_noon_line.csv` (a row per degree: land share, mean height and density in each band), `canopy_height_quarter_degree.png` (the forest on the globe), and the XCO2 files, which the album no longer reads.

### Sources without a login

- **Canopy height**: GEDI L3 Gridded Land Surface Metrics v2 (ORNL DAAC 1952), mean RH100 on a 1 km grid, read from the public NASA GIBS WMS and turned back into metres through the GIBS colour tables (0.5 m classes; 45 m and above is one class). The footprint files and GeoTIFFs need an Earthdata login.

## Time

A step is a sixteenth note of 0.125 s at 120 bpm in 3/4 (12 steps a bar). One step is one degree of longitude. The track ends at step 312 (39 s), where the last tree's note and the last bar of the drone end over North America; the silent Pacific after it is left out. The track plays 3 dB louder than the sound font alone gives it (its median level measured about 3 dB under the other albums), and its volume fades in over the first 2 s and out over the last 4 s. The listening legend plays over its first 120 steps (10 bars) while the line already moves. The globe and the music read the same step.

## Sound

D dorian, from the album's sound font (`orchestra.sf2`, GeneralUser GS). Code: [`noon.js`](../../src/features/music/domain/composers/noon.js).

Every tree on the globe is one note: it starts when the tree starts to grow and lasts as long as the tree takes to grow. The globe and the music read one list of trees ([`forest-trees.js`](../../src/features/tracks/domain/forest-trees.js); picked with a fixed seed, so the same trees grow on every play). A tree's height class (the colour of the tree on the globe) is its instrument, as in NASA's Caldwell 73 sonification ([SVS 13786](https://svs.gsfc.nasa.gov/13786/): marimba and glockenspiel; its choir is left out): marimba for the low classes, glockenspiel for the middle, vibraphone for the gold. A tree is one strike, held from the moment it starts until it is grown. The gold trees are the tallest and the fewest, so they play louder than the rest (green 0.55, blue 0.7, sky 0.85, purple 1, gold 1.25 of the height's loudness), and the trees of one kind that start in the same step share its loudness, so the many small trees do not drown them. Inside its class a taller tree plays a higher note, and the taller the tree the louder. A thick forest is many trees, so many notes at once: each 2° square of the map that is at least a quarter forest grows a tree for every 244 of its forest cells (0.25°), by chance, so a full square has its tree about a quarter of the time and a thin one rarely (about 570 trees in all), and the trees of a thick square start within about a step of each other, a thin one's over nine, so a thick forest bursts and a thin one trickles. Where the forest is quiet (sparse land, under 4 m) no tree grows and no note sounds. A tree starts on a sixteenth (a whole step), so the music keeps time.

| Part | Data | Mapping |
| --- | --- | --- |
| Green trees (4–8 m) | Trees by final height | Marimba from D3; higher up the class, higher the note |
| Blue trees (8–14 m) | Same | Marimba from D4 |
| Sky trees (14–20 m) | Same | Glockenspiel from D5 |
| Purple trees (20–28 m) | Same | Glockenspiel from A5 |
| Gold trees (28 m and up) | Same | Vibraphone from D6, a bar that rings on, so the tallest trees are heard as their own |
| Cello drone | Forest density under the line | A low fifth held each bar, louder the thicker the bar's forest (swelling and ebbing a little over eight bars); soft but never silent over sea and desert. Its root walks D, C, G, A, two bars each, and on the second bar of each a soft viola adds the chord's third. The noon meridian shines with the same level |
| Tubular bells | Land regions | A bell as the line reaches each continent |
| Woodblock | Longitude | A tick every 30° |

## Globe

See [design.md](../design.md#data-on-the-globe): neon trees, picked with a fixed seed and spaced apart, grow where the noon line has just passed, each as its note starts; the taller the canopy, the bigger the tree, the deeper it branches and the brighter its colour (green, blue, sky, purple, gold); a CO₂ haze floats above them, warmer and higher where the air is thicker; the trees are lit by the noon sun over the line; a noon meridian ribbon moves west, and each tree's note lights where the tree starts, in the tree's colour; the camera follows the meridian; the halo and the month label follow the air.

## Credits

- Cover: NASA Scientific Visualization Studio, [SVS 4950](https://svs.gsfc.nasa.gov/4950/) (GEDI forest height)
- Data: GEDI L3 v2, Dubayah et al., ORNL DAAC, served by NASA GIBS; NASA GMAO GEOS carbon
- Instruments: GeneralUser GS (see `src/features/music/data/soundfonts/CREDITS.md`)

## Not Done Yet

- Docent narration wired to the player (domain text is in `src/features/docent/domain/noon-narration.js`).
- Tuning the mix by ear (the levels are set from the sound font's defaults, not measured).
