// The analog synth's sounds (see data/analog-synth.js): each a stack of oscillators, `waves`, each { type, octave
// (above the note), detune (cents), gain (its share of the patch) }, and `level`, which evens out how loud the patches
// play.
export const Patch = Object.freeze({
  // A sine an octave down under a soft triangle and a faint, slow-beating sawtooth: a deep hum that the filter opens
  // from a dull rumble to a hollow, cave-like drone.
  CAVE: {
    level: 1.6,
    waves: [
      { type: 'sine', octave: -1, detune: 0, gain: 1 },
      { type: 'triangle', octave: 0, detune: 0, gain: 0.8 },
      { type: 'sawtooth', octave: 0, detune: 4, gain: 0.25 },
    ],
  },
});
