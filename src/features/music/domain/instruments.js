// The instruments the music plays, as General MIDI programs of one sound font (built by scripts/build-soundfont.mjs
// from GeneralUser GS; see src/features/music/data/soundfonts/CREDITS.md), and the MIDI controllers they answer to.

export const SOUND_FONT = 'orchestra.sf2';

export const CC = Object.freeze({
  VOLUME: 7,
  EXPRESSION: 11,
  RESET_ALL: 121,
});

// `volume` (CC 7, which scales the level by (volume/127)²) evens out how loud the programs play against each other.
export const Instrument = Object.freeze({
  FLUTE: { program: 73, volume: 110 },
  OBOE: { program: 68, volume: 100 },
  FRENCH_HORN: { program: 60, volume: 100 },
  OCARINA: { program: 79, volume: 110 },
  PICCOLO: { program: 72, volume: 80 },
  PAD: { program: 89, volume: 70 },
  CELLO: { program: 42, volume: 90 },
  VIOLA: { program: 41, volume: 75 },
  VIOLIN: { program: 40, volume: 75 },
});
