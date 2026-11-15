// Plays a song on a SoundFont synthesizer and an analog synth, in time with the app's playback clock.
//
// The app owns the clock: while a track plays it calls follow() every frame with how far into the track it is. The
// engine lines the audio clock up with it, then steps the song's composer a little ahead on the audio clock, each step
// given what the song's data is at the data time it sounds at (its sample). When the app's clock jumps (a seek or
// another track), the music starts over from there. A composer may set its tempo from the data (stepSecAt), every bar
// or every `stepsPerTempo` steps; the data clock runs on regardless.
//
// Space: the whole mix sits where the sample is, as seen from where the song starts (north ahead, east to the
// right), further away the further it has gone; a song without a path stays straight ahead.
//
// Mix: synths -> effects (see master-fx.js) -> gate -> analyser -> panner -> volume. Besides the sound font, a composer
// may play the analog synth (see analog-synth.js), notes, noise hits and held voices; all start over with the music.
// The gate closes when the music stops and opens when it starts again.

import { CC, SOUND_FONT } from '../domain/instruments.js';
import { bearing, distanceKm } from '../../tracks/domain/geo.js';
import { createAnalogSynth } from './analog-synth.js';
import { createMasterFx } from './master-fx.js';

const SYNTH_LIB_URL = 'https://cdn.jsdelivr.net/npm/spessasynth_lib@4.3.14/+esm';
const SYNTH_PROCESSOR_URL = 'https://cdn.jsdelivr.net/npm/spessasynth_lib@4.3.14/dist/spessasynth_processor.min.js';
const SOUND_FONT_URL = new URL(`./soundfonts/${SOUND_FONT}`, import.meta.url);

// How far ahead of the audio clock steps are scheduled.
const LOOKAHEAD_SEC = 0.15;
// A gap this large between the app's clock and the audio clock means the app jumped: start over.
const RESYNC_SEC = 0.15;
// stop() fades the whole mix out with this time constant, cutting off the notes' release and the effects' tails.
const STOP_FADE_SEC = 0.02;
// MIDI CC that silences a channel at once (All Sound Off).
const ALL_SOUND_OFF = 120;
// After a stop, the music starts over this long after the All Sound Off it queued (quietAt), never at the same time:
// the synth may take the two in either order, and an All Sound Off taken second cuts the first notes, held chords and
// drones among them, so the music would play on silent until they next sound.
const RESTART_GAP_SEC = 0.01;
// Notes stop this much before their full length, so repeated notes re-strike cleanly.
const NOTE_GAP_SEC = 0.02;
// Volume changes ease in with this time constant, so dragging the slider does not click.
const VOLUME_RAMP_SEC = 0.02;
// The analyser the visuals read; it sits before the volume, so they show the music even when it is turned down.
const ANALYSER = Object.freeze({ fftSize: 4096, smoothingTimeConstant: 0.8, minDecibels: -90, maxDecibels: -40 });
// The mix is placed by an HRTF panner at a distance from `near` (at the song's start) to `far` (the furthest the
// flock gets), in panner units; with the inverse model the level falls to near/far. It glides with this time constant.
const SPACE = Object.freeze({ near: 1, far: 3, glideSec: 0.5 });
const PANNER = Object.freeze({ panningModel: 'HRTF', distanceModel: 'inverse', refDistance: SPACE.near, rolloffFactor: 1 });
// MIDI channels the composer's instruments take, in order; 9 is skipped as General MIDI keeps it for drums.
const MIDI_CHANNELS = Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15]);
// The pitch wheel's centre and its range in semitones each way, unless the composer sets its own (bendRangeSemitones).
const PITCH_WHEEL = Object.freeze({ centre: 8192, rangeSemitones: 2 });
// Analog voices still open when the music starts over or stops fade out over this long.
const VOICE_STOP_SEC = 0.05;

/**
 * What a track plays. Composer-specific data (a flock's lead, a storm's kit) rides along for the composer's setSong.
 *
 * @typedef {Object} Song
 * @property {Object} composer what decides what plays: its `instruments`, `stepSec` and `stepsPerBar`, optionally
 *   `stepSecAt(sample)` (the step length from the data, set every bar or every `stepsPerTempo` steps) and
 *   `bendRangeSemitones`, and setSong(song), reset() and
 *   playStep(music, { sample, time, step, bar, at, stepSec, stepMs })
 * @property {number} startMs  data time at the start of the track
 * @property {number} msPerSec  ms of data time that pass in a second of the track
 * @property {(time: number) => (Object | null)} sampleAt  the data at a data time, null where there is none (nothing
 *   plays there); with a `path`, it has the `lat` and `lon` the mix is placed at
 * @property {{ lat: number, lon: number }[]} [path]  where the song goes, for its place in space; without it the mix
 *   stays straight ahead
 */

export function createSoundEngine() {
  let context = null;
  let output = null;
  let panner = null;
  let analyser = null;
  let gate = null;
  // Audio time by which every note scheduled before the last stop() has been silenced; the music starts no earlier.
  let quietAt = 0;
  let fx = null;
  let analog = null;
  let synth = null;
  let space = null;
  // The analog voices open now (see music.voice).
  const voices = new Set();
  let loading = null;
  let volume = 1;
  /** @type {Map<Object, number>} */
  let channels = new Map();
  // The composer the channels are set up for.
  let composer = null;
  // The song the composer is fitted to, with where it starts and how far (km) from there it ever gets (null without a
  // path).
  let song = null;
  // Where the audio clock and the track's clock last lined up, the next step's audio time, its place in the bar, and
  // the bar's step length.
  let anchor = null;
  let nextStepAt = 0;
  let step = 0;
  let bar = 0;
  let stepSec = 0;

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
      gate = new GainNode(context);
      gate.connect(analyser);
      fx = createMasterFx(context);
      fx.output.connect(gate);
      analog = createAnalogSynth(context, fx.input);
    }
    try {
      const buffer = context.createBuffer(1, 1, 22050);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.start(0);
    } catch {
      // AudioContext may not be ready
    }
    loading ??= load();
    return Promise.all([loading, context.resume()]);
  }

  async function load() {
    if (!context.audioWorklet) {
      throw new Error('AudioWorklet is disabled on insecure HTTP. Please access via HTTPS or localhost.');
    }
    const [{ WorkletSynthesizer }, font] = await Promise.all([import(SYNTH_LIB_URL), fetchSoundFont()]);
    await context.audioWorklet.addModule(SYNTH_PROCESSOR_URL);
    const instance = new WorkletSynthesizer(context);
    instance.connect(fx.input);
    await instance.soundBankManager.addSoundBank(font, SOUND_FONT);
    await instance.isReady;
    synth = instance;
  }

  // Gives each of `next`'s instruments a channel, set up afresh so nothing the last composer left there carries over.
  function assignChannels(next) {
    composer = next;
    channels = new Map(next.instruments.map((inst, i) => [inst, MIDI_CHANNELS[i]]));
    for (const [inst, channel] of channels) {
      synth.controllerChange(channel, CC.RESET_ALL, 0);
      synth.midiChannels[channel].setDrums(Boolean(inst.drums));
      synth.programChange(channel, inst.program);
      synth.controllerChange(channel, CC.VOLUME, inst.volume);
      synth.pitchWheelRange(channel, bendRange());
    }
  }

  function bendRange() {
    return composer?.bendRangeSemitones ?? PITCH_WHEEL.rangeSemitones;
  }

  async function fetchSoundFont() {
    const res = await fetch(SOUND_FONT_URL);
    if (!res.ok) throw new Error(`${SOUND_FONT_URL}: HTTP ${res.status}`);
    return res.arrayBuffer();
  }

  // Squared, so the slider feels even to the ear.
  function level() {
    return volume ** 2;
  }

  /** @param {number} value 0 (silent) to 1 (full) */
  function setVolume(value) {
    volume = value;
    output?.gain.setTargetAtTime(level(), context.currentTime, VOLUME_RAMP_SEC);
  }

  /** @param {Song} next */
  function setSong(next) {
    if (song === next) return;
    if (composer !== next.composer) {
      silence();
      assignChannels(next.composer);
    }
    song = next;
    anchor = null;
    if (next.path) {
      const origin = next.path[0];
      space = { origin, maxDistance: Math.max(...next.path.map((s) => distanceKm(origin.lat, origin.lon, s.lat, s.lon))) };
    } else {
      space = null;
      moveTo(0, 0, context.currentTime);
    }
    composer.setSong(next);
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
      silence();
      fx.reset(now);
      // After a stop, start once the notes it left queued are silenced, from where the app's clock will be then.
      const start = Math.max(now, quietAt + RESTART_GAP_SEC);
      gate.gain.cancelScheduledValues(start);
      gate.gain.setTargetAtTime(1, start, STOP_FADE_SEC);
      anchor = { audioSec: start, elapsedSec: elapsedSec + (start - now) };
      nextStepAt = start;
      step = 0;
      bar = 0;
      composer.reset();
    }
    while (nextStepAt < now + LOOKAHEAD_SEC) {
      const time = song.startMs + (anchor.elapsedSec + (nextStepAt - anchor.audioSec)) * song.msPerSec;
      const sample = song.sampleAt(time);
      if (step % (composer.stepsPerTempo ?? composer.stepsPerBar) === 0) {
        stepSec = (sample && composer.stepSecAt?.(sample)) ?? composer.stepSec;
      }
      if (sample) {
        if (step === 0 && space) place(sample, nextStepAt);
        composer.playStep(music, { sample, time, step, bar, at: nextStepAt, stepSec, stepMs: stepSec * song.msPerSec });
      }
      nextStepAt += stepSec;
      step = (step + 1) % composer.stepsPerBar;
      if (step === 0) bar++;
    }
  }

  // Moves the mix to the sample's bearing from where the song starts (the listener faces north, -z; east is +x), at a
  // distance that grows with how far it has gone.
  function place(sample, at) {
    const { origin, maxDistance } = space;
    const angle = bearing(origin.lat, origin.lon, sample.lat, sample.lon);
    const gone = maxDistance > 0 ? distanceKm(origin.lat, origin.lon, sample.lat, sample.lon) / maxDistance : 0;
    moveTo(angle, gone, at);
  }

  // Moves the mix `angle` from straight ahead, further away as it is `gone` (0 near to 1 far).
  function moveTo(angle, gone, at) {
    const radius = SPACE.near + gone * (SPACE.far - SPACE.near);
    panner.positionX.setTargetAtTime(radius * Math.sin(angle), at, SPACE.glideSec);
    panner.positionZ.setTargetAtTime(-radius * Math.cos(angle), at, SPACE.glideSec);
  }

  /** @type {import('../domain/composers/flock.js').Music} */
  const music = {
    note(instrument, midi, velocity, at, steps) {
      const channel = channelOf(instrument);
      synth.noteOn(channel, midi, Math.round(velocity), { time: at });
      synth.noteOff(channel, midi, { time: at + steps * stepSec - NOTE_GAP_SEC });
    },
    hold(instrument, midi, velocity, at) {
      synth.noteOn(channelOf(instrument), midi, Math.round(velocity), { time: at });
    },
    release(instrument, midi, at) {
      synth.noteOff(channelOf(instrument), midi, { time: at });
    },
    bend(instrument, semitones, at) {
      const value = PITCH_WHEEL.centre * (1 + Math.max(-1, Math.min(1, semitones / bendRange())));
      synth.pitchWheel(channelOf(instrument), Math.min(16383, Math.round(value)), { time: at });
    },
    control(instrument, cc, value, at) {
      synth.controllerChange(channelOf(instrument), cc, value, { time: at });
    },
    program(instrument, sound, at) {
      const channel = channelOf(instrument);
      synth.programChange(channel, sound.program, { time: at });
      synth.controllerChange(channel, CC.VOLUME, sound.volume, { time: at });
    },
    synthNote(patch, midi, velocity, at, steps, shape) {
      analog.play(patch, midi, velocity, at, steps * stepSec, shape);
    },
    voice(lead, sound, at) {
      const voice = analog.voice(lead, sound, at);
      voices.add(voice);
      return {
        move: voice.move,
        close(when, releaseSec) {
          voice.close(when, releaseSec);
          voices.delete(voice);
        },
      };
    },
    noise(velocity, at, steps, fromHz, toHz, shape) {
      analog.noise(velocity, at, steps * stepSec, fromHz, toHz, shape);
    },
    effect(effect, value, at) {
      fx.set(effect, value, at);
    },
  };

  function channelOf(instrument) {
    const channel = channels.get(instrument);
    if (channel === undefined) throw new Error(`instrument ${instrument.program} is not among the composer's`);
    return channel;
  }

  // Stops every note and fades out every analog note, hit and voice still sounding.
  function silence() {
    synth?.stopAll();
    analog?.silence();
    for (const voice of voices) voice.close(context.currentTime, VOICE_STOP_SEC);
    voices.clear();
  }

  /**
   * Silences everything at once; the next follow() starts over.
   *
   * The sound font synth plays notes already queued up to LOOKAHEAD_SEC ahead even after stopAll(), and a held note
   * among them would ring on, so the gate closes over them, and an All Sound Off queued behind them clears them once
   * they have started.
   */
  function stop() {
    anchor = null;
    silence();
    if (!synth) return;
    const now = context.currentTime;
    gate.gain.cancelScheduledValues(now);
    gate.gain.setTargetAtTime(0, now, STOP_FADE_SEC);
    quietAt = now + LOOKAHEAD_SEC + STOP_FADE_SEC;
    synth.stopAll(true);
    for (const channel of MIDI_CHANNELS) synth.controllerChange(channel, ALL_SOUND_OFF, 0, { time: quietAt });
    fx.reset(now);
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
