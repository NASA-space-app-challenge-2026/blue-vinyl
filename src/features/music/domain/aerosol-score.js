// The music of the aerosol album, "Connected by the Air". EIC's message for the page: "What happens in one region—whether
// natural events or human activities—can affect weather patterns and air quality thousands of miles away." So each
// track follows one event (two in Spain and Etna) from where it starts to a distant place, with the numbers of
// section 9.4 of notebooks/aerosol_album.ipynb.
//
// Every event has a motif, and every day (a bar of 8 three-hour steps) the motif is heard three ways:
//  1. Source: close, dry, on the source's side of the stereo field; louder as the air at the source thickens.
//  2. Journey: its opening imitated by up to three voices as the plume spreads (area), each later, softer and more
//     blurred than the last as it reaches farther, walking across the stereo field as the front closes on the receptor.
//  3. Arrival: the whole motif on a second instrument, on the receptor's side, as loud as the air that arrives there.
// The same melody in two places tells the listener that the two places share the air. Each particle type keeps its
// instruments and each event its motif across the album: the Sahara's motif is heard behind Erin and leads Saharan Dust.
// Erin's lead is its own sea salt, churned up at the eye (EIC: "blue spirals"): a violin in the middle whose echoes
// circle out to both sides as the salt spreads, with no distant place to reach; under it, strings that swell with the
// wind and timpani at its peak.

import { minorDegree, velocityGain } from './pitch.js';

export const AerosolInstrument = Object.freeze({
  GUITAR: 'acoustic_guitar_nylon',
  HARP: 'orchestral_harp',
  CELLO: 'cello',
  HORN: 'french_horn',
  CELESTA: 'celesta',
  VIOLIN: 'violin',
  VIBRAPHONE: 'vibraphone',
  STRINGS: 'string_ensemble_1',
  TIMPANI: 'timpani',
});

/** What a note belongs to: the particle toggle that mutes it, or the bed under every track. */
export const AerosolPart = Object.freeze({
  SALT: 'salt',
  DUST: 'dust',
  SMOKE: 'smoke',
  SULFATE: 'sulfate',
  BED: 'bed',
});

// Levels that even out the SoundFont's instruments against each other.
const MIX = Object.freeze({
  [AerosolInstrument.GUITAR]: 2.2,
  [AerosolInstrument.HARP]: 2.0,
  [AerosolInstrument.CELLO]: 2.0,
  [AerosolInstrument.HORN]: 1.6,
  [AerosolInstrument.CELESTA]: 1.6,
  [AerosolInstrument.VIOLIN]: 2.0,
  [AerosolInstrument.VIBRAPHONE]: 1.6,
  [AerosolInstrument.STRINGS]: 1.8,
  [AerosolInstrument.TIMPANI]: 4.5,
});

const TONIC = 0; // C minor
const STEPS_PER_BAR = 8; // a day
// A particle type's instruments, at its source and where it arrives, and the motif's home note on each. Sea salt only
// spreads round the storm that makes it, so it has no arrival.
const VOICES = Object.freeze({
  seaSalt: { source: AerosolInstrument.VIOLIN, arrival: null, home: 67, arrivalHome: 67 },
  dust: { source: AerosolInstrument.GUITAR, arrival: AerosolInstrument.HARP, home: 60, arrivalHome: 60 },
  smoke: { source: AerosolInstrument.CELLO, arrival: AerosolInstrument.HORN, home: 48, arrivalHome: 60 },
  sulfate: { source: AerosolInstrument.CELESTA, arrival: AerosolInstrument.VIBRAPHONE, home: 72, arrivalHome: 72 },
});
// Each event's motif as [scale steps from home, beat]; a beat is an eighth of a bar's first half.
const MOTIFS = Object.freeze({
  erin: [[0, 0], [2, 1], [4, 2], [6, 3], [4, 4], [2, 5], [0, 6]],
  sahara: [[0, 0], [2, 1], [4, 2], [3, 3], [1, 5]],
  'southern-africa': [[0, 0], [-1, 1], [2, 2], [1, 4]],
  spain: [[4, 0], [3, 1], [2, 2], [0, 3]],
  etna: [[0, 0], [4, 1], [2, 2], [7, 3]],
});
// An echo's run by how fast the particles move, slowest to fastest (split at the track's quartiles of daily speed, as
// the bird album splits its flock's speed): how many notes it runs and how many beats apart.
const ECHO_TIERS = Object.freeze([
  { notes: 2, everyBeats: 1.4 },
  { notes: 3, everyBeats: 1 },
  { notes: 4, everyBeats: 0.75 },
  { notes: 6, everyBeats: 0.5 },
]);
// Right in front of the listener (see NoteEvent.space).
const HERE = Object.freeze({ angle: 0, gone: 0 });
// How far round (radians) a spreading plume's echoes turn in a day, from half this in calm air to one and a half
// times it at the storm's strongest; negative, anticlockwise, as Atlantic storms turn.
const SPIN_PER_DAY = Math.PI / 2;
const ARRIVAL_FLOOR = 0.2; // the arrival is silent until the receptor's AOD is this far up its range
// The particle toggle (and so the part) of each particle type.
const PART = Object.freeze({ seaSalt: 'salt', dust: 'dust', smoke: 'smoke', sulfate: 'sulfate' });

/**
 * A moment the globe shows what the music plays, from the track's start: the motif at the event's source, the k-th echo
 * of its journey, or its arrival. `strength` (0..1) is how loud it is played.
 *
 * @typedef {Object} AerosolCue
 * @property {number} timeSec
 * @property {'source' | 'echo' | 'arrival'} kind
 * @property {number} event index in the track's events
 * @property {number} k the echo's number, 1 to MAX_ECHOES (0 for the source and the arrival)
 * @property {number} strength
 */

/** How many echoes a journey has at most: the k-th sits k / MAX_ECHOES of the way from the source to the front. */
export const MAX_ECHOES = 3;

/**
 * Builds the notes of one aerosol track, from its start.
 *
 * @param {import('../../tracks/domain/aerosol-track.js').AerosolRecord[]} records
 * @param {number} durationSec
 * @param {import('../../album/domain/album.js').Track} track
 * @returns {import('./ice-sea-score.js').NoteEvent[]}
 */
export function aerosolScore(records, durationSec, track) {
  return compose(records, durationSec, track).notes;
}

/**
 * The moments of one aerosol track the globe draws, from the same numbers and at the same times as its notes.
 *
 * @param {import('../../tracks/domain/aerosol-track.js').AerosolRecord[]} records
 * @param {number} durationSec
 * @param {import('../../album/domain/album.js').Track} track
 * @returns {AerosolCue[]}
 */
export function aerosolCues(records, durationSec, track) {
  return compose(records, durationSec, track).cues;
}

function compose(records, durationSec, track) {
  const events = track?.aerosol?.events ?? [];
  if (!records?.length || !events.length) return { notes: [], cues: [] };
  const barSec = (durationSec / records.length) * STEPS_PER_BAR;
  const bars = chunk(records, STEPS_PER_BAR);

  const tonic = track.aerosol.tonic ?? TONIC;
  const notes = [];
  const cues = [];
  events.forEach((event, i) => {
    // A second event plays half a bar later, between the first one's motifs; an arrival alone keeps to the bar.
    const offsetSec = event.heard === 'arrival' ? 0 : (i * barSec) / 2;
    const out = eventNotes(event, i, bars, barSec, offsetSec, tonic);
    notes.push(...out.notes);
    cues.push(...out.cues);
  });
  notes.push(...(track.aerosol.trackEye ? stormNotes(bars, barSec, tonic) : bedNotes(bars.length, barSec)));

  for (const n of notes) {
    n.durationSec = Math.max(0.05, Math.min(n.durationSec, durationSec - n.timeSec - n.releaseSec));
  }
  return {
    notes: notes.filter((n) => n.timeSec < durationSec).sort((a, b) => a.timeSec - b.timeSec),
    cues: cues.filter((c) => c.timeSec < durationSec).sort((a, b) => a.timeSec - b.timeSec),
  };
}

/** Source, journey and arrival of one event, a bar a day, `offsetSec` into each bar, and the cues that show them. */
function eventNotes(event, eventIndex, bars, barSec, offsetSec, tonic) {
  const voice = VOICES[event.particle];
  const motif = MOTIFS[event.id];
  if (!voice || !motif) return { notes: [], cues: [] };
  const beatSec = barSec / 16;
  const part = PART[event.particle];
  const level = event.level ?? 1;

  const days = bars.map((records) => {
    const mean = (key) => average(records.map((r) => r.plumes[event.particle]?.[key] ?? 0));
    const view = records[0];
    const place = (p) => (p === 'eye' ? { lat: view.viewLat, lon: view.viewLon } : p);
    const source = place(event.source);
    const receptor = event.receptor ? place(event.receptor) : null;
    const area = mean('areaMillionKm2');
    // The front, where the plume is nearest its receptor; at the source while there is no plume.
    const front = receptor && area > 0 ? { lat: mean('frontLat'), lon: mean('frontLon') } : source;
    return {
      source,
      receptor,
      sourceAod: mean('sourceAod'),
      receptorAod: receptor ? mean('receptorAod') : 0,
      reachKm: mean('reachKm'),
      area,
      frontToReceptorKm: receptor ? mean('frontToReceptorKm') : 0,
      frontAngle: bearing(source, front),
      frontKm: distanceKm(source, front),
      // How fast this particle type moves in view (mass flux over mass), as the bird album hears its flock's speed.
      speed: average(records.map((r) => r[event.particle]?.speed ?? 0)),
      windKt: average(records.map((r) => r.erinWindKt ?? 0)),
    };
  });
  const scale = (key) => range(days.map((d) => d[key]));
  const sourceScale = scale('sourceAod');
  const arrival = scale('receptorAod');
  const reach = scale('reachKm');
  const area = scale('area');
  const wind = scale('windKt');
  const tierOf = tiers(days.map((d) => d.speed), ECHO_TIERS.length);
  const furthestKm = Math.max(1, ...days.map((d) => d.frontKm));
  const motifBeats = Math.max(...motif.map(([, beat]) => beat)) + 1;
  const heardFrom = event.heard !== 'arrival';

  const notes = [];
  const cues = [];
  const cue = (timeSec, kind, k, strength) => cues.push({ timeSec, kind, event: eventIndex, k, strength });
  let spin = 0; // where a spreading event's echoes stand in their circle round the listener
  days.forEach((day, b) => {
    const start = b * barSec + offsetSec;
    const before = days[Math.max(0, b - 1)];

    // 1. Source, right in front of the listener, who stands where the event starts. A spinning motif goes round up to
    // three times in the same time as the wind rises.
    const strength = sourceScale(day.sourceAod);
    const sourceGain = velocityGain(45 + 65 * strength) * MIX[voice.source] * level;
    const turns = event.spin ? 1 + Math.round(2 * wind(day.windKt)) : 1;
    if (heardFrom) cue(start, 'source', 0, strength * level);
    for (let turn = 0; heardFrom && turn < turns; turn++) {
      for (const [step, beat] of motif) {
        notes.push({
          timeSec: start + ((turn * motifBeats + beat) * beatSec) / turns,
          durationSec: (beatSec * 1.6) / Math.sqrt(turns),
          instrument: voice.source,
          part,
          midi: minorDegree(voice.home, step, tonic),
          gain: sourceGain,
          space: HERE,
          attackSec: 0.02,
          releaseSec: 0.25,
        });
      }
    }

    // 2. Journey: no plume, no echoes. Each echo sounds further out than the last, towards the plume's front (or, for a
    // plume that only spreads, round the listener the way an Atlantic storm turns), as the bird album places its flock.
    // The particles' speed sets how many notes an echo runs, as the flock's speed does; the run climbs while the front
    // closes on the receptor (or the plume grows) and falls while it draws back.
    const echoes = heardFrom && day.area > 0 ? 1 + Math.round((MAX_ECHOES - 1) * area(day.area)) : 0;
    const far = reach(day.reachKm);
    const gapSec = beatSec * (2 + 3 * far);
    const tier = ECHO_TIERS[tierOf(day.speed)];
    const closing = day.receptor ? day.frontToReceptorKm <= before.frontToReceptorKm : day.area >= before.area;
    const run = closing ? 1 : -1;
    if (event.spin) spin -= SPIN_PER_DAY * (0.5 + wind(day.windKt));
    for (let k = 1; k <= echoes; k++) {
      const at = start + beatSec * 4 + (k - 1) * gapSec;
      const space = day.receptor
        ? { angle: day.frontAngle, gone: (day.frontKm / furthestKm) * (k / echoes) }
        : { angle: spin - ((k - 1) * 2 * Math.PI) / MAX_ECHOES, gone: (k / MAX_ECHOES) * (0.4 + 0.6 * far) };
      cue(at, 'echo', k, strength * level * 0.62 ** k);
      for (let j = 0; j < tier.notes; j++) {
        notes.push({
          timeSec: at + j * beatSec * tier.everyBeats * (1 + 0.5 * far),
          durationSec: beatSec * (1.2 + k) * tier.everyBeats,
          instrument: voice.source,
          part,
          midi: minorDegree(voice.home, motif[0][0] + run * (j + k - 1), tonic),
          gain: sourceGain * 0.62 ** k,
          space,
          attackSec: 0.03 + 0.08 * k,
          releaseSec: 0.4 + 0.35 * k,
        });
      }
    }

    // 3. Arrival, from the receptor's direction, far away; or close by, coming in from the source's side, when the
    // receptor is the eye the listener stands in.
    const arrived = arrival(day.receptorAod);
    if (voice.arrival && day.receptor && arrived >= ARRIVAL_FLOOR) {
      const space = event.receptor === 'eye'
        ? { angle: bearing(day.receptor, day.source), gone: 0.15 }
        : { angle: bearing(day.source, day.receptor), gone: 1 };
      cue(start + barSec / 2, 'arrival', 0, arrived * level);
      for (const [step, beat] of motif) {
        notes.push({
          timeSec: start + barSec / 2 + beat * beatSec * 1.25,
          durationSec: beatSec * 2.2,
          instrument: voice.arrival,
          part,
          midi: minorDegree(voice.arrivalHome, step, tonic),
          gain: velocityGain(40 + 70 * arrived) * MIX[voice.arrival] * level,
          space,
          attackSec: 0.08,
          releaseSec: 0.6,
        });
      }
    }
  });
  return { notes, cues };
}

/** Under Erin's salt: a minor chord a day that swells with the salt at the eye, timpani on the windiest day. */
function stormNotes(bars, barSec, tonic) {
  const days = bars.map((records) => ({
    salt: average(records.map((r) => r.seaSalt.aod)),
    windKt: average(records.map((r) => r.erinWindKt ?? 0)),
  }));
  const salt = range(days.map((d) => d.salt));
  const peak = days.reduce((best, d, i) => (d.windKt > days[best].windKt ? i : best), 0);
  const notes = [];
  days.forEach((day, b) => {
    const start = b * barSec;
    const root = 48 + tonic - (tonic > 6 ? 12 : 0); // the tonic between G2 and F#3
    const chord = day.windKt >= 64 ? [root, root + 7, root + 15] : [root, root + 7]; // a third joins at 64 kt, a hurricane
    for (const midi of chord) {
      notes.push({
        timeSec: start,
        durationSec: barSec,
        instrument: AerosolInstrument.STRINGS,
        part: AerosolPart.SALT,
        midi,
        gain: velocityGain(40 + 60 * salt(day.salt)) * MIX[AerosolInstrument.STRINGS] * 0.6,
        pan: 0,
        attackSec: 0.6,
        releaseSec: 0.9,
      });
    }
    if (b === peak) {
      for (let k = 0; k < 3; k++) {
        notes.push({
          timeSec: start + (k * barSec) / 6,
          durationSec: 1.2,
          instrument: AerosolInstrument.TIMPANI,
          part: AerosolPart.SALT,
          midi: 36 + tonic - (tonic > 6 ? 12 : 0),
          gain: velocityGain(100 + 7 * k) * MIX[AerosolInstrument.TIMPANI],
          pan: 0,
          attackSec: 0.002,
          releaseSec: 0.9,
        });
      }
    }
  });
  return notes;
}

/** A quiet open fifth every two days, the air the events travel through. */
function bedNotes(barCount, barSec) {
  const notes = [];
  for (let b = 0; b < barCount; b += 2) {
    for (const midi of [36, 43]) {
      notes.push({
        timeSec: b * barSec,
        durationSec: 2 * barSec,
        instrument: AerosolInstrument.STRINGS,
        part: AerosolPart.BED,
        midi,
        gain: velocityGain(42) * MIX[AerosolInstrument.STRINGS] * 0.45,
        pan: 0,
        attackSec: 0.8,
        releaseSec: 1.2,
      });
    }
  }
  return notes;
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function average(values) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Maps values onto 0..1 between the smallest and the largest of `values`. */
function range(values) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return (v) => (hi > lo ? (v - lo) / (hi - lo) : 0);
}

/** Sorts values into `count` tiers at their quantiles; returns the tier (0 to count - 1) of a value. */
function tiers(values, count) {
  const sorted = [...values].sort((a, b) => a - b);
  const edges = Array.from({ length: count - 1 }, (_, i) => sorted[Math.floor(((i + 1) * sorted.length) / count)]);
  return (v) => edges.filter((edge) => v >= edge).length;
}

/** Bearing from `a` to `b`, radians clockwise from north. */
function bearing(a, b) {
  const rad = Math.PI / 180;
  const dLon = (b.lon - a.lon) * rad;
  const y = Math.sin(dLon) * Math.cos(b.lat * rad);
  const x = Math.cos(a.lat * rad) * Math.sin(b.lat * rad) - Math.sin(a.lat * rad) * Math.cos(b.lat * rad) * Math.cos(dLon);
  return Math.atan2(y, x);
}

/** Great-circle distance between two points, in km. */
function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const cos = Math.sin(a.lat * rad) * Math.sin(b.lat * rad)
    + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.cos((b.lon - a.lon) * rad);
  return 6371 * Math.acos(Math.max(-1, Math.min(1, cos)));
}
