// An analog-style synth in Web Audio, for the sounds a sound font cannot shape note by note.
//   - A note is its patch's oscillators through a resonant low-pass filter that an envelope throws open as the note
//     starts and lets fall back, held for part of its length and released over a tail.
//   - A noise hit is a burst of white noise through a sweeping high-pass that fades out: a tick of percussion.

const MIN_HZ = 20;
const MAX_HZ = 18000;
// How fast a note's level and filter open (s).
const ATTACK_SEC = 0.004;
// A note's peak level at full velocity, its oscillators' gains shared out of it; a noise hit's.
const VOICE_GAIN = 0.22;
const NOISE_GAIN = 0.12;
const NOISE_SEC = 2;
// setTargetAtTime reaches about 95% of the way in three time constants.
const TIME_CONSTANTS = 3;
// A released note's oscillators stop once its tail has faded this far.
const TAIL_CONSTANTS = 8;
// The noise hit's high-pass resonance.
const NOISE_Q = 2;

const hzOf = (midi) => 440 * 2 ** ((midi - 69) / 12);
const clampHz = (hz) => Math.min(MAX_HZ, Math.max(MIN_HZ, hz));

/**
 * @param {BaseAudioContext} context
 * @param {AudioNode} destination where the notes play into
 */
export function createAnalogSynth(context, destination) {
  const noiseBuffer = new AudioBuffer({ length: Math.round(NOISE_SEC * context.sampleRate), sampleRate: context.sampleRate });
  const samples = noiseBuffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;

  /**
   * Plays `midi` on `patch` (a Patch) at `velocity` (0-127) from `at` for `durationSec`, shaped by `shape`:
   *   cutoff: the filter's resting cutoff, in octaves above the note; resonance: the filter's Q;
   *   env: how many octaves above that the envelope throws the filter as the note starts;
   *   decay: how long (s) the filter takes to fall back; gate: how much of the note's length it is held (0 to 1);
   *   release: how long (s) it rings on once let go.
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
    for (const wave of patch.waves) {
      const osc = new OscillatorNode(context, { type: wave.type, frequency: hz * 2 ** wave.octave, detune: wave.detune });
      osc.connect(new GainNode(context, { gain: wave.gain / total })).connect(filter);
      osc.start(at);
      osc.stop(end);
    }
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
  }

  return { play, noise };
}
