# Glacier Album: As the Ice Melts

The album's story, data and mappings. It follows [album-guide.md](../album-guide.md); the data comes from `notebooks/glacier_album.ipynb` (issues #8 and #17).

## Message

> "As the planet warms and polar ice melts, our global average sea level is rising." ([SVS 5235](https://svs.gsfc.nasa.gov/5235/), Climate Vital Signs Dashboard)

Each track plays one pole: its sea ice shrinking year after year, and the global sea level rising on the same timeline. The seasonal freeze and thaw is left out, so the long-term change is what the listener hears and sees.

The ice data is sea ice, the only ice data in the EIC gallery. It stands for polar ice melt.

## Tracks

| # | Track | Ice | Sea | Years | Length |
| --- | --- | --- | --- | --- | --- |
| 1 | Arctic | Arctic September extent vs. its 1981–2010 normal | Global mean sea level, change since 1993 | 1993–2024 | 0:40 |
| 2 | Antarctic | Antarctic February extent vs. its 1981–2010 normal | The same series | 1993–2024 | 0:40 |

Data files: `data/glacier/tracks/` (see `tracks.json` for every source, version and credit).

## Time

One year a bar of 1.2 s: long enough to hear each year's note and how it moved from the year before, short enough that the years run on as one line. There is no intro; after the last bar the last note rings out for 1.3 s. 32 years make 39.7 s. The tempo comes first: every year gets its bar, and a longer series makes a longer track. The sound and the globe read the same timeline (`YEAR_TIMELINE`), so a year's notes and its picture change together.

## Sound

The score is written to be understood by ear alone, by listeners who cannot see the globe: two streams that can be told apart at once, each with one meaning, on sounds whose meaning is familiar from life. Both tracks share it, so what is learned on one holds on the other. All parts are in C minor, played from the FluidR3_GM SoundFont (CC BY 3.0).

| Part | Data | Mapping |
| --- | --- | --- |
| Ice: vibraphone (Arctic), piano (Antarctic), a little right | Ice extent against its 1981–2010 normal | Pitch: less ice is lower. One note a year, struck on the downbeat and held to the next. The normal is G5 and each 4% of it is one step of C minor (C4 to B♭6), fine enough that most years sound different from the year before (Arctic: 25 of 31). Quieter too with less ice, velocity 70 + 30 × extent / normal. Each note is evened out by its sample's measured level (the vibraphone's jump by up to 10 dB from key to key, the piano's by 8 dB), and the piano plays at the vibraphone's level. |
| Sea: low strings (String Ensemble 1), a little left | Sea level | Pitch, like a bottle filling with water. A held note from C3 at the 1993 level, one step of C minor up for each 15 mm, to C4 at +100 mm; it moves only when the sea reaches another step, and is louder as it rises. |
| Timpani | Record low | A stroke in every year lower than all years since 1979; the track's lowest year is the loudest. |

The ice falls as the sea rises, so the two lines draw together: on Arctic the ice goes from G5 in 1993 to F4 in 2024 (C4 in 2012) while the sea climbs from C3 to C4. They are told apart by sound (struck against bowed strings), by register and by side. The ice's instrument is the one thing that differs between the tracks, a vibraphone on Arctic and a piano on Antarctic; the rest of the score is shared, so what is learned on one track holds on the other.

Mix: set from the RMS of the samples (the first 1.82 s, decoded outside the browser), the ice at the normal about 3 dB over the sea line in the middle of its rise. Not yet measured in a browser render of the whole score.

## Globe

See [design.md](../design.md#data-on-the-globe): the ice morphing from one year's shape into the next over a fading blue trail of the years before, pieces of the lost ice falling into the water, the year, and the label as the porthole of SVS 5235: water rising with the sea level. The 1993 sea level sits 14% up the label and each 10 cm of rise takes 30% of its height.

## Credits

- Covers, one per track, each pole at its smallest ice of 2024: NASA Scientific Visualization Studio
  - Arctic: [SVS 5382](https://svs.gsfc.nasa.gov/5382/), frame 2200 of the 4K animation (September 11, 2024, before the yellow 1981–2010 average line fades in), cropped to a square
  - Antarctic: [SVS 5064](https://svs.gsfc.nasa.gov/5064/), the 2024 daily frame without dates for February 20, 2024 (converted from EXR), cropped to a square
- Data: NSIDC Sea Ice Index v4 (G02135); NOAA Laboratory for Satellite Altimetry, global mean sea level
- Instruments: FluidR3_GM SoundFont by Frank Wen (CC BY 3.0), via [gleitz/midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts)

## Not Done Yet

- The WebGL shader around the globe edge (album guide, Globe).
- Background color taken from the cover (album guide, Color and Cover Image).
- Docent narration and text for screen readers.
