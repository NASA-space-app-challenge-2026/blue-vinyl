// The instruments the music plays, as General MIDI programs of one sound font (built by scripts/build-soundfont.mjs
// from GeneralUser GS; see src/features/music/data/soundfonts/CREDITS.md), and the MIDI controllers they answer to.

export const SOUND_FONT = 'orchestra.sf2';

export const CC = Object.freeze({
  VOLUME: 7,
  PAN: 10,
  EXPRESSION: 11,
  RESET_ALL: 121,
});

// `volume` (CC 7, which scales the level by (volume/127)²) evens out how loud the programs play against each other.
// `drums`: a drum kit, played on a drum channel, one sound per key.
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
  DOUBLE_BASS: { program: 43, volume: 80 },
  VOICE_OOHS: { program: 53, volume: 76 },
  TROMBONE: { program: 57, volume: 100 },
  TUBA: { program: 58, volume: 100 },
  TAIKO: { program: 116, volume: 66 },
  STANDARD_KIT: { program: 0, volume: 100, drums: true },
  POWER_KIT: { program: 16, volume: 100, drums: true },
  ORCHESTRAL_KIT: { program: 48, volume: 100, drums: true },
});
