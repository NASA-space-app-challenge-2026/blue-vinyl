/**
 * Liner notes for each album, by album id, shown on the back of its sleeve (see album-cover.js).
 *
 * - subtitle: a line under the album's title.
 * - message: the data the album is made from and what it has to say.
 * - globeVisual: what the globe shows.
 * - sonification: what the music does with the data.
 * - docentTip: a docent's spoken introduction, about fifteen seconds long.
 * - tracks: a line on each track, in the album's order.
 */
export const ALBUM_NOTES = Object.freeze({
  'arctic-bird': {
    subtitle: 'A year of migration between the Arctic and the far south',
    message:
      'Built on satellite tracking from the Arctic Animal Movement Archive, the data behind a NASA visualization, this album follows migratory birds through a year of travel across continents and over the equator, in step with the turning seasons. Birds tracked from 2003 to 2019 fly together through a single year.',
    globeVisual:
      'Thirty birds beat their wings across the globe, leaving trails of light that link their wintering grounds in the south to their breeding grounds in the Arctic.',
    sonification:
      'Each species has its own lead (flute, oboe, French horn or ocarina). It climbs higher the farther north the birds fly, and breaks into breathless sixteenth-note runs as they fly faster.',
    docentTip:
      'This album lets you hear a year in the flight of migratory birds, drawn from tracking data. Listen as the melody climbs higher when the birds head north, and as the rhythm changes when they take flight.',
    tracks: [
      { name: 'Buff-breasted Sandpiper', desc: 'Crosses the length of the Americas, from Alaska to the Argentine pampas (flute).' },
      { name: 'Whimbrel', desc: 'A master of long-haul flight, covering some 20,000 km a year (oboe).' },
      { name: 'Yellow-billed Loon', desc: 'Heads north along the North Pacific coast to the Arctic Ocean (French horn).' },
      { name: 'Northern Pintail', desc: 'Leaves northern Japan for its breeding grounds on the Siberian tundra (ocarina).' },
    ],
  },

  glacier: {
    subtitle: 'Polar sea ice and the rising sea',
    message:
      'Satellite records of polar sea ice and global mean sea level over the past 32 years show the reality of the climate crisis: as the ice melts, the sea rises.',
    globeVisual:
      "The polar ice at the heart of the globe shrinks year by year, while the label at the record's centre fills like a porthole with the 10 cm the sea has risen since 1993.",
    sonification:
      'On the right, the clear sound of the ice (vibraphone and piano) sinks lower and weaker as the sea ice shrinks. On the left, the sound of the sea (strings) grows higher and grander as the water rises.',
    docentTip:
      'This album lets you hear 32 years of satellite records of shrinking polar ice and a rising sea. Feel the tension between a sound that sinks lower as the ice shrinks and a sound that climbs higher as the sea rises.',
    tracks: [
      { name: 'Arctic', desc: "The steep decline of the Arctic's September sea ice minimum, against the rising sea (vibraphone and low strings)." },
      { name: 'Antarctic', desc: "The swings of Antarctica's February summer sea ice, against the steadily rising sea (piano and low strings)." },
    ],
  },

  lightning: {
    subtitle: 'Lightning that follows the summer sun',
    message:
      "Some 60,000 lightning flashes a track, drawn from those an optical sensor aboard the International Space Station recorded in 2021, capture the Earth's breathing: lightning migrates to whichever hemisphere is in summer, following the heat of the sun.",
    globeVisual:
      'Over the course of a year, orange and blue lightning flashes cross the equator, following the summer hemisphere lit by the sun.',
    sonification:
      'In January, when the Southern Hemisphere is hot, the music plays in heavy drums and a dark minor key. In July, as the lightning moves north, it turns to shimmering metallic tones and a bright major key.',
    docentTip:
      "This album lets you hear where lightning strikes over a year. Lightning in the Southern Hemisphere is played on heavy drums, and lightning in the Northern Hemisphere on bright metallic instruments. Listen to the lightning's energy move as the year goes by.",
    tracks: [
      { name: 'The Americas and Africa', desc: 'Lightning moving with the seasons across the Americas and Africa, either side of the Atlantic (taiko and celesta).' },
      { name: 'Asia and Australia', desc: 'The breath of great thunderstorms passing between East Asia and Australia (melodic toms and dulcimer).' },
    ],
  },

  forest: {
    subtitle: "The height of the world's forests and the carbon in the air",
    message:
      "A 3D map of the world's forest heights, measured by a laser aboard the Space Station, is set against observations of carbon dioxide in the air, showing the forests' work in holding carbon and the greenhouse gas still rising around them.",
    globeVisual:
      'The noon sun circles the globe in 45 seconds, lighting up the 3D columns of trees rising from each continent in turn.',
    sonification:
      'The taller and denser the trees, the higher and faster the flute and harp play, while the pad and cello beneath them grow louder and heavier as the carbon dioxide thickens over time.',
    docentTip:
      "This album lets you hear the height and density of the world's forests. Where the forest is dense, the notes pour out all at once; where it is sparse, listen to them fall one by one.",
    tracks: [
      { name: 'Under the Noon Sun · 2019–2023', desc: 'The noon sun circling the Earth, and four years of thickening carbon dioxide in the air (harp, flute and pizzicato strings).' },
    ],
  },

  'hot-oceans': {
    subtitle: 'The life cycle of a major hurricane',
    message:
      "Using storm tracking data from the US National Hurricane Center, this album traces a hurricane's life: feeding on the ocean's heat, raging out of control, then dying out once it makes landfall.",
    globeVisual:
      "On the globe, the storm's spiral grows larger and spins faster as its winds rise, its clouds turning from sea blue through yellow to magenta, then winds down and fades once it is over land.",
    sonification:
      "As the hurricane's winds strengthen, the drums race from about 40 to as many as 200 beats per minute, and at the moment of peak wind speed a single, devastating cymbal crash erupts.",
    docentTip:
      'This album lets you hear the changing wind speed of Atlantic hurricanes. As the wind picks up, the drums race like a heartbeat; listen for the cymbal crash that bursts out the moment the storm reaches its top speed.',
    tracks: [
      { name: 'Katrina 2005', desc: 'The storm of the century that struck the Gulf of Mexico (rock drum kit).' },
      { name: 'Felix 2007', desc: 'A violent Category 5 hurricane that struck Nicaragua (marching drumline).' },
      { name: 'Laura 2020', desc: 'The fierce storm that tore into Louisiana (Latin percussion: conga and clave).' },
      { name: 'Helene 2024', desc: 'A vast hurricane that left its scars across Florida and far inland (orchestral timpani and snare).' },
    ],
  },

  hemispheres: {
    subtitle: 'Storms over two oceans in the hottest year on record',
    message:
      'Satellite records of tropical cyclones around the world capture the storms of two seasons in 2023, the year sea surface temperatures were the highest on record: the southern summer over the South Indian Ocean (January to April) and the North Atlantic season (June to October).',
    globeVisual: 'Spinning storms form over each hot ocean, leaving their paths across the globe, coloured by when in the season each one formed.',
    sonification:
      'Each storm that forms adds a new synthesizer melody. Its pitch rises in the north and sinks in the south as the storm heads toward the pole, and the sound moves between your ears as the storm travels west and east.',
    docentTip:
      'This album lets you hear the tracks of storms over the oceans of both hemispheres. Feel which way the storms move, rising in the north and sinking in the south, in three-dimensional sound.',
    tracks: [
      { name: 'North Atlantic 2023', desc: 'A North Atlantic season that brought 20 storms despite El Niño (analogue whistle).' },
      { name: 'South Indian 2023', desc: 'Cyclone Freddy, which crossed the whole South Indian Ocean and set a record as the longest-lived (analogue bowed strings).' },
    ],
  },

  wildfire: {
    subtitle: "America's wildfires in a warming climate",
    message:
      'Forty years of US wildfire statistics and satellite fire detections show the destructive force of wildfires that grow larger and burn longer as the climate changes.',
    globeVisual:
      'Large wildfires flare up across the United States where they burned, their fronts glowing red and their smoke rising, then burn down to dark scars.',
    sonification:
      'The more land burns in a year, the higher and rougher the French horn cries. At 2015 and 2020, the worst fire years on record, the whole orchestra erupts in a scream, then falls still for a breath before the fire roars back.',
    docentTip:
      'This album lets you hear observations of large wildfires in the United States. Listen as every instrument erupts in a scream when the burned land peaks, and to the silence that follows.',
    tracks: [
      { name: 'Burned Acres', desc: 'Land burned across the US each year from 1983 to 2024, and a history of its large fire ignitions (French horn and timpani).' },
      { name: '2020 Fire Season', desc: 'The 160-day spread of the 2020 fire season that turned the sky orange, day by day (trombone and taiko drums).' },
    ],
  },

  aerosol: {
    subtitle: 'Dust and smoke carried around the planet',
    message:
      "Fine particle data from NASA's global atmospheric model reveal how the air connects us all: sandstorms and wildfire smoke from one region ride the atmosphere to continents thousands of miles away.",
    globeVisual: 'Saharan sand (pink) and African wildfire smoke (orange) ride the winds across the Atlantic and spread to other continents.',
    sonification:
      'A guitar and cello melody played where the particles rise is reborn as the very same melody on a distant harp and horn the moment they cross the air and arrive, in the Caribbean, on Saint Helena or in Britain, up to 7,000 km away.',
    docentTip:
      'This album lets you hear fine dust moving through the air, tracked by a global atmospheric model. Listen to the direction and speed of particles that set out from around the world and ride the wind across the ocean to faraway places.',
    tracks: [
      { name: 'Hurricane Erin', desc: 'Hurricane Erin, born off Cape Verde, and the sea salt swirling in it (violin).' },
      { name: 'Saharan Dust', desc: 'A great sandstorm leaving the Sahara and reaching the Caribbean in 6.8 days (guitar to harp).' },
      { name: 'Southern Africa Smoke', desc: 'Smoke from southern African wildfires reaching the remote Atlantic island of Saint Helena (cello to horn).' },
      { name: 'Spain and Etna', desc: "Smoke from Spain's wildfires reaching Britain, and Etna's volcanic sulphur dioxide reaching Greece (cello to horn, celesta to vibraphone)." },
    ],
  },

  smog: {
    subtitle: 'Haze that drifts in with the weather and moves on',
    message:
      "Small particles stay in the air for only a few days, but the weather can carry them far from where they rose. Built on the haze computed by NASA's GEOS-CF atmospheric model, hour by hour, this album follows smog over three cities as it drifts in from beyond the map, covers the city and passes on: Canadian wildfire smoke over New York, an early summer haze over Seoul and winter smog over Shanghai.",
    globeVisual:
      'The globe holds the city in the middle as a brown fog drifts in, thickening over it and then thinning away. The glow around the globe turns from blue in clean air through yellow and orange to red and purple as the haze over the city thickens.',
    sonification:
      'Each city plays one bright dance loop that never changes; only the air it is heard through does. As the haze over the city thickens, the music grows muffled and quiet, down to a low hum at its haziest hour, and opens up again as the air clears.',
    docentTip:
      'This album lets you hear how thick the smog is as it rolls over a city. When the smog covers the city, the bright dance music grows muffled, as if heard through fog; listen as it rings out clear again when the wind sweeps the smog away.',
    tracks: [
      { name: 'New York 2023', desc: "Smoke from Canada's wildfires drifts over the city, June 5 to 8 (synth-pop loop with a square-wave arpeggio)." },
      { name: 'Seoul 2025', desc: 'An early summer haze passes over the city, June 15 to 17 (house loop with saw-wave chord stabs).' },
      { name: 'Shanghai 2025', desc: 'Winter smog drifts in over the city and moves on, December 28 to 31 (the same house loop as Seoul).' },
    ],
  },
});
