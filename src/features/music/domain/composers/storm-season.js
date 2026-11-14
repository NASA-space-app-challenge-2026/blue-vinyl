// Composer for the hemispheres album: one ocean's whole storm season as ambient music, each storm a voice that glides
// like a bird's call while it lives.
//
//   the sea: a quiet pad and a low drone, I and IV in D, two bars each, playing on through the weeks with no storm
//   each storm: one held voice on the track's lead (see Lead in ../patches.js), gliding between the notes of D major:
//     latitude -> pitch, north higher, on its hemisphere's range (the south's lower, so a southern storm sinks as it
//       heads for the pole)
//     degrees east of where it formed -> place around the listener: every storm starts straight ahead, left as it
//       heads west, back toward the middle as it turns east
//     distance from the globe's centre -> loudness: full over the middle of the view, nothing at the label's edge
//     wind -> loudness and brightness
//
// The whole mix rings in a large room and echoes three steps behind. Each step's sample is the season at the data time
// it sounds at, storms or none, so the sea plays on through the quiet (see seasonSong).

import { Effect } from '../effects.js';
import { CC, Instrument } from '../instruments.js';
import { Patch } from '../patches.js';
import { Hemisphere, stormsAt } from '../../../tracks/domain/storm-season.js';
import { intensityOf } from '../../../tracks/domain/storm-track.js';
import { arcDeg } from '../../../tracks/domain/geo.js';

const BPM = 72;
const STEPS_PER_BEAT = 4;
const STEPS_PER_BAR = 16;

// The storms' scale, D major, as semitones above D.
const SCALE = Object.freeze([0, 2, 4, 5, 7, 9, 11]);
// Where each hemisphere's storms sing: latitude `lat[0]` at the foot (`baseMidi`, a D), `lat[1]` at the top of
// `octaves` of the scale, about a note every two degrees, so a storm heading poleward moves a note every day or two.
const PITCH_RANGE = Object.freeze({
  // Three octaves up from D3, rising as a storm heads north.
  [Hemisphere.NORTH]: Object.freeze({ lat: [5, 47], baseMidi: 50, octaves: 3 }),
  // Two octaves up from D2, below nearly every northern storm, sinking as a storm heads south.
  [Hemisphere.SOUTH]: Object.freeze({ lat: [-35, -5], baseMidi: 38, octaves: 2 }),
});
// A voice slides to its next note over this long; it swells in over ONSET_SEC as its storm forms and fades over
// RELEASE_SEC as it dies away.
const GLIDE_SEC = 0.15;
const ONSET_SEC = 0.12;
const RELEASE_SEC = 0.8;

// How a storm sounds by intensity (see intensityOf), calm to full scale: its `gain`, and the filter's `cutoff` in
// octaves above the note.
const STRENGTH = Object.freeze({ gain: [0.35, 1], cutoff: [1, 4] });
// Loudness by where a storm is: full within FULL_SHARE of the way from the globe's centre to the label's edge, fading
// to nothing at the edge.
const FULL_SHARE = 0.5;
// A storm sounds fully to one side once it has gone this many degrees of longitude east or west of where it formed.
const PAN_SPAN_DEG = 20;

// The sea under the storms: the pad's chord and the drone's root (MIDI), SEA_BARS bars each, in turn.
const SEA = Object.freeze([
  Object.freeze({ chord: Object.freeze([50, 54, 57, 61]), root: 38 }), // Dmaj7 over D2
  Object.freeze({ chord: Object.freeze([55, 59, 62, 66]), root: 43 }), // Gmaj7 over G2
]);
const SEA_BARS = 2;
const SEA_VELOCITY = Object.freeze({ pad: 52, drone: 70 });
/** @type {import('../../data/analog-synth.js').NoteShape} */
const DRONE_SHAPE = Object.freeze({ cutoff: 0.8, resonance: 1, env: 1, decay: 1.5, gate: 0.9, release: 2.5 });
const SPACE = Object.freeze({ reverb: 0.4, echo: 0.18, echoSteps: 3, feedback: 0.4 });
// The pad's own reverb in the sound font (CC 91).
const PAD_REVERB = 90;

const lerp = ([from, to], amount) => from + (to - from) * amount;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * The song (see music/data/sound-engine.js) of a storm season track that plays `span` over `durationSec`, held over
 * `focus`. The mix stays straight ahead (its path is the focus alone); the composer places each storm's voice instead.
 *
 * @param {StormSeasonComposer} composer
 * @param {import('../../../tracks/domain/storm-season.js').StormTrack[]} tracks
 * @param {{ startMs: number, endMs: number }} span  the data time the track plays
 * @param {number} durationSec
 * @param {{ lat: number, lon: number, arcDeg: number }} focus  the globe's centre, and the arc to the label's edge
 */
export function seasonSong(composer, tracks, span, durationSec, focus) {
  return {
    composer,
    tracks,
    span,
    durationSec,
    focus,
    startMs: span.startMs,
    msPerSec: (span.endMs - span.startMs) / durationSec,
    sampleAt: (time) => ({ lat: focus.lat, lon: focus.lon, storms: stormsAt(tracks, time) }),
    path: [focus],
  };
}

export class StormSeasonComposer {
  instruments = Object.freeze([Instrument.HALO_PAD]);
  stepSec = 60 / BPM / STEPS_PER_BEAT;
  stepsPerBar = STEPS_PER_BAR;

  /**
   * @param {import('../patches.js').Lead} lead what the storms sing on
   * @param {string} hemisphere one of Hemisphere: where the track's storms sing
   */
  constructor(lead, hemisphere) {
    this.lead = lead;
    this.range = PITCH_RANGE[hemisphere];
  }

  /** @param {ReturnType<typeof seasonSong>} song */
  setSong(song) {
    this.focus = song.focus;
  }

  reset() {
    this.started = false;
    // Each storm's open voice, by its track.
    this.voices = new Map();
  }

  /**
   * @param {import('./flock.js').Music} music
   * @param {{ sample: { storms: import('../../../tracks/domain/storm-season.js').Storm[] }, step: number, bar: number, at: number }} now
   */
  playStep(music, { sample, step, bar, at }) {
    if (!this.started) this.start(music, at);
    if (step === 0 && bar % SEA_BARS === 0) this.playSea(music, bar, at);
    const singing = new Set();
    for (const storm of sample.storms) {
      singing.add(storm.track);
      this.sing(music, storm, at);
    }
    for (const [track, voice] of this.voices) {
      if (singing.has(track)) continue;
      voice.close(at, RELEASE_SEC);
      this.voices.delete(track);
    }
  }

  start(music, at) {
    this.started = true;
    music.effect(Effect.REVERB, SPACE.reverb, at);
    music.effect(Effect.ECHO, SPACE.echo, at);
    music.effect(Effect.ECHO_TIME, SPACE.echoSteps * this.stepSec, at);
    music.effect(Effect.FEEDBACK, SPACE.feedback, at);
    music.control(Instrument.HALO_PAD, CC.REVERB, PAD_REVERB, at);
  }

  playSea(music, bar, at) {
    const { chord, root } = SEA[(bar / SEA_BARS) % SEA.length];
    const steps = SEA_BARS * STEPS_PER_BAR;
    for (const midi of chord) music.note(Instrument.HALO_PAD, midi, SEA_VELOCITY.pad, at, steps);
    music.synthNote(Patch.CAVE, root, SEA_VELOCITY.drone, at, steps, DRONE_SHAPE);
  }

  // Moves the storm's voice (opening it as the storm forms) to where and how strong the storm is.
  sing(music, storm, at) {
    const sound = this.soundOf(storm);
    const voice = this.voices.get(storm.track);
    if (voice) {
      voice.move(sound, at, GLIDE_SEC);
      return;
    }
    const opened = music.voice(this.lead, { ...sound, gain: 0 }, at);
    opened.move(sound, at, ONSET_SEC);
    this.voices.set(storm.track, opened);
  }

  /** @returns {import('../../data/analog-synth.js').VoiceSound} */
  soundOf(storm) {
    const intensity = intensityOf(storm.wind);
    return {
      midi: this.noteOf(storm.lat),
      gain: this.loudnessAt(storm.lat, storm.lon) * lerp(STRENGTH.gain, intensity),
      levels: this.lead.waves.map((wave) => wave.level),
      cutoff: lerp(STRENGTH.cutoff, intensity),
      pan: clamp(storm.east / PAN_SPAN_DEG, -1, 1),
    };
  }

  // The note (MIDI) nearest latitude `lat` on the hemisphere's range.
  noteOf(lat) {
    const { lat: [from, to], baseMidi, octaves } = this.range;
    const degree = Math.round(clamp((lat - from) / (to - from), 0, 1) * (octaves * SCALE.length - 1));
    const octave = Math.floor(degree / SCALE.length);
    return baseMidi + 12 * octave + SCALE[degree - octave * SCALE.length];
  }

  // How loud (0 to 1) a storm at `lat`, `lon` sounds, by how far it is from the globe's centre.
  loudnessAt(lat, lon) {
    const out = arcDeg(this.focus.lat, this.focus.lon, lat, lon) / this.focus.arcDeg;
    const fade = clamp((out - FULL_SHARE) / (1 - FULL_SHARE), 0, 1);
    return Math.cos((fade * Math.PI) / 2) ** 2;
  }
}
