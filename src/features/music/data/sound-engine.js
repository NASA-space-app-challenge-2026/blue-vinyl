// Plays a composer's steps on a SoundFont synthesizer, in time with the app's playback clock.
//
// The app owns the clock: while a track plays it calls follow() every frame with the track and how far into it the
// clock is. The engine lines the audio clock up with it once, then schedules the composer's steps a little ahead on
// the audio clock, so notes keep exact time between frames. When the app's clock jumps (a seek or another track),
// the engine lines up again.

import { CC, SOUND_FONT } from '../domain/instruments.js';

const SYNTH_LIB_URL = 'https://cdn.jsdelivr.net/npm/spessasynth_lib@4.3.14/+esm';
const SYNTH_PROCESSOR_URL = 'https://cdn.jsdelivr.net/npm/spessasynth_lib@4.3.14/dist/spessasynth_processor.min.js';
const SOUND_FONT_URL = new URL(`./soundfonts/${SOUND_FONT}`, import.meta.url);

// How far ahead of the audio clock steps are scheduled.
const LOOKAHEAD_SEC = 0.2;
// A gap this large between the app's clock and the audio clock means the app jumped: line up again.
const RESYNC_SEC = 0.15;
// Notes stop this much before their full length, so repeated notes re-strike cleanly.
const NOTE_GAP_SEC = 0.02;
// The sound font plays quietly (peaks near 0.1 at full volume); this brings the mix up to a normal level.
const MIX_GAIN = 3;
// Volume changes ease in with this time constant, so dragging the slider does not click.
const VOLUME_RAMP_SEC = 0.02;
// MIDI channels the composer's instruments take, in order; 9 is skipped as General MIDI keeps it for drums.
const MIDI_CHANNELS = Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15]);

/**
 * @typedef {Object} Composer
 * @property {readonly Object[]} instruments  the Instruments it plays
 * @property {(year: Object[], lead: Object, day: number) => void} setTrack
 * @property {(day: number) => import('../domain/composers/migration.js').StepEvents} step
 *
 * @typedef {Object} PlayingTrack
 * @property {Object[]} year  the track's days, one step each
 * @property {Object} lead    the Instrument that carries the track
 */

/**
 * @param {{ composer: Composer, stepSec: number, onPulse?: (strength: number) => void }} options
 *   `onPulse` is called when a step the composer marks sounds, for the visuals.
 */
export function createSoundEngine({ composer, stepSec, onPulse }) {
  let context = null;
  let output = null;
  let synth = null;
  let loading = null;
  let volume = 1;
  /** @type {Map<Object, number>} */
  let channels = new Map();
  // Where the audio clock and the track's clock last lined up, and the next step to schedule.
  let anchor = null;
  let nextStep = 0;

  /** Call from a user gesture: the browser only lets audio start from one. Resolves once the sound font is in. */
  function unlock() {
    context ??= new AudioContext();
    if (!output) {
      output = new GainNode(context, { gain: level() });
      output.connect(context.destination);
    }
    loading ??= load();
    return Promise.all([loading, context.resume()]);
  }

  async function load() {
    const [{ WorkletSynthesizer }, font] = await Promise.all([import(SYNTH_LIB_URL), fetchSoundFont()]);
    await context.audioWorklet.addModule(SYNTH_PROCESSOR_URL);
    const instance = new WorkletSynthesizer(context);
    instance.connect(output);
    await instance.soundBankManager.addSoundBank(font, SOUND_FONT);
    await instance.isReady;
    channels = new Map(composer.instruments.map((inst, i) => [inst, MIDI_CHANNELS[i]]));
    for (const [inst, channel] of channels) {
      instance.controllerChange(channel, CC.RESET_ALL, 0);
      instance.programChange(channel, inst.program);
      instance.controllerChange(channel, CC.VOLUME, inst.volume);
    }
    synth = instance;
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

  /**
   * Schedules what plays next. Call every frame while a track plays.
   *
   * @param {PlayingTrack} track
   * @param {number} elapsedSec how far into the track the app's clock is
   */
  function follow(track, elapsedSec) {
    if (!synth) return;
    const now = context.currentTime;
    const expected = anchor?.track === track ? anchor.elapsedSec + (now - anchor.audioSec) : null;
    if (expected === null || Math.abs(expected - elapsedSec) > RESYNC_SEC) {
      synth.stopAll();
      anchor = { track, audioSec: now, elapsedSec };
      nextStep = Math.ceil(elapsedSec / stepSec);
      composer.setTrack(track.year, track.lead, nextStep);
    }
    while (nextStep < track.year.length) {
      const at = anchor.audioSec + nextStep * stepSec - anchor.elapsedSec;
      if (at >= now + LOOKAHEAD_SEC) break;
      play(composer.step(nextStep), Math.max(at, now));
      nextStep++;
    }
  }

  function play({ notes, controls, pulse }, at) {
    for (const { instrument, cc, value } of controls) synth.controllerChange(channelOf(instrument), cc, value, { time: at });
    for (const { instrument, midi, velocity, steps } of notes) {
      const channel = channelOf(instrument);
      synth.noteOn(channel, midi, velocity, { time: at });
      synth.noteOff(channel, midi, { time: at + steps * stepSec - NOTE_GAP_SEC });
    }
    if (pulse !== null && onPulse) setTimeout(() => onPulse(pulse), (at - context.currentTime) * 1000);
  }

  function channelOf(instrument) {
    const channel = channels.get(instrument);
    if (channel === undefined) throw new Error(`instrument ${instrument.program} is not among the composer's`);
    return channel;
  }

  /** Silences everything; the next follow() lines up afresh. */
  function stop() {
    anchor = null;
    synth?.stopAll();
  }

  return { unlock, setVolume, follow, stop };
}
