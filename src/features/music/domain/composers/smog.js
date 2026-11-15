// Composer for the smog album (see docs/albums/smog.md): a dark deep house loop, heard through the air the map shows.
// After nell-v2's "The Wind That Sweeps the Smog".
//
// Each track plays its own four-bar loop (its `loop`, a SmogLoop) in a minor key at 136 BPM, a day a sixteenth note,
// unchanged from start to end, its hook on the track's `lead`. The air only changes how the loop comes through, the
// same way in every track:
//   - The fog: the thicker the city's air that day (fogOf, the fog the map draws over the city), the more the whole mix
//     is muffled, as if heard through a wall, and the more it smears into reverb and grit. Clear air plays it crisp.
//   - The thinning: while the fog over the box is thinning, a gust of wind blows on every beat, as loud as the box is
//     losing fog.
//   - The swings (see tracks/domain/smog.js), on their day: as the smog rolls in, a deep boom as the map darkens; as it
//     clears, a riser over the beat before, the loop silent, then a crash as the map flashes clear.
//
// The day is read from the step's data time, so the bars stay in place wherever the needle is set down.

import { Effect } from '../effects.js';
import { CC, Instrument } from '../instruments.js';
import { NoiseShape, Patch } from '../patches.js';
import { STEPS_PER_BAR, STEPS_PER_BEAT, STEP_SEC, dayAt } from '../../../tracks/domain/smog.js';

// A chord: its four notes, low to high, held by the pad and picked by the hook, and the bass's root (MIDI).
const chord = (notes, root) => Object.freeze({ notes: Object.freeze(notes), root });

// The loops a track may play, each four chords a bar apiece, and its hook: [step, chord note, length in steps], played
// `octave` octaves above the chord.
export const SmogLoop = Object.freeze({
  // D minor: Dm7, B♭maj7, Gm7, Am7; a high, sparse hook.
  D_MINOR: Object.freeze({
    chords: [chord([62, 65, 69, 72], 38), chord([58, 62, 65, 69], 34), chord([55, 58, 62, 65], 43), chord([57, 60, 64, 67], 45)],
    octave: 2,
    hook: [[0, 3, 2], [3, 2, 1], [6, 1, 2], [8, 3, 2], [10, 2, 2], [14, 0, 2]],
  }),
  // A minor: Am7, Fmaj7, Dm7, Em7; a busy, syncopated hook.
  A_MINOR: Object.freeze({
    chords: [chord([57, 60, 64, 67], 45), chord([53, 57, 60, 64], 41), chord([50, 53, 57, 60], 38), chord([52, 55, 59, 62], 40)],
    octave: 1,
    hook: [[0, 0, 1], [2, 2, 1], [3, 3, 1], [6, 2, 1], [8, 1, 1], [10, 3, 1], [11, 2, 1], [14, 0, 1]],
  }),
  // F minor: Fm7, D♭maj7, B♭m7, E♭; a slow, held hook.
  F_MINOR: Object.freeze({
    chords: [chord([53, 56, 60, 63], 41), chord([49, 53, 56, 60], 37), chord([46, 49, 53, 56], 34), chord([51, 55, 58, 63], 39)],
    octave: 1,
    hook: [[0, 3, 3], [4, 2, 2], [7, 1, 3], [10, 2, 2], [12, 0, 4]],
  }),
  // E minor: Em7, Cmaj7, Am7, Bm7; a ringing hook.
  E_MINOR: Object.freeze({
    chords: [chord([52, 55, 59, 62], 40), chord([48, 52, 55, 59], 36), chord([45, 48, 52, 55], 45), chord([47, 50, 54, 57], 35)],
    octave: 2,
    hook: [[0, 2, 4], [4, 3, 2], [6, 1, 2], [8, 2, 4], [12, 3, 2], [14, 1, 2]],
  }),
});

// The leads a track may play its hook on: keys and mallets.
export const SmogLead = Object.freeze({
  CELESTA: Instrument.CELESTA,
  MARIMBA: Instrument.MARIMBA,
  ELECTRIC_PIANO: Instrument.ELECTRIC_PIANO,
  VIBRAPHONE: Instrument.VIBRAPHONE,
});

// The loop's parts (the drums from nell-v2's house loop): the steps of the bar each plays.
const DRUMS = Object.freeze({ kick: [0, 4, 8, 12], clap: [4, 12], hat: [2, 6, 10, 14], ghost: [1, 3, 5, 7, 9, 11, 13, 15] });
const BASS_STEPS = new Map([[2, 2], [6, 2], [10, 2], [14, 2]]);
const VELOCITY = Object.freeze({ kick: 118, clap: 100, hat: 88, ghost: 50, bass: 110, pad: 70, lead: 104 });
const SOUND_FONT_REVERB = 40;
// The standard kit's keys.
const Drum = Object.freeze({ KICK: 36, CLAP: 39, CLOSED_HAT: 42, CRASH: 49 });

// The fog over the music: at none the mix is as it is, at all of it the low-pass is down to MUFFLED_HZ and the reverb
// and grit are at their most (nell-v2).
const OPEN_HZ = 18000;
const MUFFLED_HZ = 220;
const REVERB = Object.freeze([0.12, 0.6]);
const DRIVE = Object.freeze([0, 0.3]);
// A gust on each beat while the box is losing fog: a burst of noise falling from 6 kHz, as loud as the share of a whole
// fog the box loses by the next day, none from `from` and full at `full`. nell-v2's thresholds were per hour; these
// per-day ones are ours, set from 2025's days (the box loses 0.1 or more on about a quarter of Seoul's days and on none
// of Pretoria's), not yet heard by the user.
const GUST = Object.freeze({ from: 0.1, full: 0.3, velocity: 120, steps: STEPS_PER_BEAT, hz: [6000, 700] });
// The swings: the riser, silent beat, crash and impact of a clearing; the boom of the smog rolling in (nell-v2, the
// riser and the silence a beat long, as swings can come a few days apart).
const RISER = Object.freeze({ velocity: 110, steps: STEPS_PER_BEAT, hz: [300, 9000] });
const SILENT_STEPS = STEPS_PER_BEAT;
const CRASH_VELOCITY = 124;
const IMPACT = Object.freeze({ velocity: 115, steps: 4, hz: [150, 2500] });
const BOOM = Object.freeze({ midi: 26, velocity: 127, steps: 2 * STEPS_PER_BAR });
const BOOM_SHAPE = Object.freeze({ cutoff: 1, resonance: 2, env: 3, decay: 0.6, gate: 0.3, release: 2 });
const BOOM_NOISE = Object.freeze({ velocity: 100, steps: 8, hz: [800, 60] });

const lerp = ([from, to], amount) => from + (to - from) * amount;

export class SmogComposer {
  instruments = Object.freeze([...Object.values(SmogLead), Instrument.PAD, Instrument.SYNTH_BASS, Instrument.STANDARD_KIT]);
  stepSec = STEP_SEC;
  stepsPerBar = STEPS_PER_BAR;

  /**
   * @param {{ track: import('../../../tracks/domain/smog.js').SmogTrack, grid: import('../../../tracks/domain/smog.js').SmogGrid, lead: Object, loop: Object }} song
   *   the city's year, the box around it, the lead (one of SmogLead) and the loop (one of SmogLoop)
   */
  setSong({ track, grid, lead, loop }) {
    this.track = track;
    this.grid = grid;
    this.lead = lead;
    this.loop = loop;
    this.swings = new Map(track.swings.map((swing) => [swing.day, swing]));
  }

  reset() {
    this.started = false;
    this.lastDay = null;
  }

  /**
   * @param {import('./flock.js').Music} music
   * @param {{ time: number, at: number }} now
   */
  playStep(music, { time, at }) {
    if (!this.started) {
      this.started = true;
      for (const inst of [this.lead, Instrument.PAD]) music.control(inst, CC.REVERB, SOUND_FONT_REVERB, at);
    }
    const day = Math.round(dayAt(this.track, time));
    if (day === this.lastDay || day < 0 || day >= this.track.t.length) return;
    this.lastDay = day;
    this.hear(music, this.track.fog[day], at);
    this.playSwings(music, day, at);
    if (this.clearingWithin(day)) return;
    this.playGust(music, day, at);
    this.playLoop(music, day, at);
  }

  // The air the loop is heard through.
  hear(music, fog, at) {
    music.effect(Effect.LOWPASS, OPEN_HZ * (MUFFLED_HZ / OPEN_HZ) ** fog, at);
    music.effect(Effect.REVERB, lerp(REVERB, fog), at);
    music.effect(Effect.DRIVE, lerp(DRIVE, fog), at);
  }

  // Whether the air clears within SILENT_STEPS after `day`, when the loop holds its breath.
  clearingWithin(day) {
    for (let next = day + 1; next <= day + SILENT_STEPS; next++) if (this.swings.get(next)?.clear) return true;
    return false;
  }

  playSwings(music, day, at) {
    if (this.swings.get(day + RISER.steps)?.clear) {
      music.noise(RISER.velocity, at, RISER.steps, ...RISER.hz, NoiseShape.RISE);
    }
    const swing = this.swings.get(day);
    if (!swing) return;
    if (swing.clear) {
      music.note(Instrument.STANDARD_KIT, Drum.CRASH, CRASH_VELOCITY, at, STEPS_PER_BAR);
      music.noise(IMPACT.velocity, at, IMPACT.steps, ...IMPACT.hz);
    } else {
      music.synthNote(Patch.CAVE, BOOM.midi, BOOM.velocity, at, BOOM.steps, BOOM_SHAPE);
      music.noise(BOOM_NOISE.velocity, at, BOOM_NOISE.steps, ...BOOM_NOISE.hz);
    }
  }

  playGust(music, day, at) {
    if (day % STEPS_PER_BEAT) return;
    const thinning = this.grid.thinning[day];
    if (thinning < GUST.from) return;
    const velocity = GUST.velocity * Math.min(1, (thinning - GUST.from) / (GUST.full - GUST.from));
    music.noise(velocity, at, GUST.steps, ...GUST.hz);
  }

  playLoop(music, day, at) {
    const step = day % STEPS_PER_BAR;
    const bar = Math.floor(day / STEPS_PER_BAR);
    const { chords, octave, hook } = this.loop;
    const { notes, root } = chords[bar % chords.length];
    const drum = (key, velocity) => music.note(Instrument.STANDARD_KIT, key, velocity, at, 1);
    if (DRUMS.kick.includes(step)) drum(Drum.KICK, VELOCITY.kick);
    if (DRUMS.clap.includes(step)) drum(Drum.CLAP, VELOCITY.clap);
    if (DRUMS.hat.includes(step)) drum(Drum.CLOSED_HAT, VELOCITY.hat);
    else if (DRUMS.ghost.includes(step)) drum(Drum.CLOSED_HAT, VELOCITY.ghost);
    const bassSteps = BASS_STEPS.get(step);
    if (bassSteps) music.note(Instrument.SYNTH_BASS, root, VELOCITY.bass, at, bassSteps);
    if (step === 0) for (const midi of notes) music.note(Instrument.PAD, midi, VELOCITY.pad, at, STEPS_PER_BAR);
    for (const [s, note, length] of hook) {
      if (s === step) music.note(this.lead, notes[note] + 12 * octave, VELOCITY.lead, at, length);
    }
  }
}
