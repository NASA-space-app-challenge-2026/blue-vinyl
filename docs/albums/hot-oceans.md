# Hot Oceans Album (working title)

Issue #21, branch `feat/#21`. Warm water feeds hurricanes: the message of EIC page [5097 2022 Hurricane Season](https://svs.gsfc.nasa.gov/5097/), heard through three Atlantic hurricanes (Emily 2005, Felix 2007, Sam 2021). Analysis: [`notebooks/hot_oceans_album.ipynb`](../../notebooks/hot_oceans_album.ipynb). Sources: [`data/hot_oceans/sources.md`](../../data/hot_oceans/sources.md).

Status (2026-11-14): data analyzed and tracks chosen. Not yet implemented: track export, album entry, composer, visuals, covers. This file is the hand-off for that work.

## Message

5097 draws one season of storm tracks over sea surface temperature (SST), and says:

> "Hurricanes tend to form over the warm tropical oceans where the SST is warmer than ~26.5 C (~80 F)"
>
> "Sea surface temperatures play an important role in hurricane formation and development, with warmer temperatures linked to more intense storms."

What the notebook found (sections 4–8):

| Finding | Number |
| --- | --- |
| Storms are born over warm water | 87–100 % of named storms are born over water ≥ 26.5 °C |
| The water under a storm goes with whether it strengthens or weakens over the next 24 hours, not with how strong it is now | Below about 27 °C most storms weaken (about 1 in 5 strengthen); above 29 °C most strengthen (7–8 in 10). Neutral SST (no change on average): Atlantic 26.9 °C, South Indian 27.5 °C, West and South Pacific 28.1 °C |
| The link is immediate | Strongest for the 24 hours around the present moment, not a day later |
| The birth water says nothing about a storm's lifetime energy | Spearman ρ 0.06 between SST at birth and ACE |
| The water along the path does | Step by step, the SST now adds the most to explaining the next day's wind change; the birth SST adds almost nothing |
| Warm water lets a storm grow; it does not make it grow | Wind shear, dry air and land, not in this data, decide most of the rest |
| Hot seasons are stormier only in the Atlantic | 2023 had the warmest Atlantic main development region of 2003–2024, but ranks 8th in energy |

The album must say "warm water lets storms grow", never "every warm sea makes a strong storm" or "every hot year is stormier".

## Decisions (user, 2026-11-14)

- **One storm per track.** The album joins the storm's wind (as in the earlier single-storm album) with the water under it. Storms moving as a flock (latitude as pitch, east–west travel as panning) go to a **separate album**.
- **Tracks**: Emily 2005, Felix 2007, Sam 2021 (three tracks, notebook sections 9 and 11.3). First Dennis, Emily and Felix, the Atlantic storms of the earlier single-storm album that follow the water best; then Dennis was swapped for Sam so that one track weakens over cool water and the weakening colour is seen (user, 2026-11-14). Dennis followed the same path as Emily, in the same month.
- **The melody of the earlier album is replaced by the ocean.** That melody drew the 24-hour wind change, which the tempo already plays. The ocean takes its place, so the number of layers stays the same.
- **On screen, next to the storm, show the SST under it as a number**, and colour it by what it does to the storm: one colour when the water is warm enough to grow the storm, another when it is cool enough to weaken it. The line between them is the basin's neutral SST from the notebook: **26.9 °C** for the Atlantic.
- **Implement it in this repository from scratch.** The earlier album lives in another project (`nell-v2`, see Reference below). Its design and mapping may be reused, its files may not be copied.

## Tracks

| Track | Named | Peak | SST under it at sea | Landfalls (HURDAT2 `L` records) | Steps in step with the water | Weakens |
| --- | --- | --- | --- | --- | --- | --- |
| Emily 2005 (`AL052005`) | 9.25 days | 140 kt | 28.1–29.5 °C | Grenada, Yucatán, Tamaulipas | 77 % | On land; also over warm water in the Caribbean (140 → 115 kt, 17–18 July) |
| Felix 2007 (`AL062007`) | 4.25 days | 150 kt | 28.3–29.3 °C | Grenada, Nicaragua | 82 % | On land; briefly over warm water (150 → 135 kt, 3 September) |
| Sam 2021 (`AL182021`) | 12 days | 135 kt | 24.4–29.1 °C | none | 86 % | Over cool water, north of the 26.9 °C line |

"In step": over warm water and strengthening, or over cool water and weakening (notebook section 9).

What each track shows:

- **Emily and Felix** stay over water warmer than 26.9 °C for as long as they are at sea, so their SST number keeps the growing colour and the ocean line stays on the growing side. The water breaks off at landfall and returns when Emily reaches the Gulf after Yucatán. Both also weaken over warm water (eyewall replacement, upper winds and nearby land, not in this data): warm water lets a storm grow but does not make it grow. Keep those moments as they are: a full ocean line under a slowing tempo.
- **Sam** grows over warm water and weakens as it moves north over cooler water. Its SST number turns to the weakening colour and the ocean line sags: the ending 5097 points to. Sam makes no landfall, so it has no big drum.

The SST in the analysis is a monthly mean, which hides the cooling a storm leaves in its own wake. Daily SST may show the water under a slow storm 1–2 °C cooler; Emily and Felix move fast, so it is unlikely to cross the line for them.

## Data to Sound (planned)

| Layer | Data | Sound | Screen |
| --- | --- | --- | --- |
| Wind (result) | Maximum sustained wind (kt) | Tempo and percussion layers by category, as in the earlier album | Storm size and spin; wind speed label |
| Water (cause) | SST under the storm against the neutral SST (26.9 °C) | A slow, low line (cello or low brass), one note held over one or two bars. Above the neutral SST: on chord tones, full and heavy. Below it: bending flat, leaving the chord, thinning | SST number next to the storm, coloured by growing / weakening; the SST field under the globe with the 26.5 °C line, as 5097 draws it |
| Landfall (event) | Storm centre over land (no SST) | The ocean line breaks off; the big drum strikes, as in the earlier album | The storm reaches the coast |

- The water and the wind change at the same moment: no delay between the ocean line and the tempo (notebook 5.2).
- The ocean is heard as weight and pressure, never brightness: warm water fuels a disaster, and bad news must not sound cheerful ([album-guide.md](../album-guide.md)).
- Each track needs a different main instrument (album guide). The earlier album gave each storm its own percussion family: Emily Latin, Felix marching drumline (Dennis, dropped, had the drum set). Sam needs one of its own.
- Each track lasts 40–60 seconds.

## Next Steps

1. **Export the tracks** from the notebook into `data/hot_oceans/tracks/` (see [data-guide.md](../data-guide.md)): one CSV per storm (6-hourly time, latitude, longitude, max wind kt, pressure hPa, SST °C, over-land flag, landfall records) and `tracks.json`. Add the SST per record at the resolution the visuals need; the analysis used monthly means.
2. Update `data/hot_oceans/sources.md` with the exported files.
3. Add the album to [`albums.js`](../../src/features/album/data/albums.js), with covers (NASA or Wikimedia, licensed) and credits.
4. Composer: wind → tempo and percussion; SST → ocean line; landfall → drum.
5. Globe: storm view, wind label, SST number with the two colours, SST field and the 26.5 °C line.
6. Fill in this file's sections as they are built, as [arctic-bird.md](arctic-bird.md) does.

## Open Questions

- Album title.
- What the SST label shows over land (hidden, or a dash).
- The ocean line's instrument.
- Whether the neutral line on screen is 26.9 °C (data) while the SST field draws EIC's 26.5 °C line, or both use one value.
- Issue #21's title and body still describe the first plan (four basins, seasons); update them.

## Reference: the Earlier Single-Storm Album

Project `nell-v2` (`/Users/nell/Projects/nasa/nell-v2`), album "Chasing the Rising Storm". Read for the design; do not copy files.

- Spec: `docs/albums/hurricane.md` (tempo rule, percussion families and their category layers, landfall drum, melody that this album replaces)
- Catalog: `src/features/album/data/catalog/hurricane.js`
- Composer: `src/features/music/domain/composers/hurricane.js`
- Storm view: `src/features/globe/presentation/storm-view.js`
