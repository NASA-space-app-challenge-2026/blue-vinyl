'use strict';

// Composition root: wires the features together.

import { albums } from '../features/album/data/albums.js';
import { albumDurationSec, trackBoundaries, trackIndexAt, wrapIndex } from '../features/album/domain/album.js';
import { createAlbumColumn } from '../features/album/presentation/album-column.js';
import { createAlbumCredit } from '../features/album/presentation/album-credit.js';
import { PlaybackState } from '../features/controls/domain/playback-state.js';
import { createAlbumSwitcher } from '../features/controls/presentation/album-switcher.js';
import { createFullscreenButton } from '../features/controls/presentation/fullscreen-button.js';
import { createGlassCapsule } from '../features/controls/presentation/glass-capsule.js';
import { createPlayButton } from '../features/controls/presentation/play-button.js';
import { createPlayHint } from '../features/controls/presentation/play-hint.js';
import { createSettingsMenu } from '../features/controls/presentation/settings-menu.js';
import { createVolumeControl } from '../features/controls/presentation/volume-control.js';
import { GLOBE_THEMES } from '../features/globe/data/globe-themes.js';
import { DEFAULT_GLOBE_THEME, GlobeTheme } from '../features/globe/domain/globe-theme.js';
import { createGlobeAttribution } from '../features/globe/presentation/globe-attribution.js';
import { createGlobeView } from '../features/globe/presentation/globe-view.js';
import { createSeaLevelOverlay } from '../features/globe/presentation/sea-level-overlay.js';
import { createMusicPlayer } from '../features/music/data/music-player.js';
import { SOUNDFONT_CREDIT } from '../features/music/data/soundfont-bank.js';
import { iceSeaScore } from '../features/music/domain/ice-sea-score.js';
import { loadIceSeaTrack } from '../features/tracks/data/track-repository.js';
import { recordYearAt } from '../features/tracks/domain/ice-sea-series.js';
import { YEAR_TIMELINE, yearAt } from '../features/tracks/domain/year-timeline.js';
import { createRecordSwap } from '../features/turntable/presentation/record-swap.js';
import { createTurntableView } from '../features/turntable/presentation/turntable-view.js';

// Set by showAlbum().
let albumIndex = 0;
let album;
let totalMs;
// Data of each track of the album, by track index; null until loaded, and for tracks without data.
/** @type {(import('../features/tracks/data/track-repository.js').IceSeaTrackData | null)[]} */
let trackData = [];

let state = PlaybackState.STOPPED;
let elapsedMs = 0;
let lastFrameTs = null;
let tickFrame = null;
// True while the records change; steps asked for meanwhile add up in pendingSteps.
let swapping = false;
let pendingSteps = 0;

const slot = (id) => document.getElementById(id);

const albumCredit = createAlbumCredit(slot('corner-bottom-right'));
const playHint = createPlayHint(slot('bottom-center'));

const albumColumn = createAlbumColumn(slot('stage'), albums);
const turntable = createTurntableView(slot('stage'), {
  onToggle: togglePlayback,
  onCued: () => {
    if (state === PlaybackState.CUEING) startPlaying();
  },
  onGrab: () => {
    music.unlock();
    setState(PlaybackState.SCRUBBING);
  },
  onScrub: (progress) => {
    if (progress === null) return;
    elapsedMs = progress * totalMs;
    render();
  },
  onDrop: (progress) => {
    elapsedMs = progress * totalMs;
    startPlaying();
  },
  onLift: () => setState(PlaybackState.STOPPED),
});
const recordSwap = createRecordSwap({ recordEl: turntable.recordEl, recordGeometry: turntable.recordGeometry, column: albumColumn });
const globe = createGlobeView(turntable.labelSlot);
const seaOverlay = createSeaLevelOverlay(turntable.labelSlot);
const music = createMusicPlayer();
const globeAttribution = createGlobeAttribution(slot('corner-bottom-right'));

const transportControls = createGlassCapsule(slot('corner-bottom-left'));
const playButton = createPlayButton(transportControls, { onToggle: togglePlayback });
createVolumeControl(transportControls, { onChange: (level) => music.setVolume(level) });
const albumControls = createGlassCapsule(slot('corner-bottom-left'));
createAlbumSwitcher(albumControls, {
  onPrevious: () => switchAlbum(-1),
  onNext: () => switchAlbum(1),
});
const viewControls = createGlassCapsule(slot('corner-top-right'));
createFullscreenButton(viewControls);
createSettingsMenu(viewControls, {
  globeThemes: Object.values(GlobeTheme).map((theme) => ({ value: theme, label: GLOBE_THEMES[theme].label })),
  globeTheme: DEFAULT_GLOBE_THEME,
  onGlobeThemeChange: applyGlobeTheme,
});
applyGlobeTheme(DEFAULT_GLOBE_THEME);

document.addEventListener('keydown', (event) => {
  // Focused controls (buttons, radios) already react to Space on their own.
  if (event.code !== 'Space' || event.target.closest('button, input')) return;
  event.preventDefault();
  togglePlayback();
});

function applyGlobeTheme(theme) {
  globe.setTheme(theme, GLOBE_THEMES[theme]);
  globeAttribution.render(GLOBE_THEMES[theme].attribution);
}

function showAlbum(index) {
  albumIndex = index;
  album = albums[albumIndex];
  totalMs = albumDurationSec(album) * 1000;
  albumColumn.setAlbum(albumIndex);
  turntable.setTrackStarts(trackBoundaries(album).slice(1, -1));
  albumCredit.render(album);
  trackData = album.tracks.map(() => null);
  music.load([]);
  loadAlbumData(album);
}

/**
 * Loads the data of the album's tracks, then builds the album's music: each track's notes, moved to where the
 * track starts. Playback that is already running picks the music up where it is.
 *
 * @param {import('../features/album/domain/album.js').Album} loading
 */
async function loadAlbumData(loading) {
  if (!loading.tracks.some((track) => track.iceSea)) return;
  let data;
  try {
    data = await Promise.all(loading.tracks.map((track) => (track.iceSea ? loadIceSeaTrack(track.iceSea) : null)));
  } catch (error) {
    console.warn('Album data unavailable:', error);
    return;
  }
  if (album !== loading) return;
  trackData = data;
  const starts = trackBoundaries(album).map((edge) => (edge * totalMs) / 1000);
  const notes = album.tracks.flatMap((track, i) => {
    if (!data[i]) return [];
    return iceSeaScore(data[i].years, track.iceSea.voice, YEAR_TIMELINE, track.durationSec)
      .map((note) => ({ ...note, timeSec: note.timeSec + starts[i] }));
  });
  music.load(notes);
  albumCredit.render(album, [SOUNDFONT_CREDIT]);
  if (state === PlaybackState.PLAYING) music.play(() => elapsedMs / 1000);
  render();
}

// Takes one of the steps asked for meanwhile, if any; 0 when none.
function takePendingStep() {
  const step = Math.sign(pendingSteps);
  pendingSteps -= step;
  return step;
}

/**
 * Changes records, once for `step` (-1 or 1) and once more for each step asked for meanwhile: the arm lifts, the
 * record goes into its sleeve and the column of sleeves moves along to the new album, whose record comes out stopped
 * at its start. The catalog wraps around.
 */
async function switchAlbum(step) {
  if (swapping) {
    pendingSteps += step;
    return;
  }
  swapping = true;
  // Nothing on the stage can be touched while the records change.
  slot('stage').inert = true;
  elapsedMs = 0;
  setState(PlaybackState.STOPPED);
  try {
    await recordSwap.play(step, (direction) => {
      showAlbum(wrapIndex(albumIndex + direction, albums.length));
      render();
    }, takePendingStep);
  } finally {
    pendingSteps = 0;
    slot('stage').inert = false;
    swapping = false;
  }
}

function togglePlayback() {
  if (swapping) return;
  music.unlock();
  setState(state === PlaybackState.STOPPED ? PlaybackState.CUEING : PlaybackState.STOPPED);
}

function startPlaying() {
  setState(PlaybackState.PLAYING);
  music.play(() => elapsedMs / 1000);
  cancelAnimationFrame(tickFrame);
  lastFrameTs = null;
  tickFrame = requestAnimationFrame(tick);
}

function render() {
  const progress = elapsedMs / totalMs;
  turntable.render(state, progress);
  albumColumn.render(trackIndexAt(album, progress));
  renderData(progress);
}

/**
 * Draws the year that plays at `progress` on the globe: its ice, the normal ice edge, the edge of the latest record
 * low, and the sea level. The intro, and the record at rest before it plays, show the first year.
 */
function renderData(progress) {
  const index = trackIndexAt(album, progress);
  const track = album.tracks[index];
  const data = trackData[index];
  if (!track.iceSea || !data) {
    globe.focus(null);
    globe.showIce(null);
    seaOverlay.render(null);
    return;
  }
  globe.focus(track.iceSea.poleLat);
  const trackSec = (progress - trackBoundaries(album)[index]) * (totalMs / 1000);
  const { years } = data;
  const now = yearAt(YEAR_TIMELINE, trackSec, years.length);
  const at = Math.max(0, now.index);
  const trackKey = `${album.id}:${index}`;
  const year = years[at];
  // Share of this year's beat played: the ice moves from last year's shape to this year's over the beat, starting
  // on the note and settling into the shape; the water eases from this year's level towards the next.
  const along = now.index < 0 ? 0 : Math.min(1, now.beatSec / YEAR_TIMELINE.beatSec);
  const settle = 1 - (1 - along) ** 3;
  const next = years[Math.min(at + 1, years.length - 1)];
  const recordYear = recordYearAt(data.years, at);
  globe.showIce({
    key: trackKey,
    poleLat: track.iceSea.poleLat,
    shapes: data.iceShapes,
    at: at === 0 ? 0 : at - 1 + settle,
    normal: data.normal,
    record: recordYear === null ? null : data.iceByYear.get(recordYear) ?? null,
    linesKey: `${trackKey}:${recordYear}`,
  });
  seaOverlay.render({
    year: year.year,
    firstYear: years[0].year,
    extent: year.extent,
    normal: year.normal,
    seaLevelMm: year.seaLevelMm,
    waterMm: year.seaLevelMm + (next.seaLevelMm - year.seaLevelMm) * along,
  });
}

function setState(next) {
  if (next !== PlaybackState.PLAYING) music.stop();
  state = next;
  playHint.render(state);
  playButton.render(state);
  render();
}

function tick(ts) {
  if (state !== PlaybackState.PLAYING) return;
  // The sound sets the clock while it plays, so the globe follows what is heard; until then the frames do.
  const heardSec = music.positionSec();
  if (heardSec !== null) elapsedMs = heardSec * 1000;
  else if (lastFrameTs !== null) elapsedMs += ts - lastFrameTs;
  lastFrameTs = ts;
  if (elapsedMs >= totalMs) {
    elapsedMs = 0;
    setState(PlaybackState.STOPPED);
    return;
  }
  render();
  tickFrame = requestAnimationFrame(tick);
}

showAlbum(albumIndex);
setState(PlaybackState.STOPPED);
