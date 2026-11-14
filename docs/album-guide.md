# Album Guide

This guide states what every album must achieve and how its data is turned into sound and visuals. Use it when you design a new album or review one. For screen layout and interaction details, see [design.md](design.md). For where the data lives, see [data-guide.md](data-guide.md).

## Terms

- **Album**: a group of tracks around one topic. It has a title, a description, a cover image and its tracks.
- **Track**: one part of an album. It has a title, a duration and music generated from data.
- **Main instrument**: the instrument in a track that carries the information the track is meant to convey.

## Quality Criteria

Every album must pass all four criteria.

| ID | Criterion | Pass condition |
| --- | --- | --- |
| Q1 | Clear message | The album defines what information it takes from the EIC data, and the music expresses that information. A listener can hear what the data says, not just that data is present. |
| Q2 | Audiovisual sync | Sound and visuals express the same information at the same moment. Decide how the data is shown first, then make the sound follow it, the way a popping dancer hits the beat or an ad cuts on the music. The goal is the feeling people get when two senses line up. |
| Q3 | Musicality | The soundscape balances faithful data interpretation with an artistically satisfying result. It does not collapse into dissonance or clutter, even when the data reaches its extremes. |
| Q4 | Sources | All data comes from the NASA Earth Information Center [EIC gallery](https://svs.gsfc.nasa.gov/gallery/earth-information-center/) (SVS ID 40467 and its sub-galleries). See [Sources](#sources) below. |

### Sources

- Record the EIC visualization the album is based on: title, SVS ID and URL.
- Record every source dataset you actually downloaded from that visualization's `datasets` list: name, provider, URL or DOI, version, download date and license.
- Do not use a topic that does not trace back to an EIC visualization.
- Use only datasets that the EIC visualization lists as its sources under `datasets`. Do not bring in other data, even on the same topic.
- Show the same sources on the album's sleeve, like a photo credit, so listeners can see them.

## Track Data

- Analyze the data in the album's notebook first (see [notebook-guide.md](notebook-guide.md)). Plan the sonification from that analysis, not before it.
- Save the data chosen for the music in each track's data file and commit it to git (see [data-guide.md](data-guide.md)).

## Sonification

- Instruments are played from SoundFonts.
- The mood of the music matches the mood of the information. Data that is bad news for people must not sound bright or cheerful.
- In each track, the main instrument stands out above every other sound, and it carries the track's information faithfully.
- The amount of change shown on screen is the amount of change heard. A large visual change must sound large; a small one must sound small.

## Visualization

### Globe

- The globe at the center of the record shows the data. Depending on what change the album wants to show, it can zoom into a region or overlay information such as the date. Each album chooses its own presentation.
- A WebGL shader is drawn around the edge of the globe. Each album chooses how it looks.

### Progress Ring

- A circular progress bar runs around the edge of the globe. It marks the start and end of the current track and fills clockwise.
- Clicking a point on the ring plays the track from that point.
- The ring animates when it changes.

### Color and Cover Image

- The cover image represents the data of the currently selected track. Use an image from NASA or Wikimedia, and show its license.
- The background color is the main color extracted from the cover image.
- Track visuals should draw on the main color of the cover image where possible.

### Animation

- Every visual change in the data is animated. Fade in and out, or an opacity transition, is recommended.

### Tonearm

- The listener can drag the tonearm.
- Dropped over a track, playback starts from the beginning of that track. This also starts playback when the player is stopped.
- Dropped outside the record, playback stops.

## Constraints

- Every track in an album has a different main instrument.
- Each track is between 40 seconds and 1 minute long.
- An album has at most 4 tracks.
