// Composer for the hemispheres album: one ocean's storm season. Every storm on the globe sings while it lives.
//
//   the sea: a pad that swings between Dmaj7 and Gmaj7 every two bars over a drone on D, from start to end, storms or
//     none
//   each storm: a voice of the track's lead that opens as the storm forms and fades as it ends, gliding between the
//     notes of D major as the storm moves:
//       latitude -> pitch, north higher (the southern oceans sing an octave and more below the northern ones)
//       degrees east of where it formed -> pan, west to the left
//       distance from the globe's centre -> loudness, silent at the label's edge
//       wind -> loudness and how hard the note is struck
//
// The track plays the season's days evenly over its length; each step's sample is the season at the data time it
// sounds at, sampled whether a storm is alive or not, so the sea plays on through the quiet (see seasonSong).

import { CC, Instrument } from '../instruments.js';
import { Hemisphere, stormsAt } from '../../../tracks/domain/storm-season.js';
import { arcDeg } from '../../../tracks/domain/geo.js';

const BPM = 72;
const STEPS_PER_BEAT = 4;
const STEPS_PER_BAR = 16;

// D major, as semitones above D.
const KEY_ROOT = 2;
const MAJOR = Object.freeze([0, 2, 4, 5, 7, 9, 11]);

// The sea's chords, a voicing each, held CHORD_BARS bars in turn; the drone under them, renewed every DRONE_BARS.
const CHORDS = Object.freeze([
  Object.freeze([50, 54, 57, 61]), // Dmaj7
  Object.freeze([55, 59, 62, 66]), // Gmaj7
]);
const CHORD_BARS = 2;
const CHORD_VELOCITY = 48;
const DRONE = Object.freeze([38, 45]); // D2 and A2
const DRONE_BARS = 4;
const DRONE_VELOCITY = 52;

// Where each hemisphere's storms sing: the latitudes from `fromLat` (lowest note) to `toLat` (highest) spread over
// `octaves` of D major from `lowMidi`, about a note every 2 degrees. North is higher in both.
const PITCH_RANGE = Object.freeze({
  [Hemisphere.NORTH]: Object.freeze({ fromLat: 5, toLat: 47, lowMidi: 50, octaves: 3 }), // D3 to D6
  [Hemisphere.SOUTH]: Object.freeze({ fromLat: -35, toLat: -5, lowMidi: 38, octaves: 2 }), // D2 to D4
});

// Storm voices: as many channels as storms can sound at once, fading ones included. Each glides with the pitch wheel
// over BEND_RANGE semitones either way; a jump farther than that strikes the new note.
const VOICES = 8;
const BEND_RANGE = 12;
const GLIDE = Object.freeze({ sec: 0.15, steps: 4 });
// A voice opens over `attackSec` and fades over `releaseSec` once its storm has ended, in `steps` expression changes.
const ATTACK = Object.freeze({ sec: 0.12, steps: 3 });
const RELEASE = Object.freeze({ sec: 0.8, steps: 8 });
// Loudness by wind: a depression at `weakest`, rising to 1 at category 5.
const WIND = Object.freeze({ fromKt: 34, toKt: 137, weakest: 0.35 });
const VELOCITY = Object.freeze({ weak: 60, strong: 110 });
// Degrees of longitude east (or west) of where a storm formed that pan it fully right (or left).
const PAN_FULL_DEG = 20;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** MIDI note of a scale degree of D major above `lowMidi` (a D). */
function degreeToMidi(lowMidi, degree) {
  const octave = Math.floor(degree / MAJOR.length);
  return lowMidi + 12 * octave + MAJOR[degree - octave * MAJOR.length];
}

/**
 * Loudness (0..1) of a storm `arc` degrees from the globe's centre, when the label's edge is `edgeDeg` from it: full
 * within half way to the edge, then down to silence at the edge along a squared cosine.
 */
function distanceGain(arc, edgeDeg) {
  const inner = edgeDeg / 2;
  if (arc <= inner) return 1;
  if (arc >= edgeDeg) return 0;
  return Math.cos(((arc - inner) / (edgeDeg - inner)) * (Math.PI / 2)) ** 2;
}

function windShare(windKt) {
  return clamp((windKt - WIND.fromKt) / (WIND.toKt - WIND.fromKt), 0, 1);
}

/**
 * The song (see music/data/sound-engine.js) of a storm season track that plays `span` over `durationSec`, held over
 * `focus`. The mix stays straight ahead (its path is the focus alone); each storm has its own pan instead.
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
  stepSec = 60 / BPM / STEPS_PER_BEAT;
  stepsPerBar = STEPS_PER_BAR;
  bendRangeSemitones = BEND_RANGE;

  /**
   * @param {Object} lead the Instrument the storms sing on
   * @param {string} hemisphere one of Hemisphere: where the track's storms sing
   */
  constructor(lead, hemisphere) {
    this.range = PITCH_RANGE[hemisphere];
    this.voices = Array.from({ length: VOICES }, () => Object.freeze({ ...lead }));
    this.instruments = Object.freeze([Instrument.HALO_PAD, Instrument.PAD, ...this.voices]);
  }

  /** @param {ReturnType<typeof seasonSong>} song */
  setSong(song) {
    this.song = song;
  }

  reset() {
    // The voice singing each storm, by its track: { voice, held (the struck note), pitch (where it glides to) }.
    this.singing = new Map();
    // When each voice has faded out and can take another storm.
    this.freeAt = new Map(this.voices.map((voice) => [voice, 0]));
  }

  /**
   * @param {import('./flock.js').Music} music
   * @param {{ sample: { storms: import('../../../tracks/domain/storm-season.js').Storm[] }, step: number, bar: number, at: number }} now
   */
  playStep(music, { sample, step, bar, at }) {
    if (step === 0) this.playSea(music, bar, at);
    const alive = new Set();
    for (const storm of sample.storms) {
      alive.add(storm.track);
      const sound = this.soundOf(storm);
      const singer = this.singing.get(storm.track);
      if (singer) this.move(music, singer, sound, at);
      else this.open(music, storm.track, sound, at);
    }
    for (const [track, singer] of this.singing) {
      if (alive.has(track)) continue;
      this.close(music, singer, at);
      this.singing.delete(track);
    }
  }

  // The sea, held under everything.
  playSea(music, bar, at) {
    if (bar % CHORD_BARS === 0) {
      const chord = CHORDS[(bar / CHORD_BARS) % CHORDS.length];
      for (const midi of chord) music.note(Instrument.HALO_PAD, midi, CHORD_VELOCITY, at, CHORD_BARS * STEPS_PER_BAR);
    }
    if (bar % DRONE_BARS === 0) {
      for (const midi of DRONE) music.note(Instrument.PAD, midi, DRONE_VELOCITY, at, DRONE_BARS * STEPS_PER_BAR);
    }
  }

  // What a storm sounds like now: its note, loudness (0..1), pan (0..127) and how hard a new note is struck.
  soundOf(storm) {
    const { fromLat, toLat, lowMidi, octaves } = this.range;
    const top = octaves * MAJOR.length;
    const degree = clamp(Math.round(((storm.lat - fromLat) / (toLat - fromLat)) * top), 0, top);
    const { focus } = this.song;
    const wind = windShare(storm.wind);
    const level = distanceGain(arcDeg(focus.lat, focus.lon, storm.lat, storm.lon), focus.arcDeg) * (WIND.weakest + (1 - WIND.weakest) * wind);
    return {
      pitch: degreeToMidi(lowMidi, degree),
      expression: Math.round(127 * level),
      pan: Math.round(64 + 63 * clamp(storm.east / PAN_FULL_DEG, -1, 1)),
      velocity: VELOCITY.weak + (VELOCITY.strong - VELOCITY.weak) * wind,
    };
  }

  // A storm has formed: a free voice strikes its note and opens.
  open(music, track, sound, at) {
    const voice = this.voices.find((v) => this.freeAt.get(v) <= at && ![...this.singing.values()].some((s) => s.voice === v));
    if (!voice) return;
    music.control(voice, CC.EXPRESSION, 0, at);
    music.control(voice, CC.PAN, sound.pan, at);
    music.bend(voice, 0, at);
    music.hold(voice, sound.pitch, sound.velocity, at);
    for (let k = 1; k <= ATTACK.steps; k++) {
      music.control(voice, CC.EXPRESSION, Math.round((sound.expression * k) / ATTACK.steps), at + (ATTACK.sec * k) / ATTACK.steps);
    }
    this.singing.set(track, { voice, held: sound.pitch, pitch: sound.pitch, expression: sound.expression });
  }

  // A storm goes on: its voice glides to its note, and follows its loudness and pan.
  move(music, singer, sound, at) {
    const { voice } = singer;
    if (sound.pitch !== singer.pitch) {
      if (Math.abs(sound.pitch - singer.held) > BEND_RANGE) {
        music.release(voice, singer.held, at);
        music.bend(voice, 0, at);
        music.hold(voice, sound.pitch, sound.velocity, at);
        singer.held = sound.pitch;
      } else {
        for (let k = 1; k <= GLIDE.steps; k++) {
          const pitch = singer.pitch + ((sound.pitch - singer.pitch) * k) / GLIDE.steps;
          music.bend(voice, pitch - singer.held, at + (GLIDE.sec * (k - 1)) / GLIDE.steps);
        }
      }
      singer.pitch = sound.pitch;
    }
    music.control(voice, CC.EXPRESSION, sound.expression, at);
    music.control(voice, CC.PAN, sound.pan, at);
    singer.expression = sound.expression;
  }

  // A storm has ended: its voice fades out, then lets go of its note.
  close(music, singer, at) {
    const { voice } = singer;
    for (let k = 1; k <= RELEASE.steps; k++) {
      music.control(voice, CC.EXPRESSION, Math.round(singer.expression * (1 - k / RELEASE.steps)), at + (RELEASE.sec * k) / RELEASE.steps);
    }
    music.release(voice, singer.held, at + RELEASE.sec);
    this.freeAt.set(voice, at + RELEASE.sec);
  }
}
