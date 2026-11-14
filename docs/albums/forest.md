# Forest Album: Forests Hold Carbon

The album's story, data and mappings. It follows [album-guide.md](../album-guide.md); the data comes from `notebooks/forest_album.ipynb` (issue #23).

## Message

> "Every year, about half of human caused carbon dioxide emissions are absorbed by oceans and the world's vegetation, including crops... and trees. ... Trees consume this carbon dioxide. They eat it as food and they store it as wood." ([SVS 14696](https://svs.gsfc.nasa.gov/14696/), NASA + Smithsonian and Greenhouse Gases, made for the Earth Information Center)

Each track reads the forest under one ISS orbit, as GEDI does, while the CO₂ in the air rises through the same 125 months of 2015–2025. The forests sound different from place to place; the air goes the same way every time. EIC does not turn forest height into carbon on these pages, and the CO₂ data does not separate what forests take up, so the two are played side by side, as the video shows them, not as cause and effect.

Pages and datasets (album guide Q4): 14696 is in the EIC gallery and its sources are [4950](https://svs.gsfc.nasa.gov/4950/) and [5095](https://svs.gsfc.nasa.gov/5095/) (Relative Height, GEDI RH100) and [5115](https://svs.gsfc.nasa.gov/5115/) and [5110](https://svs.gsfc.nasa.gov/5110/) (GEOS Carbon Dioxide).

## Tracks

| # | Track | Region the orbit is chosen for | Lead | Colour |
| --- | --- | --- | --- | --- |
| 1 | Amazon | 15° S–5° N, 75°–50° W | Marimba | `#9ad66a` |
| 2 | Congo Basin | 5° S–5° N, 12°–30° E | Harp | `#e0c060` |
| 3 | Borneo | 4° S–7° N, 108°–119° E | Koto | `#5ac8a8` |
| 4 | Pacific Northwest | 42°–49° N, 124.5°–120° W (old growth of 5095) | Pizzicato strings | `#c8e8a0` |

Each orbit is a circular one of 51.64° and 92.9 min; its ascending node (to 0.5°) is the one crossing the most canopy of 10 m or taller inside the region (ours). Each track is 55 s.

Data files: `data/forest/tracks/` (see `tracks.json` for every source, version and credit): per track `<track>_orbit.csv` (a row per step: where the ISS is, the mean canopy height and its spread under it, and the forest density around it) and `<track>_forest.csv` (the cells drawn on the globe, with the step the ISS passes each), and `global_xco2_monthly.csv`, which every track shares.

### Sources without a login

- **Canopy height**: GEDI L3 Gridded Land Surface Metrics v2 (ORNL DAAC 1952), mean RH100 and its standard deviation on a 1 km grid, read from the public NASA GIBS WMS and turned back into metres through the GIBS colour tables (0.5 m classes; 45 m and above is one class). The footprint files and GeoTIFFs need an Earthdata login.
- **CO₂**: NASA GMAO GEOS daily assimilated CO₂ (version PRE), column average XCO2, from the public GMAO datashare; the 15th of each month, averaged over the globe by area.

## Time

A step is a sixteenth note of 0.22 s, a bar of slow 6/8 is 12 steps, a year two bars. Two steps are a month of CO₂, so the 125 months take 250 steps, 55 s. The orbit is laid over the same steps: it starts in the middle of its longest stretch without data (over the sea), and the sea goes by four times as fast as the land, so most of the track is forest. The globe and the music read the same step.

## Sound

D dorian, from the album's sound font (`orchestra.sf2`, GeneralUser GS). Code: [`forest.js`](../../src/features/music/domain/composers/forest.js).

The lead reads the colours of GEDI's map (SVS 4950) under the ISS, as the mission puts it: the colour (canopy height) sets the pitch and how bright the note is, and how thickly the colours crowd together (forest density) sets the rhythm.

| Part | Data | Mapping |
| --- | --- | --- |
| Lead (each track its own wooden instrument) | Canopy height under the ISS (brown to white) | Pitch: 0–45 m over two and a half octaves of D dorian from D3, louder the taller, accented on each bar's downbeat. Brightness (CC 74, the filter): dark over short forest, open over the tallest. Land under 5 m (grass, scrub, desert) is silent |
| Lead rhythm | Forest density: the share of the cells around the ISS (the band drawn on the globe) with canopy of 10 m or taller | A note each dotted quarter where the forest is thin, eighths, sixteenths where it is dense, by the track's tertiles of density, so every track has all three. GEDI's canopy cover (L2B) needs a login, so density comes from the same height grid |
| Notes under the lead | How uneven the canopy is (standard deviation of RH100) | On each dotted-quarter beat, none, one or two notes below the lead (a third, then a fifth), by the track's tertiles of the spread |
| Celesta | Tall forest | An octave above the lead wherever the step's canopy is 25 m or more, as the tall columns flash |
| Choir | CO₂ | Held each bar: an open D (D3, A3), adding F3 past a quarter of the song's CO₂ range, C4 past half and E4 past three quarters; as loud as the month's CO₂, so it swells over the years and dips each northern summer |
| Cello | CO₂ | D2 each bar, harder as the CO₂ rises |
| Seashore | The sea | A wave each bar the ISS is over the sea or a gap |

## Globe

See [design.md](../design.md#data-on-the-globe): the camera follows the ISS, closer than the fitted view; the forest it passes grows into columns coloured like 4950; the halo around the globe thickens with the CO₂; the month and its ppm are printed at 6 o'clock.

## Credits

- Cover: NASA Scientific Visualization Studio, [SVS 4950](https://svs.gsfc.nasa.gov/4950/) (GEDI forest height); Pacific Northwest: [SVS 5095](https://svs.gsfc.nasa.gov/5095/) (old growth in the Northwest US)
- Data: GEDI L3 v2, Dubayah et al., ORNL DAAC, served by NASA GIBS; NASA GMAO GEOS carbon
- Instruments: GeneralUser GS (see `src/features/music/data/soundfonts/CREDITS.md`)

## Not Done Yet

- Docent narration and text for screen readers.
- Tuning the mix by ear (the levels are set from the sound font's defaults, not measured).
