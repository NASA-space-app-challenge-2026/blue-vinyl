// A short ambient preview of the spatial audio for the onboarding. A soft, still pad fills the room around the
// listener, and through it a breath of air with a glassy shimmer and sparse chimes circles the head twice, drifting
// nearer and further, placed by the same head-related (HRTF) panning the music uses, so earphones bring out where it is.
// A long generated reverb gives the whole of it a space to sound in.
//
// The circling sound starts ahead of the listener and turns clockwise, to the right first, as a dot drawn circling a
// head seen from above does. It has its own audio context, closed when it ends, so it never touches the music's mix.

// One turn round the head, and how many turns the preview takes.
const TURN_SEC = 6;
const TURNS = 2;
// How long it swells in and fades out, and how fast Stop fades it.
const FADE_IN_SEC = 1.6;
const FADE_OUT_SEC = 2.4;
const STOP_FADE_SEC = 0.35;
// The overall level.
const LEVEL = 0.8;

// The pad: an A major add9 voicing (MIDI numbers), each note two slightly detuned voices, under a low-pass filter.
const PAD_NOTES = Object.freeze([45, 52, 59, 61, 64, 68]);
const PAD_DETUNE_CENTS = 7;
const PAD_LEVEL = 0.028;
const PAD_CUTOFF_HZ = 1100;

// The circling sound: band-passed noise (air), a high glassy fifth, and a chime every so often from a pentatonic.
const AIR_HZ = 1600;
const AIR_LEVEL = 0.4;
const SHIMMER_NOTES = Object.freeze([76, 83]);
const SHIMMER_LEVEL = 0.03;
const CHIME_SEC = 0.75;
const CHIME_NOTES = Object.freeze([81, 88, 85, 92, 83, 88, 90, 85]);
const CHIME_LEVEL = 0.1;
const CHIME_DECAY_SEC = 2.2;

// The circle's radius in panner units, breathing between near and far twice a turn, and how often its position is set.
const RADIUS = 1.8;
const RADIUS_SWING = 0.7;
const PATH_STEP_SEC = 1 / 30;

// The reverb: a decaying stereo noise tail, and how much of each part is sent to it.
const REVERB_SEC = 3.5;
const PAD_WET = 0.8;
const MOVER_WET = 0.3;

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

        pad(context, sendTo(context, master, reverb, PAD_WET), start, stopAt);

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
        air(context, panner, start, stopAt);
        shimmer(context, panner, start, stopAt);
        const chimes = Math.floor((durationSec - FADE_OUT_SEC) / CHIME_SEC);
        for (let i = 0; i < chimes; i++) {
          chime(context, panner, CHIME_NOTES[i % CHIME_NOTES.length], start + 0.4 + i * CHIME_SEC);
        }

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

// The still pad: detuned triangles under a low-pass filter whose cutoff drifts slowly.
function pad(context, destination, start, stopAt) {
  const filter = new BiquadFilterNode(context, { type: 'lowpass', frequency: PAD_CUTOFF_HZ, Q: 0.5 });
  filter.connect(destination);
  const drift = new OscillatorNode(context, { frequency: 0.08 });
  drift.connect(new GainNode(context, { gain: PAD_CUTOFF_HZ * 0.35 })).connect(filter.frequency);
  drift.start(start);
  drift.stop(stopAt);
  for (const midi of PAD_NOTES) {
    for (const detune of [-PAD_DETUNE_CENTS, PAD_DETUNE_CENTS]) {
      const osc = new OscillatorNode(context, { type: 'triangle', frequency: hz(midi), detune });
      osc.connect(new GainNode(context, { gain: PAD_LEVEL })).connect(filter);
      osc.start(start);
      osc.stop(stopAt);
    }
  }
}

// A breath of air: band-passed noise that swells and ebbs.
function air(context, destination, start, stopAt) {
  const noise = new AudioBufferSourceNode(context, { buffer: noiseBuffer(context, 2), loop: true });
  const band = new BiquadFilterNode(context, { type: 'bandpass', frequency: AIR_HZ, Q: 0.9 });
  const amp = new GainNode(context, { gain: AIR_LEVEL * 0.6 });
  const swell = new OscillatorNode(context, { frequency: 0.25 });
  swell.connect(new GainNode(context, { gain: AIR_LEVEL * 0.4 })).connect(amp.gain);
  noise.connect(band).connect(amp).connect(destination);
  for (const node of [noise, swell]) {
    node.start(start);
    node.stop(stopAt);
  }
}

// A glassy fifth high up, trembling slowly.
function shimmer(context, destination, start, stopAt) {
  const amp = new GainNode(context, { gain: SHIMMER_LEVEL });
  amp.connect(destination);
  const tremolo = new OscillatorNode(context, { frequency: 3.2 });
  tremolo.connect(new GainNode(context, { gain: SHIMMER_LEVEL * 0.6 })).connect(amp.gain);
  tremolo.start(start);
  tremolo.stop(stopAt);
  for (const midi of SHIMMER_NOTES) {
    const osc = new OscillatorNode(context, { type: 'sine', frequency: hz(midi) });
    osc.connect(amp);
    osc.start(start);
    osc.stop(stopAt);
  }
}

// A soft chime: a sine with a faint inharmonic partial, struck gently and ringing out.
function chime(context, destination, midi, at) {
  const amp = new GainNode(context, { gain: 0 });
  amp.connect(destination);
  amp.gain.setValueAtTime(0, at);
  amp.gain.linearRampToValueAtTime(CHIME_LEVEL, at + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + CHIME_DECAY_SEC);
  for (const [ratio, level] of [[1, 1], [2.76, 0.12]]) {
    const osc = new OscillatorNode(context, { type: 'sine', frequency: hz(midi) * ratio });
    osc.connect(new GainNode(context, { gain: level })).connect(amp);
    osc.start(at);
    osc.stop(at + CHIME_DECAY_SEC + 0.05);
  }
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

function hz(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}
