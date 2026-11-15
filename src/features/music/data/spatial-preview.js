// A short ambient preview of the spatial audio for the onboarding, sounding like space. A deep drone in open fifths and
// a faint high halo of stars hang still around the listener in a long reverb. Through them, sounds after the radio
// waves NASA's spacecraft hear in Earth's magnetosphere circle the head twice, drifting nearer and further: the
// "chorus", quick rising chirps like birdsong at dawn; the "whistler", a long falling tone set off by lightning; and a
// hiss of solar wind. They are placed by the same head-related (HRTF) panning the music uses, so earphones bring out
// where they are.
//
// The circling sounds start ahead of the listener and turn clockwise, to the right first, as a dot drawn circling a
// head seen from above does. It has its own audio context, closed when it ends, so it never touches the music's mix.

// One turn round the head, and how many turns the preview takes.
const TURN_SEC = 6;
const TURNS = 2;
// How long it swells in and fades out, and how fast Stop fades it.
const FADE_IN_SEC = 2;
const FADE_OUT_SEC = 2.6;
const STOP_FADE_SEC = 0.35;
// The overall level.
const LEVEL = 0.8;

// The drone: D in open fifths and octaves (MIDI numbers), each note two voices beating slowly against each other,
// under a dark low-pass filter that opens and closes slowly.
const DRONE_NOTES = Object.freeze([38, 45, 50, 57]);
const DRONE_BEAT_HZ = 0.35;
const DRONE_LEVEL = 0.02;
const DRONE_CUTOFF_HZ = 520;
// The halo: a high, faint ninth and fifth that swell in and out, like light from far away.
const HALO_NOTES = Object.freeze([76, 81, 88]);
const HALO_LEVEL = 0.008;

// The chorus: rising chirps, one every CHIRP_SEC or so, each from a low to a high pitch over CHIRP_LENGTH_SEC.
const CHIRP_SEC = 0.42;
const CHIRP_FROM_HZ = Object.freeze([700, 1300]);
const CHIRP_RISE = Object.freeze([1.8, 2.8]);
const CHIRP_LENGTH_SEC = Object.freeze([0.12, 0.3]);
const CHIRP_LEVEL = 0.17;
// The whistlers: long falling tones, at these times into the preview.
const WHISTLER_AT_SEC = Object.freeze([1.4, 5.2, 8.6]);
const WHISTLER_FROM_HZ = 5200;
const WHISTLER_TO_HZ = 420;
const WHISTLER_SEC = 1.6;
const WHISTLER_LEVEL = 0.16;
// The solar wind: band-passed noise, swelling and ebbing.
const WIND_HZ = 1100;
const WIND_LEVEL = 0.45;

// The circle's radius in panner units, breathing between near and far twice a turn, and how often its position is set.
const RADIUS = 1.8;
const RADIUS_SWING = 0.7;
const PATH_STEP_SEC = 1 / 30;

// The reverb: a long decaying stereo noise tail, and how much of each part is sent to it.
const REVERB_SEC = 5.5;
const BED_WET = 0.9;
const MOVER_WET = 0.45;

/**
 * @returns {{ turnSec: number, play: () => Promise<void>, stop: () => void }}
 *   play: starts the preview, resolving when it ends or is stopped; stop: fades it out quickly and silences it
 */
export function createSpatialPreview() {
  let playing = null;
  // While it plays: its context, its master gain, and what ends its wait when it is stopped early.
  let active = null;
  let master = null;
  let end = null;

  function play() {
    if (playing) return playing;
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return Promise.resolve();
    const context = new AudioContextClass();
    active = context;
    const durationSec = TURN_SEC * TURNS;
    playing = context
      .resume()
      .then(() => {
        const start = context.currentTime + 0.05;
        const stopAt = start + durationSec + 0.1;

        master = new GainNode(context, { gain: 0 });
        master.connect(context.destination);
        master.gain.setValueAtTime(0, start);
        master.gain.linearRampToValueAtTime(LEVEL, start + FADE_IN_SEC);
        master.gain.setValueAtTime(LEVEL, start + durationSec - FADE_OUT_SEC);
        master.gain.linearRampToValueAtTime(0, start + durationSec);

        const reverb = new ConvolverNode(context, { buffer: impulse(context, REVERB_SEC) });
        reverb.connect(master);

        const bed = sendTo(context, master, reverb, BED_WET);
        drone(context, bed, start, stopAt);
        halo(context, bed, start, stopAt);

        const panner = new PannerNode(context, {
          panningModel: 'HRTF',
          distanceModel: 'inverse',
          refDistance: 1,
          rolloffFactor: 0.8,
          positionZ: -RADIUS,
        });
        panner.connect(sendTo(context, master, reverb, MOVER_WET));
        for (let t = 0; t <= durationSec; t += PATH_STEP_SEC) {
          const angle = (2 * Math.PI * t) / TURN_SEC;
          const radius = RADIUS + RADIUS_SWING * Math.sin(2 * angle);
          panner.positionX.setValueAtTime(radius * Math.sin(angle), start + t);
          panner.positionZ.setValueAtTime(-radius * Math.cos(angle), start + t);
        }
        wind(context, panner, start, stopAt);
        for (let t = 0.6; t < durationSec - FADE_OUT_SEC; t += CHIRP_SEC * between([0.6, 1.4])) {
          chirp(context, panner, start + t);
        }
        for (const at of WHISTLER_AT_SEC) whistler(context, panner, start + at);

        return new Promise((resolve) => {
          end = resolve;
          setTimeout(resolve, (durationSec + 0.3) * 1000);
        });
      })
      .catch((error) => console.error('spatial preview failed', error))
      .finally(() => {
        stop();
        playing = null;
      });
    return playing;
  }

  function stop() {
    const context = active;
    if (context && context.state !== 'closed') {
      // A quick fade, not a cut, so it does not click; the context closes once it is silent.
      const now = context.currentTime;
      master?.gain.cancelScheduledValues(now);
      master?.gain.setValueAtTime(master.gain.value, now);
      master?.gain.linearRampToValueAtTime(0, now + STOP_FADE_SEC);
      setTimeout(() => context.close().catch(() => {}), (STOP_FADE_SEC + 0.05) * 1000);
    }
    active = null;
    master = null;
    end?.();
    end = null;
  }

  return { turnSec: TURN_SEC, play, stop };
}

// A node that passes what it gets to `dry` as it is and to `reverb` at `wet`.
function sendTo(context, dry, reverb, wet) {
  const input = new GainNode(context);
  input.connect(dry);
  input.connect(new GainNode(context, { gain: wet })).connect(reverb);
  return input;
}

// The drone: pairs of sines and triangles a fraction of a hertz apart, so they beat slowly, under a dark filter.
function drone(context, destination, start, stopAt) {
  const filter = new BiquadFilterNode(context, { type: 'lowpass', frequency: DRONE_CUTOFF_HZ, Q: 2 });
  filter.connect(destination);
  const sweep = new OscillatorNode(context, { frequency: 0.06 });
  sweep.connect(new GainNode(context, { gain: DRONE_CUTOFF_HZ * 0.5 })).connect(filter.frequency);
  sweep.start(start);
  sweep.stop(stopAt);
  for (const midi of DRONE_NOTES) {
    for (const [type, offset] of [['sine', 0], ['triangle', DRONE_BEAT_HZ]]) {
      const osc = new OscillatorNode(context, { type, frequency: hz(midi) + offset });
      osc.connect(new GainNode(context, { gain: DRONE_LEVEL })).connect(filter);
      osc.start(start);
      osc.stop(stopAt);
    }
  }
}

// The halo: high sines, each swelling in and out at its own slow rate.
function halo(context, destination, start, stopAt) {
  HALO_NOTES.forEach((midi, i) => {
    const amp = new GainNode(context, { gain: HALO_LEVEL });
    amp.connect(destination);
    const swell = new OscillatorNode(context, { frequency: 0.11 + i * 0.07 });
    swell.connect(new GainNode(context, { gain: HALO_LEVEL })).connect(amp.gain);
    const osc = new OscillatorNode(context, { type: 'sine', frequency: hz(midi) });
    osc.connect(amp);
    for (const node of [swell, osc]) {
      node.start(start);
      node.stop(stopAt);
    }
  });
}

// The solar wind: band-passed noise that swells and ebbs, its band drifting.
function wind(context, destination, start, stopAt) {
  const noise = new AudioBufferSourceNode(context, { buffer: noiseBuffer(context, 2), loop: true });
  const band = new BiquadFilterNode(context, { type: 'bandpass', frequency: WIND_HZ, Q: 1.2 });
  const drift = new OscillatorNode(context, { frequency: 0.13 });
  drift.connect(new GainNode(context, { gain: WIND_HZ * 0.4 })).connect(band.frequency);
  const amp = new GainNode(context, { gain: WIND_LEVEL * 0.6 });
  const swell = new OscillatorNode(context, { frequency: 0.2 });
  swell.connect(new GainNode(context, { gain: WIND_LEVEL * 0.4 })).connect(amp.gain);
  noise.connect(band).connect(amp).connect(destination);
  for (const node of [noise, drift, swell]) {
    node.start(start);
    node.stop(stopAt);
  }
}

// One chorus chirp: a sine rising quickly, swelling and gone.
function chirp(context, destination, at) {
  const from = between(CHIRP_FROM_HZ);
  const length = between(CHIRP_LENGTH_SEC);
  const osc = new OscillatorNode(context, { type: 'sine', frequency: from });
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(from * between(CHIRP_RISE), at + length);
  const amp = new GainNode(context, { gain: 0 });
  const level = CHIRP_LEVEL * between([0.5, 1]);
  amp.gain.setValueAtTime(0, at);
  amp.gain.linearRampToValueAtTime(level, at + length * 0.4);
  amp.gain.linearRampToValueAtTime(0, at + length);
  osc.connect(amp).connect(destination);
  osc.start(at);
  osc.stop(at + length + 0.02);
}

// One whistler: a sine falling from high to low, fast at first and slowing, fading as it falls.
function whistler(context, destination, at) {
  const osc = new OscillatorNode(context, { type: 'sine', frequency: WHISTLER_FROM_HZ });
  osc.frequency.setValueAtTime(WHISTLER_FROM_HZ, at);
  osc.frequency.setTargetAtTime(WHISTLER_TO_HZ, at, WHISTLER_SEC / 4);
  const amp = new GainNode(context, { gain: 0 });
  amp.gain.setValueAtTime(0, at);
  amp.gain.linearRampToValueAtTime(WHISTLER_LEVEL, at + 0.05);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + WHISTLER_SEC);
  osc.connect(amp).connect(destination);
  osc.start(at);
  osc.stop(at + WHISTLER_SEC + 0.05);
}

// A stereo reverb tail: noise in each channel, decaying over `seconds`.
function impulse(context, seconds) {
  const length = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  }
  return buffer;
}

function noiseBuffer(context, seconds) {
  const length = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// A random number between the two ends of a range.
function between([low, high]) {
  return low + Math.random() * (high - low);
}

function hz(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}
