# Mission

Blue Vinyl is our entry for the NASA Space Apps Challenge 2026 challenge **[The Earth Information Jukebox](https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/?tab=details)**. This document states what the challenge asks for and what we commit to building. Every feature, issue, and design decision should trace back to a goal here.

## The Challenge

NASA's Earth Information Center (EIC) publishes visualizations of our changing planet: global temperature, ocean currents, aerosols, night lights, and more. These are almost entirely visual, which shuts out blind and low-vision people and limits how anyone else can engage with the data.

The challenge asks for an "Earth Jukebox": an interface, script, or application that pairs EIC visual frames with sonifications generated from them, so that a person can pick a visualization and hear it.

- **Sonification**: non-speech audio that conveys information or perceptualizes data.
- **Visual frames**: EIC visualizations are often animations. Individual frames can be extracted and used as the input for sound.

Accepted forms include an interactive web jukebox, a desktop app, an API, or a curated playlist of generated audio with an explanation of how it was made.

Challenge level: Intermediate, Beginner/Youth. Skills: Arts & Multimedia, Earth Science, Software.

## Our Answer

Blue Vinyl is an interactive web jukebox. Each EIC dataset is an **album** placed on a **turntable**. Playing a record spins the **globe** through the dataset's frames while the **music** engine turns what is on screen into sound in real time. A **docent** describes what the listener is hearing and seeing, so the experience works without sight.

| Concept    | Feature folder (see [architecture.md](architecture.md)) |
| ---------- | -------------------------------------------------------- |
| Album      | `album`: a dataset, its songs and their timelines        |
| Track      | `tracks`: NASA data loaded as time series on the globe   |
| Globe      | `globe`: the globe and its data views                    |
| Music      | `music`: data-to-sound mapping and the audio engine      |
| Turntable  | `turntable`: the record and player visuals               |
| Controls   | `controls`: play, pause, seek, settings                  |
| Docent     | `docent`: spoken and written descriptions                |

## Goals

1. **Select and hear.** A user can choose an EIC visualization and hear its soundscape alongside the frames, with playback that stays in sync.
2. **Sound driven by the data.** Audio parameters (pitch, tempo, volume, rhythm, instrumentation, stereo position) are derived from the frames themselves, such as color, brightness, pixel density, and position. A listener should be able to hear a change in the data.
3. **Musical, not noise.** Raw pixel-to-sound mapping is filtered through scales, harmony, and rulesets so the result is pleasant to listen to while staying faithful to the data.
4. **Accessible first.** The whole experience works with a keyboard and a screen reader. Every album has descriptive text and docent narration explaining what the data shows and how it maps to sound.
5. **Tell the story.** For each album we document the "why": what the data means for the planet, and why we chose each mapping.

## Non-Goals

- Scientific analysis tools or precise value readouts. We convey patterns and change, not exact measurements.
- Covering every EIC visualization. A few well-crafted albums beat many shallow ones.
- Native desktop or mobile apps. The deliverable is a static web page.

## Candidate Data

All sources come from the challenge's Resources tab and are produced by NASA's Scientific Visualization Studio (SVS). The hint column is the challenge's own suggestion for how each set suits sonification.

| Dataset | Sonification hint |
| ------- | ----------------- |
| [EIC Content Database](https://svs.gsfc.nasa.gov/gallery/earth-information-center/) | Full catalog of EIC visuals |
| [Change in Night Lights 2012–2023](https://svs.gsfc.nasa.gov/5313/) | High contrast; intensity to tempo or volume |
| [Global Sea Surface Currents and Temperature](https://svs.gsfc.nasa.gov/3912/) | Continuous flow and thermal gradients; evolving soundscapes |
| [GEOS Aerosols](https://svs.gsfc.nasa.gov/5669/) | Particle types as separate layers; multi-track instruments |
| [Air Quality Model Runs](https://svs.gsfc.nasa.gov/5533/) | High-resolution frames; color palette and density to sound |
| [Perpetual Ocean 2: Western Boundary Currents](https://svs.gsfc.nasa.gov/5425/) | High contrast; visual shifts to rhythm or scale |
| [DYAMOND Global Carbon Dioxide](https://svs.gsfc.nasa.gov/5196/) | Changing patterns over time; driver for interactive synthesis |
| [Lightning Events from the ISS 2017–2023](https://svs.gsfc.nasa.gov/5011/) | Rapid flashes; percussive triggers |
| [3D Atmospheric River](https://svs.gsfc.nasa.gov/4960/) | Moisture density and spread; immersive landscapes |
| [GEDI Forest Height](https://svs.gsfc.nasa.gov/4950/) | Color-coded canopy height to pitch or rhythm |

Reference for the concept: [Data Sonification: Caldwell 73](https://svs.gsfc.nasa.gov/13786/), which maps luminosity to volume and position to pitch.

Data prep (frame extraction, color and density analysis) lives in `notebooks/` and exports static datasets into `src/features/*/data`.

## Definition of Done

The submission is ready when:

- At least one album plays end to end: frames on the globe, sound generated from those frames, and docent description.
- The page is usable with a keyboard and a screen reader alone.
- Each shipped album documents its data source, its data-to-sound mapping, and the story behind it.
- The app runs as a static site (`npm start`) with no backend.
- NASA data is credited to SVS and the EIC on the page.
