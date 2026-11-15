// Connects playback to the system's media controls (lock screen, notification shade, media keys) through the Media
// Session API.
//
// The music is made with Web Audio, which a browser does not count as media: it shows no media controls for it, and a
// mobile browser silences it once the page goes to the background. So a silent <audio> element plays alongside while
// the music plays; it is what the system sees as playing.

// The silent loop's length and format; Android shows media controls only for media at least 5 s long.
const SILENCE = Object.freeze({ seconds: 10, sampleRate: 8000 });
// 8-bit PCM is unsigned, centred on 128.
const SILENT_SAMPLE = 128;

/** A WAV of silence, mono 8-bit PCM. */
function silentWav() {
  const samples = SILENCE.seconds * SILENCE.sampleRate;
  const view = new DataView(new ArrayBuffer(44 + samples));
  const text = (at, s) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, SILENCE.sampleRate, true);
  view.setUint32(28, SILENCE.sampleRate, true); // bytes per second
  view.setUint16(32, 1, true); // bytes per frame
  view.setUint16(34, 8, true); // bits per sample
  text(36, 'data');
  view.setUint32(40, samples, true);
  for (let i = 0; i < samples; i++) view.setUint8(44 + i, SILENT_SAMPLE);
  return new Blob([view], { type: 'audio/wav' });
}

/**
 * @param {{ onPlay: () => void, onPause: () => void, onPrevious: () => void, onNext: () => void }} handlers
 */
export function createMediaCenter({ onPlay, onPause, onPrevious, onNext }) {
  const session = navigator.mediaSession ?? null;
  const element = new Audio(URL.createObjectURL(silentWav()));
  element.loop = true;
  let playing = false;
  let shownKey = null;

  // Safari: play Web Audio as media, so it keeps going in the background and ignores the ring/silent switch.
  if (navigator.audioSession) navigator.audioSession.type = 'playback';

  if (session) {
    session.setActionHandler('play', onPlay);
    session.setActionHandler('pause', onPause);
    session.setActionHandler('previoustrack', onPrevious);
    session.setActionHandler('nexttrack', onNext);
  }

  function play() {
    element.play().catch(() => {
      // Not allowed before the first user gesture; unlock() plays it from one.
    });
  }

  return {
    /** Browsers let media start only after a user gesture; call this from one. */
    unlock() {
      element.play().then(() => {
        if (!playing) element.pause();
      }, () => {});
    },

    /** @param {boolean} next whether the music plays */
    setPlaying(next) {
      playing = next;
      if (playing) play();
      else element.pause();
      if (session) session.playbackState = playing ? 'playing' : 'paused';
    },

    /**
     * Shows the track in the media controls; does nothing while it is the one shown.
     *
     * @param {{ key: string, title: string, album: string, artworkUrl: string }} track
     */
    setTrack({ key, title, album, artworkUrl }) {
      if (!session || key === shownKey) return;
      shownKey = key;
      session.metadata = new MediaMetadata({ title, album, artwork: [{ src: new URL(artworkUrl, document.baseURI).href }] });
    },
  };
}
