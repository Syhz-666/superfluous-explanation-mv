# A Superfluous Explanation — Music Video

**English** · [简体中文](README.zh-CN.md)

A full music video rendered entirely from code with **Remotion + React + procedural graphics**.
No video editor involved — every frame is computed.

> Based on 《多余的解释》 by 许嵩 (Vae). 4:37, nine chapters.

> **Want to watch it? Render it yourself.** The finished video is 157 MB — too large for version control.
> See [Rendering](#rendering).

---

## What it looks like

Nine chapters over the track:

| Chapter | Time | Content |
|---|---|---|
| Intro | 0 – 17.3 | Winter city at night. She appears, back to camera |
| Verse 1 | 17.3 – 64.6 | Problem → guessing → effort → shop window → "sister" → the corner |
| Chorus 1 | 64.6 – 100.9 | "She's just my sister" — and the sister is standing right there |
| Verse 2 | 100.9 – 131.1 | Repeat, reuse of verse-1 camera positions |
| Chorus 2 | 131.1 – 166.8 | Slow orbit; the two drift closer together |
| **Bridge** | 166.8 – 182.3 | **The only warm colour in the whole video** — she offers the scarf, nobody takes it |
| Chorus 3 | 182.3 – 211.7 | The scarf drops. Its colour drains |
| Chorus 4 | 211.7 – 241.4 | She walks away; continuous pull-back inside each shot |
| Outro | 241.4 – 277.0 | Empty city. Window lights go out, one by one |

Design documents live in [`docs/`](docs/):

- [`TREATMENT.md`](docs/TREATMENT.md) — concept, style bible, palette, banned-look list, recurring motifs
- [`STORYBOARD.md`](docs/STORYBOARD.md) — shot-by-shot breakdown

---

## Rendering

### First: supply the audio

**The song is not in this repository.** It's a copyrighted commercial recording —
shipping it would be redistribution. Provide your own copy at:

```
assets/许嵩 - 多余的解释.wav
```

(The filename must match what the scripts expect. To use a different track,
edit the `SONG` constant at the top of `scripts/prep_full.py`.)

If you only want to render, a single `public/song.mp3` is enough — that's the
file Remotion actually reads. The `assets/*.wav` is only needed to re-run the
data pipeline (recompute the lyric timings).

### Render

Requires **Node 18+** and **ffmpeg** (Remotion bundles its own, too).

```bash
npm install
npx remotion render FullMV out/full-mv.mp4 --concurrency=12
```

Roughly 10 minutes for 1920×1080 / 30fps / 277 seconds, including 3-subframe
motion blur.

To halve that, turn motion blur off — set `SUB_FRAMES` to `1` in
`src/mv/FullMV.tsx`.

Preview with a scrubbable timeline and frame stepping:

```bash
npx remotion studio
```

---

## Project structure

```
assets/            Original source material (human-provided, not regenerated)
  song.wav         The audio (not committed)
  reference.jpg    Character reference
  reference-sheet.png  Turnaround: front / back / side
  lyrics.lrc       Lyrics with timestamps
  poses/           Ten pose images (4-frame walk cycle, phone call, smile…)
  pixel/           Pixel-art variant (unused in this project)

public/            What Remotion reads at render time (processed from assets/)
  song.mp3         Compressed audio
  poses/           Normalised pose images
  char-*.png       Three views cut from the turnaround sheet

src/
  Root.tsx         Composition registration
  WhaleGirl.tsx    Character component + pose registry
  lyricTiming.ts   Per-character lyric timings (generated, see below)
  songData.ts      Beats + chapters (generated)
  mv/
    FullMV.tsx     Main composition
    chapters.ts    Shot data — one config block per chapter
    City.tsx       Procedural winter city
    Snow.tsx       Snow
    Elements.tsx   Shop window / silhouettes / footprints / the second person
    LyricText.tsx  Per-character lyric layer

scripts/           Data pipeline (see below)
docs/              Design documents
out/               Renders (gitignored)
analysis/          Analysis intermediates + model cache (gitignored)
```

---

## Data pipeline

From "a song + lyrics" to "per-character timings" — all scripted:

```
assets/song.wav
      │
      ├─ scripts/separate_vocals.py    Demucs vocal separation
      │                                Essential: drums and backing mask the
      │                                quiet opening lines in the full mix.
      │
      ├─ scripts/whisper_align.py      faster-whisper word-level timings,
      │                                run on the isolated vocal stem.
      │                                VAD is off — it clips the opening.
      │
      └─ scripts/align_lyrics.py       Global DP alignment between the
                                       (human-corrected) lyric text and the
                                       audio-derived timings
                                       → src/lyricTiming.ts
```

Asset processing:

```
scripts/prep_poses.py   Normalise height, align feet baseline, remove background → public/poses/
scripts/prep_views.py   Split the turnaround sheet and normalise → public/char-*.png
scripts/prep_full.py    Compress audio, gather beats and chapters → src/songData.ts
```

**Why vocal separation matters:** transcribing the full mix silently dropped the
opening two lines (17.1s, 21.2s). After separation, the vocal stem measures
0.0003 energy for the first 16 seconds — pure instrumental — then jumps to 0.15
at 17s. The starting point becomes unambiguous.

---

## Two deliberate technical choices

**Lyric timings come from the LRC file, not from the model.**

Whisper's timings and the LRC file are *equally* close to the real vocal onsets
(strict onset test: 21 vs 20 lines; median deviation 167 ms for both). But the
two differ systematically by 0.87 s. Mixing them makes adjacent lines jump early
and late — that's exactly what broke an earlier version. So the LRC is used
throughout (hand-synced, internally consistent), and the model output serves
only as **cross-validation**.

**Every animation is a pure function of the frame number.**

No `useEffect`, no `Math.random()`. Rendering the same frame twice produces a
byte-identical image. That's the precondition for deterministic frame-by-frame
rendering — and the basis for beat sync working at all.

---

## Known limitations

- **Motion blur is 3-subframe temporal supersampling**, not a real shutter.
  Fast pans still show slight stepping
- **Lyric timings come from a circulating LRC file** (human-corrected),
  cross-validated against the audio, but ±0.3 s deviations are possible
- **The character is static poses swapped**, not skeletal animation. The walk is
  a 4-frame cycle; everything else is a hard cut
- **Rendering is CPU-bound** (measured: 0% GPU, 84% CPU). `city` and `snow` are
  the main hot spots

---

## License

**Code — MIT.** See [LICENSE](LICENSE). Use it however you like.

**Not covered by the MIT license:**

| Content | Location | Notes |
|---|---|---|
| **Lyrics** | `assets/lyrics.lrc`, `src/lyricTiming.ts` | Copyright 许嵩 (Vae). Kept for demonstration only — do not redistribute |
| **Character art** | images under `assets/` and `public/` | **Community-created, AI-generated**, based on the DeepSeek brand mascot. Not original work by this project's author |
| **Song** | not included (see [First: supply the audio](#first-supply-the-audio)) | Commercial recording |

> This is a **technical demonstration**: how to render a song into a music video
> with code. Take the code and do whatever you want with it — **clear the rights
> on the assets yourself**.

### Prior art

How a comparable project handles this (`pdoom-video`):

> Code is MIT; fonts retain their own licenses, and the song/lyrics files
> are excluded from the MIT coverage.
