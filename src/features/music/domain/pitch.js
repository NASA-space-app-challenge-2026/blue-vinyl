/** Semitones of the natural minor scale above its tonic. */
const NATURAL_MINOR = Object.freeze([0, 2, 3, 5, 7, 8, 10]);

// Flats, as the SoundFont sample names use them.
const NOTE_NAMES = Object.freeze(['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']);

/**
 * MIDI note `steps` scale degrees above (or below) `home` in the natural minor on `tonic` (a pitch class, 0 for C);
 * `home` must be in that scale. Without `tonic`, `home` is the tonic.
 *
 * @param {number} home
 * @param {number} steps
 * @param {number} [tonic]
 */
export function minorDegree(home, steps, tonic = home % 12) {
  const above = (((home - tonic) % 12) + 12) % 12;
  const start = NATURAL_MINOR.indexOf(above);
  if (start < 0) throw new Error(`MIDI ${home} is not in the minor scale on ${tonic}`);
  const degree = start + steps;
  const octave = Math.floor(degree / NATURAL_MINOR.length);
  return home - above + 12 * octave + NATURAL_MINOR[degree - octave * NATURAL_MINOR.length];
}

/** Note name of a MIDI note, such as 'Bb3' (middle C is C4). */
export function noteName(midi) {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

/** MIDI note velocity (0..127) as a linear gain, the way synthesizers commonly map it. */
export function velocityGain(velocity) {
  return (velocity / 127) ** 2;
}
