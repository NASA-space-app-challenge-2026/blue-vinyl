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
| 4 | Spain and Etna | Spain's fires (42° N, 6° W); Etna (37.75° N, 15° E) | Britain (52.5° N, 1.5° W); Greece (38.5° N, 22.5° E) | smoke and sulfate | C minor | `#e0a030` |

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

Two weeks, 112 steps of 3 hours, 0.4 s a step: 44.8 s a track. A day is a bar of 3.2 s, and every number the music uses is the day's mean of its 8 steps. The globe and the music read the same clock.

## Sound

FluidR3 SoundFont, played by `music-player.js`. Code: [`aerosol-score.js`](../../src/features/music/domain/aerosol-score.js). Every number is scaled between the track's lowest and highest day.

The listener stands where the event starts, facing north, and every note is placed around them by an HRTF panner, as the bird album places its flock: east to the right, further away the quieter. Headphones are needed to hear the directions.

| Part | Data | Sound |
| --- | --- | --- |
| Source (the event's motif) | AOD at the source | Loudness, right in front of the listener. Erin's motif turns one to three times a bar as its wind rises |
| Journey (up to three echoes) | Plume area; reach; front's bearing and distance from the source; particle speed in view; front closing on or drawing back from the receptor | More echoes as the plume grows, wider apart as it reaches further, each further out towards the front; the speed's quartile sets 2, 3, 4 or 6 notes an echo; the run climbs while the front closes in (or the plume grows) and falls while it draws back. Erin's salt echoes circle the listener anticlockwise, as an Atlantic storm turns |
| Arrival | AOD at the receptor | The motif on a second instrument from the receptor's direction, far away, once the AOD there is a fifth of the way up its range; louder the more arrives. On track 1 the dust arrives at the eye, close, from the east |
| Erin's strings and timpani | Sea salt in view; NHC wind | A chord as loud as the salt round the eye, gaining its third once Erin is a hurricane (64 kt); timpani on its windiest day |
| Bed (tracks 2–4) | none | A quiet open fifth every two days |

| Particle | At the source | Where it arrives |
| --- | --- | --- |
| sea salt | violin | (none) |
| dust | nylon guitar | harp |
| smoke | cello | French horn |
| sulfate | celesta | vibraphone |

Pitch carries no data: each event has a fixed motif, so the same melody heard in two places tells the listener the two places share the air.

## Globe

- The four AODs are drawn as a shell over the globe in EIC's colours, two frames blended at a time; the track's lead particle is drawn brighter and the rest dimmer, so Erin's sea salt shows its spiral.
- Grains leave the source with every motif, as many as it is loud, and drift on the frames' winds (the mean wind of all the particles, so a grain shows how the air carries, not where one measured particle went). The grains of each third of the plume light up with the echo that plays it.
- Rings open at the source with each motif and at the receptor with each arrival.
- The globe holds the view centre; on track 1 it follows Erin's eye, closer in.

## Credits

- Cover: NASA Scientific Visualization Studio, SVS 5669; track covers: NASA MODIS and Earth Observatory (see `albums.js`)
- Data: NASA GMAO GEOS-FP; NOAA National Hurricane Center
- Instruments: FluidR3_GM SoundFont (CC BY 3.0)

## Not Done Yet

- Listening on headphones and speakers to balance the mix; the levels are estimates, not measured.
- Text for screen readers (the date, what arrives where) is not read out yet.
- 5669 is not linked from the EIC gallery itself; it is in the challenge resources. Album guide Q4 asks for a gallery page.
- The Saharan Dust cover is a MODIS swath with black gaps between orbits.
