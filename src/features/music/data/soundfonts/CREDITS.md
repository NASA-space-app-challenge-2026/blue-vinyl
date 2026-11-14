# Sound Font Credits

`orchestra.sf2` is cut down from **GeneralUser GS v2.0.3** by S. Christian Collins, keeping only the General MIDI programs and drum kits the app plays (listed in `src/features/music/domain/instruments.js`), with a gong added from **VSCO 2 Community Edition**. Rebuild it with `npm run soundfont`.

- Source: https://github.com/mrbumpy409/GeneralUser-GS (commit `684543d`)
- Website: http://www.schristiancollins.com
- License: GeneralUser GS License v2.0. Free to use, modify and repackage, including in software projects. See `documentation/LICENSE.txt` in the source repository.

The gong (program 119, `Instrument.GONG`) is `Percussion/gongHit_fff.wav` from VSCO 2 Community Edition by Versilian Studios, mixed to mono, cut to 12 s and normalised by `scripts/build-soundfont.mjs`.

- Source: https://github.com/sgossner/VSCO-2-CE (commit `4403009`)
- License: CC0 1.0 Universal (public domain dedication). See `LICENSE` in the source repository.
