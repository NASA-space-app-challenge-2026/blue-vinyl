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
| HURDAT2, Atlantic | NOAA National Hurricane Center | https://www.nhc.noaa.gov/data/#hurdat | `hurdat2-1851-2025-092326.txt` (revised 2026-09-23) | 2026-11-14 | US government work, public domain | Yes (5072) | Atlantic storm tracks; the three tracks' position, wind, pressure and landfalls |
| JTWC best tracks, West Pacific and Southern Hemisphere (ATCF b-deck format) | US Navy Joint Typhoon Warning Center | https://www.metoc.navy.mil/jtwc/jtwc.html?best-tracks | Annual archives 2003–2024 (2025 not yet published: HTTP 403 on 2026-11-14) | 2026-11-14 | US government work, public domain | No. Substitute for the ATCF best track that 5097 cites: its NHC archive covers only the Atlantic and the eastern and central Pacific; JTWC keeps the ATCF best tracks of the other basins. | West Pacific, South Indian and South Pacific storm tracks |
| GHRSST Level 4 MUR SST Analysis, monthly mean (`jplMURSST41mday`) | NASA JPL (MUR v4.1, MEaSUREs); monthly mean made and served by NOAA NMFS SWFSC ERD and NOAA NESDIS CoastWatch on ERDDAP | https://coastwatch.pfeg.noaa.gov/erddap/griddap/jplMURSST41mday.html (source dataset: https://podaac.jpl.nasa.gov/dataset/MUR-JPL-L4-GLOB-v4.1) | MUR v4.1 | 2026-11-14 | Free to use and redistribute, not for legal use (ERDDAP `license` attribute) | Yes, the dataset 5097 cites, through a different distributor: PO.DAAC's copy needs an Earthdata login and is about 400 MB a day | SST under each storm, warm area per basin, season SST; the tracks' SST and the SST field on the globe |

### Downloaded Files

- `https://www.nhc.noaa.gov/data/hurdat/hurdat2-1851-2025-092326.txt`
- `https://www.metoc.navy.mil/jtwc/products/best-tracks/<year>/<year>s-b<wp|sh>/b<wp|sh><year>.zip` for every year 2003–2024
- `https://coastwatch.pfeg.noaa.gov/erddap/griddap/jplMURSST41mday.nc?sst[(<year>-<month>-16T00:00:00Z)][(-50):25:(55)][(-179.99):25:(180)]`: one map per month, every 25th grid point (0.25°), 50° S–55° N. Every month of 2003–2006 and 2021–2024; January–March and July–October of the other years.
- SVS API pages: `https://svs.gsfc.nasa.gov/api/<id>` for 5097, 5072, 40487 and the EIC gallery pages walked to find them.

## Exported Tracks

| File | What it is | From |
| --- | --- | --- |
| `tracks/kirk_2012.csv`, `tracks/lee_2017.csv`, `tracks/sam_2021.csv` | Each storm's whole life, every HURDAT2 record (synoptic and special), with the SST under its centre | HURDAT2 (`AL112012`, `AL142017`, `AL182021`); MUR monthly SST of each record's month |
| `tracks/kirk_2012_sst.geojson`, `tracks/lee_2017_sst.geojson`, `tracks/sam_2021_sst.geojson` | The SST field the globe draws under each storm, one map per month it lives in, with the 26.5 °C line | MUR monthly SST: August and September 2012; September 2017; September and October 2021 |
