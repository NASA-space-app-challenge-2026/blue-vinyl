// Composer for the smog album (see docs/albums/smog.md): a dance loop, heard through the air the map shows. nell-v2's
// "The Wind That Sweeps the Smog", its fog over the music widened.
//
// Each song plays its own four-bar loop (its `loop`, a SmogLoop) at 120 BPM, unchanged from start to end; the air only
// changes how it comes through, the same way in every song:
//   - The fog: clear air plays the loop crisp; the more smog over the city's cell (its PM2.5, as the map draws it), the
//     more the whole mix is muffled, as if through a wall, and smeared into reverb and grit, rising and falling with
//     the air hour by hour.
//   - The clearing: while the fog on the map is thinning, a gust of wind blows on every beat, as loud as the city is
//     losing fog.
//   - The turns (see tracks/domain/smog.js): as the smog rolls in, a deep boom as the map darkens; as the front sweeps
//     it out, a riser over the two bars before, the beat before it silent, and a crash as the map flashes clear.
//
// The bar and step are read from the song's playback time, so the loop stays in place wherever the needle is set down.

import { Effect } from '../effects.js';
import { CC, Instrument } from '../instruments.js';
import { NoiseShape, Patch } from '../patches.js';
import { CLEAR_LEVEL, STEPS_PER_BAR, STEPS_PER_BEAT, STEP_MS, gridAt, hourlyAt } from '../../../tracks/domain/smog.js';

// A chord: its four notes, low to high, that the parts above the bass play (the pad and stabs its lowest three, the
// pad an octave down), and the bass's root (MIDI).
const chord = (notes, root) => Object.freeze({ notes: Object.freeze(notes), root });
const PAD_OCTAVE = -12;

// The loops a song may play, each four chords a bar apiece, and its parts:
//   drums: the steps of the bar each drum strikes (`ghost`: quiet hats);
//   bass: its steps and their lengths in steps, playing the root on the analog synth;
//   pad: the Instrument holding the chord through the bar, or null;
//   arpeggio: which chord note each eighth plays on the analog synth's `patch`, or null;
//   stabs: the steps and lengths of short chords on the analog synth's `patch`, or null;
//   melody: [step, chord note, length in steps] on `instrument`, or null.
export const SmogLoop = Object.freeze({
  // Synth-pop in D minor: a square-wave arpeggio running over a pad and a syncopated bass.
  SYNTH_POP: Object.freeze({
    chords: Object.freeze([
      chord([74, 77, 81, 86], 38),
      chord([74, 77, 82, 86], 34),
      chord([72, 77, 81, 84], 41),
      chord([72, 76, 79, 84], 36),
    ]),
    drums: Object.freeze({ kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14], ghost: [1, 3, 5, 7, 9, 11, 13, 15] }),
    bass: new Map([[0, 3], [3, 3], [6, 2], [8, 3], [11, 3], [14, 2]]),
    pad: Instrument.HALO_PAD,
    arpeggio: Object.freeze({ patch: Patch.PULSE, notes: [0, 1, 2, 3, 2, 1, 2, 3] }),
    stabs: null,
    melody: null,
  }),
  // House in A minor: saw chord stabs off the beat, the bass bouncing on the offbeats under a four-to-the-floor kick.
  HOUSE: Object.freeze({
    chords: Object.freeze([
      chord([69, 72, 76, 81], 45),
      chord([69, 72, 77, 81], 41),
      chord([67, 72, 76, 79], 48),
      chord([67, 71, 74, 79], 43),
    ]),
    drums: Object.freeze({ kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14], ghost: [1, 3, 5, 7, 9, 11, 13, 15] }),
    bass: new Map([[2, 2], [6, 2], [10, 2], [14, 2]]),
    pad: null,
    arpeggio: null,
    stabs: Object.freeze({ patch: Patch.STAB, steps: new Map([[0, 2], [3, 2], [6, 1], [10, 2], [13, 2]]) }),
    melody: null,
  }),
  // Breakbeat in E minor: a broken beat under a dulcimer hook, a held bass and a warm pad.
  BREAKS: Object.freeze({
    chords: Object.freeze([
      chord([76, 79, 83, 88], 40),
      chord([76, 79, 84, 88], 36),
      chord([74, 79, 83, 86], 43),
      chord([74, 78, 81, 86], 38),
    ]),
    drums: Object.freeze({ kick: [0, 7, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], ghost: [3, 5, 9, 11, 13, 15] }),
    bass: new Map([[0, 6], [7, 3], [10, 6]]),
    pad: Instrument.PAD,
    arpeggio: null,
    stabs: null,
    melody: Object.freeze({
      instrument: Instrument.DULCIMER,
      notes: [[0, 3, 2], [2, 2, 2], [4, 1, 1], [6, 2, 2], [8, 3, 2], [11, 1, 1], [12, 2, 4]],
    }),
  }),
});
const SOUND_FONTS = Object.freeze([
  ...new Set(Object.values(SmogLoop).flatMap((loop) => [loop.pad, loop.melody?.instrument].filter(Boolean))),
]);

const VELOCITY = Object.freeze({ kick: 118, snare: 100, hat: 88, ghost: 50, bass: 110, pad: 70, arpeggio: 96, stab: 92, melody: 104 });
const BASS_SHAPE = Object.freeze({ cutoff: 1.4, resonance: 4, env: 2, decay: 0.15, gate: 0.85, release: 0.2 });
const ARP_SHAPE = Object.freeze({ cutoff: 2.5, resonance: 3, env: 1.5, decay: 0.12, gate: 0.6, release: 0.15 });
const STAB_SHAPE = Object.freeze({ cutoff: 1.5, resonance: 5, env: 2.5, decay: 0.18, gate: 0.4, release: 0.12 });
const SOUND_FONT_REVERB = 40;
// The standard kit's keys.
const Drum = Object.freeze({ KICK: 36, SNARE: 38, CLOSED_HAT: 42, CRASH: 49 });

// The fog over the music follows the air over the city hour by hour (user, 2026-11-15: the change in concentration is
// the point, and the smog as muffled as it can be): none while the air is clear (pollution level below CLEAR_LEVEL,
// about 88 µg/m³), all of it at full scale (level 1, 600 µg/m³, where the map's fog is at its thickest and brownest),
// in between as the level goes. At none the mix is as it is; at all of it the low-pass is down to MUFFLED_HZ and the
// reverb and grit are at their most.
const OPEN_HZ = 18000;
const MUFFLED_HZ = 220;
const REVERB = Object.freeze([0.12, 0.6]);
const DRIVE = Object.freeze([0, 0.3]);
// A gust on each beat while the city is losing fog: a burst of noise falling from 6 kHz, as loud as the share of a
// whole fog the city's cell loses an hour, none from `from` and full at `full`.
const GUST = Object.freeze({ from: 0.008, full: 0.06, velocity: 120, steps: STEPS_PER_BEAT, hz: [6000, 700] });
// The turns: the riser, silent beat, crash and impact of a clearing; the boom of the smog rolling in.
const RISER = Object.freeze({ velocity: 110, steps: 2 * STEPS_PER_BAR, hz: [300, 9000] });
const SILENT_STEPS = STEPS_PER_BEAT;
const CRASH_VELOCITY = 124;
const IMPACT = Object.freeze({ velocity: 115, steps: 4, hz: [150, 2500] });
const BOOM = Object.freeze({ midi: 26, velocity: 127, steps: 2 * STEPS_PER_BAR });
const BOOM_SHAPE = Object.freeze({ cutoff: 1, resonance: 2, env: 3, decay: 0.6, gate: 0.3, release: 2 });
const BOOM_NOISE = Object.freeze({ velocity: 100, steps: 8, hz: [800, 60] });

const lerp = ([from, to], amount) => from + (to - from) * amount;

export class SmogComposer {
  instruments = Object.freeze([...SOUND_FONTS, Instrument.STANDARD_KIT]);
  // A step is a sixteenth note of playback time.
  stepSec = STEP_MS / 1000;
  stepsPerBar = STEPS_PER_BAR;

  /**
   * @param {{ track: import('../../../tracks/domain/smog.js').SmogTrack, loop: Object }} song the box's hours and
   *   the loop the song plays (one of SmogLoop)
   */
  setSong({ track, loop }) {
    this.track = track;
    this.loop = loop;
    this.turns = new Map(track.turns.map((turn) => [gridAt(turn.at).index, turn]));
  }

  reset() {
    this.started = false;
    this.lastIndex = null;
  }

  /**
   * @param {import('./flock.js').Music} music
   * @param {{ time: number, at: number }} now `time`: the song's playback time (ms)
   */
  playStep(music, { time, at }) {
    if (!this.started) {
      this.started = true;
      for (const inst of SOUND_FONTS) music.control(inst, CC.REVERB, SOUND_FONT_REVERB, at);
    }
    const grid = gridAt(time);
    if (grid.index === this.lastIndex) return;
    this.lastIndex = grid.index;
    this.hear(music, this.fogAt(time), at);
    this.playTurns(music, grid, at);
    const clearing = this.track.turns.find((turn) => turn.clear && turn.at > grid.time);
    if (clearing && clearing.at - grid.time <= SILENT_STEPS * STEP_MS) return;
    this.playGust(music, grid, at);
    this.playLoop(music, grid, at);
  }

  // The air the loop is heard through.
  // How much of the fog is over the music at playback `time`, 0 to 1.
  fogAt(time) {
    const level = hourlyAt(this.track.t, this.track.level, time);
    return Math.min(1, Math.max(0, (level - CLEAR_LEVEL) / (1 - CLEAR_LEVEL)));
  }

  hear(music, fog, at) {
    music.effect(Effect.LOWPASS, OPEN_HZ * (MUFFLED_HZ / OPEN_HZ) ** fog, at);
    music.effect(Effect.REVERB, lerp(REVERB, fog), at);
    music.effect(Effect.DRIVE, lerp(DRIVE, fog), at);
  }

  playTurns(music, grid, at) {
    if (this.turns.get(grid.index + RISER.steps)?.clear) {
      music.noise(RISER.velocity, at, RISER.steps, ...RISER.hz, NoiseShape.RISE);
    }
    const turn = this.turns.get(grid.index);
    if (!turn) return;
    if (turn.clear) {
      music.note(Instrument.STANDARD_KIT, Drum.CRASH, CRASH_VELOCITY, at, STEPS_PER_BAR);
      music.noise(IMPACT.velocity, at, IMPACT.steps, ...IMPACT.hz, NoiseShape.HIT);
    } else {
      music.synthNote(Patch.CAVE, BOOM.midi, BOOM.velocity, at, BOOM.steps, BOOM_SHAPE);
      music.noise(BOOM_NOISE.velocity, at, BOOM_NOISE.steps, ...BOOM_NOISE.hz, NoiseShape.HIT);
    }
  }

  playGust(music, { step, time }, at) {
    if (step % STEPS_PER_BEAT) return;
    const cleared = hourlyAt(this.track.t, this.track.cleared, time);
    if (cleared < GUST.from) return;
    const velocity = GUST.velocity * Math.min(1, (cleared - GUST.from) / (GUST.full - GUST.from));
    music.noise(velocity, at, GUST.steps, ...GUST.hz, NoiseShape.HIT);
  }

  playLoop(music, { step, bar }, at) {
    const { chords, drums, bass, pad, arpeggio, stabs, melody } = this.loop;
    const { notes, root } = chords[bar % chords.length];
    const drum = (key, velocity) => music.note(Instrument.STANDARD_KIT, key, velocity, at, 1);
    if (drums.kick.includes(step)) drum(Drum.KICK, VELOCITY.kick);
    if (drums.snare.includes(step)) drum(Drum.SNARE, VELOCITY.snare);
    if (drums.hat.includes(step)) drum(Drum.CLOSED_HAT, VELOCITY.hat);
    else if (drums.ghost.includes(step)) drum(Drum.CLOSED_HAT, VELOCITY.ghost);
    const bassSteps = bass.get(step);
    if (bassSteps) music.synthNote(Patch.CAVE, root, VELOCITY.bass, at, bassSteps, BASS_SHAPE);
    if (pad && step === 0) {
      for (const midi of notes.slice(0, 3)) music.note(pad, midi + PAD_OCTAVE, VELOCITY.pad, at, STEPS_PER_BAR);
    }
    if (arpeggio && step % 2 === 0) {
      music.synthNote(arpeggio.patch, notes[arpeggio.notes[step / 2]], VELOCITY.arpeggio, at, 2, ARP_SHAPE);
    }
    const stabSteps = stabs?.steps.get(step);
    if (stabSteps) {
      for (const midi of notes.slice(0, 3)) music.synthNote(stabs.patch, midi, VELOCITY.stab, at, stabSteps, STAB_SHAPE);
    }
    for (const [s, note, length] of melody?.notes ?? []) {
      if (s === step) music.note(melody.instrument, notes[note], VELOCITY.melody, at, length);
    }
  }
}
