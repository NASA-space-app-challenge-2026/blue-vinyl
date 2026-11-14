// Composer for the lightning album: a year of lightning over one side of the Earth. The two hemispheres are two
// different musics, and the track turns from one into the other and back as the lightning moves north and south.
//
//   south: dark and heavy. A low struck instrument (the track's `south`, see SouthInstrument) on the strong beats, a
//     deep analog bass thumping under it, in D minor.
//   north: bright and light. A shining struck instrument (the track's `north`, see NorthInstrument) answering on the
//     off-beats, a ticking hi-hat of noise, in D major.
//   fullness, bar by bar: how much lightning the part's hemisphere had in view (its level, 0 to 1). A quiet stretch
//     strikes only the strongest steps of its pattern (Part.groove), a busy one fills the off-beats and syncopations in
//     between, up to MAX_HITS a bar; none at all leaves the part silent.
//   loudness, bar by bar: the hemisphere's share of the lightning (its pull, see PULL). The two parts are as loud as
//     each other when the two hemispheres have as much (the lightning centred on the equator), and a part fades away as
//     the other side takes over. The pull sets the strikes' velocity, the channel's expression, the south's bass and
//     the north's hi-hat. The south's bass is kept down so that at an even pull the south does not outweigh the north.
//   key: the hemisphere with more lightning sets it, so the pad and every strike move from D minor to D major on the
//     bar the north overtakes the south, and back when the south overtakes it again.
//   pitch: each strike takes the pitch of one of the bar's flashes in its hemisphere, picked in the order they struck:
//     the further from the equator, the higher a northern note and the lower a southern one, on the key's pentatonic.
//   sync: the struck flashes (see the season's `flashes.struck`) are heard as they flare on the globe. Each waits for
//     its hemisphere's next strike and takes its pitch; so none waits long on a quiet bar, a waiting flash may also
//     strike the first SYNC_HITS steps of the groove. Each is marked with its strike's data time (`flashes.heardAt`;
//     Infinity while it waits), so the globe flares it with its sound.
//
// The steps are counted from the track's start, so its bars stay in place wherever the needle is set down.

import { Effect } from '../effects.js';
import { CC, Instrument } from '../instruments.js';
import { Patch } from '../patches.js';
import { Hemisphere, firstIndexAtOrAfter, seriesAt } from '../../../tracks/domain/lightning-season.js';

const BPM = 120;
const STEPS_PER_BEAT = 4;
const STEPS_PER_BAR = 16;

// The keys, one per hemisphere: its pentatonic (steps from D) and the pad's two chords, PAD_BARS bars each.
const Key = Object.freeze({
  [Hemisphere.SOUTH.key]: Object.freeze({
    pentatonic: [0, 3, 5, 7, 10],
    pad: [
      [50, 53, 57, 64],
      [46, 50, 53, 57],
    ],
  }),
  [Hemisphere.NORTH.key]: Object.freeze({
    pentatonic: [0, 2, 4, 7, 9],
    pad: [
      [50, 54, 57, 64],
      [55, 59, 62, 66],
    ],
  }),
});

// The instruments a track's hemispheres can be played on (its `north` and `south`).
export const NorthInstrument = Object.freeze({ CELESTA: Instrument.CELESTA, DULCIMER: Instrument.DULCIMER });
export const SouthInstrument = Object.freeze({ TAIKO: Instrument.TAIKO, KOTO: Instrument.KOTO });

// Each hemisphere's part: the channel volume its instrument plays at, its pattern's steps in the order a busier bar
// adds them (strong beats first for the south, off-beats first for the north), its pitch at the equator (`baseMidi`)
// and which way it moves away from it (`direction`: up for north, down for south), and its extra layer: the north's
// hi-hat (a noise tick on every strike), the south's bass (a deep analog note on the bar's first strikes).
const Part = Object.freeze({
  [Hemisphere.NORTH.key]: Object.freeze({
    volume: 127,
    groove: [2, 10, 6, 14, 0, 8, 4, 12, 3, 11, 7, 15, 13, 5, 9, 1],
    baseMidi: 74,
    direction: 1,
    hat: Object.freeze({ velocity: 60, steps: 0.5, fromHz: 8000, toHz: 12000 }),
    bass: null,
  }),
  [Hemisphere.SOUTH.key]: Object.freeze({
    volume: 127,
    groove: [0, 8, 12, 4, 10, 6, 14, 3, 11, 2, 7, 15, 9, 1, 5, 13],
    baseMidi: 50,
    direction: -1,
    hat: null,
    // On the first `strikes` steps of its groove, the key's root two octaves below D3.
    bass: Object.freeze({
      strikes: 4,
      midi: 26,
      velocity: 75,
      steps: 3,
      shape: Object.freeze({ cutoff: 2, resonance: 1, env: 3, decay: 0.25, gate: 0.2, release: 0.4 }),
    }),
  }),
});
// A full bar strikes this many steps.
const MAX_HITS = 12;
// A struck flash waiting to be heard may strike at least this many of its groove's steps, whatever the bar's level.
const SYNC_HITS = 4;
// A flash this far from the equator (degrees) sits DEGREES steps of the key's pentatonic from the part's base.
const FAR_LAT = 45;
const DEGREES = 8;
// A part's pull from its hemisphere's share of the lightning: none at `none` of it or less, full at `full` or more.
const PULL = Object.freeze({ none: 0.25, full: 0.75 });
// Loudness at no pull and at full pull, in the strikes' velocity (steps on the beat a little louder) and the
// channel's expression.
const VELOCITY = Object.freeze({ none: 40, all: 120, onBeat: 7 });
const EXPRESSION = Object.freeze({ none: 40, all: 127 });
const NOTE_STEPS = 2;

const PAD_BARS = 2;
const PAD_VELOCITY = 50;
const PAD_REVERB = 100;
// The whole mix's room and echo, the echo three steps behind.
const SPACE = Object.freeze({ reverb: 0.3, echo: 0.1, echoSteps: 3, feedback: 0.3 });

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = ({ none, all }, f) => none + (all - none) * f;

// The note (MIDI) for a flash at `lat` in `part`'s hemisphere, on `key`.
function noteOf(part, key, lat) {
  const { pentatonic } = key;
  const degree = Math.round(clamp(Math.abs(lat) / FAR_LAT, 0, 1) * DEGREES);
  const octave = Math.floor(degree / pentatonic.length);
  const offset = 12 * octave + pentatonic[degree - octave * pentatonic.length];
  return part.baseMidi + part.direction * offset;
}

export class LightningComposer {
  instruments = Object.freeze([Instrument.HALO_PAD, ...Object.values(NorthInstrument), ...Object.values(SouthInstrument)]);
  stepSec = 60 / BPM / STEPS_PER_BEAT;
  stepsPerBar = STEPS_PER_BAR;

  /**
   * @param {{ season: import('../../../tracks/domain/lightning-season.js').LightningSeason, north: Object, south: Object }} song
   *   the track's season, and the instruments its hemispheres are struck on (one of NorthInstrument, SouthInstrument)
   */
  setSong({ season, north, south }) {
    // The flashes the last season's music held back are drawn at their own time again.
    this.season?.flashes.heardAt.fill(NaN);
    this.season = season;
    this.inst = { [Hemisphere.NORTH.key]: north, [Hemisphere.SOUTH.key]: south };
  }

  reset() {
    this.started = false;
    // The data time struck flashes have been gathered up to, and each hemisphere's flashes waiting for its next strike.
    this.struckTo = null;
    this.waiting = { [Hemisphere.NORTH.key]: [], [Hemisphere.SOUTH.key]: [] };
    this.season?.flashes.heardAt.fill(NaN);
  }

  /**
   * @param {import('../composer.js').Music} music
   * @param {{ time: number, at: number, stepMs: number }} now
   */
  playStep(music, { time, at, stepMs }) {
    if (!this.started) this.start(music, at);
    const origin = this.season.t[0];
    const steps = Math.round((time - origin) / stepMs);
    const step = steps % STEPS_PER_BAR;
    const bar = Math.floor(steps / STEPS_PER_BAR);
    const barStart = origin + bar * STEPS_PER_BAR * stepMs;
    const barEnd = barStart + STEPS_PER_BAR * stepMs;
    const levels = Object.fromEntries(Object.values(Hemisphere).map((h) => [h.key, seriesAt(this.season, this.season[h.key], barStart)]));
    const north = levels[Hemisphere.NORTH.key];
    const south = levels[Hemisphere.SOUTH.key];
    const key = Key[north > south ? Hemisphere.NORTH.key : Hemisphere.SOUTH.key];
    if (step === 0 && bar % PAD_BARS === 0) this.playPad(music, key, bar, at);
    this.gather(time, time + stepMs);
    for (const hemisphere of Object.values(Hemisphere)) {
      const level = levels[hemisphere.key];
      const share = north + south > 0 ? level / (north + south) : 0.5;
      const pull = clamp((share - PULL.none) / (PULL.full - PULL.none), 0, 1);
      if (step === 0) music.control(this.inst[hemisphere.key], CC.EXPRESSION, Math.round(lerp(EXPRESSION, pull)), at);
      this.playPart(music, hemisphere, key, level, pull, { barStart, barEnd, step, time, at });
    }
  }

  start(music, at) {
    this.started = true;
    music.effect(Effect.REVERB, SPACE.reverb, at);
    music.effect(Effect.ECHO, SPACE.echo, at);
    music.effect(Effect.ECHO_TIME, SPACE.echoSteps * this.stepSec, at);
    music.effect(Effect.FEEDBACK, SPACE.feedback, at);
    music.control(Instrument.HALO_PAD, CC.REVERB, PAD_REVERB, at);
    for (const hemisphere of Object.values(Hemisphere)) {
      music.control(this.inst[hemisphere.key], CC.VOLUME, Part[hemisphere.key].volume, at);
    }
  }

  // `bar`: the bars since the track began.
  playPad(music, key, bar, at) {
    const chord = key.pad[Math.floor(bar / PAD_BARS) % key.pad.length];
    for (const midi of chord) music.note(Instrument.HALO_PAD, midi, PAD_VELOCITY, at, PAD_BARS * STEPS_PER_BAR);
  }

  // Gathers the struck flashes from `from` to `to` (data time) into their hemispheres' waiting. Picks up where the last
  // step left off when it is near, so the clock's jitter neither skips nor repeats one; taken back (the needle moved
  // back), it listens afresh.
  gather(from, to) {
    const { t, lat, struck, heardAt } = this.season.flashes;
    const near = this.struckTo !== null && Math.abs(from - this.struckTo) < to - from;
    if (!near) {
      for (const waiting of Object.values(this.waiting)) {
        for (const i of waiting) heardAt[i] = NaN;
        waiting.length = 0;
      }
      if (this.struckTo !== null && from < this.struckTo) heardAt.fill(NaN);
    }
    const start = near ? this.struckTo : from;
    this.struckTo = to;
    const end = firstIndexAtOrAfter(t, to);
    for (let i = firstIndexAtOrAfter(t, start); i < end; i++) {
      if (!struck[i]) continue;
      // Kept off the globe until it is heard.
      heardAt[i] = Infinity;
      this.waiting[(Hemisphere.NORTH.has(lat[i]) ? Hemisphere.NORTH : Hemisphere.SOUTH).key].push(i);
    }
  }

  // Strikes `hemisphere`'s part on `step` of the bar from `barStart` to `barEnd` if its groove reaches that step at its
  // `level`, or a struck flash waits and the step is among the groove's first SYNC_HITS, in `key`, as loud as its
  // `pull`. The strike takes the waiting flash's pitch and marks the waiting heard at `time`.
  playPart(music, hemisphere, key, level, pull, { barStart, barEnd, step, time, at }) {
    const part = Part[hemisphere.key];
    const waiting = this.waiting[hemisphere.key];
    const hits = level > 0 ? clamp(Math.round(level * MAX_HITS), 1, MAX_HITS) : 0;
    const rank = part.groove.indexOf(step);
    if (rank >= (waiting.length ? Math.max(hits, SYNC_HITS) : hits)) return;
    const { lat: flashLat, heardAt } = this.season.flashes;
    const lat = waiting.length ? flashLat[waiting[0]] : this.flashLat(hemisphere, barStart, barEnd, step);
    if (lat === null) return;
    for (const i of waiting) heardAt[i] = time;
    waiting.length = 0;
    const accent = step % STEPS_PER_BEAT === 0 ? VELOCITY.onBeat : 0;
    music.note(this.inst[hemisphere.key], noteOf(part, key, lat), Math.min(127, lerp(VELOCITY, pull) + accent), at, NOTE_STEPS);
    if (part.hat) music.noise(part.hat.velocity * pull, at, part.hat.steps, part.hat.fromHz, part.hat.toHz);
    if (part.bass && rank < part.bass.strikes) {
      const { midi, velocity, steps, shape } = part.bass;
      music.synthNote(Patch.CAVE, midi, velocity * pull, at, steps, shape);
    }
  }

  // The latitude of the bar's flash in `hemisphere` as far through its flashes as `step` is through the bar, or null
  // when the hemisphere had none drawn in it.
  flashLat(hemisphere, barStart, barEnd, step) {
    const { t, lat } = this.season.flashes;
    const own = [];
    for (let i = firstIndexAtOrAfter(t, barStart), to = firstIndexAtOrAfter(t, barEnd); i < to; i++) {
      if (hemisphere.has(lat[i])) own.push(lat[i]);
    }
    return own.length ? own[Math.floor((step / STEPS_PER_BAR) * own.length)] : null;
  }
}
