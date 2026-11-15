# Sources: Wildfire Album

Every source the album uses, whether it comes from EIC or elsewhere. Written from [wildfire_album.ipynb](../../notebooks/wildfire_album.ipynb), which does the downloads. Rules: [data-guide.md](../../docs/data-guide.md#sources-file).

Cover image credits are in [albums.js](../../src/features/album/data/albums.js).

## EIC Visualizations

| SVS ID | Title | URL | Path from the EIC gallery | Datasets it cites |
| --- | --- | --- | --- | --- |
| 40531 | Wildland Fires Dashboard | https://svs.gsfc.nasa.gov/40531/ | Not recorded (the notebook's gallery walk is not built yet) | None (message only) |
| 5453 | Annual Wildfire Burned Area in the United States | https://svs.gsfc.nasa.gov/5453/ | Not recorded | United States Total Wildland Fires and Acres, https://www.nifc.gov/fire-information/statistics/wildfires |
| 5639 | Daily Visualizations of the Largest Wildfires in the United States: 2026 | https://svs.gsfc.nasa.gov/5639/ | Not recorded | Fire Events Data Suite and FEDS OGC API, https://earth-information-system.github.io/fireatlas/docs/nrt.html; GEOS Atmospheric Model, no link; GEOS Forward Processing 2Km Replay, no link; GEOS Composition Forecast; GEOS-FP; Quick Fire Emissions Dataset; EONET API; IRWIN |

## Datasets Used

| Dataset | Provider | URL | Version | Downloaded | License | EIC cites it? | Used for |
| --- | --- | --- | --- | --- | --- | --- | --- |
| United States Total Wildland Fires and Acres (1983–2024) | NIFC / NICC | https://www.nifc.gov/fire-information/statistics/wildfires | Not recorded (web page table) | 2026-11-14 | US federal public information | Yes (5453) | Track 1, Burned Acres. NIFC footnote: 2004 fires and acres do not include state lands for North Carolina. |
| MTBS Burned Area Boundaries, fire occurrence points (`mtbs_FODpoints_DD`) | MTBS (USGS EROS, USDA Forest Service) | https://www.mtbs.gov/direct-download | Not recorded (composite file, last modified 2026-11-14) | 2026-11-15 | US federal public domain | No. Substitute: NIFC (cited by 5453) has no locations. | Track 1 globe: 1984–2024 fires typed `Wildfire` or `Wildland Fire Use`, their ignition date, acres and point |
| Fire Events Data Suite (FEDS) large-fire perimeter archive, `public.eis_fire_lf_perimeter_archive` | NASA EIS, via VEDA | https://openveda.cloud/api/features/collections/public.eis_fire_lf_perimeter_archive | Not recorded | 2026-11-14 | NASA open data | Yes (5639 cites FEDS and the FEDS OGC API). Substitute for 5453's NIFC, which has no locations; this VEDA collection is not the endpoint 5639 links to. | Track 2, 2020 Fire Season: 2020 fires with `farea > 50` km², their daily area and newly burning pixels (`n_newpixels`) |

Downloaded files:

- https://svs.gsfc.nasa.gov/api/40467, https://svs.gsfc.nasa.gov/api/40531, https://svs.gsfc.nasa.gov/api/5453, https://svs.gsfc.nasa.gov/api/5639
- https://www.nifc.gov/fire-information/statistics/wildfires
- https://edcintl.cr.usgs.gov/downloads/sciweb1/shared/MTBS_Fire/data/composite_data/fod_pt_shapefile/mtbs_fod_pts_data.zip
- https://openveda.cloud/api/features/collections/public.eis_fire_lf_perimeter_archive/items, paged with `limit`, `offset`, `datetime` (2020) and `filter=farea>50`
