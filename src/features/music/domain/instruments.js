// The instruments the music plays, as General MIDI programs of one sound font (built by scripts/build-soundfont.mjs
// from GeneralUser GS; see src/features/music/data/soundfonts/CREDITS.md), and the MIDI controllers they answer to.

export const SOUND_FONT = 'orchestra.sf2';

export const CC = Object.freeze({
  VOLUME: 7,
  PAN: 10,
  EXPRESSION: 11,
  REVERB: 91,
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
  STANDARD_KIT: { program: 0, volume: 100, drums: true },
  POWER_KIT: { program: 16, volume: 100, drums: true },
  ORCHESTRAL_KIT: { program: 48, volume: 100, drums: true },
  // The lightning album (see composers/lightning.js): its pad, also the hemispheres album's sea (see
  // composers/storm-season.js), and what each hemisphere's flashes are struck on, the south's on drums. Volumes from
  // nell-v2, the melodic tom's set so the south sits against the north as on the taiko track (rendered offline, mean
  // RMS over each part's range).
  HALO_PAD: { program: 94, volume: 58 },
  CELESTA: { program: 8, volume: 100 },
  DULCIMER: { program: 15, volume: 127 },
  TAIKO: { program: 116, volume: 66 },
  MELODIC_TOM: { program: 117, volume: 85 },
});
