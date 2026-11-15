// Lengths of time as a screen reader should say them: "1:20" on screen would be read out as "1 colon 20".

/** @param {number} sec a length of time @returns {string} in words for a screen reader, such as "3 minutes 5 seconds" */
export function spokenDuration(sec) {
  const whole = Math.round(sec);
  const minutes = Math.floor(whole / 60);
  const seconds = whole % 60;
  const unit = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  if (minutes === 0) return unit(seconds, 'second');
  return seconds === 0 ? unit(minutes, 'minute') : `${unit(minutes, 'minute')} ${unit(seconds, 'second')}`;
}
