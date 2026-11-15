# Sources: Glacier Album

Every source the album uses, whether it comes from EIC or elsewhere. Written from [glacier_album.ipynb](../../notebooks/glacier_album.ipynb), which does the downloads. Rules: [data-guide.md](../../docs/data-guide.md#sources-file).

The album's tracks are not exported yet (issue #17). Update this file when they are.

## EIC Visualizations

| SVS ID | Title | URL | Path from the EIC gallery | Datasets it cites |
| --- | --- | --- | --- | --- |
| 5046 | Daily Arctic Sea Ice, By Year | https://svs.gsfc.nasa.gov/5046/ | Daily Visualizations → Daily Visualizations › 5046 | Blue Marble: Next Generation (MODIS); 10 km Daily Sea Ice Concentration (AMSR2), no link; 10 km Daily 89 GHz Brightness Temperature (AMSR2), no link |
| 5064 | Daily Antarctic Sea Ice, By Year | https://svs.gsfc.nasa.gov/5064/ | Daily Visualizations → Daily Visualizations › 5064 | Same as 5046 |
| 5099 | Daily Polar Sea Ice, Two Year History | https://svs.gsfc.nasa.gov/5099/ | Daily Visualizations › 5099; EIC Dashboards → Climate Vital Signs Dashboard › 5099 | Same as 5046 |
| 5382 | Arctic Sea Ice Minimum 2024 | https://svs.gsfc.nasa.gov/5382/ | EIC Dashboards → Climate Vital Signs Dashboard › 5382 | Same as 5046 |
| 5235 | Sea Level Through a Porthole (2023) | https://svs.gsfc.nasa.gov/5235/ | EIC Dashboards → Climate Vital Signs Dashboard › 5235 | GSFC GMSL v5.1, DOI 10.5067/GMSLM-TJ151 |
| 14713 | Building Coastal Resilience with NASA Data | https://svs.gsfc.nasa.gov/14713/ | EIC Videos › 14713 | None (message only) |

## Datasets Used

| Dataset | Provider | URL | Version | Downloaded | License | EIC cites it? | Used for |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Sea Ice Index (G02135), daily extent and 1981–2010 climatology, Arctic and Antarctic | NSIDC / NOAA | https://nsidc.org/data/g02135 | v4.0 | Not recorded (the files are not in this checkout) | Public, no login | No. Substitute for JAXA AMSR2, which has no link and needs a G-Portal account. NSIDC is the source of the numbers EIC quotes on 5382. | Sea ice analysis |
| Global Mean Sea Level (GMSL), TOPEX/Poseidon, Jason-1/2/3 | NASA GSFC, via PO.DAAC | https://podaac.jpl.nasa.gov/dataset/MERGED_TP_J1_OSTM_OST_GMSL_ASCII_V51 (DOI https://doi.org/10.5067/GMSLM-TJ151) | v5.1 | Not recorded (the file is not in this checkout) | NASA open data; needs a free Earthdata login | Yes (5235) | Sea level analysis |

Downloaded files:

- https://noaadata.apps.nsidc.org/NOAA/G02135/north/daily/data/N_seaice_extent_daily_v4.0.csv
- https://noaadata.apps.nsidc.org/NOAA/G02135/south/daily/data/S_seaice_extent_daily_v4.0.csv
- https://noaadata.apps.nsidc.org/NOAA/G02135/north/daily/data/N_seaice_extent_climatology_1981-2010_v4.0.csv
- https://noaadata.apps.nsidc.org/NOAA/G02135/south/daily/data/S_seaice_extent_climatology_1981-2010_v4.0.csv
- https://archive.podaac.earthdata.nasa.gov/podaac-ops-cumulus-protected/MERGED_TP_J1_OSTM_OST_GMSL_ASCII_V51/GMSL_TPJAOS_5.1.txt (Earthdata login)
