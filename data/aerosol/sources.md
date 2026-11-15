# Sources: Aerosol Album

Every source the album uses, whether it comes from EIC or elsewhere. Written from [aerosol_album.ipynb](../../notebooks/aerosol_album.ipynb), which does the downloads. Rules: [data-guide.md](../../docs/data-guide.md#sources-file).

Cover image credits are in [albums.js](../../src/features/album/data/albums.js).

## EIC Visualizations

| SVS ID | Title | URL | Path from the EIC gallery | Datasets it cites |
| --- | --- | --- | --- | --- |
| 5669 | GEOS Aerosols (2025) | https://svs.gsfc.nasa.gov/5669/ | Not linked from the EIC gallery (the notebook walks it from SVS 40467); listed in the challenge resources ([mission.md](../../docs/mission.md)) | GEOS Forward Processing 2Km Replay (Model, August 19, 2025), no link |

## Datasets Used

| Dataset | Provider | URL | Version | Downloaded | License | EIC cites it? | Used for |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GEOS-FP `tavg3_2d_aer_Nx`, 3-hourly 2-D aerosol diagnostics, 0.25° × 0.3125°: AOD, column mass and mass flux of sea salt, dust, smoke (organic + black carbon) and sulfate | NASA GMAO | https://gmao.gsfc.nasa.gov/GMAO_products/NRT_products.php | GEOS-FP as run in August 2025 (operational, upgraded in place) | 2026-11-14 | Public, no login; NASA data | No. Substitute: 5669 cites the GEOS-FP 2 km Replay, which has no download; GEOS-FP is the same model and aerosol scheme at 0.25°. | All tracks: the four stems, every event's plume (section 9.4 of the notebook) and the globe's frames, Aug 11–24, 2025, every 3 hours |
| Best track of Hurricane Erin (AL05 2025), ATCF b-deck | NOAA National Hurricane Center | https://www.nhc.noaa.gov/data/ | ATCF archive 2025 | 2026-11-15 | Public; NOAA data | No. 5669 names Erin; the best track gives where its eye was and how strong it blew. | Track 1, Hurricane Erin: the view and the source of its sea salt follow the eye; its wind sets the strings, the timpani and how fast the lead turns |
| EIC still `Aerosols_2025-08-19T20_00_00_1920x1080.png` | NASA SVS | https://svs.gsfc.nasa.gov/vis/a000000/a005600/a005669/Aerosols_2025-08-19T20_00_00_1920x1080.png | 5669 | 2026-11-14 | NASA media | Yes (5669) | Comparison only (section 4 of the notebook); no track uses its pixels |

Downloaded files:

- https://svs.gsfc.nasa.gov/api/40467 and the gallery pages it links (40473, 40477, 40479, 40484, 40487, 40509, 40512, 40529, 40531), https://svs.gsfc.nasa.gov/api/5669
- https://portal.nccs.nasa.gov/datashare/gmao/geos-fp/das/Y2025/M08/D{dd}/GEOS.fp.asm.tavg3_2d_aer_Nx.202508{dd}_{hhmm}.V01.nc4 for the 112 times from 2025-08-11 01:30 to 2025-08-24 22:30 UTC (only the 20 variables the album needs are read, over HTTP range requests)
- https://ftp.nhc.noaa.gov/atcf/archive/2025/bal052025.dat.gz
- https://svs.gsfc.nasa.gov/vis/a000000/a005600/a005669/Aerosols_2025-08-19T20_00_00_1920x1080.png
