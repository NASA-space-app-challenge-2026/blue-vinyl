# A Year on the Wing (Arctic Bird Album)

Issue #18. One year of bird movement from the Arctic Animal Movement Archive, the dataset behind EIC page [4877](https://svs.gsfc.nasa.gov/4877/). The data is analyzed and exported in [`notebooks/arctic_bird_album.ipynb`](../../notebooks/arctic_bird_album.ipynb).

## Message

EIC shows that Arctic animals move with the seasons, with all years folded into one. The album plays the four species of the public bird studies that fly the farthest in a year, farthest first:

| Track | Species | km in a year (median bird) | Lead |
| --- | --- | --- | --- |
| 1 | Lesser Yellowlegs | 24,670 | Flute |
| 2 | Whimbrel | 20,306 | Oboe |
| 3 | Yellow-billed Loon | 10,289 | French horn |
| 4 | Red-throated Loon | 9,699 | Clarinet |

The shorebirds cross the equator to South America; the loons stay in the North Pacific. A listener hears both how far each flock goes and when it goes.

## Data

Each track is one species' flock through one folded year, one row per day (`data/arctic_bird/tracks/<species>.csv`): the birds' median latitude, circular mean longitude, mean km flown that day and the number of birds tracked. See section 9 of the notebook for how a day is built.

## Data to Sound

One day of data is one sixteenth note at 105 BPM, so a year lasts about 52 s. Every scale is shared by the whole album, so the same latitude or distance sounds the same in every track. Code: [`migration.js`](../../src/features/music/domain/composers/migration.js).

| Data | Sound |
| --- | --- |
| Latitude | Pitch of the lead on a D major pentatonic scale, about two and a half octaves from the southernmost to the northernmost flock. The shorebirds sweep the whole range; the loons stay in its upper part. The lead moves at most two scale steps per note, so a fast move sounds as a run. |
| km flown that day | How often the lead plays and how hard: one note a bar while resting (under 10 km), up to a note on every sixteenth over 200 km. |
| Heading | Rising phrases while the flock goes north, falling phrases while it goes south. |
| km flown since Jan 1 | String voices: one more voice and a little louder for every sixth of the album's farthest year, so the farthest flyer ends with the fullest chord. |

A cello root and a soft pad hold a chord that contains the lead's note at each bar.

## Visuals

The globe turns to each flock as its track starts, draws the trail flown so far in the track's color, and marks where the flock is now with a dot that pulses on every lead note, as strongly as the note is played.

## Sound Font

The instruments come from GeneralUser GS, cut down by `npm run soundfont`. See [CREDITS.md](../../src/features/music/data/soundfonts/CREDITS.md).
