// The instruments the music plays, as General MIDI programs of one sound font (built by scripts/build-soundfont.mjs
// from GeneralUser GS; see src/features/music/data/soundfonts/CREDITS.md), and the MIDI controllers they answer to.

export const SOUND_FONT = 'orchestra.sf2';

export const CC = Object.freeze({
  VOLUME: 7,
  EXPRESSION: 11,
  RESET_ALL: 121,
});

// `volume` (CC 7) evens out how loud the programs play against each other. `lowNote`: the lowest MIDI note a melody
// on it starts from, so every lead plays in its own comfortable register.
export const Instrument = Object.freeze({
  FLUTE: { program: 73, volume: 110, lowNote: 62 },
  OBOE: { program: 68, volume: 100, lowNote: 62 },
  FRENCH_HORN: { program: 60, volume: 100, lowNote: 50 },
  CLARINET: { program: 71, volume: 105, lowNote: 50 },
  STRINGS: { program: 49, volume: 85, lowNote: 50 },
  CELLO: { program: 42, volume: 85, lowNote: 38 },
  WARM_PAD: { program: 89, volume: 60, lowNote: 50 },
});
