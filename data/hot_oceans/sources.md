# Sources: Hot Oceans Album

Every source the album uses, whether it comes from EIC or elsewhere. Written from [hot_oceans_album.ipynb](../../notebooks/hot_oceans_album.ipynb), which does the downloads. Rules: [data-guide.md](../../docs/data-guide.md#sources-file).

The album's tracks are in [`tracks/`](tracks/), exported by section 12 of the notebook and described in [`tracks/tracks.json`](tracks/tracks.json).

## EIC Visualizations

| SVS ID | Title | URL | Path from the EIC gallery | Role |
| --- | --- | --- | --- | --- |
| 5097 | 2022 Hurricane Season | https://svs.gsfc.nasa.gov/5097/ | EIC Videos → NASA and Hurricanes (https://svs.gsfc.nasa.gov/gallery/nasaand-hurricanes/) › 5097 | The album's message: warm water makes and feeds hurricanes. Storm tracks over sea surface temperature. |
| 5072 | Atlantic Hurricane Wind Speed Plots | https://svs.gsfc.nasa.gov/5072/ | Daily Visualizations → Daily Visualizations › 5072 | Wind speed over a season; cites HURDAT2. |

Gallery 40487 (NASA and Hurricanes) is quoted for its description only; it cites no dataset.

Datasets cited by 5097 (`datasets` field of https://svs.gsfc.nasa.gov/api/5097):

| Cited dataset | Used |
| --- | --- |
| Automated Tropical Cyclone Forecast (ATCF) – Best Track, https://ftp.nhc.noaa.gov/atcf/ | Yes, through HURDAT2 (Atlantic) and the JTWC ATCF best tracks (other basins), see below |
| Multi-scale Ultra-high Resolution (MUR) SST Analysis, no link | Yes |
| IMERG (NASA/GSFC) | No: rain, not part of the message checked |
| CPC Cloud Composite, no link | No: clouds, not part of the message checked |

Datasets cited by 5072: HURDAT2 (NOAA/NHC), no link; ATCF – Best Track (NOAA), https://ftp.nhc.noaa.gov/atcf/.

## Datasets Used

| Dataset | Provider | URL | Version | Downloaded | License | EIC cites it? | Used for |
| --- | --- | --- | --- | --- | --- | --- | --- |
| HURDAT2, Atlantic | NOAA National Hurricane Center | https://www.nhc.noaa.gov/data/#hurdat | `hurdat2-1851-2025-092326.txt` (revised 2026-09-23) | 2026-11-14 | US government work, public domain | Yes (5072) | Atlantic storm tracks; the four tracks' position, wind, pressure and landfalls |
| JTWC best tracks, West Pacific and Southern Hemisphere (ATCF b-deck format) | US Navy Joint Typhoon Warning Center | https://www.metoc.navy.mil/jtwc/jtwc.html?best-tracks | Annual archives 2003–2024 (2025 not yet published: HTTP 403 on 2026-11-14) | 2026-11-14 | US government work, public domain | No. Substitute for the ATCF best track that 5097 cites: its NHC archive covers only the Atlantic and the eastern and central Pacific; JTWC keeps the ATCF best tracks of the other basins. | West Pacific, South Indian and South Pacific storm tracks |
| GHRSST Level 4 MUR SST Analysis, monthly mean (`jplMURSST41mday`) | NASA JPL (MUR v4.1, MEaSUREs); monthly mean made and served by NOAA NMFS SWFSC ERD and NOAA NESDIS CoastWatch on ERDDAP | https://coastwatch.pfeg.noaa.gov/erddap/griddap/jplMURSST41mday.html (source dataset: https://podaac.jpl.nasa.gov/dataset/MUR-JPL-L4-GLOB-v4.1) | MUR v4.1 | 2026-11-14 | Free to use and redistribute, not for legal use (ERDDAP `license` attribute) | Yes, the dataset 5097 cites, through a different distributor: PO.DAAC's copy needs an Earthdata login and is about 400 MB a day | SST under each storm, warm area per basin, season SST; choosing the tracks (storms over water at or above 26.5 °C all their life, section 9.2). Not exported, played or drawn |

### Downloaded Files

- `https://www.nhc.noaa.gov/data/hurdat/hurdat2-1851-2025-092326.txt`
- `https://www.metoc.navy.mil/jtwc/products/best-tracks/<year>/<year>s-b<wp|sh>/b<wp|sh><year>.zip` for every year 2003–2024
- `https://coastwatch.pfeg.noaa.gov/erddap/griddap/jplMURSST41mday.nc?sst[(<year>-<month>-16T00:00:00Z)][(-50):25:(55)][(-179.99):25:(180)]`: one map per month, every 25th grid point (0.25°), 50° S–55° N. Every month of 2003–2006 and 2021–2024; January–March and July–October of the other years.
- SVS API pages: `https://svs.gsfc.nasa.gov/api/<id>` for 5097, 5072, 40487 and the EIC gallery pages walked to find them.

## Exported Tracks

| File | What it is | From |
| --- | --- | --- |
| `tracks/felix_2007.csv`, `tracks/michael_2018.csv`, `tracks/laura_2020.csv`, `tracks/helene_2024.csv` | Each storm's whole life, every HURDAT2 record (synoptic and special), with its landfalls | HURDAT2 (`AL062007`, `AL142018`, `AL132020`, `AL092024`) |
