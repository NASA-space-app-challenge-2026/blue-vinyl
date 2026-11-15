import { loadSamples, sampleKey } from './soundfont-bank.js';

// A small hall: a decaying noise impulse mixed in parallel.
const REVERB = Object.freeze({ seconds: 2.6, decaySec: 0.55, wet: 0.22 });
// Notes are scheduled this far ahead of the moment play() is called, so the first ones are not late.
const START_DELAY_SEC = 0.06;
const STOP_FADE_SEC = 0.08;
// A note held longer than its sample is built from overlapping copies of the sample's body.
const SUSTAIN = Object.freeze({ skipSec: 0.25, crossfadeSec: 0.6 });
// Catches the rare peak, such as a timpani stroke on a loud chord, before it clips.
const LIMITER = Object.freeze({ threshold: -3, knee: 0, ratio: 20, attack: 0.003, release: 0.25 });

/** Dry signal plus a reverb send, into `destination`. Returns the input node. */
export function createMixBus(context, destination) {
  const input = context.createGain();
  const dry = context.createGain();
  dry.gain.value = 1 - REVERB.wet;
  const wet = context.createGain();
  wet.gain.value = REVERB.wet;
  const reverb = context.createConvolver();
  const length = Math.round(REVERB.seconds * context.sampleRate);
  const impulse = context.createBuffer(2, length, context.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = impulse.getChannelData(c);
    let energy = 0;
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (REVERB.decaySec * context.sampleRate));
      energy += data[i] ** 2;
    }
    const scale = 1 / Math.sqrt(energy);
    for (let i = 0; i < length; i++) data[i] *= scale;
  }
  reverb.buffer = impulse;
  reverb.normalize = false;
  input.connect(dry).connect(destination);
  input.connect(reverb).connect(wet).connect(destination);
  return input;
}

// The stereo position `pan` (-1 left to 1 right) in front of `destination`, one node per position, kept per context.
const panners = new WeakMap();
function panned(context, destination, pan) {
  if (!pan) return destination;
  if (!panners.has(destination)) panners.set(destination, new Map());
  const byPan = panners.get(destination);
  if (!byPan.has(pan)) {
    const panner = context.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(destination);
    byPan.set(pan, panner);
  }
  return byPan.get(pan);
}

// A note placed in space (see NoteEvent.space) goes through an HRTF panner, as the bird album places its flock (see
// sound-engine.js): the listener faces north (-z), east is +x, and the note sits `gone` of the way from `near` to
// `far`, its level falling to near/far with the inverse model. One panner per place, rounded to these steps.
const SPACE = Object.freeze({ near: 1, far: 3, angleStepDeg: 5, goneStep: 0.05 });
const PANNER = Object.freeze({ panningModel: 'HRTF', distanceModel: 'inverse', refDistance: SPACE.near, rolloffFactor: 1 });
const placers = new WeakMap();
function placed(context, destination, { angle, gone }) {
  if (!placers.has(destination)) placers.set(destination, new Map());
  const byPlace = placers.get(destination);
  const a = Math.round((((angle * 180) / Math.PI) % 360) / SPACE.angleStepDeg) * SPACE.angleStepDeg;
  const g = Math.round(Math.max(0, Math.min(1, gone)) / SPACE.goneStep) * SPACE.goneStep;
  const key = `${a}:${g.toFixed(2)}`;
  if (!byPlace.has(key)) {
    const radius = SPACE.near + g * (SPACE.far - SPACE.near);
    const rad = (a * Math.PI) / 180;
    const panner = new PannerNode(context, { ...PANNER, positionX: radius * Math.sin(rad), positionY: 0, positionZ: -radius * Math.cos(rad) });
    panner.connect(destination);
    byPlace.set(key, panner);
  }
  return byPlace.get(key);
}

// One copy of a sample, faded in at `fadeIn` and out at `fadeOut` (context times), starting `offsetSec` into it.
function voice(context, destination, buffer, { at, offsetSec, gain, attackSec, fadeOutAt, releaseSec }) {
  const source = context.createBufferSource();
  source.buffer = buffer;
  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0, at);
  envelope.gain.linearRampToValueAtTime(gain, at + attackSec);
  envelope.gain.setValueAtTime(gain, Math.max(fadeOutAt, at + attackSec));
  envelope.gain.setTargetAtTime(0, Math.max(fadeOutAt, at + attackSec), releaseSec / 4);
  source.connect(envelope).connect(destination);
  source.start(at, offsetSec);
  source.stop(Math.max(fadeOutAt, at + attackSec) + releaseSec);
  return { source, envelope };
}

/**
 * Schedules the notes that sound from `fromSec` (score time) on, with score time `fromSec` at context time `startAt`.
 * A note already sounding at `fromSec` starts partway through.
 *
 * @param {BaseAudioContext} context
 * @param {AudioNode} destination
 * @param {import('../domain/ice-sea-score.js').NoteEvent[]} notes
 * @param {Map<string, AudioBuffer>} samples
 * @param {number} fromSec
 * @param {number} startAt
 */
export function scheduleNotes(context, destination, notes, samples, fromSec, startAt) {
  const voices = [];
  const toContext = (sec) => startAt + (sec - fromSec);
  for (const note of notes) {
    const end = note.timeSec + note.durationSec;
    if (end + note.releaseSec <= fromSec) continue;
    const buffer = samples.get(sampleKey(note.instrument, note.midi));
    if (!buffer) continue;
    const out = note.space ? placed(context, destination, note.space) : panned(context, destination, note.pan);
    if (note.durationSec <= buffer.duration - note.releaseSec) {
      const offsetSec = Math.max(0, fromSec - note.timeSec);
      if (offsetSec >= buffer.duration) continue;
      voices.push(voice(context, out, buffer, {
        at: toContext(note.timeSec + offsetSec),
        offsetSec,
        gain: note.gain,
        attackSec: offsetSec > 0 ? 0.02 : note.attackSec,
        fadeOutAt: toContext(end),
        releaseSec: note.releaseSec,
      }));
      continue;
    }
    // Held note: overlapping copies of the sample body, crossfaded.
    const body = buffer.duration - SUSTAIN.skipSec;
    const fade = Math.min(SUSTAIN.crossfadeSec, body / 3);
    const step = body - fade;
    for (let k = 0, start = note.timeSec; start < end; k++, start += step) {
      const first = k === 0;
      const stop = Math.min(start + body, end);
      if (stop + fade <= fromSec) continue;
      const skip = first ? 0 : SUSTAIN.skipSec;
      const offsetSec = Math.max(0, fromSec - start);
      voices.push(voice(context, out, buffer, {
        at: toContext(start + offsetSec),
        offsetSec: skip + offsetSec,
        gain: note.gain,
        attackSec: offsetSec > 0 ? 0.02 : first ? note.attackSec : fade,
        fadeOutAt: toContext(stop === end ? end : stop - fade),
        releaseSec: stop === end ? note.releaseSec : fade,
      }));
    }
  }
  return voices;
}

/**
 * Plays a score from any point, in step with the album clock. Samples load in the background; play() waits for them.
 */
export function createMusicPlayer() {
  const context = new AudioContext();
  const master = context.createGain();
  const limiter = context.createDynamicsCompressor();
  for (const [name, value] of Object.entries(LIMITER)) limiter[name].value = value;
  master.connect(limiter).connect(context.destination);
  const bus = createMixBus(context, master);

  let notes = [];
  let ready = Promise.resolve(new Map());
  let session = 0;
  let running = null;

  /** @param {import('../domain/ice-sea-score.js').NoteEvent[]} score notes in album time */
  function load(score) {
    stop();
    notes = score;
    ready = loadSamples(context, score);
    ready.catch((error) => console.warn('Music unavailable:', error));
    return ready;
  }

  /**
   * Starts playing once the samples are ready, from the album position `fromSec()` returns at that moment.
   *
   * @param {() => number} fromSec
   */
  async function play(fromSec) {
    stop();
    const id = ++session;
    let samples;
    try {
      samples = await ready;
    } catch {
      return;
    }
    if (id !== session || notes.length === 0) return;
    const from = fromSec();
    const startAt = context.currentTime + START_DELAY_SEC;
    running = { from, startAt, voices: scheduleNotes(context, bus, notes, samples, from, startAt) };
  }

  function stop() {
    session++;
    if (!running) return;
    const now = context.currentTime;
    for (const { source, envelope } of running.voices) {
      envelope.gain.cancelScheduledValues(now);
      envelope.gain.setTargetAtTime(0, now, STOP_FADE_SEC / 3);
      try {
        source.stop(now + STOP_FADE_SEC);
      } catch {
        // Already stopped.
      }
    }
    running = null;
  }

  /** Album position (s) of the sound, or null while nothing plays. */
  function positionSec() {
    if (!running) return null;
    return running.from + Math.max(0, context.currentTime - running.startAt);
  }

  /** @param {number} level 0..1 */
  function setVolume(level) {
    master.gain.setTargetAtTime(level ** 2, context.currentTime, 0.02);
  }

  /** Browsers start audio only after a user gesture; call this from one. */
  function unlock() {
    if (context.state !== 'running') context.resume();
    try {
      const buffer = context.createBuffer(1, 1, 22050);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.start(0);
    } catch {
      // AudioContext may not be ready
    }
  }

  return { load, play, stop, positionSec, setVolume, unlock };
}
