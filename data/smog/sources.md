# Sources: Smog Album

Every source the album uses, whether it comes from EIC or elsewhere. Written from [smog_album.ipynb](../../notebooks/smog_album.ipynb), which does the downloads. Rules: [data-guide.md](../../docs/data-guide.md#sources-file).

No tracks are exported yet. The notebook picks the cities (Seoul plus three).

## EIC Visualizations

| SVS ID | Title | URL | Path from the EIC gallery | Role |
| --- | --- | --- | --- | --- |
| 5151 | Particulate Matter (PM) 2.5 | https://svs.gsfc.nasa.gov/5151/ | EIC Dashboards → Air Quality Dashboard (https://svs.gsfc.nasa.gov/gallery/air-quality-dashboard/) › Models: Air Quality › 5151; also under the Earth Now Dashboard and Daily Visualizations | The album's EIC page: the world's surface PM2.5 from GEOS-CF, the last two weeks, regenerated regularly. |

Datasets cited by 5151 (`datasets` field of https://svs.gsfc.nasa.gov/api/5151): GEOS-CF (NASA GMAO), https://portal.nccs.nasa.gov/datashare/gmao/geos-cf/v2/, no date range.

## Datasets Used

| Dataset | Provider | URL | Version | Downloaded | License | EIC cites it? | Used for |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GEOS-CF, `aqc_tavg_1hr_g1440x721_v1`, `pm25_rh35_gcc` (surface PM2.5, µg/m³, hourly means, 0.25°) | NASA GMAO, served by NCCS | https://opendap.nccs.nasa.gov/dods/gmao/geos-cf/assim/aqc_tavg_1hr_g1440x721_v1 | v1 (2018-01-01 to 2026-01-02) | 2026-11-15 | NASA data, no restrictions | Yes, an older version. 5151 links v2, which starts on 2025-08-04 and holds no whole calendar year; v1 holds all of 2025 (user, 2026-11-15). | One value a day (00:30 UTC) for every candidate city in 2025, to count its swings and pick the cities |
| Natural Earth 1:110m populated places | Natural Earth | https://www.naturalearthdata.com/downloads/110m-cultural-vectors/ | 5.1.2 | 2026-11-15 | Public domain | No. EIC names no city. | The 243 candidate cities, their positions and time zones |
| Natural Earth 1:50m admin 0 countries | Natural Earth | https://www.naturalearthdata.com/downloads/50m-cultural-vectors/ | 5.1.1 | 2026-11-15 | Public domain | No | Each city's UN subregion (one pick per region) and the map outlines |

Credit: Keller, C. A., et al. (2021). Description of the NASA GEOS composition forecast modeling system GEOS-CF v1.0. JAMES 13, e2020MS002413. https://doi.org/10.1029/2020MS002413

### Downloaded Files

- `https://opendap.nccs.nasa.gov/dods/gmao/geos-cf/assim/aqc_tavg_1hr_g1440x721_v1.dods?pm25_rh35_gcc[<hour>][0][188:4:624][0:4:1439]`: the 00:30 UTC hour of every day of 2025, every 4th cell (1°) from 43° S to 66° N. Only the cities' cells are kept, plus the whole grid of one hour for the map.
- `https://naciscdn.org/naturalearth/110m/cultural/ne_110m_populated_places.zip`
- `https://naciscdn.org/naturalearth/50m/cultural/ne_50m_admin_0_countries.zip`
- SVS API: `https://svs.gsfc.nasa.gov/api/5151`
