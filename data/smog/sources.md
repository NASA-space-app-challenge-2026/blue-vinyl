# Sources: Smog Album

Every source the album uses, whether it comes from EIC or elsewhere. Written from [smog_album.ipynb](../../notebooks/smog_album.ipynb), which does the downloads. Rules: [data-guide.md](../../docs/data-guide.md#sources-file).

The album reproduces nell-v2's "The Wind That Sweeps the Smog" (user, 2026-11-15): the North China Plain in the winter of 2018-19, three songs. The notebook exports them to `data/smog/tracks/` (see `tracks.json` there).

## EIC Visualizations

| SVS ID | Title | URL | Path from the EIC gallery | Role |
| --- | --- | --- | --- | --- |
| 5151 | Particulate Matter (PM) 2.5 | https://svs.gsfc.nasa.gov/5151/ | EIC Dashboards → Air Quality Dashboard (https://svs.gsfc.nasa.gov/gallery/air-quality-dashboard/) › Models: Air Quality › 5151; also under the Earth Now Dashboard and Daily Visualizations | The album's EIC page: the world's surface PM2.5 from GEOS-CF, the last two weeks, regenerated regularly. |

Datasets cited by 5151 (`datasets` field of https://svs.gsfc.nasa.gov/api/5151): GEOS-CF (NASA GMAO), https://portal.nccs.nasa.gov/datashare/gmao/geos-cf/v2/, no date range.

## Datasets Used

| Dataset | Provider | URL | Version | Downloaded | License | EIC cites it? | Used for |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GEOS-CF, `aqc_tavg_1hr_g1440x721_v1`, `pm25_rh35_gcc` (surface PM2.5, µg/m³, hourly means, 0.25°) | NASA GMAO, served by NCCS | https://opendap.nccs.nasa.gov/dods/gmao/geos-cf/assim/aqc_tavg_1hr_g1440x721_v1 | v1 (from 2018-01-01) | 2026-11-15 | NASA data, no restrictions | Yes, an older version. 5151 links v2, which starts on 2025-08-04; the winter of 2018-19 is only in v1. | All three tracks: every hour of each song's stretch over the box 34–42° N, 112–121° E (33 × 37 cells) |
| Natural Earth 1:50m admin 0 countries | Natural Earth | https://www.naturalearthdata.com/downloads/50m-cultural-vectors/ | 5.1.1 | 2026-11-15 | Public domain | No | Map outlines in the notebook's graphs only |

Credit: Keller, C. A., et al. (2021). Description of the NASA GEOS composition forecast modeling system GEOS-CF v1.0. JAMES 13, e2020MS002413. https://doi.org/10.1029/2020MS002413

### Downloaded Files

- `https://opendap.nccs.nasa.gov/dods/gmao/geos-cf/assim/aqc_tavg_1hr_g1440x721_v1.dods?pm25_rh35_gcc[<hour>:<hour + 23>][0][496:528][1168:1204]`: the box, 24 hours a request, covering each song's hours. Each track's exact hours are in `data/smog/tracks/tracks.json`.
- `https://naciscdn.org/naturalearth/50m/cultural/ne_50m_admin_0_countries.zip`
- SVS API: `https://svs.gsfc.nasa.gov/api/5151`
