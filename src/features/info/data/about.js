// What the About dialog says about the project and the team.

/** @type {Readonly<import('../domain/info.js').AboutContent>} */
export const ABOUT = Object.freeze({
  version: '0.1.0',
  tagline: 'An Earth Information Jukebox',
  intro: [
    'Blue Vinyl turns NASA Earth data into music. Each dataset is an album on a record. Press play, and the globe at the '
      + 'center of the record turns through the data while the music is written from it as it plays.',
    "NASA's Earth Information Center shows our changing planet almost entirely in pictures, which leaves out blind and "
      + 'low-vision people. Blue Vinyl lets anyone hear a change in the data: sea ice shrinking, storms crossing an '
      + 'ocean, birds flying across the world, fires spreading through a season.',
  ],
  howItWorks: [
    {
      title: 'Albums',
      body: 'Each album is one story of the planet, told by a NASA dataset. Its tracks are the places or years it plays.',
    },
    {
      title: 'Sound from data',
      body: 'Pitch, tempo, loudness, rhythm, instruments and stereo position all come from the data, so a listener can '
        + 'hear it change.',
    },
    {
      title: 'Music, not noise',
      body: 'Scales, harmony and rules keep the sound pleasant to listen to while staying faithful to the data.',
    },
    {
      title: 'Accessible first',
      body: 'Everything works from the keyboard and a screen reader, and every album describes what it shows and how '
        + 'it sounds.',
    },
  ],
  shortcuts: [
    { keys: 'Space', action: 'Play or pause' },
    { keys: '← / →', action: 'Previous or next album' },
    { keys: '↑ / ↓', action: 'Volume up or down' },
  ],
  challenge: {
    label: 'NASA Space Apps Challenge 2026 · The Earth Information Jukebox',
    url: 'https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/',
  },
  team: [
    { name: 'Nell', github: 'nero-angela' },
    { name: 'shkim', github: 'coco0402' },
  ],
});
