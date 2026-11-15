// What the onboarding says before the player comes up: what Blue Vinyl is, then why earphones bring out its sound.

/** @type {Readonly<import('../domain/info.js').OnboardingContent>} */
export const ONBOARDING = Object.freeze({
  steps: [
    {
      visual: 'pale-blue-dot',
      eyebrow: 'An Earth Information Jukebox',
      heading: 'Listen to the sound of the Pale Blue Dot.',
      body: [
        'Blue Vinyl turns NASA Earth data into music. Each album is one story of our planet, from sea ice and storms to '
          + 'birds and wildfires, pressed onto a record.',
        'Drop the needle, and the globe at the center of the record turns through the data while the music is written '
          + 'from it as it plays.',
      ],
      note: 'In 1990 Voyager 1 looked back from six billion kilometers away and saw Earth as a pale blue dot.',
    },
    {
      visual: 'earphones',
      eyebrow: 'Spatial audio',
      heading: 'Put on your earphones.',
      body: [
        'The music is placed in the space around you. As a storm crosses the ocean or a flock flies off, its sound moves '
          + 'from left to right, and from near to far.',
        'Earphones or headphones let you hear where each sound comes from. Speakers work too, with less of the space.',
      ],
    },
  ],
  next: 'Next',
  back: 'Back',
  start: 'Start listening',
  skip: 'Skip',
  preview: 'Hear it move',
  previewStop: 'Stop',
});
