// The effects a composer turns on the whole mix (see domain/effects.js), as Web Audio nodes:
//   input -> low-pass -> clean and overdriven blend -> output
//                               \-> echo (feeding back on itself) -> output
//                               \-> reverb -> output
// The echo and the reverb tap the mix after the low-pass, so a muffled mix rings on muffled.

import { Effect } from '../domain/effects.js';

// A change arrives this long after it is due, ramping in a straight line from the one before, so a knob turned every
// step sounds turned, not stepped. Straight ramps: exponential glides re-aimed every step on gains that feed back can
// run away.
const GLIDE_SEC = 0.03;
const MAX_ECHO_SEC = 2;
// The reverb: a room of decaying noise this long, falling by 60 dB over it.
const REVERB_SEC = 2.8;
// The low-pass rolls off gently, without a resonant peak at its cutoff.
const LOWPASS_Q = 0.7;
// The overdrive (from nell-v2): the mix is pushed up to MAX_PUSH times harder into a tanh clipper at full drive, and
// the clipped sound brought back down by MAKEUP. The clipper's curve is tanh(SHAPE·x) over the input's -1..1.
const MAX_PUSH = 8;
const MAKEUP = 0.3;
const SHAPE = 3;
const CURVE_POINTS = 1024;

/** @param {BaseAudioContext} context */
export function createMasterFx(context) {
  const input = new GainNode(context);
  const output = new GainNode(context);
  const lowpass = new BiquadFilterNode(context, { type: 'lowpass', frequency: Effect.LOWPASS.neutral, Q: LOWPASS_Q });
  const clean = new GainNode(context);
  const push = new GainNode(context);
  const clipper = new WaveShaperNode(context, { curve: tanhCurve(), oversample: '2x' });
  const driven = new GainNode(context, { gain: 0 });
  const echoSend = new GainNode(context, { gain: 0 });
  const echo = new DelayNode(context, { maxDelayTime: MAX_ECHO_SEC });
  const feedback = new GainNode(context);
  const reverbSend = new GainNode(context, { gain: 0 });
  const reverb = new ConvolverNode(context, { buffer: roomOf(context) });

  input.connect(lowpass);
  lowpass.connect(clean).connect(output);
  lowpass.connect(push).connect(clipper).connect(driven).connect(output);
  for (const tap of [clean, driven]) {
    tap.connect(echoSend);
    tap.connect(reverbSend);
  }
  echoSend.connect(echo).connect(feedback).connect(echo);
  echo.connect(output);
  reverbSend.connect(reverb).connect(output);

  // Each effect's AudioParams and the value each takes from the effect's.
  const params = new Map([
    [Effect.REVERB, [[reverbSend.gain, (v) => v]]],
    [Effect.ECHO, [[echoSend.gain, (v) => v]]],
    [Effect.ECHO_TIME, [[echo.delayTime, (v) => Math.min(MAX_ECHO_SEC, v)]]],
    [Effect.FEEDBACK, [[feedback.gain, (v) => v]]],
    [Effect.LOWPASS, [[lowpass.frequency, (v) => v]]],
    [
      Effect.DRIVE,
      [
        [clean.gain, (v) => 1 - v],
        [push.gain, (v) => 1 + (MAX_PUSH - 1) * v],
        [driven.gain, (v) => MAKEUP * v],
      ],
    ],
  ]);

  /** From `at`, glides `effect` (an Effect) to `value`. */
  function set(effect, value, at) {
    for (const [param, valueOf] of params.get(effect)) param.linearRampToValueAtTime(valueOf(value), at + GLIDE_SEC);
  }

  /** Every effect back where it leaves the sound as it is, from `at`, dropping any change still to come. */
  function reset(at) {
    for (const [effect, effectParams] of params) {
      for (const [param] of effectParams) param.cancelScheduledValues(at);
      set(effect, effect.neutral, at);
    }
  }

  reset(context.currentTime);
  return { input, output, set, reset };
}

// Two channels of white noise decaying exponentially, a little differently on each side, as an impulse response.
function roomOf(context) {
  const length = Math.round(REVERB_SEC * context.sampleRate);
  const room = new AudioBuffer({ numberOfChannels: 2, length, sampleRate: context.sampleRate });
  for (let channel = 0; channel < 2; channel++) {
    const data = room.getChannelData(channel);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * 10 ** ((-3 * i) / length);
  }
  return room;
}

function tanhCurve() {
  const curve = new Float32Array(CURVE_POINTS);
  for (let i = 0; i < CURVE_POINTS; i++) {
    curve[i] = Math.tanh(SHAPE * ((2 * i) / (CURVE_POINTS - 1) - 1)) / Math.tanh(SHAPE);
  }
  return curve;
}
