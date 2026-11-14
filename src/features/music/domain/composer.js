// What a composer is, and what it plays through. The sound engine (see data/sound-engine.js) keeps time and plays the
// sounds; an album's composer (see composers/) decides what plays.

/**
 * @typedef {Object} Music what a composer plays through
 * @property {(instrument: Object, midi: number, velocity: number, at: number, steps: number) => void} note
 * @property {(instrument: Object, cc: number, value: number, at: number) => void} control
 * @property {(patch: Object, midi: number, velocity: number, at: number, steps: number, shape: Object) => void} synthNote
 *   a note on the analog synth (see data/analog-synth.js)
 * @property {(velocity: number, at: number, steps: number, fromHz: number, toHz: number) => void} noise a noise hit
 * @property {(effect: Object, value: number, at: number) => void} effect turns an Effect on the whole mix (see effects.js)
 */

/**
 * @typedef {Object} Composer
 * @property {Object[]} instruments the Instruments it plays, at most 15
 * @property {number} stepSec one step's length
 * @property {number} stepsPerBar
 * @property {(song: Song) => void} setSong fits itself to a song
 * @property {() => void} reset returns to its opening state as the music starts over
 * @property {(music: Music, now: { time: number, step: number, bar: number, at: number, stepMs: number }) => void} playStep
 *   plays one step at audio time `at`, sounding the data at `time` and covering `stepMs` of data time
 * @property {(time: number) => ({ angle: number, gone: number } | null)} [spaceAt] where the mix sits at data `time`:
 *   its bearing from straight ahead (radians) and how far away it is (0 near to 1 far), or null to leave it where it
 *   is. Without it the mix sits straight ahead and near.
 */

/**
 * @typedef {Object} Song
 * @property {Composer} composer what plays the song
 * @property {number} msPerSec ms of data time that pass in a second of the track
 * @property {number} originMs the data time at the start of the track
 */

export {};
