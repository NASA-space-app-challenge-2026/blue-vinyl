# Notebook Guide

Every album starts with a Jupyter notebook in `notebooks/`. The notebook works out what the EIC visualizations say, finds the data behind them, and prepares the data that becomes the album's tracks. Follow this guide whenever you create or change one.

## Principles

1. **Start from the EIC message.** Each EIC visualization says something: the planet breathes with the seasons, this year fell below the old normal, the sea is rising. Find that message first, then pick the data that shows it. Never start from "what can we measure".
2. **Use the original data.** Build graphs from the dataset the EIC page cites, not from the pixels of its images or videos. The pixels show how the data was drawn; the dataset is the data itself.
3. **Separate what EIC says from what we add.** Quote EIC's own words for its message. Anything we compute beyond that, such as long-term context or extra comparisons, is labeled as ours.
4. **Make it reproducible.** Anyone on the team can run the notebook from top to bottom and get the same results.

## Finding the Message and the Data

For every EIC visualization in the album:

1. Read its SVS page through the API: `https://svs.gsfc.nasa.gov/api/<id>`.
2. Take the message from its `description` and media captions. Note the exact claims: numbers, comparisons, reference periods, causes.
3. Take the source data from its `datasets` field (name, platform, sensor, credit).
4. Get that data. If it cannot be downloaded:
   - use the dataset behind the page's numbers instead, and say so (for example, NSIDC's Sea Ice Index is the source of NASA's sea ice minimum announcements), or
   - if no data is available at all, fall back to measuring the frames, and label every graph built that way as a visual measure.

## Notebook Structure

One notebook per album, named `<album>_album.ipynb`, with these sections in order:

1. **Overview**: the album, its issue number, and how to run the notebook.
2. **EIC pages and messages**: one table with the SVS id, title, the message quoted from EIC, and the source dataset of each visualization.
3. **One section per message**, each containing:
   - the message, quoted from EIC
   - the source data: name, provider, link, units and time range
   - a graph that reproduces what the EIC visualization shows
   - the numbers that back the message (for example, the gap to a baseline or a ranking), checked against the numbers EIC states
   - the data series this message offers as a track
4. **Message summary**: one table that lists, for each message, the EIC page, the message, the key number and the track data.
5. **Track candidates**: the series that could become tracks, with their length, range and resolution.

## Graphs

- The title states the message, not just the variable: "Arctic sea ice in 2024 stayed below the 1981–2010 normal", not "Extent 2024".
- Show the reference EIC uses, such as a baseline period, average or record, whenever the message depends on it.
- Label axes with units. Use dates on time axes.
- Put the source and its credit under every graph.

## Data Handling

- Download through code in the notebook. Never commit raw data.
- Cache downloads in `notebooks/.cache/` (git-ignored).
- Keep credentials out of the repository. For NASA Earthdata, use a `~/.netrc` entry:

  ```
  machine urs.earthdata.nasa.gov login <username> password <password>
  ```

  If a section needs a login the reader does not have, it explains how to get one and skips without failing.
- Keep the original units in the data. Convert units only for display.
- When tracks are decided, export them as static files into `src/features/<feature>/data/` (see [architecture.md](architecture.md)), together with the source, credit and message of each track.

## Running and Committing

- Run with `npm run notebook`. Add new Python packages to the `notebook` script in `package.json`.
- Before committing, restart the kernel and run all cells, so the saved outputs match the code.
- Commit with outputs, so the team can read the results on GitHub without running the notebook. Keep the file small: use a modest figure size and avoid embedding large images.
