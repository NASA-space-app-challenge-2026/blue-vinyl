'use strict';

const SOUND_URLS = Object.freeze([
  new URL('../assets/meow-1.mp3', import.meta.url).href,
  new URL('../assets/meow-2.m4a', import.meta.url).href,
  new URL('../assets/meow-3.m4a', import.meta.url).href,
]);

const DEFAULT_VOLUME = 0.3;

/**
 * Loads and plays cute, cheerful kitten meows at a gentle volume.
 * Cycles through distinct high-pitched meow samples with subtle pitch jitter.
 */
export function createCatSound() {
  let audioContext = null;
  const audioBuffers = new Map();

  // Pre-load via HTMLAudio elements for instant synchronous availability
  SOUND_URLS.forEach((url) => {
    const audio = new Audio(url);
    audio.preload = 'auto';
    audio.load();
  });

  // Pre-decode into Web Audio buffers for zero-latency overlapping playback
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      audioContext = new AudioCtx();
      SOUND_URLS.forEach((url) => {
        fetch(url)
          .then((res) => res.arrayBuffer())
          .then((buf) => audioContext.decodeAudioData(buf))
          .then((decoded) => {
            audioBuffers.set(url, decoded);
          })
          .catch(() => {});
      });
    }
  } catch {
    // AudioContext blocked or unsupported
  }

  let lastIndex = -1;

  function pickSoundIndex() {
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * SOUND_URLS.length);
    } while (nextIndex === lastIndex && SOUND_URLS.length > 1);
    lastIndex = nextIndex;
    return nextIndex;
  }

  function play() {
    const index = pickSoundIndex();
    const url = SOUND_URLS[index];
    // Bright, sweet pitch variation for cute kitten vocalization
    const pitch = 1.02 + Math.random() * 0.08;

    const buffer = audioBuffers.get(url);
    if (audioContext && buffer) {
      try {
        if (audioContext.state === 'suspended') {
          audioContext.resume().catch(() => {});
        }
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = pitch;
        const gain = audioContext.createGain();
        gain.gain.value = DEFAULT_VOLUME;
        source.connect(gain);
        gain.connect(audioContext.destination);
        source.start(0);
        return;
      } catch (err) {
        console.warn('Web Audio meow failed, falling back to HTML Audio:', err);
      }
    }

    // Synchronous HTML Audio fallback
    try {
      const audio = new Audio(url);
      audio.playbackRate = pitch;
      audio.volume = DEFAULT_VOLUME;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => console.warn('HTML Audio meow failed:', err));
      }
    } catch (err) {
      console.warn('Failed to play meow sound:', err);
    }
  }

  return Object.freeze({ play });
}
