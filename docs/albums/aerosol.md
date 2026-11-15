# Aerosol Album: Connected by the Air

The album's story, data and mappings. It follows [album-guide.md](../album-guide.md); the data comes from [`notebooks/aerosol_album.ipynb`](../../notebooks/aerosol_album.ipynb) (issue #28). Every source: [`data/aerosol/sources.md`](../../data/aerosol/sources.md).

## Message

> "This visualization still image highlights how our atmosphere connects distant parts of the world. What happens in one region—whether natural events or human activities—can affect weather patterns and air quality thousands of miles away." ([SVS 5669](https://svs.gsfc.nasa.gov/5669/), GEOS Aerosols (2025))

EIC's still is one moment, Aug 19, 2025, 20:00 UTC, with four kinds of particles in four colours: sea salt (blue), dust (pink), smoke (orange) and sulfate (green). The album plays the two weeks around it, Aug 11–24, every 3 hours, and turns the message into what each track follows: **one event, small where it starts, reaching a distant place**. The challenge asks for this page as a multi-track sonification, each particle type with its own instrument ([mission.md](../mission.md)); here a particle type keeps its instruments across the album, and its toggle under the globe mutes it on the globe and in the music together.

## Tracks

| # | Track | Event (where it starts) | Where it reaches | Lead particle | Key | Colour |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Hurricane Erin | Erin's eye, from its birth west of Cape Verde (16.5° N, 23.1° W, Aug 11) | (spreads round the storm); the Sahara's dust arrives at the eye | sea salt | A minor | `#4080ff` |
| 2 | Saharan Dust | the Sahara (18° N, 2° E) | the Caribbean (17.5° N, 67.5° W) | dust | C minor | `#ff58a0` |
| 3 | Southern Africa Smoke | the fires of southern Africa (12° S, 22° E) | St Helena (15.9° S, 5.7° W) | smoke | C minor | `#ff7820` |
| 4 | Etna's Breath | Etna (37.75° N, 15° E) | Greece (38.5° N, 22.5° E) | sulfate | C minor | `#e0a030` |

The receptors are ours; EIC names the Caribbean and the United States for the dust and the Atlantic for the smoke. Kilauea, in EIC's caption, has no track: GEOS-FP carries no stream west of it these weeks (as much sulfate downwind as upwind, near the clean-air floor; section 8 of the notebook).

What the numbers say (section 9.4): Erin's salt has no plume while it is a tropical storm and grows round the eye to about 1.1 million km² once its winds pass 60 kt (Aug 15); Saharan dust leaves the coast on Aug 14 and its peak reaches 70° W on Aug 21, about 6.8 days and 10 m/s (an earlier outbreak reaches the Caribbean on Aug 13); southern Africa's smoke front closes on St Helena through the two weeks; Spain's smoke reaches Britain around Aug 15 and 18; Etna's stream exists from Aug 13 to 19.

## Data

Track files: `data/aerosol/tracks/<track>.csv`, one row per 3-hour step (112 rows), with `tracks.json`. Each row holds:

- the view centre (`view_lat`, `view_lon`; Erin's eye on track 1);
- four stems, one per particle type, seen from the view: centre-weighted AOD, where it sits (degrees north and east of the centre) and how fast it moves (mass flux over mass, m/s);
- each event's plume (`<particle>_*`): the AOD at its source, how far the plume connected to the source reaches (95th percentile, km) and its area (million km²); for an event with a receptor also the front (the plume's point nearest the receptor), its distance to the receptor and the AOD at the receptor;
- `erin_wind_kt` on track 1 (NHC best track, interpolated).

Frames for the globe: `data/aerosol/tracks/frames/`, one PNG per step shared by all tracks, holding the four AODs and the wind of all the particles (encoding in `tracks.json`). They hold numbers, not pictures; the app decodes them.

## Time

Two weeks, 112 steps of 3 hours, 0.25 s a step: 28 s a track. 

## Sound

120 BPM, a step a sixteenth note. Erin is in A minor, the other tracks in C minor. The lead sings on the analog synth (`src/features/music/data/analog-synth.js`, an exception to the album guide's SoundFont rule as in Mirror Storms); the air plays from the app's SoundFont. The whole mix rings in a large room (reverb send 0.4) and echoes three steps behind (send 0.18, feedback 0.4). Composer: `src/features/music/domain/composers/aerosol.js`.

The lead is the track's lead particle (the one the globe circles), one held voice, as a storm's in [hemispheres.md](hemispheres.md):

| Data | Mapping |
| --- | --- |
| latitude | pitch, north higher, on the track's minor pentatonic over two octaves from the tonic, spread over the latitudes the particle covers (11 notes); it glides to each new note over 0.15 s |
| degrees east of where it was released | place around the listener on an HRTF panner, fully to the side 20° of longitude away |
| speed (km a step) | loudness (0.35 at the slowest to 1 at the fastest step) and brightness (the filter's cutoff 1 to 4 octaves above the note) |

| Track | Lead | Sound |
| --- | --- | --- |
| Hurricane Erin | Whistle | one sine, quick vibrato |
| Saharan Dust | Bowed string | a sawtooth over a triangle an octave down |
| Southern Africa Smoke | Vocal | two hollow squares, ringing filter, slow wide vibrato |
| Etna's Breath | Brass | two sawtooths a little apart |

The air is one sustained instrument for each of the three particle types other than the lead's, held on a tone of the tonic minor chord. Its loudness is that type's AOD at the lead's head, read from the frame the globe draws, on a log scale from 0.01 (the thinnest air a frame holds) to 1.0 (the top of EIC's colours); EIC's own scale starts at 0.03, so air too thin to colour on the globe is already faintly heard. The SoundFont squares its expression, so the expression is the square root of the level. Its loudness never falls below 0.2 of full, so each instrument is always plainly heard while its toggle is on, even where its type is absent round the lead; it grows to full as the air thickens. The toggle under the globe switches the particle type off on the globe and in the music together.

| Particle type | Instrument | Tone above the tonic |
| --- | --- | --- |
| Sea salt | Seashore | an octave (noise, no pitch to speak of) |
| Dust | Halo pad | the tonic |
| Smoke | Voice oohs | the fifth |
| Sulfate | Warm pad | the minor third, an octave up |

## Globe

- The four AODs are drawn as a shell over the whole globe in EIC's colours and log scale, decoded to their real values and carried along the frames' flow between two frames; nothing is added to any particle type.
- The globe holds still on the track's view centre, with no zoom.

## Credits

- Cover: NASA Scientific Visualization Studio, SVS 5669; track covers: NASA MODIS and Earth Observatory; Saharan Dust: [Dust Traverses the Atlantic Ocean](https://science.nasa.gov/earth/earth-observatory/dust-traverses-the-atlantic-ocean-146871), Jun 18 2020 (see `albums.js`)
- Data: NASA GMAO GEOS-FP; NOAA National Hurricane Center

## Not Done Yet

- Text for screen readers (the date, what arrives where) is not read out yet.
- 5669 is not linked from the EIC gallery itself; it is in the challenge resources. Album guide Q4 asks for a gallery page.
