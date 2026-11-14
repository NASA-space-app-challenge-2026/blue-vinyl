// The effects a composer turns on the whole mix (see domain/effects.js), as Web Audio nodes:
//   input -> output
//         \-> echo (feeding back on itself) -> output
//         \-> reverb -> output

import { Effect } from '../domain/effects.js';

// A change arrives this long after it is due, ramping in a straight line from the one before, so a knob turned every
// step sounds turned, not stepped. Straight ramps: exponential glides re-aimed every step on gains that feed back can
// run away.
const GLIDE_SEC = 0.03;
const MAX_ECHO_SEC = 2;
// The reverb: a room of decaying noise this long, falling by 60 dB over it.
const REVERB_SEC = 2.8;

/** @param {BaseAudioContext} context */
export function createMasterFx(context) {
  const input = new GainNode(context);
  const output = new GainNode(context);
  const echoSend = new GainNode(context, { gain: 0 });
  const echo = new DelayNode(context, { maxDelayTime: MAX_ECHO_SEC });
  const feedback = new GainNode(context);
  const reverbSend = new GainNode(context, { gain: 0 });
  const reverb = new ConvolverNode(context, { buffer: roomOf(context) });

  input.connect(output);
  input.connect(echoSend).connect(echo).connect(feedback).connect(echo);
  echo.connect(output);
  input.connect(reverbSend).connect(reverb).connect(output);

  // Each effect's AudioParam and the value it takes from the effect's.
  const params = new Map([
    [Effect.REVERB, [reverbSend.gain, (v) => v]],
    [Effect.ECHO, [echoSend.gain, (v) => v]],
    [Effect.ECHO_TIME, [echo.delayTime, (v) => Math.min(MAX_ECHO_SEC, v)]],
    [Effect.FEEDBACK, [feedback.gain, (v) => v]],
  ]);

  /** From `at`, glides `effect` (an Effect) to `value`. */
  function set(effect, value, at) {
    const [param, valueOf] = params.get(effect);
    param.linearRampToValueAtTime(valueOf(value), at + GLIDE_SEC);
  }

  /** Every effect back where it leaves the sound as it is, from `at`, dropping any change still to come. */
  function reset(at) {
    for (const [effect, [param]] of params) {
      param.cancelScheduledValues(at);
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
