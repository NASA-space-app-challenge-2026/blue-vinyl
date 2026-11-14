export const PlaybackState = Object.freeze({
  /** Tonearm rests off the record. */
  STOPPED: 'stopped',
  /** Tonearm is moving onto the record. */
  CUEING: 'cueing',
  /** Stylus is on the record and the clock runs. */
  PLAYING: 'playing',
  /** The listener holds the tonearm; the clock follows the needle instead of running. */
  SCRUBBING: 'scrubbing',
});
