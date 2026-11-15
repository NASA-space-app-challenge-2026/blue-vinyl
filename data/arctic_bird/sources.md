# Sources: Arctic Bird Album

Every source the album uses, whether it comes from EIC or elsewhere. Written from [arctic_bird_album.ipynb](../../notebooks/arctic_bird_album.ipynb), which does the downloads. Rules: [data-guide.md](../../docs/data-guide.md#sources-file).

## EIC Visualization

| SVS ID | Title | URL | Path from the EIC gallery |
| --- | --- | --- | --- |
| 4877 | Ecological insights from three decades of animal movement tracking across a changing Arctic | https://svs.gsfc.nasa.gov/4877/ | EIC Videos → NASA + The Smithsonian: Biodiversity ([14700](https://svs.gsfc.nasa.gov/14700/)) › sources → 4877 |

Datasets listed on 4877 (`datasets` field of https://svs.gsfc.nasa.gov/api/4877):

| Cited dataset | Used |
| --- | --- |
| Arctic Animal Movement Archive (AAMA), no link | Yes: the bird studies below |
| Blue Marble: Next Generation (MODIS) | No: map background only |
| 10 km Daily Sea Ice Concentration (AMSR2), no link | No: map background only |
| Band Combination 5, 4, 3 (Landsat-8 OLI), no link | No: map background only |

## Datasets Used

| Dataset | Provider | URL | Version | Downloaded | License | EIC cites it? | Used for |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Arctic Animal Movement Archive (AAMA), bird studies | Movebank (Max Planck Institute of Animal Behavior); each study is owned by its researchers | https://www.movebank.org/cms/movebank-content/arctic-animal-movement-archive | Live archive, no version | 2026-11-14 | Public download with license terms waived by the owners (`suspend_license_terms: true` in the Movebank API). Movebank [terms of use](https://www.movebank.org/cms/movebank-content/general-movebank-terms-of-use) apply. | Yes | Analysis and all four tracks |
| Natural Earth 1:110m coastline | Natural Earth | https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_coastline.geojson | v5.1.2 | 2026-11-14 | Public domain | No (map background in notebook graphs) | Notebook maps only |

### Movebank Downloads

- Study list: https://www.movebank.org/movebank/service/public/json?entity_type=study
- AAMA study list: the AAMA page above (`raw/aama.html`).
- Locations: `https://www.movebank.org/movebank/service/public/json?study_id=<id>&individual_local_identifiers=<ids>&sensor_type=<sensor>`, saved as `raw/movebank/<id>.json` (first 30 individuals) and `raw/movebank/<id>_all.json` (every individual, for the four track studies).
- 21 AAMA bird studies that Movebank serves without a login are analyzed. The rest of the AAMA needs a Movebank account or owner approval and is not used.

Studies behind the tracks:

| Track | Movebank study | Study ID | Sensors |
| --- | --- | --- | --- |
| Buff-breasted Sandpiper | buffBreastedSandpiper_USGS_ASC_argosGPS | 1128676353 | GPS, Argos |
| Whimbrel | whimbrel_USGS_ASC_argos | 854852176 | Argos |
| Yellow-billed Loon | yellowBilledLoon_USGS_ASC_argos | 506737915 | Argos |
| Northern Pintail | northernPintail_USGS_ASC_argos | 927024278 | Argos |

## Referenced, Not Downloaded

- Paper: Davidson et al. 2020, *Science* 370(6517), 712–715, https://doi.org/10.1126/science.abb7080
- The paper's analysis data on Zenodo (CC0): https://zenodo.org/record/4122502

## Images

Cover photos are listed with their credits in [albums.js](../../src/features/album/data/albums.js) (`coverCredit`).
