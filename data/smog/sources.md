# Sources: Smog Album

Every source the album uses, whether it comes from EIC or elsewhere. Written from [smog_album.ipynb](../../notebooks/smog_album.ipynb), which does the downloads. Rules: [data-guide.md](../../docs/data-guide.md#sources-file).

The album plays nell-v2's "The Wind That Sweeps the Smog" over three cities whose smog flows in from outside the map, covers them and passes on (user, 2026-11-15): New York (June 2023), Seoul (June 2025) and Shanghai (December 2025), the air right over each city, as its aerosol optical depth. The notebook screens the whole world of 2025 at a coarse grid, picks each song's hours at the app's grid and exports them to `data/smog/tracks/` (see `tracks.json` there).

## EIC Visualizations

| SVS ID | Title | URL | Path from the EIC gallery | Role |
| --- | --- | --- | --- | --- |
| 5151 | Particulate Matter (PM) 2.5 | https://svs.gsfc.nasa.gov/5151/ | EIC Dashboards → Air Quality Dashboard (https://svs.gsfc.nasa.gov/gallery/air-quality-dashboard/) › Models: Air Quality › 5151; also under the Earth Now Dashboard and Daily Visualizations | The album's EIC page: the world's surface PM2.5 from GEOS-CF, the last two weeks, regenerated regularly. The album plays the same model's column AOD instead (see below). |

Datasets cited by 5151 (`datasets` field of https://svs.gsfc.nasa.gov/api/5151): GEOS-CF (NASA GMAO), https://portal.nccs.nasa.gov/datashare/gmao/geos-cf/v2/, no date range.

## Datasets Used

| Dataset | Provider | URL | Version | Downloaded | License | EIC cites it? | Used for |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GEOS-CF, `xgc_tavg_1hr_g1440x721_x1`, `aod550_bc` + `aod550_oc` + `aod550_sulfate` + `aod550_dust` + `aod550_sala` + `aod550_salc` (aerosol optical depth at 550 nm, hourly means, 0.25°) | NASA GMAO, served by NCCS | https://opendap.nccs.nasa.gov/dods/gmao/geos-cf/assim/xgc_tavg_1hr_g1440x721_x1 | v1 (from 2018-01-01) | 2026-11-15 | NASA data, no restrictions | Same model, other collection: 5151 shows surface PM2.5 from v2 (starts 2025-08-04). Surface PM2.5 empties and refills in place each day, so the fog seemed to blink; the column's AOD drifts on unbroken (user, 2026-11-15). | Screening the whole world of 2025 (2°, every 6th hour, four of the six aerosols), and the four tracks: every hour of each, the 33 × 33 cells (±4°) around the city |
| Natural Earth 1:50m admin 0 countries | Natural Earth | https://www.naturalearthdata.com/downloads/50m-cultural-vectors/ | 5.1.1 | 2026-11-15 | Public domain | No | Map outlines in the notebook's graphs only |

Credit: Keller, C. A., et al. (2021). Description of the NASA GEOS composition forecast modeling system GEOS-CF v1.0. JAMES 13, e2020MS002413. https://doi.org/10.1029/2020MS002413

### Downloaded Files

- `https://opendap.nccs.nasa.gov/dods/gmao/geos-cf/assim/xgc_tavg_1hr_g1440x721_x1.dods?aod550_bc.aod550_bc[<first>:6:<last>][0:8:720][0:8:1439],…` (the four `aod550_bc`, `_oc`, `_sulfate`, `_dust` in one request): the whole world, every 6th hour and 8th cell, 20 steps a request, over 2025. The screen only.
- `https://opendap.nccs.nasa.gov/dods/gmao/geos-cf/assim/xgc_tavg_1hr_g1440x721_x1.dods?aod550_bc.aod550_bc[<hour>:<hour + 23>][<row - 16>:<row + 16>][<col - 16>:<col + 16>],…` (the six `aod550_*` in one request): each song's box around its city's cell, 24 hours a request, over its window of a few days. Each track's exact hours are in `data/smog/tracks/tracks.json`.
- `https://naciscdn.org/naturalearth/50m/cultural/ne_50m_admin_0_countries.zip`
- SVS API: `https://svs.gsfc.nasa.gov/api/5151`
