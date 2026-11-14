# Glacier Album: As the Ice Melts

The album's story, data and mappings. It follows [album-guide.md](../album-guide.md); the data comes from `notebooks/glacier_album.ipynb` (issues #8 and #17).

## Message

> "As the planet warms and polar ice melts, our global average sea level is rising." ([SVS 5235](https://svs.gsfc.nasa.gov/5235/), Climate Vital Signs Dashboard)

Each track plays one pole: its sea ice shrinking year after year, and the global sea level rising on the same timeline. The seasonal freeze and thaw is left out, so the long-term change is what the listener hears and sees.

The ice data is sea ice, the only ice data in the EIC gallery. It stands for polar ice melt; its amount never drives the sea level values.

## Tracks

| # | Track | Ice | Sea | Years | Length |
| --- | --- | --- | --- | --- | --- |
| 1 | North | Arctic September extent vs. its 1981–2010 normal | Global mean sea level, change since 1993 | 1993–2024 | 0:58 |
| 2 | South | Antarctic February extent vs. its 1981–2010 normal | The same series | 1993–2024 | 0:58 |

Data files: `data/glacier/tracks/` (see `tracks.json` for every source, version and credit).

## Time

A 4 s intro, then one year every 1.5 s (40 BPM), then the last year held. The sound and the globe read the same timeline (`YEAR_TIMELINE`), so a year's notes and its picture change together.

## Sound

All parts are in D minor and played from the FluidR3_GM SoundFont (CC BY 3.0).

| Part | Data | Mapping |
| --- | --- | --- |
| Main instrument: cello (North), piano (South) | Ice extent | The 1981–2010 normal is home, D4 (North) or D5 (South); each 0.25 (North) or 0.15 (South) million km² is one scale step. Less ice is lower, so a pole that never returns to its normal never returns home. |
| Harp ripple | Sea level | Each year a ripple from D2 up to the water line, one octave from D3 (0 mm) to D4 (100 mm): longer, higher and louder as the sea rises. |
| Wave | Sea level | A Seashore stroke each year under the harp, higher as the water rises, like the note of a filling vessel. |
| Held strings, D2 and A2 | The normal | The whole track, like the gold line on the globe. |
| Timpani | Record low | A stroke in every year lower than all years since 1979; the track's lowest year is the loudest. |

Mix (RMS while the years play, measured in a browser render): the main instrument on top; the sea reaches 6 dB under it in the last third; the wave sits 8 dB under the harp; the strings 14 dB and the timpani 12 dB under the main instrument.

## Globe

See [design.md](../design.md#data-on-the-globe): the year's ice, the gold normal line, the dashed record-low line, the year and extent, and water rising from the bottom of the label with a mm ruler, after the porthole of SVS 5235.

## Credits

- Cover: NASA Scientific Visualization Studio, [SVS 5382](https://svs.gsfc.nasa.gov/5382/) (2024 Arctic minimum still, cropped)
- Data: NSIDC Sea Ice Index v4 (G02135); NOAA Laboratory for Satellite Altimetry, global mean sea level
- Instruments: FluidR3_GM SoundFont by Frank Wen (CC BY 3.0), via [gleitz/midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts)

## Not Done Yet

- The WebGL shader around the globe edge (album guide, Globe).
- Background color taken from the cover (album guide, Color and Cover Image).
- Docent narration and text for screen readers.
