# Glacier Album: As the Ice Melts

The album's story, data and mappings. It follows [album-guide.md](../album-guide.md); the data comes from `notebooks/glacier_album.ipynb` (issues #8 and #17).

## Message

> "As the planet warms and polar ice melts, our global average sea level is rising." ([SVS 5235](https://svs.gsfc.nasa.gov/5235/), Climate Vital Signs Dashboard)

Each track plays one pole: its sea ice shrinking year after year, and the global sea level rising on the same timeline. The seasonal freeze and thaw is left out, so the long-term change is what the listener hears and sees.

The ice data is sea ice, the only ice data in the EIC gallery. It stands for polar ice melt; its amount never drives the sea level values.

## Tracks

| # | Track | Ice | Sea | Years | Length |
| --- | --- | --- | --- | --- | --- |
| 1 | North | Arctic September extent vs. its 1981–2010 normal | Global mean sea level, change since 1993 | 1993–2024 | 0:59 |
| 2 | South | Antarctic February extent vs. its 1981–2010 normal | The same series | 1993–2024 | 0:59 |

Data files: `data/glacier/tracks/` (see `tracks.json` for every source, version and credit).

## Time

The tempo of the opening of Rachmaninoff's Piano Concerto No. 2 (Moderato, half note = 66, cut time): one year a bar, 1.82 s, so each chord rings as long as its whole note in the score. There is no intro, as the concerto opens on the piano's first chord; after the last bar the last chord rings out for 1.3 s. 32 years make 59.5 s. The tempo comes first: every year gets its bar, and a longer series makes a longer track. The sound and the globe read the same timeline (`YEAR_TIMELINE`), so a year's notes and its picture change together.

## Sound

All parts are in C minor, the concerto's key, and played from the FluidR3_GM SoundFont (CC BY 3.0).

| Part | Data | Mapping |
| --- | --- | --- |
| Ice, North: piano | Ice extent | One key a year, in the mood of the opening of Rachmaninoff's Piano Concerto No. 2 rather than its notes: struck on the downbeat and held the whole bar. The 1981–2010 normal is F5 and each 0.4 million km² is one step of C minor (B♭5 down to F4). Less ice is lower; a bigger change from the year before is louder. |
| Ice, South: cello | Ice extent | One note a year. The normal is C4; each 0.15 million km² is one step of C minor. Less ice is lower; a bigger change from the year before is louder. |
| Sea, North: piano left hand | Sea level | The score's low F1, doubled an octave up with F2 so it is heard on small speakers (F1 alone is 44 Hz): half a bar after the ice note, on the third beat, a half note to the end of the bar. It sounds when the water rises: in the first year and in every year the sea rose (all but 1998 and 2011), harder the higher the sea, from an already clear mf in 1993 to fff at +100 mm. |
| Sea, South: French horn | Sea level | Low, on the root of each year's chord (C3, A♭2, E♭3, B♭2), legato with the ice. Heard as strength, not pitch: from very soft in 1993 to strong at +100 mm. |
| Harp | Sea level | Each year, with the sea line, a wave washes in and recedes: the same shape every year, low on the harp, up through the chord and back two notes, harder as the sea rises. |
| Harmony | (time) | One chord a year: on North the score's chords over F (above); on South cycling Cm, A♭, E♭, B♭, so the waves move instead of repeating. Small fixed variations in timing and velocity keep them from sounding machine-made. |
| Wave | Sea level | A Seashore stroke each year under the harp, stronger as the water rises. |
| Held strings, F2 and C3 (North) or C2 and G2 (South) | The normal | The whole track: the home the ice melody leaves. |
| Timpani | Record low | A stroke in every year lower than all years since 1979; the track's lowest year is the loudest. |

Mix (RMS while the years play, measured in a browser render of an earlier score; not measured again since the piano became one key and the low F louder): the piano and the cello at the same level on top; the horn rises to 3 dB under them in the last third, and the piano's low F is set to about match the piano at the end; harp and wave reach 8 dB under them, the wave 8 dB under the harp; the strings sit 14 dB and the timpani 12 dB under the main instrument.

## Globe

See [design.md](../design.md#data-on-the-globe): the ice morphing from one year's shape into the next over a fading blue trail of the years before, pieces of the lost ice falling into the water, the year with its extent and its change since 1993 in percent, and the label as the porthole of SVS 5235: water rising past a centimetre ruler, with the 1993 sea level at its foot and the year's measured rise at its height. The 1993 sea level sits 14% up the label and each 10 cm of rise takes 30% of its height.

## Credits

- Cover: NASA Scientific Visualization Studio, [SVS 5382](https://svs.gsfc.nasa.gov/5382/) (2024 Arctic minimum still, cropped)
- Data: NSIDC Sea Ice Index v4 (G02135); NOAA Laboratory for Satellite Altimetry, global mean sea level
- Instruments: FluidR3_GM SoundFont by Frank Wen (CC BY 3.0), via [gleitz/midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts)

## Not Done Yet

- The WebGL shader around the globe edge (album guide, Globe).
- Background color taken from the cover (album guide, Color and Cover Image).
- Docent narration and text for screen readers.
