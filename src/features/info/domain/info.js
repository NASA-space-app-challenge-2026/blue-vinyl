// Shapes of what the About and License dialogs say.

/**
 * @typedef {Object} TeamMember
 * @property {string} name
 * @property {string} [role]
 * @property {string} [github] GitHub user name
 */

/**
 * @typedef {Object} AboutContent
 * @property {string} tagline
 * @property {string[]} intro paragraphs
 * @property {{ title: string, body: string }[]} howItWorks
 * @property {{ keys: string, action: string }[]} shortcuts
 * @property {{ label: string, url: string }} challenge
 * @property {string} teamName
 * @property {TeamMember[]} team
 * @property {string} disclaimer
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
