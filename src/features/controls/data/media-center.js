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
// The artwork the media controls show: the cover's middle square, at this many pixels a side.
const ARTWORK = Object.freeze({ sizePx: 512, type: 'image/jpeg', quality: 0.9 });

/** The middle square of the image at `url`, as a data URL. */
async function squareArtwork(url) {
  const image = new Image();
  image.src = url;
  await image.decode();
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = ARTWORK.sizePx;
  canvas.height = ARTWORK.sizePx;
  canvas.getContext('2d').drawImage(
    image,
    (image.naturalWidth - side) / 2,
    (image.naturalHeight - side) / 2,
    side,
    side,
    0,
    0,
    ARTWORK.sizePx,
    ARTWORK.sizePx,
  );
  return canvas.toDataURL(ARTWORK.type, ARTWORK.quality);
}

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
     * Shows the track in the media controls, its artwork once cropped; does nothing while it is the one shown.
     *
     * @param {{ key: string, title: string, album: string, artworkUrl: string }} track
     */
    async setTrack({ key, title, album, artworkUrl }) {
      if (!session || key === shownKey) return;
      shownKey = key;
      // The app is the artist, by the name its page goes by (index.html).
      const artist = document.title;
      session.metadata = new MediaMetadata({ title, artist, album });
      let src;
      try {
        src = await squareArtwork(artworkUrl);
      } catch (error) {
        console.warn('Media artwork unavailable:', error);
        return;
      }
      if (key !== shownKey) return;
      const size = `${ARTWORK.sizePx}x${ARTWORK.sizePx}`;
      session.metadata = new MediaMetadata({ title, artist, album, artwork: [{ src, sizes: size, type: ARTWORK.type }] });
    },
  };
}
