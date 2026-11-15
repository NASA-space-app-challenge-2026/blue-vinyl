// Sounds of the analog synth (see data/analog-synth.js).

// How a noise burst is shaped: HIT strikes and fades, RISE swells into its end.
export const NoiseShape = Object.freeze({ HIT: 'hit', RISE: 'rise' });
//
// A Patch is a stack of oscillators played as one note: `waves`, each { type, octave (above the note), detune (cents),
// gain (its share of the patch) }, and `level`, which evens out how loud patches play.
export const Patch = Object.freeze({
  // A sine an octave down under a soft triangle and a faint, slowly beating sawtooth: a deep hum that the filter opens
  // from a dull rumble to a hollow, cave-like drone.
  CAVE: Object.freeze({
    level: 1.6,
    waves: Object.freeze([
      { type: 'sine', octave: -1, detune: 0, gain: 1 },
      { type: 'triangle', octave: 0, detune: 0, gain: 0.8 },
      { type: 'sawtooth', octave: 0, detune: 4, gain: 0.25 },
    ]),
  }),
});

// A Lead is a held, gliding voice (see GlideVoice in data/analog-synth.js): its oscillators (`waves`, each { type,
// octave, detune, level }, the level chosen so every lead is about as loud), the low-pass filter's `resonance` (Q) and
// its `vibrato` ({ hz, cents }, or null).
export const Lead = Object.freeze({
  // A whistle: one pure tone wavering quickly like a bird's.
  WHISTLE: Object.freeze({
    waves: Object.freeze([{ type: 'sine', octave: 0, detune: 0, level: 1 }]),
    resonance: 0.8,
    vibrato: Object.freeze({ hz: 5.5, cents: 18 }),
  }),
  // A singing voice: a hollow square over one an octave down, a ringing filter and a slow, wide vibrato.
  VOCAL: Object.freeze({
    waves: Object.freeze([
      { type: 'square', octave: 0, detune: 0, level: 0.4 },
      { type: 'square', octave: -1, detune: 0, level: 0.3 },
    ]),
    resonance: 6,
    vibrato: Object.freeze({ hz: 3.5, cents: 30 }),
  }),
  // A bowed string: a sawtooth over a softer triangle an octave down, a gently peaking filter and a slow, narrow
  // vibrato, full enough to carry low.
  BOWED: Object.freeze({
    waves: Object.freeze([
      { type: 'sawtooth', octave: 0, detune: 0, level: 0.5 },
      { type: 'triangle', octave: -1, detune: 0, level: 0.45 },
    ]),
    resonance: 2,
    vibrato: Object.freeze({ hz: 4.5, cents: 12 }),
  }),
  // A brass section: two sawtooths a little apart, steady, its filter peaking slightly.
  BRASS: Object.freeze({
    waves: Object.freeze([
      { type: 'sawtooth', octave: 0, detune: -7, level: 0.45 },
      { type: 'sawtooth', octave: 0, detune: 7, level: 0.45 },
    ]),
    resonance: 3,
    vibrato: null,
  }),
});
