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

## Data & Resources

Source: the challenge's [Resources tab](https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/?tab=resources). The challenge notes that more resources may be added before the hackathon, so check the tab again before picking new albums.

The challenge recommends EIC data, and every listed resource is an EIC or SVS visualization. Other NASA data, such as other SVS visualizations, Earthdata, or NASA Worldview imagery, can be used as well.

### Recommended Resources

All resources below are visualizations by NASA's Scientific Visualization Studio (SVS). The descriptions summarize what the challenge says each one is good for.

**[Earth Information Center (EIC) Content Database](https://svs.gsfc.nasa.gov/gallery/earth-information-center/)**
The SVS visuals used in the EIC dashboards. The videos and images can be used directly as input for generating audio. This is our main catalog.

**[Data Sonification: Caldwell 73](https://svs.gsfc.nasa.gov/13786/)**
Not Earth data, but a reference for how NASA turns imagery into sound. It shows how luminosity and spatial position can map to volume and pitch. Use it as a model for our mapping design.

| Dataset | What it shows | Suggested sonification |
| ------- | ------------- | ---------------------- |
| [Change in Night Lights 2012–2023 (EIC Version)](https://svs.gsfc.nasa.gov/5313/) | How urban lighting changes across the globe | Strong contrast between dark land and bright light suits computer vision that maps intensity to tempo or volume |
| [Global Sea Surface Currents and Temperature](https://svs.gsfc.nasa.gov/3912/#media_group_349716) | Ocean currents moving alongside temperature gradients | Continuous flowing motion and shifting temperature become complex, evolving soundscapes |
| [GEOS Aerosols](https://svs.gsfc.nasa.gov/5669/) | Paths of smoke, dust and other particles, split by type | Multi-track: each particle type gets its own texture or instrument |
| [Air Quality Model Runs](https://svs.gsfc.nasa.gov/5533/) | Downloadable high-resolution frames of atmospheric model output | Convert color palette and pixel density per frame into sound profiles |
| [Perpetual Ocean 2: Western Boundary Currents](https://svs.gsfc.nasa.gov/5425/) | Maps of the major ocean boundary currents | High-contrast imagery; align visual shifts with rhythms or scales |
| [DYAMOND Global Carbon Dioxide](https://svs.gsfc.nasa.gov/5196/) | Global CO2 concentration changing over time | A primary input for driving interactive synthesis |
| [Lightning Events Detected from the ISS 2017–2023](https://svs.gsfc.nasa.gov/5011/) | Layered lightning detections from space | Punctuated sonification: percussion or sudden triggers on each flash |
| [A 3D View of an Atmospheric River](https://svs.gsfc.nasa.gov/4960/) | The path of an atmospheric river in an Earth system model | Extract frames; map moisture density and spread to immersive, shifting sound |
| [GEDI Forest Height](https://svs.gsfc.nasa.gov/4950/) | Global canopy height maps | Map the color scale (height and density) to rhythm, frequency or pitch |

### Data Pipeline

Data prep lives in `notebooks/` and exports static datasets into `src/features/*/data`. Every notebook follows [notebook-guide.md](notebook-guide.md).

## Definition of Done

The submission is ready when:

- At least one album plays end to end: frames on the globe, sound generated from those frames, and docent description.
- The page is usable with a keyboard and a screen reader alone.
- Each shipped album documents its data source, its data-to-sound mapping, and the story behind it.
- The app runs as a static site (`npm start`) with no backend.
- NASA data is credited to SVS and the EIC on the page.
