# Hurricanes over Warm Water (Hot Oceans Album)

Issue #21, branch `feat/#21`. Warm water feeds hurricanes: the message of EIC page [5097 2022 Hurricane Season](https://svs.gsfc.nasa.gov/5097/), heard through four Atlantic hurricanes that live their whole life over warm water and die on land (Felix 2007, Michael 2018, Laura 2020, Helene 2024). Analysis: [`notebooks/hot_oceans_album.ipynb`](../../notebooks/hot_oceans_album.ipynb). Sources: [`data/hot_oceans/sources.md`](../../data/hot_oceans/sources.md).

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
| The water under a storm goes with whether it strengthens or weakens over the next 24 hours, not with how strong it is now | Below about 27 °C most storms weaken (about 1 in 5 strengthen); above 29 °C most strengthen (7–8 in 10) |
| Warm water lets a storm grow; it does not make it grow | Wind shear, dry air and land, not in this data, decide most of the rest |
| Hot seasons are stormier only in the Atlantic | 2023 had the warmest Atlantic main development region of 2003–2024, but ranks 8th in energy |

The album must say "warm water lets storms grow", never "every warm sea makes a strong storm" or "every hot year is stormier".

## Decisions (user, 2026-11-14)

- **One storm per track.** Storms moving as a flock (latitude as pitch, east–west travel as panning) go to a **separate album**.
- **Tracks: storms over warm water that die on land.** Every record of the storm's life over the sea is at or above EIC's 26.5 °C, and after its last landfall it never reaches the sea again (notebook section 9.2). Of the 47 such Atlantic hurricanes, the four that come ashore with the strongest wind: Felix 2007, Michael 2018, Laura 2020, Helene 2024. Before that, the tracks were Kirk 2012, Lee 2017 and Sam 2021, which went from warm water to cool far from land.
- **The SST is neither played nor drawn.** It chooses the storms. The ocean line (trombone and tuba), the SST number beside the storm and the SST field on the globe were all removed.
- **The sound is the earlier single-storm album's, without its melody** (`nell-v2`, "Chasing the Rising Storm", see Reference below), and the wind's speed is carried by the drums alone: one tempo for the whole album, and each category splits the beat finer.
- **Landfall: a gong**, loud, then the storm dies.
- **Each track has its own percussion family**: Felix marching drumline, Michael drum set, Laura Latin, Helene orchestral timpani and snare.
- **Title**: "Hurricanes over Warm Water".

## Tracks

| Track | Life | Peak | Coolest sea under it | Last landfall | Then | Kit |
| --- | --- | --- | --- | --- | --- | --- |
| Felix 2007 (`AL062007`) | 4.75 days | 150 kt | 28.3 °C | 140 kt, Nicaragua, 4 Sep 12:00 UTC | tropical depression 18 h later | Marching drumline |
| Michael 2018 (`AL142018`) | 4.75 days | 140 kt | 28.2 °C | 140 kt, Florida Panhandle, 10 Oct 17:30 UTC | extratropical over Virginia 30.5 h later | Drum set |
| Laura 2020 (`AL132020`) | 8.25 days | 130 kt | 27.7 °C | 130 kt, Louisiana, 27 Aug 06:00 UTC | tropical depression 24 h later | Latin |
| Helene 2024 (`AL092024`) | 3.25 days | 120 kt | 30.0 °C | 120 kt, Florida Big Bend, 27 Sep 03:10 UTC | remnant low 15 h later | Orchestral |

Felix and Laura also come ashore earlier as tropical storms: Felix over Grenada (45 kt), Laura five times (the Leeward Islands twice, Hispaniola, Cuba twice, 40–55 kt). Each of those landfalls strikes the gong too, softer.

"Coolest sea under it" is the MUR monthly SST under the storm's centre, over the sea, during the life the track plays. The monthly mean hides the cooling a storm leaves in its own wake.

## Time

Each track plays its storm's whole life at an even pace, from its first record as a tropical depression to its first record after the peak below 34 kt or no longer tropical (notebook section 12), each in 30 s ([album-guide.md](../album-guide.md)): Helene 3.25 days (2.6 hours a second) to Laura 8.25 days (6.6 hours a second). The storm fades in over the track's first 2.5 s and out over its last.

## Sound

[`composers/hurricane.js`](../../src/features/music/domain/composers/hurricane.js), on the app's SoundFont (GeneralUser GS plus a gong, see [Credits](#credits)).

| Layer | Data | Sound |
| --- | --- | --- |
| Wind | Maximum sustained wind | One tempo, 90 BPM, all album long. The track's percussion family splits the beat as finely as the wind's category calls for (below), and each category adds pieces and craft (backbeat, ghost notes, flams, fills from category 3, an opening stroke from category 4, drags and rolls at 5), the ringing drums panned round the listener with the storm's spin. Behind it a double bass and a pad strike each bar, cello, viola and violin circle the chord in eighth notes (from tropical storm, category 1 and 2), a choir joins from category 3 |
| Landfall | HURDAT2 `L` records | A gong and a low D on the double bass, at the landfall's own time, as loud as the wind the storm comes ashore with (velocity 64 for calm air to 127 at 160 kt); the gong rings for four bars |

How finely the beat is split (`SUBDIVISION`):

| Category | Strokes a beat | Feel | Strokes a second at 90 BPM |
| --- | --- | --- | --- |
| Tropical depression | 1 | quarter notes | 1.5 |
| Tropical storm | 2 | eighths | 3 |
| Category 1 | 3 | triplets | 4.5 |
| Category 2 | 4 | sixteenths | 6 |
| Category 3 | 6 | sextuplets | 9 |
| Category 4 | 8 | thirty-seconds | 12 |
| Category 5 | 12 | twelve a beat | 18 |

Straight and triplet splits take turns, so each category change is heard as a new feel, not only as more notes. Each kit's tab is written on the grid its category calls for (a tab of 12 letters plays triplets), and the composer checks at load that every kit's bar and fill at each category reach exactly that split and no finer. The fastest piece of each kit carries it: the snare line (drumline, orchestra), the hi-hat (drum set), the maracas and bongos (Latin). In the offline mix, the drums of all pieces together play about 3 strokes a second for a tropical depression and up to 25 at Felix's category 5 peak.

- Harmony: D minor, i – VI – III – VII, a chord at least 2 s long: one bar at 90 BPM.
- The kits are General MIDI drum kits of GeneralUser GS (Standard, Power, Orchestral). The drum set and Latin share the Standard kit.
- The gong is `gongHit_fff.wav` of VSCO 2 Community Edition (CC0), added to the SoundFont as program 119 by [`build-soundfont.mjs`](../../scripts/build-soundfont.mjs): mixed to mono, cut to 12 s with a 4 s fade and normalised (the recording peaks at half scale). In an offline render the final gong is 4–8 dB louder (RMS) than the band in the two seconds before it.

What a listener hears:

- **Felix**: a soft gong as it crosses Grenada, then two days from triplets to twelve a beat as it grows to category 5; the gong at 140 kt in Nicaragua, and the split falls back to quarter notes as it dies.
- **Michael**: the split climbs to twelve a beat over the Gulf of Mexico and holds until the gong on the Florida Panhandle at its peak.
- **Laura**: five soft gongs across the Caribbean over an eighth-note beat, then the climb over the Gulf to thirty-seconds and the loudest gong in Louisiana.
- **Helene**: the shortest life; thirty-seconds under the timpani as it reaches 120 kt, the gong in Florida, then it is gone.

## Globe

- **The storm** ([`storm-view.js`](../../src/features/globe/presentation/storm-view.js)): a cloud spiral drawn by a shader on the globe, turning anticlockwise. Its wind grows it, spins it faster, clears its eye and tints its thin cloud from sea blue through yellow to magenta. The globe keeps it in the middle; the glow around the globe takes its colour.
- **Below the storm**: its wind in km/h, in its category's colour.
- **The date** at 6 o'clock (UTC).

## Credits

- Covers: each storm near its peak, public domain, from Wikimedia Commons: [Felix from the International Space Station, 3 September 2007](https://commons.wikimedia.org/wiki/File:Felix_2007-09-03_1138Z.jpg) (NASA); [Michael at landfall, GOES-16, 10 October 2018](https://commons.wikimedia.org/wiki/File:Michael_2018-10-10_1700Z.jpg) (NASA Earth Observatory), also the album cover; [Laura, VIIRS, 26 August 2020](https://commons.wikimedia.org/wiki/File:Laura_2020-08-26_1925Z.jpg) (NASA LANCE); [Helene, MODIS on Aqua, 26 September 2024](https://commons.wikimedia.org/wiki/File:Helene_2024-09-26_1945Z.jpg) (NASA Worldview).
- Data, on the sleeve: NASA SVS 5097, 5072 · HURDAT2 (NOAA/NHC) · GHRSST MUR SST v4.1 (NASA JPL, via NOAA CoastWatch), which chose the storms. Details in [`sources.md`](../../data/hot_oceans/sources.md).
- Gong: VSCO 2 Community Edition, Versilian Studios, CC0 ([`CREDITS.md`](../../src/features/music/data/soundfonts/CREDITS.md)).

## Not Done Yet

- Listening check in the app: the mix has been rendered offline only (levels above), not heard. The kits' volumes against each other are the earlier album's, set for its tempo, not this one's.
- The gong's level against each kit, and whether four bars of ring is right.
- Trimming the SoundFont's kits to the keys played.

## Reference: the Earlier Single-Storm Album

Project `nell-v2` (`/Users/nell/Projects/nasa/nell-v2`), album "Chasing the Rising Storm". Its percussion families, category mapping, accompaniment and storm view are the base of this album's sound and globe.

- Spec: `docs/albums/hurricane.md`
- Catalog: `src/features/album/data/catalog/hurricane.js`
- Composer: `src/features/music/domain/composers/hurricane.js`
- Storm view: `src/features/globe/presentation/storm-view.js`
