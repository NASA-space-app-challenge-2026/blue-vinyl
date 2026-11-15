// Recorded docent audio (made with ElevenLabs), by album id, to play in place of the browser's speech synthesis.
//
// - intro: the album's introduction read through, its title first (introText). `sentences` is where each of its
//   sentences starts and ends in the file (s), found from the pauses between them, so each is played, and captioned,
//   on its own, with the docent's own breath between (see docent-voice.js).
// - tracks: each track's announcement (trackAnnouncement), one file a track, with where its words start and end, the
//   silence the recording leaves round them cut away.
//
// A sentence with no recording (an album not yet recorded) is spoken by the browser.

import { SENTENCE_GAP_SEC, docentIntroSec, introText, sentencesOf, trackAnnouncement } from '../domain/docent.js';

const DOCENT_DIR = 'assets/docent';

// An album's recordings, in DOCENT_DIR/<album id>/: intro.mp3, its sentences' spans, and track-1.mp3, track-2.mp3, …,
// each one's span (all in s). A track recorded under a name it is yet to be given in the catalog gives that name too
// ({ span, title }), so its caption says what the recording does.
function recording(albumId, sentences, tracks) {
  return {
    intro: { url: `${DOCENT_DIR}/${albumId}/intro.mp3`, sentences },
    tracks: tracks.map((track, i) => ({
      url: `${DOCENT_DIR}/${albumId}/track-${i + 1}.mp3`,
      ...(Array.isArray(track) ? { span: track } : track),
    })),
  };
}

// The spans were found from each file's pauses (a sentence's end being the pause that best fits its share of the
// words), on the recordings of 2026-11-15.
const DOCENT_AUDIO = Object.freeze({
  'arctic-bird': recording(
    'arctic-bird',
    [[0.09, 1.44], [2.05, 7.76], [8.38, 14.61]],
    [[0.07, 3.13], [0.11, 2.19], [0.09, 2.82], [0.07, 2.73]],
  ),
  glacier: recording(
    'glacier',
    [[0.09, 1.43], [1.94, 8.56], [9.19, 16.65]],
    [[0.03, 2.03], [0.09, 2.25]],
  ),
  lightning: recording(
    'lightning',
    [[0.04, 1.78], [2.51, 6.24], [6.89, 14.61], [15.18, 18.63]],
    [[0.06, 3.18], [0.07, 2.9]],
  ),
  forest: recording(
    'forest',
    [[0.04, 1.46], [2.07, 6.42], [7, 15.27]],
    [[0.06, 5.28]],
  ),
  'hot-oceans': recording(
    'hot-oceans',
    [[0.1, 1.58], [2.18, 6.39], [6.92, 15.64]],
    [[0.07, 3.3], [0.06, 3.2], [0.07, 3.06], [0.06, 3.11]],
  ),
  hemispheres: recording(
    'hemispheres',
    [[0.03, 1.14], [1.71, 6.73], [7.32, 14.42]],
    [[0.04, 3.47], [0.06, 3.47]],
  ),
  wildfire: recording(
    'wildfire',
    [[0.07, 1.69], [2.28, 7.27], [7.92, 15.7]],
    [[0.06, 2.52], [0.07, 3.17]],
  ),
  aerosol: recording(
    'aerosol',
    [[0.07, 1.45], [2.09, 8.25], [8.9, 17.37]],
    // Track 4 is recorded as "Etna's Breath", the name it is to be given in place of "Spain and Etna".
    [[0.06, 2.56], [0.07, 2.62], [0.06, 3], { span: [0.06, 2.34], title: "Etna's Breath" }],
  ),
  smog: recording(
    'smog',
    [[0.04, 2.2], [2.91, 7.67], [8.27, 18.74]],
    [[0.06, 3.15], [0.07, 3.28], [0.07, 3.42]],
  ),
});

/**
 * @typedef {Object} DocentLine
 * @property {string} text the sentence, as the bubble shows it
 * @property {{ url: string, startSec: number, endSec: number }} [clip] where it is recorded, if it is
 */

/**
 * The docent's introduction to an album as lines to say: its title, then its introduction's sentences, each with its
 * recording where there is one.
 *
 * @param {string} albumId
 * @param {string} albumTitle
 * @param {string | undefined} tip the album's introduction
 * @returns {DocentLine[]}
 */
export function introLines(albumId, albumTitle, tip) {
  const recording = DOCENT_AUDIO[albumId]?.intro;
  return sentencesOf(introText(albumTitle, tip)).map((text, i) => {
    const span = recording?.sentences[i];
    return span ? { text, clip: { url: recording.url, startSec: span[0], endSec: span[1] } } : { text };
  });
}

/**
 * A track's announcement as the one line to say, with its recording where there is one.
 *
 * @param {string} albumId
 * @param {number} trackIndex from 0
 * @param {string} title
 * @returns {DocentLine[]}
 */
export function trackLines(albumId, trackIndex, title) {
  const recording = DOCENT_AUDIO[albumId]?.tracks?.[trackIndex];
  const text = trackAnnouncement(trackIndex, recording?.title ?? title);
  if (!recording) return [{ text }];
  const [startSec, endSec] = recording.span;
  return [{ text, clip: { url: recording.url, startSec, endSec } }];
}

/**
 * How long the docent's introduction to an album lasts, in whole seconds: its recording's sentences and the breaths
 * between them where it is recorded, else as long as its words would take to say.
 *
 * @param {string} albumId
 * @param {string} albumTitle
 * @param {string | undefined} tip the album's introduction
 */
export function introSec(albumId, albumTitle, tip) {
  const lines = introLines(albumId, albumTitle, tip);
  if (!lines.every((line) => line.clip)) return docentIntroSec(introText(albumTitle, tip));
  const said = lines.reduce((sec, { clip }) => sec + clip.endSec - clip.startSec, 0);
  return Math.max(1, Math.ceil(said + (lines.length - 1) * SENTENCE_GAP_SEC));
}
