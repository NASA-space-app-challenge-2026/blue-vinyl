// What the onboarding says before the player comes up: what Blue Vinyl is, then why earphones bring out its sound.

/** @type {Readonly<import('../domain/info.js').OnboardingContent>} */
export const ONBOARDING = Object.freeze({
  steps: [
    {
      visual: 'pale-blue-dot',
      eyebrow: 'An Earth Information Jukebox',
      heading: 'Listen to the sound of the Pale Blue Dot.',
      body: [
        'Blue Vinyl turns NASA Earth data into music.',
        'Each album is one story of our planet, from sea ice and storms to birds and wildfires, pressed onto a record.',
      ],
      note: 'In 1990 Voyager 1 looked back from six billion kilometers away and saw Earth as a pale blue dot.',
    },
    {
      visual: 'earphones',
      eyebrow: 'Spatial audio',
      heading: 'Put on your earphones.',
      body: [
        'Sound is placed in three dimensions around you, so earphones are recommended for the best listening.',
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
