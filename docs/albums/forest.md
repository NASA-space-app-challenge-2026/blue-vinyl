# Forest Album: Forests Hold Carbon

The album's story, data and mappings. It follows [album-guide.md](../album-guide.md); the data comes from `notebooks/forest_album.ipynb` (issue #23).

## Message

> "Every year, about half of human caused carbon dioxide emissions are absorbed by oceans and the world's vegetation, including crops... and trees. ... Trees consume this carbon dioxide. They eat it as food and they store it as wood." ([SVS 14696](https://svs.gsfc.nasa.gov/14696/), NASA + Smithsonian and Greenhouse Gases, made for the Earth Information Center)

The album is fitted to the forest map. GEDI drew its map of the world's canopy from April 2019 to March 2023 (one composite; it does not show the forest changing), so the album has one track: the Earth turns once under the noon line (the meridian where the Sun stands highest) over that map. No year outside the window is played.

Pages and datasets (album guide Q4): 14696 is in the EIC gallery and its sources are [4950](https://svs.gsfc.nasa.gov/4950/) and [5095](https://svs.gsfc.nasa.gov/5095/) (Relative Height, GEDI RH100) and [5115](https://svs.gsfc.nasa.gov/5115/) and [5110](https://svs.gsfc.nasa.gov/5110/) (GEOS Carbon Dioxide).

## Tracks

| # | Track | Window | Lead (tropics) | Colour |
| --- | --- | --- | --- | --- |
| 1 | Under the Noon Sun · 2019–2023 | April 2019 to March 2023 (opens with the legend) | Harp | `#8ecf7a` |

The line runs from 52° S to 52° N and moves west a degree a step. Three bands: **north** (flute), **tropics** (harp), **south** (pizzicato).

Data files: `data/forest/tracks/` (see `tracks.json` for every source, version and credit): `forest_noon_line.csv` (a row per degree: land share, mean height and density in each band), `canopy_height_quarter_degree.png` (the forest on the globe), and the XCO2 files, which the album no longer reads.

### Sources without a login

- **Canopy height**: GEDI L3 Gridded Land Surface Metrics v2 (ORNL DAAC 1952), mean RH100 on a 1 km grid, read from the public NASA GIBS WMS and turned back into metres through the GIBS colour tables (0.5 m classes; 45 m and above is one class). The footprint files and GeoTIFFs need an Earthdata login.

## Time

A step is a sixteenth note of 0.125 s at 120 bpm in 3/4 (12 steps a bar). One step is one degree of longitude. 360 steps take the line once round the Earth (45 s); the listening legend plays over its first 120 steps (10 bars) while the line already moves. The globe and the music read the same step.

## Sound

D dorian, from the album's sound font (`orchestra.sf2`, GeneralUser GS). Code: [`noon.js`](../../src/features/music/domain/composers/noon.js).

Three voices play the forest under the noon line, made to be followed by ear alone: how tall sets pitch and loudness together; how dense sets the rhythm.

| Part | Data | Mapping |
| --- | --- | --- |
| North (flute) | Canopy height and density, 23°–52° N | Pitch and loudness from 4–24 m; rhythm by density. Quiet where land is sparse or under 4 m |
| Tropics (harp) | Same, 23° S–23° N | As the north, from D4 |
| South (pizzicato) | Same, 52°–23° S | As the north, from D3 |
| Tubular bells | Land regions | A bell as the line reaches each continent |
| Woodblock | Longitude | A tick every 30° |
| Seashore | Sea / no forest | A wave each bar where no band is sounding |

## Globe

See [design.md](../design.md#data-on-the-globe): neon trees, picked at random and spaced apart, grow where the noon line has just passed; the taller the canopy, the bigger the tree, the deeper it branches and the brighter its colour (green, teal, sky, silver, gold); a CO₂ haze floats above them, warmer and higher where the air is thicker; the trees are lit by the noon sun over the line; a noon meridian ribbon moves west, and each forest note lights where it is played, in its voice's colour; the camera follows the meridian; the halo and the month label follow the air.

## Credits

- Cover: NASA Scientific Visualization Studio, [SVS 4950](https://svs.gsfc.nasa.gov/4950/) (GEDI forest height)
- Data: GEDI L3 v2, Dubayah et al., ORNL DAAC, served by NASA GIBS; NASA GMAO GEOS carbon
- Instruments: GeneralUser GS (see `src/features/music/data/soundfonts/CREDITS.md`)

## Not Done Yet

- Docent narration wired to the player (domain text is in `src/features/docent/domain/noon-narration.js`).
- Tuning the mix by ear (the levels are set from the sound font's defaults, not measured).
