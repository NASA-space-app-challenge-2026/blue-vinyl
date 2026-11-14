# A Year on the Wing (Arctic Bird Album)

Issue #18. One year of bird movement from the Arctic Animal Movement Archive, the dataset behind EIC page [4877](https://svs.gsfc.nasa.gov/4877/). The data is analyzed and exported in [`notebooks/arctic_bird_album.ipynb`](../../notebooks/arctic_bird_album.ipynb).

## Message

EIC shows that Arctic animals move with the seasons, with all years folded into one. The album plays four species of the public bird studies through one year:

| Track | Species | km in a year (median bird) | Lead |
| --- | --- | --- | --- |
| 1 | Buff-breasted Sandpiper | not ranked (no bird tracked a full year) | Flute |
| 2 | Whimbrel | 20,306 | Oboe |
| 3 | Yellow-billed Loon | 10,289 | French horn |
| 4 | Northern Pintail | 3,819 (one bird tracked a full year) | Ocarina |

The Buff-breasted sandpiper (our choice, in place of the Lesser yellowlegs) flies from Alaska's Arctic coast to the Pampas of Argentina and Uruguay; it plays a fixed list of 93 birds we picked. The Whimbrel and the Yellow-billed loon are two of the four species that fly the farthest in a year. The Northern pintail (our choice, in place of the Red-throated loon) flies from northern Japan to the tundra of eastern Siberia. The shorebirds cross the equator to South America; the loon and the pintail stay in the North Pacific.

## Data

Each track file (`data/arctic_bird/tracks/<species>.csv`) holds the daily positions of 30 bird-years of one species: one bird in one calendar year each, chosen from every individual of the species' study (the notebook's analysis caps each study at 30 individuals, the tracks do not). Every bird-year of at least 20 days can play, except one that moved more than 1,000 km while its tag was silent for over 30 days (the app would draw that hidden flight as a slow glide across the continent); shorter bird-years only make up the number when a species runs out. The order they are chosen in keeps the music rhythmic and the flock together on the globe. First the core: birds that rest and then fly in bursts (the upper half by burstiness of daily distance), whose tags never fall silent for more than 7 days, within 2,500 km of the flock's centre. Then birds that cover days the core leaves empty, and birds that move on days when fewer than 3 birds of the flock move, so every season has birds flying; if that makes more than 30, the most spread of the core give way. Then the rest, one at a time and always the one closest to the flock so far, stop-and-go birds before even movers and steady tags before silent ones. The app lays every year over one, so the birds of all years fly together through Jan 1 to Dec 31, a week a second (about 52 s a track). See section 9 of the notebook.

The **flock** is the birds on the map at a moment, averaged together: their mean position, mean speed, mean change of latitude and how many of them are flying (faster than 5 km/h). Code: [`bird-track.js`](../../src/features/tracks/domain/bird-track.js).

## Data to Sound

D major pentatonic at 96 BPM. Code: [`flock.js`](../../src/features/music/domain/composers/flock.js) and [`sound-engine.js`](../../src/features/music/data/sound-engine.js).

| Data | Sound |
| --- | --- |
| Flock latitude | Pitch of the lead, over two and a half octaves from the track's southernmost to its northernmost flock. |
| Flock speed | One of five tiers, split at the quintiles of the track's daily flock speed: from one note a bar at velocity 50 to a note every sixteenth at 110. The two fastest tiers add a piccolo an octave above the lead. The cello's root follows the same tiers. |
| Heading | In the moving tiers the lead runs up while the flock heads north and down while it heads south; resting, it turns around its note. |
| Birds flying | Viola and violin hold the bar's chord as loud as the share of birds flying. |
| Flock position | The whole mix sits at the flock's bearing from where the track's flock starts (north ahead, east to the right), further away the further it has gone (HRTF panner). |

Each bar a chord that holds the lead's note plays on the pad; every fourth bar it returns to D major when it can.

## Visuals

- Each bird is drawn seen from above with flapping wings, turned the way it flies, in the track's colour; birds fade in and out as their paths begin and end.
- A comet tail of the last 30 days follows each bird, drawn as a WebGL ribbon in the globe's scene.
- The globe turns to keep the flock in the middle; turned by hand, it glides back a second after release.
- A WebGL halo around the globe breathes with the music: each place on the rim shows a frequency band, low at 6 o'clock to high at 12, in the track's colour.
- The date (month and day) is printed at 6 o'clock on the globe.
- Each track's cover is the lead photo of its species' English Wikipedia article, from Wikimedia Commons (for the Whimbrel, the Hudsonian whimbrel of the Americas, which the Alaska study tags), saved in `assets/albums/arctic-bird/`. Its credit and license are shown at the bottom right, and its main color is the backdrop.

## Sound Font

The instruments come from GeneralUser GS, cut down by `npm run soundfont`. See [CREDITS.md](../../src/features/music/data/soundfonts/CREDITS.md).
