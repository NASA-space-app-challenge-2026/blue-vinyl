# Hurricanes over Warm Water (Hot Oceans Album)

Issue #21, branch `feat/#21`. Warm water feeds hurricanes: the message of EIC page [5097 2022 Hurricane Season](https://svs.gsfc.nasa.gov/5097/), heard through three Atlantic hurricanes (Emily 2005, Felix 2007, Sam 2021). Analysis: [`notebooks/hot_oceans_album.ipynb`](../../notebooks/hot_oceans_album.ipynb). Sources: [`data/hot_oceans/sources.md`](../../data/hot_oceans/sources.md).

Status (2026-11-14): implemented. Tracks exported (notebook section 12), album in [`albums.js`](../../src/features/album/data/albums.js), sound and globe as below.

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
- **Title**: "Hurricanes over Warm Water", with the word for the storms in it.
- **The ocean line's instrument**: trombone, with the tuba under it over the warmest water.
- **Two lines**: the SST number's colour and the ocean line turn at the neutral SST (26.9 °C); the field on the globe draws EIC's 26.5 °C line.
- **Over land** the SST number is hidden (it fades out with the ocean line).
- **Sam's percussion**: orchestral timpani and snare.

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

## Time

Each track plays its storm's whole life at an even pace, from its first record as a tropical depression to its first record after the peak below 34 kt or no longer tropical (notebook section 12): each in 30 s ([album-guide.md](../album-guide.md)): Emily 10.25 days (8.2 hours a second), Felix 4.75 days (3.8 hours a second), Sam 12.5 days (10 hours a second). The storm fades in over the track's first 2.5 s and out over its last.

## Sound

[`composers/hurricane.js`](../../src/features/music/domain/composers/hurricane.js), on the app's SoundFont (GeneralUser GS, see [Credits](#credits)). The design follows the earlier single-storm album (see Reference below), written anew here, with its melody replaced by the ocean line.

| Layer | Data | Sound |
| --- | --- | --- |
| Wind (result) | Maximum sustained wind | Tempo: as many beats a minute as the wind blows km/h up to 150, a third as fast above (46–193 BPM), set at each bar. Each track's percussion family plays the wind's category, one step of craft a category (pulse, backbeat, ghost notes, flams, fills from category 3, an opening stroke from category 4, rolls at 5), its ringing drums panned round the listener with the storm's spin. Behind it a double bass and a pad strike each bar, cello, viola and violin circle the chord (from tropical storm, category 1 and 2), a choir joins from category 3 |
| Water (cause) | SST under the storm against the Atlantic's neutral SST, 26.9 °C | The ocean line: trombone, one note a chord (2 s or more), D3 at the neutral SST and a step of D minor for every 0.5 °C, between F2 and D4. At or above the neutral SST it sits on the nearest chord note, louder the warmer the water, with the tuba an octave under it from 27.9 °C. Below it the note leaves the chord, bends flat (0.5 semitone a degree, at most a whole tone, over 1.2 s), plays softer and is let go early in its chord (12 % sooner a degree, at least 45 % held) |
| Landfall (event) | HURDAT2 `L` records | Taiko and a low D on the double bass, at the landfall's own time. Over land the ocean line stops |

- Harmony: D minor, i – VI – III – VII, a chord at least 2 s long, over as many bars as that takes at the tempo it starts at.
- The ocean line is read record by record, as the SST number is, so a new note sounds when the number changes enough to call for one. It is re-struck as each chord starts.
- Percussion families (each track's main instrument): Emily Latin (salsa section on the 3-2 clave), Felix marching drumline, Sam orchestral timpani and snare.
- The kits are General MIDI drum kits of GeneralUser GS (Standard, Power, Orchestral) kept in the app's SoundFont, which grew from 6.9 MB to 12 MB with them and the new programs (trombone, tuba, double bass, choir, taiko). Trimming the kits to the keys played is left for later.

What a listener hears:

- **Emily, Felix**: a full, steady ocean line under percussion that speeds up and thickens; it breaks off under the big drum at each landfall and returns when Emily reaches the Gulf. Where they weaken over warm water, the line stays full while the tempo slows.
- **Sam**: the line holds through the storm's peak; from 1 October, as Sam moves north over cooler water, it sinks from F3 to F2, bends flat, thins and breaks apart while the tempo slows.

## Globe

- **The storm** ([`storm-view.js`](../../src/features/globe/presentation/storm-view.js)): a cloud spiral drawn by a shader on the globe, turning anticlockwise. Its wind grows it, spins it faster, clears its eye and tints its thin cloud from sea blue through yellow to magenta. The globe keeps it in the middle; the glow around the globe takes its colour.
- **Below the storm**: its wind in km/h, in its category's colour, and the SST under it (one decimal, °C): orange while the water is at or above 26.9 °C (it lets the storm grow), blue below it. Over land the SST fades out with the ocean line.
- **The SST field** ([`sst-field-layer.js`](../../src/features/globe/presentation/sst-field-layer.js)): the month's SST under the storm in bands, yellow to red above 26.5 °C and blue below, with EIC's 26.5 °C line in white, as 5097 draws it. It changes to the next month's map when the storm's life crosses into it (Felix, Sam).
- **The date** at 6 o'clock (UTC).

Two lines on purpose: the SST number and the ocean line turn at the neutral SST the notebook measured (26.9 °C: where a storm on average stops strengthening), while the field shows EIC's line (26.5 °C: where storms form).

## Credits

- Covers: each storm near its peak, public domain, from Wikimedia Commons: [Emily, MODIS, 16 July 2005](https://commons.wikimedia.org/wiki/File:Emily_2005-07-16_1545Z_(cropped).jpg) (Jeff Schmaltz, NASA MODIS Rapid Response Team), [Felix from the International Space Station, 3 September 2007](https://commons.wikimedia.org/wiki/File:Felix_2007-09-03_1138Z.jpg) (NASA), [Sam, 26 September 2021](https://commons.wikimedia.org/wiki/File:Sam_2021-09-26_2000Z.jpg) (NASA Worldview).
- Data, on the sleeve: NASA SVS 5097, 5072 · HURDAT2 (NOAA/NHC) · GHRSST MUR SST v4.1 (NASA JPL, via NOAA CoastWatch). Details in [`sources.md`](../../data/hot_oceans/sources.md).

## Not Done Yet

- Listening check of the mix: the ocean line against each kit, and the kits' levels against each other, have only been set from the earlier album, not heard in this one.
- The SST field switches to the next month's map at once, without a fade.
- Daily SST: the line uses monthly means (see Tracks).

## Reference: the Earlier Single-Storm Album

Project `nell-v2` (`/Users/nell/Projects/nasa/nell-v2`), album "Chasing the Rising Storm". Read for the design; do not copy files.

- Spec: `docs/albums/hurricane.md` (tempo rule, percussion families and their category layers, landfall drum, melody that this album replaces)
- Catalog: `src/features/album/data/catalog/hurricane.js`
- Composer: `src/features/music/domain/composers/hurricane.js`
- Storm view: `src/features/globe/presentation/storm-view.js`
