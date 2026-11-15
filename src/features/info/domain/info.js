// Shapes of what the About and License dialogs say.

/**
 * @typedef {Object} TeamMember
 * @property {string} name
 * @property {string} [role]
 * @property {string} [github] GitHub user name
 */

/**
 * @typedef {Object} AboutContent
 * @property {string} version release version, as in 1.2.3
 * @property {string} tagline
 * @property {string[]} intro paragraphs
 * @property {{ title: string, body: string }[]} howItWorks
 * @property {{ keys: string, action: string }[]} shortcuts
 * @property {{ label: string, url: string }} challenge
 * @property {string} teamName
 * @property {TeamMember[]} team
 */

/**
 * Something the app uses that someone else made.
 *
 * @typedef {Object} LicensedWork
 * @property {string} name
 * @property {string} [url] where the work comes from
 * @property {string} by who made or provides it
 * @property {string} [use] what the app uses it for
 * @property {string} license
 * @property {string} [licenseUrl]
 */

/**
 * @typedef {Object} LicenseSection
 * @property {string} title
 * @property {string} [note]
 * @property {LicensedWork[]} works
 */

export {};

/**
 * One step of the onboarding shown before the player.
 *
 * @typedef {Object} OnboardingStep
 * @property {'pale-blue-dot' | 'earphones'} visual the picture beside the text
 * @property {string} [eyebrow] a small line above the heading
 * @property {string} heading
 * @property {string[]} body paragraphs
 * @property {string} [note] a small line under the body
 */

/**
 * @typedef {Object} OnboardingContent
 * @property {OnboardingStep[]} steps
 * @property {string} next the button that moves on a step
 * @property {string} back the button that goes back a step
 * @property {string} start the last step's button, which starts the player
 * @property {string} skip the button that starts the player at once
 * @property {string} preview the button that plays the spatial audio preview
 * @property {string} previewStop the same button while the preview plays, which stops it
 */
