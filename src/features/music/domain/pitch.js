/** Semitones of the D natural minor scale above its tonic. */
const D_MINOR = Object.freeze([0, 2, 3, 5, 7, 8, 10]);

// Flats, as the SoundFont sample names use them.
const NOTE_NAMES = Object.freeze(['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']);

/** MIDI note `steps` scale degrees above (or below) `home` in D minor; `home` must be a D. */
export function minorDegree(home, steps) {
  const octave = Math.floor(steps / D_MINOR.length);
  const index = steps - octave * D_MINOR.length;
  return home + 12 * octave + D_MINOR[index];
}

/** Note name of a MIDI note, such as 'Bb3' (middle C is C4). */
export function noteName(midi) {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

/** MIDI note velocity (0..127) as a linear gain, the way synthesizers commonly map it. */
export function velocityGain(velocity) {
  return (velocity / 127) ** 2;
}
