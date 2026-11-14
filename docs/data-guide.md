# Data Guide

This guide says where data lives in the repository, what stays on your machine, and what gets committed. Follow it whenever you download, analyze or export data for an album.

## The Rule

- **Data you download to analyze stays local.** It goes into a git-ignored folder and is never committed.
- **Data the music uses is committed.** Once a series is chosen to drive a track, it is exported into the album's `tracks/` folder and pushed.

Anyone can rebuild the local data by running the album's notebook. The committed data is the small, final set the app needs.

## Folder Structure

All data lives in `data/` at the repository root, with one folder per album. The album folder uses the same name as the notebook (`notebooks/<album>_album.ipynb` → `data/<album>/`).

```
data/
  <album>/
    raw/           # git-ignored: downloads and intermediate files, local only
      api/         #   SVS API responses (<id>.json)
      media/       #   EIC images and videos
      ...          #   source datasets (CSV, NetCDF, HDF, ...)
    tracks/        # committed: the data the music and the globe use
      <track>.csv  #   one file per track
      <name>.geojson #  shapes the globe draws (optional)
      tracks.json  #   source, credit and message of every track
```

For example, the glacier album uses `data/glacier/raw/` and `data/glacier/tracks/`.

## Local Data (`raw/`)

Everything under `data/*/raw/` is git-ignored (see `.gitignore`). Put here:

- downloads: source datasets, SVS API responses, images and videos
- intermediate results: merged, filtered or resampled data you made while analyzing

How to work with it:

- Download through code in the notebook, never by hand, so anyone can rebuild the folder by running the notebook from top to bottom.
- Skip a download when the file is already there, so reruns are fast.
- Keep the original file names, so a file can be traced back to its source.
- Never move a file out of `raw/` into a committed folder as is. Export what the music needs into `tracks/` instead (see below).
- Before committing, check that nothing local is staged: `git status` must not list anything under `raw/`.

> `notebooks/.cache/` is the older location for downloads and is also git-ignored. New work uses `data/<album>/raw/`. Move existing notebooks over when you next change them.

## Source Links

Anyone reading a notebook must be able to open every source in one click, without running it. Each notebook starts with a **Links** section that lists, for every EIC visualization it uses:

| Link | What it is | Example |
| --- | --- | --- |
| Gallery path | How to reach the page from the [EIC gallery](https://svs.gsfc.nasa.gov/gallery/earth-information-center/): section → sub-gallery → page | EIC Dashboards → Climate Vital Signs Dashboard → 5382 |
| SVS page | The visualization page | `https://svs.gsfc.nasa.gov/5382/` |
| SVS API | The JSON the notebook reads | `https://svs.gsfc.nasa.gov/api/5382` |
| Cited source | The dataset the page names in its `datasets` field, with its link, or "no link" when the page gives none | GMSL v5.1, `https://doi.org/10.5067/GMSLM-TJ151` |
| Downloaded file | The exact URL of every file the notebook downloads, plus the dataset page | `https://noaadata.apps.nsidc.org/.../N_seaice_extent_daily_v4.0.csv` |
| Note | Whether the download is the cited source or a substitute, why, and what access it needs (public or login) | "Substitute: EIC gives no link for JAXA AMSR2" |

Rules:

- **Build the table from the SVS API in code**, not by hand, so it stays in sync with EIC. Render it as Markdown (`IPython.display.Markdown`) so the links are clickable in Jupyter and on GitHub.
- **Use the cited source first.** Use a substitute only when the cited one cannot be downloaded, and write the reason in the Note column.
- **Use the cited version.** If the page cites version 5.1 of a dataset, download 5.1, not the latest, unless the newer version is needed and the reason is written down.
- **Repeat the links locally**: put the EIC page and source links again right under each message section's title, so a reader never has to scroll back.
- **Never put credentials in a link**, and mark links that need a login.

## Music Data (`tracks/`)

When a series is chosen to become a track, export it from the notebook into `data/<album>/tracks/` and commit it.

What belongs here:

- only the series a track actually plays, already trimmed, resampled and cleaned
- one file per track, named after what it shows, in `snake_case`: `arctic_sea_ice_extent_daily.csv`
- GeoJSON files with the shapes the globe draws for a track, such as yearly ice polygons, when the track needs them
- one `tracks.json` that describes every track in the folder

Each track file:

- is CSV with a header row; the first column is the time axis (ISO dates, `YYYY-MM-DD`)
- keeps the original units of the source data; the unit is part of the column name (`extent_million_km2`)
- stays small: a few hundred KB at most. Downsample or crop to what the music needs instead of committing the full dataset.

Each GeoJSON file:

- is a `FeatureCollection` in longitude and latitude (WGS 84), already split at the 180° meridian, so the globe can draw it as is
- gives each feature the properties the app needs to pick it, such as `year`
- stays small, like a track file: simplify and round the shapes to what is visible on the record label

`tracks.json` lists, for each track:

```json
[
  {
    "file": "arctic_sea_ice_and_global_sea_level.csv",
    "title": "North",
    "pages": [
      {
        "svsId": 5382,
        "svsUrl": "https://svs.gsfc.nasa.gov/5382/",
        "message": "Quoted from the EIC page the track comes from."
      }
    ],
    "note": "Ours: what we computed or chose beyond what EIC says.",
    "sources": [
      {
        "source": "NSIDC Sea Ice Index, Version 4 (G02135)",
        "sourceUrl": "https://nsidc.org/data/g02135",
        "downloadUrl": "https://noaadata.apps.nsidc.org/NOAA/G02135/north/monthly/data/N_09_extent_v4.0.csv",
        "version": "4.0",
        "doi": "https://doi.org/10.7265/a98x-0f50",
        "downloaded": "2026-11-14",
        "license": "Open access; cite as asked on the dataset page",
        "credit": "Fetterer, F., et al. Sea Ice Index, Version 4. NSIDC.",
        "substitute": "EIC names JAXA AMSR2 but gives no link. Omit this key when the source is the one EIC cites."
      }
    ],
    "visuals": ["arctic_september_sea_ice_extent.geojson"],
    "units": { "extent_million_km2": "million km²" },
    "timeRange": ["1979-09-01", "2024-09-01"]
  }
]
```

Rules:

- `tracks/` is written only by the notebook. Do not edit its files by hand; change the notebook and export again.
- Re-export after every change to the data steps, and commit the notebook and `tracks/` together.
- `pages` lists every EIC page the track comes from, each with its message quoted. A track that combines two pages lists both.
- `sources` lists every file the track's data comes from, one entry per download. A track that plays two datasets lists both.
- `visuals` lists the GeoJSON files the globe draws for the track; omit it when there are none.
- Every file in `tracks/` must appear in `tracks.json`, as a `file` or in `visuals`, and every entry must point to a file that exists.

## Committing Checklist

1. Rerun the notebook from top to bottom (see [notebook-guide.md](notebook-guide.md)).
2. Run `git status` and check:
   - nothing under `data/*/raw/` or `notebooks/.cache/` is listed
   - changed files under `data/<album>/tracks/` are the ones you meant to export
3. Commit the notebook and its `tracks/` changes in the same commit.

## Adding a New Album

1. Create the notebook `notebooks/<album>_album.ipynb` (see [notebook-guide.md](notebook-guide.md)).
2. Download into `data/<album>/raw/`. The folder is created by the notebook and ignored by git automatically.
3. When tracks are decided, export them into `data/<album>/tracks/` with a `tracks.json`, and commit.
