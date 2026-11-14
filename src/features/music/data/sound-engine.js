// Plays a song on a SoundFont synthesizer, in time with the app's playback clock.
//
// The app owns the clock: while a track plays it calls follow() every frame with how far into the track it is. The
// engine lines the audio clock up with it, then steps the song's composer a little ahead on the audio clock, each step
// told the time in the song it sounds at. When the app's clock jumps (a seek or another track), the music starts over
// from there. Each song names its composer; when the composer changes, its instruments take over the MIDI channels.
//
// Space: the composer may place the whole mix (the flock's bearing and distance, for the birds); otherwise it sits
// straight ahead.

import { CC, SOUND_FONT } from '../domain/instruments.js';

const SYNTH_LIB_URL = 'https://cdn.jsdelivr.net/npm/spessasynth_lib@4.3.14/+esm';
const SYNTH_PROCESSOR_URL = 'https://cdn.jsdelivr.net/npm/spessasynth_lib@4.3.14/dist/spessasynth_processor.min.js';
const SOUND_FONT_URL = new URL(`./soundfonts/${SOUND_FONT}`, import.meta.url);

// How far ahead of the audio clock steps are scheduled.
const LOOKAHEAD_SEC = 0.15;
// A gap this large between the app's clock and the audio clock means the app jumped: start over.
const RESYNC_SEC = 0.15;
// Notes stop this much before their full length, so repeated notes re-strike cleanly.
const NOTE_GAP_SEC = 0.02;
// The sound font plays quietly; this brings the mix up to a normal level.
const MIX_GAIN = 3;
// Volume changes ease in with this time constant, so dragging the slider does not click.
const VOLUME_RAMP_SEC = 0.02;
// The analyser the visuals read; it sits before the volume, so they show the music even when it is turned down.
const ANALYSER = Object.freeze({ fftSize: 4096, smoothingTimeConstant: 0.8, minDecibels: -90, maxDecibels: -40 });
// The mix is placed by an HRTF panner, in panner units; with the inverse model the level falls with the distance
// beyond `near`. It glides with this time constant. A composer that does not place it leaves it at `ahead`.
const SPACE = Object.freeze({ near: 1, glideSec: 0.5, ahead: { x: 0, z: -1 } });
const PANNER = Object.freeze({ panningModel: 'HRTF', distanceModel: 'inverse', refDistance: SPACE.near, rolloffFactor: 1 });
// MIDI channels the composer's instruments take, in order; 9 is skipped as General MIDI keeps it for drums.
const MIDI_CHANNELS = Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15]);

/**
 * What a song's composer does (see domain/composers/).
 *
 * @typedef {Object} Composer
 * @property {Object[]} instruments  every Instrument it plays
 * @property {number} stepSec
 * @property {number} stepsPerBar
 * @property {(song: Object) => void} setSong
 * @property {() => void} reset  back to the opening state, as the music starts
 * @property {(songSec: number) => ({ x: number, z: number } | null)} spaceAt  where the mix sits, or null to keep it
 * @property {(music: Object, now: { songSec: number, step: number, bar: number, at: number }) => void} playStep
 */

/**
 * @typedef {Object} Song
 * @property {Composer} composer
 * @property {Object} lead  the Instrument that plays the melody
 */

export function createSoundEngine() {
  let context = null;
  let output = null;
  let panner = null;
  let analyser = null;
  let synth = null;
  let loading = null;
  let volume = 1;
  /** @type {Map<Object, number>} */
  let channels = new Map();
  // The composer whose instruments hold the channels, and the song it is fitted to.
  /** @type {Composer | null} */
  let composer = null;
  let song = null;
  // Where the audio clock and the track's clock last lined up, the next step's audio time, and its place in the bar.
  let anchor = null;
  let nextStepAt = 0;
  let step = 0;
  let bar = 0;

  /** Call from a user gesture: the browser only lets audio start from one. Resolves once the sound font is in. */
  function unlock() {
    context ??= new AudioContext();
    if (!output) {
      output = new GainNode(context, { gain: level() });
      output.connect(context.destination);
      panner = new PannerNode(context, PANNER);
      panner.connect(output);
      analyser = new AnalyserNode(context, ANALYSER);
      analyser.connect(panner);
    }
    loading ??= load();
    return Promise.all([loading, context.resume()]);
  }

  async function load() {
    const [{ WorkletSynthesizer }, font] = await Promise.all([import(SYNTH_LIB_URL), fetchSoundFont()]);
    await context.audioWorklet.addModule(SYNTH_PROCESSOR_URL);
    const instance = new WorkletSynthesizer(context);
    instance.connect(analyser);
    await instance.soundBankManager.addSoundBank(font, SOUND_FONT);
    await instance.isReady;
    synth = instance;
  }

  // Gives the composer's instruments the channels, once it is not already theirs.
  function takeChannels(next) {
    if (composer === next) return;
    composer = next;
    synth.stopAll();
    channels = new Map(next.instruments.map((inst, i) => [inst, MIDI_CHANNELS[i]]));
    for (const [inst, channel] of channels) {
      synth.controllerChange(channel, CC.RESET_ALL, 0);
      synth.programChange(channel, inst.program);
      synth.controllerChange(channel, CC.VOLUME, inst.volume);
    }
  }

  async function fetchSoundFont() {
    const res = await fetch(SOUND_FONT_URL);
    if (!res.ok) throw new Error(`${SOUND_FONT_URL}: HTTP ${res.status}`);
    return res.arrayBuffer();
  }

  // Squared, so the slider feels even to the ear.
  function level() {
    return MIX_GAIN * volume ** 2;
  }

  /** @param {number} value 0 (silent) to 1 (full) */
  function setVolume(value) {
    volume = value;
    output?.gain.setTargetAtTime(level(), context.currentTime, VOLUME_RAMP_SEC);
  }

  /** @param {Song} next */
  function setSong(next) {
    if (song === next) return;
    takeChannels(next.composer);
    song = next;
    anchor = null;
    composer.setSong(next);
    place(SPACE.ahead, context.currentTime);
  }

  /**
   * Schedules what plays next. Call every frame while a track plays.
   *
   * @param {Song} next
   * @param {number} elapsedSec how far into the track the app's clock is
   */
  function follow(next, elapsedSec) {
    if (!synth) return;
    setSong(next);
    const now = context.currentTime;
    const expected = anchor ? anchor.elapsedSec + (now - anchor.audioSec) : null;
    if (expected === null || Math.abs(expected - elapsedSec) > RESYNC_SEC) {
      synth.stopAll();
      anchor = { audioSec: now, elapsedSec };
      // Steps keep to the song's grid, so a step sounds when the visuals reach it, whatever the jump landed on.
      const index = Math.ceil(elapsedSec / composer.stepSec - 1e-6);
      nextStepAt = now + index * composer.stepSec - elapsedSec;
      step = index % composer.stepsPerBar;
      bar = Math.floor(index / composer.stepsPerBar);
      composer.reset();
    }
    while (nextStepAt < now + LOOKAHEAD_SEC) {
      const songSec = anchor.elapsedSec + (nextStepAt - anchor.audioSec);
      if (step === 0) {
        const where = composer.spaceAt(songSec);
        if (where) place(where, nextStepAt);
      }
      composer.playStep(music, { songSec, step, bar, at: nextStepAt });
      nextStepAt += composer.stepSec;
      step = (step + 1) % composer.stepsPerBar;
      if (step === 0) bar++;
    }
  }

  // Moves the mix to { x, z } (the listener faces -z; +x is to the right).
  function place({ x, z }, at) {
    panner.positionX.setTargetAtTime(x, at, SPACE.glideSec);
    panner.positionZ.setTargetAtTime(z, at, SPACE.glideSec);
  }

  /** @type {import('../domain/composers/flock.js').Music} */
  const music = {
    note(instrument, midi, velocity, at, steps) {
      const channel = channelOf(instrument);
      synth.noteOn(channel, midi, Math.round(velocity), { time: at });
      synth.noteOff(channel, midi, { time: at + steps * composer.stepSec - NOTE_GAP_SEC });
    },
    control(instrument, cc, value, at) {
      synth.controllerChange(channelOf(instrument), cc, value, { time: at });
    },
  };

  function channelOf(instrument) {
    const channel = channels.get(instrument);
    if (channel === undefined) throw new Error(`instrument ${instrument.program} is not among the composer's`);
    return channel;
  }

  /** Silences everything; the next follow() starts over. */
  function stop() {
    anchor = null;
    synth?.stopAll();
  }

  return {
    unlock,
    setVolume,
    follow,
    stop,
    /** The music's AnalyserNode, or null before audio is unlocked. */
    get analyser() {
      return synth ? analyser : null;
    },
  };
}
