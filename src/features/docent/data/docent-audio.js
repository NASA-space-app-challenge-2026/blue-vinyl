// Recorded docent audio (made with ElevenLabs), by album id, to play in place of the browser's speech synthesis.
//
// - intro: the album's introduction read through, its title first (introText). `sentences` is where each of its
//   sentences starts and ends in the file (s), found from the pauses between them, so each is played, and captioned,
//   on its own, with the docent's own breath between (see docent-voice.js).
// - tracks: each track's announcement (trackAnnouncement), one file a track, with where its words start and end, the
//   silence the recording leaves round them cut away.
//
// A sentence with no recording (an album not yet recorded) is spoken by the browser.

import { introText, sentencesOf, trackAnnouncement } from '../domain/docent.js';

const DOCENT_AUDIO = Object.freeze({
  'arctic-bird': {
    intro: {
      url: 'assets/docent/arctic-bird/intro.mp3',
      sentences: [
        [0.05, 1.38],
        [2.03, 7.94],
        [8.56, 17.59],
      ],
    },
    tracks: [
      { url: 'assets/docent/arctic-bird/track-1.mp3', span: [0.07, 3.13] },
      { url: 'assets/docent/arctic-bird/track-2.mp3', span: [0.11, 2.19] },
      { url: 'assets/docent/arctic-bird/track-3.mp3', span: [0.09, 2.82] },
      { url: 'assets/docent/arctic-bird/track-4.mp3', span: [0.07, 2.73] },
    ],
  },
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
  const text = trackAnnouncement(trackIndex, title);
  const recording = DOCENT_AUDIO[albumId]?.tracks?.[trackIndex];
  if (!recording) return [{ text }];
  const [startSec, endSec] = recording.span;
  return [{ text, clip: { url: recording.url, startSec, endSec } }];
}
