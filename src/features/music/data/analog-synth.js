// An analog-style synth in Web Audio, for sounds a sound font cannot shape note by note.
//
//   play: a note of a Patch (see domain/patches.js), its oscillators through a resonant low-pass filter that an
//     envelope throws open as the note starts and lets fall back, held for part of its length and released over a tail.
//   noise: a burst of white noise through a sweeping high-pass that fades out, a tick of percussion.
//   voice: a GlideVoice of a Lead, held open while its composer moves its pitch, level, brightness and place.

const HZ = Object.freeze({ min: 20, max: 18000 });
// How fast a note's level and filter open (s).
const ATTACK_SEC = 0.004;
// A note's peak level at full velocity, its oscillators' gains shared out of it; a noise hit's.
const VOICE_GAIN = 0.22;
const NOISE_GAIN = 0.12;
const NOISE_SEC = 2;
// setTargetAtTime gets about 95% of the way in three time constants.
const TIME_CONSTANTS = 3;
// A released note's oscillators stop once its tail has faded this many time constants.
const TAIL_CONSTANTS = 8;
// The noise hit's high-pass resonance.
const NOISE_Q = 2;
// How fast silence() fades out what is sounding (s).
const SILENCE_SEC = 0.03;

const hzOf = (midi) => 440 * 2 ** ((midi - 69) / 12);
const clampHz = (hz) => Math.min(HZ.max, Math.max(HZ.min, hz));

/**
 * How a note of a Patch is shaped.
 *
 * @typedef {Object} NoteShape
 * @property {number} cutoff  the filter's resting cutoff, in octaves above the note
 * @property {number} resonance  the filter's Q
 * @property {number} env  how many octaves above that the envelope throws the filter as the note starts
 * @property {number} decay  how long (s) the filter takes to fall back
 * @property {number} gate  how much of the note's length it is held (0 to 1)
 * @property {number} release  how long (s) it rings on once let go
 */

/**
 * Where a GlideVoice is: `midi`, `gain` (0 to 1 of a full note's level), `levels` (each wave's, 0 to 1), `cutoff`
 * (the filter's, in octaves above the note) and `pan` (-1 left to 1 right).
 *
 * @typedef {Object} VoiceSound
 * @property {number} midi
 * @property {number} gain
 * @property {number[]} levels
 * @property {number} cutoff
 * @property {number} pan
 */

/**
 * @param {BaseAudioContext} context
 * @param {AudioNode} destination where everything plays into
 */
export function createAnalogSynth(context, destination) {
  const noiseBuffer = new AudioBuffer({ length: Math.round(NOISE_SEC * context.sampleRate), sampleRate: context.sampleRate });
  const samples = noiseBuffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  // The notes and hits sounding or still to sound, until they end: each one's level and its sources. Held voices are
  // closed by whoever opened them.
  const sounding = new Set();

  function track(amp, sources) {
    const entry = { amp, sources };
    sounding.add(entry);
    sources[0].addEventListener('ended', () => sounding.delete(entry));
  }

  /**
   * Plays `midi` on `patch` at `velocity` (0-127) from `at` for `durationSec`.
   *
   * @param {import('../domain/patches.js').Patch} patch
   * @param {NoteShape} shape
   */
  function play(patch, midi, velocity, at, durationSec, shape) {
    const hz = hzOf(midi);
    const rest = clampHz(hz * 2 ** shape.cutoff);
    const filter = new BiquadFilterNode(context, { type: 'lowpass', Q: shape.resonance, frequency: rest });
    filter.frequency.setValueAtTime(rest, at);
    filter.frequency.linearRampToValueAtTime(clampHz(rest * 2 ** shape.env), at + ATTACK_SEC);
    filter.frequency.setTargetAtTime(rest, at + ATTACK_SEC, shape.decay / TIME_CONSTANTS);

    const amp = new GainNode(context, { gain: 0 });
    const peak = (VOICE_GAIN * patch.level * velocity) / 127;
    const off = at + Math.max(ATTACK_SEC, durationSec * shape.gate);
    amp.gain.setValueAtTime(0, at);
    amp.gain.linearRampToValueAtTime(peak, at + ATTACK_SEC);
    amp.gain.setValueAtTime(peak, off);
    amp.gain.setTargetAtTime(0, off, shape.release / TIME_CONSTANTS);
    filter.connect(amp).connect(destination);

    const end = off + (shape.release / TIME_CONSTANTS) * TAIL_CONSTANTS;
    const total = patch.waves.reduce((sum, wave) => sum + wave.gain, 0);
    const oscillators = patch.waves.map((wave) => {
      const osc = new OscillatorNode(context, { type: wave.type, frequency: hz * 2 ** wave.octave, detune: wave.detune });
      osc.connect(new GainNode(context, { gain: wave.gain / total })).connect(filter);
      osc.start(at);
      osc.stop(end);
      return osc;
    });
    track(amp, oscillators);
  }

  /** A burst of noise at `velocity` (0-127) from `at` fading over `durationSec`, through a high-pass sweeping from `fromHz` to `toHz`. */
  function noise(velocity, at, durationSec, fromHz, toHz) {
    const source = new AudioBufferSourceNode(context, { buffer: noiseBuffer, loop: true });
    const filter = new BiquadFilterNode(context, { type: 'highpass', frequency: fromHz, Q: NOISE_Q });
    filter.frequency.setValueAtTime(fromHz, at);
    filter.frequency.exponentialRampToValueAtTime(toHz, at + durationSec);
    const amp = new GainNode(context, { gain: 0 });
    const peak = (NOISE_GAIN * velocity) / 127;
    amp.gain.setValueAtTime(peak, at);
    amp.gain.setTargetAtTime(0, at, durationSec / TIME_CONSTANTS);
    source.connect(filter).connect(amp).connect(destination);
    source.start(at, Math.random() * NOISE_SEC);
    source.stop(at + durationSec);
    track(amp, [source]);
  }

  /**
   * Opens a voice of `lead` sounding `sound` from `at`.
   *
   * @param {import('../domain/patches.js').Lead} lead
   * @param {VoiceSound} sound
   */
  function voice(lead, sound, at) {
    return createGlideVoice(context, destination, lead, sound, at);
  }

  /** Fades out every note and hit sounding now, and drops those still to come. */
  function silence() {
    const now = context.currentTime;
    for (const { amp, sources } of sounding) {
      amp.gain.cancelScheduledValues(now);
      amp.gain.setTargetAtTime(0, now, SILENCE_SEC / TIME_CONSTANTS);
      // A source not yet started never starts.
      for (const source of sources) source.stop(now + SILENCE_SEC);
    }
    sounding.clear();
  }

  return { play, noise, voice, silence };
}

// A voice held open while its pitch, level, brightness and place glide: oscillators, each at its own level, through a
// low-pass filter, then its level and a head-related (HRTF) panner that sets it on an arc in front of the listener,
// with the time and colour differences between the ears that make a sound seem to move outside the head.
function createGlideVoice(context, destination, { waves, resonance, vibrato }, sound, at) {
  const filter = new BiquadFilterNode(context, { type: 'lowpass', Q: resonance });
  const amp = new GainNode(context, { gain: 0 });
  const panner = new PannerNode(context, { panningModel: 'HRTF', distanceModel: 'linear', rolloffFactor: 0 });
  filter.connect(amp).connect(panner).connect(destination);
  const levels = waves.map(() => new GainNode(context, { gain: 0 }));
  const oscillators = waves.map((wave, i) => {
    const osc = new OscillatorNode(context, { type: wave.type, detune: wave.detune });
    osc.connect(levels[i]).connect(filter);
    osc.start(at);
    return osc;
  });
  let lfo = null;
  if (vibrato) {
    lfo = new OscillatorNode(context, { frequency: vibrato.hz });
    const depth = new GainNode(context, { gain: vibrato.cents });
    lfo.connect(depth);
    for (const osc of oscillators) depth.connect(osc.detune);
    lfo.start(at);
  }

  /** From `at`, glides to `next` over about `glideSec` (at once when 0). */
  function move({ midi, gain, levels: waveLevels, cutoff, pan }, when, glideSec) {
    const set = (param, value) => {
      if (glideSec > 0) param.setTargetAtTime(value, when, glideSec / TIME_CONSTANTS);
      else param.setValueAtTime(value, when);
    };
    const hz = hzOf(midi);
    oscillators.forEach((osc, i) => set(osc.frequency, hz * 2 ** waves[i].octave));
    levels.forEach((level, i) => set(level.gain, waveLevels[i]));
    set(filter.frequency, clampHz(hz * 2 ** cutoff));
    set(amp.gain, VOICE_GAIN * gain);
    // -1 to 1 is hard left through straight ahead to hard right, on a circle a unit from the listener.
    const azimuth = (pan * Math.PI) / 2;
    set(panner.positionX, Math.sin(azimuth));
    set(panner.positionZ, -Math.cos(azimuth));
  }

  /** Fades the voice out from `when` over `releaseSec`, then stops it. */
  function close(when, releaseSec) {
    amp.gain.cancelScheduledValues(when);
    amp.gain.setTargetAtTime(0, when, releaseSec / TIME_CONSTANTS);
    const end = when + (releaseSec / TIME_CONSTANTS) * TAIL_CONSTANTS;
    for (const osc of oscillators) osc.stop(end);
    lfo?.stop(end);
  }

  move(sound, at, 0);
  return { move, close };
}
