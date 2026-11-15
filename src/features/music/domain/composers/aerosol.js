// Composer for the aerosol album: the lead particle sings its way over the air it goes through.
//
//   the lead: one held voice on the track's lead (see Lead in ../patches.js), as a storm's in storm-season.js:
//     latitude -> pitch, north higher, on the notes of the track's minor pentatonic scale over the latitudes the particle
//       covers; the voice glides to each new note
//     degrees east of where it was released -> place around the listener, fully to the side PAN_SPAN_DEG away
//     speed -> loudness and brightness
//   the air: one sustained instrument for each of the other three particle types, held on a chord tone, never quieter than
//     AIR_LOUDNESS's low end and louder the thicker that type's AOD at the lead's head, on a log scale (EIC's, down to the
//     thinnest air a frame holds); a type whose toggle is off is silent, as it is on the globe

import { Effect } from '../effects.js';
import { CC, Instrument } from '../instruments.js';
import { PARTICLE_TOGGLE } from '../../../tracks/domain/aerosol-paths.js';
import { levelOf, SOUND_AOD } from '../../../tracks/domain/aerosol-frame.js';

const BPM = 120;
const STEPS_PER_BEAT = 4;
const STEPS_PER_BAR = 16;

// The lead's scale, minor pentatonic, as semitones above the tonic, and how many octaves the particle's latitudes span.
const SCALE = Object.freeze([0, 3, 5, 7, 10]);
const OCTAVES = 2;
// A voice slides to its next note over this long; it swells in over ONSET_SEC at the start.
const GLIDE_SEC = 0.15;
const ONSET_SEC = 0.12;
// Gains and filter cutoffs (octaves above the note) from the slowest step of the lead to its fastest.
const SPEED = Object.freeze({ gain: [0.35, 1], cutoff: [1, 4] });
// The lead sounds fully to one side once it has gone this many degrees of longitude east or west of where it started.
const PAN_SPAN_DEG = 20;

// What each particle type plays: its instrument, and the tone it holds, in semitones above the air's root (the
// tonic, in the octave from C3). Together they are the tonic minor chord.
const AIR_ROOT_MIDI = 48;
const AIR_VELOCITY = 80;
const AIR = Object.freeze({
  seaSalt: Object.freeze({ instrument: Instrument.SEASHORE, above: 12 }),
  dust: Object.freeze({ instrument: Instrument.HALO_PAD, above: 0 }),
  smoke: Object.freeze({ instrument: Instrument.VOICE_OOHS, above: 7 }),
  sulfate: Object.freeze({ instrument: Instrument.PAD, above: 15 }),
});
const AIR_PARTICLES = Object.freeze(Object.keys(AIR));
// How loud a particle type's instrument is, as a share of full, from the thinnest air (still plainly heard) to the
// thickest.
const AIR_LOUDNESS = Object.freeze([0.35, 1]);
const SPACE = Object.freeze({ reverb: 0.4, echo: 0.18, echoSteps: 3, feedback: 0.4 });

const lerp = ([from, to], amount) => from + (to - from) * amount;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * The song (see music/data/sound-engine.js) of an aerosol track: its lead particle's series, played over
 * `durationSec`.
 *
 * @param {AerosolComposer} composer
 * @param {import('../../../tracks/domain/aerosol-hero.js').HeroSeries} hero
 * @param {number} durationSec
 * @param {{ lead: import('../patches.js').Lead, baseMidi: number }} sound what the track plays the lead on: the lead,
 *   and the note its lowest latitude sings, which is the track's tonic
 * @param {(time: number) => import('../../../tracks/domain/aerosol-hero.js').HeroSample} sampleHero  the lead at a step
 * @param {() => Record<string, boolean>} toggles which particle types are on now, by toggle (PARTICLE_TOGGLE)
 */
export function aerosolSong(composer, hero, durationSec, sound, sampleHero, toggles) {
  return {
    composer,
    aerosol: true,
    hero,
    ...sound,
    startMs: 0,
    msPerSec: 1000,
    sampleAt: (ms) => ({ ...sampleHero(hero, (ms / 1000 / durationSec) * (hero.samples.length - 1)), on: toggles() }),
  };
}

export class AerosolComposer {
  instruments = Object.freeze(AIR_PARTICLES.map((particle) => AIR[particle].instrument));
  stepSec = 60 / BPM / STEPS_PER_BEAT;
  stepsPerBar = STEPS_PER_BAR;

  /** @param {ReturnType<typeof aerosolSong>} song */
  setSong(song) {
    this.song = song;
    // The lead's own particle type is not in the air: the lead is it.
    this.air = AIR_PARTICLES.filter((particle) => particle !== song.hero.particle);
  }

  reset() {
    this.started = false;
    this.voice = null;
    // The expression last sent to each particle type's instrument.
    this.expression = {};
  }

  /**
   * @param {import('./flock.js').Music} music
   * @param {{ sample: Object, at: number }} now  the sample is what the song's sampleAt gives
   */
  playStep(music, { sample, at }) {
    if (!this.started) this.start(music, at);
    for (const particle of this.air) this.mixAir(music, particle, sample, at);
    this.voice.move(this.soundOf(sample), at, GLIDE_SEC);
  }

  start(music, at) {
    this.started = true;
    music.effect(Effect.REVERB, SPACE.reverb, at);
    music.effect(Effect.ECHO, SPACE.echo, at);
    music.effect(Effect.ECHO_TIME, SPACE.echoSteps * this.stepSec, at);
    music.effect(Effect.FEEDBACK, SPACE.feedback, at);
    const { lead, baseMidi } = this.song;
    const tonic = baseMidi % 12;
    for (const particle of this.air) {
      const { instrument, above } = AIR[particle];
      music.control(instrument, CC.EXPRESSION, 0, at);
      music.hold(instrument, AIR_ROOT_MIDI + tonic + above, AIR_VELOCITY, at);
    }
    this.voice = music.voice(lead, { ...this.soundOf({ lat: this.song.hero.lat.min, east: 0, speedKm: 0 }), gain: 0 }, at);
  }

  // Sets how loud a particle type sounds: its AOD at the lead's head, none when its toggle is off. The SoundFont's
  // expression (CC 11) scales the level by (expression/127)², so the expression is the loudness's square root.
  mixAir(music, particle, { aods, on }, at) {
    const expression = on[PARTICLE_TOGGLE[particle]] ? Math.round(127 * Math.sqrt(lerp(AIR_LOUDNESS, levelOf(aods[particle], SOUND_AOD)))) : 0;
    if (this.expression[particle] === expression) return;
    this.expression[particle] = expression;
    music.control(AIR[particle].instrument, CC.EXPRESSION, expression, at);
  }

  /** @returns {import('../../data/analog-synth.js').VoiceSound} */
  soundOf({ lat, east, speedKm }) {
    const { lead, hero } = this.song;
    const speed = hero.fastestKm > 0 ? clamp(speedKm / hero.fastestKm, 0, 1) : 0;
    return {
      midi: this.noteOf(lat),
      gain: lerp(SPEED.gain, speed),
      levels: lead.waves.map((wave) => wave.level),
      cutoff: lerp(SPEED.cutoff, speed),
      pan: clamp(east / PAN_SPAN_DEG, -1, 1),
    };
  }

  // The note (MIDI) of the track's scale nearest latitude `lat` on the range the particle covers.
  noteOf(lat) {
    const { baseMidi, hero } = this.song;
    const { min, max } = hero.lat;
    const share = max > min ? clamp((lat - min) / (max - min), 0, 1) : 0.5;
    const degree = Math.round(share * OCTAVES * SCALE.length);
    const octave = Math.floor(degree / SCALE.length);
    return baseMidi + 12 * octave + SCALE[degree - octave * SCALE.length];
  }
}
