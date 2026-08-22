# Screen Recorder — Cloud Planner Handoff

## Current product state

The app is a browser-based screen recorder with:

- Editable slide title, subtitle, and logo.
- Screen recording with optional microphone and facecam.
- A semi-transparent private prompt in Document Picture-in-Picture, with saved notes, opacity and text-size controls, and a strict browser-tab capture guard.
- Seekable WebM finalization through `ts-ebml`.
- High-resolution lossless PNG screenshot capture.
- Manual cloud tags added directly on the slide.
- A Cloud Planner with CSV import/export, live search, editable topic descriptions, multiline terms, selection, and sequential presenter prompts.

## Current cloud presentation behavior

- The central `650px`-wide full-height corridor is reserved for the main slide content.
- Selected planner topics are currently preallocated into alternating left/right grid cells.
- The active topic title and description remain in the slide center.
- When a topic is completed, a miniature title/description moves into its cluster.
- Planner tags use a topic-specific color and geometric marker.
- Planner tags are compact text labels; direct-entry tags retain the bubble style.
- Direct and planner tags use separate density calculations.
- Long added terms are mirrored in the top-center readout with preserved line breaks.
- The final readout remains for 25 seconds.

## Current layout implementation

Relevant code is in `script.js`:

- `precalculateTopicGrid()` creates equal vertical cells on the left and right.
- `getTopicCluster()` resolves topic centers and visual identity.
- `arrangeTopicCloud()` uses a large random candidate-slot list and collision tests.
- Planner tags receive immutable `gridIndex` and `gridCount` values.
- Tags grow from small to large and retain the largest collision-free size.
- The layout has several defensive fallbacks because random slot placement can exhaust fragmented space.

Relevant CSS is in `style.css`:

- `.topic-cloud`, `.topic-tag`, and `.completed-topic-label`
- `.added-tag-readout`
- `.slide.capture-mode`

## Known weakness

The random-slot search is more complex than necessary and can still create:

- Fragmented free space.
- Uneven cluster capacity.
- Excessive retry work.
- Hard-to-reason-about fallback behavior.
- Different visual results after rearrangement.

## Agreed migration

Replace the random planner layout with a deterministic hybrid:

1. **MaxRects-style cluster packing**
   - Treat the full-height center corridor as forbidden.
   - This leaves two usable bins: left and right.
   - Measure each topic cluster using its title, description, selected-term count, and estimated tag rectangles.
   - Sort clusters largest-first.
   - Pack them into the two bins using best-short-side-fit or best-area-fit.

2. **Global scale search**
   - Binary-search a shared scale factor.
   - Choose the largest scale where every selected topic fits.
   - Respect a minimum readable font size.
   - If the minimum cannot fit, report capacity instead of hiding tags.

3. **Deterministic local tag placement**
   - Precompute every tag position before prompts begin.
   - Use a topic-ID-seeded spiral or perimeter walk around the miniature title/description.
   - Measure actual text bounds where practical.
   - Reveal tags sequentially at their reserved positions; do not repack earlier tags.

4. **Preserve isolation**
   - Direct-entry tags must never affect planner density, positions, or miniature sizing.
   - Planner tags must remain inside their packed topic bounds.
   - The central corridor and screenshot-safe content remain protected.

## Migration progress

Implemented in the current working tree:

- MaxRects-style free-rectangle splitting and containment pruning.
- Largest-first topic-cluster packing across the left and right bins.
- Twelve-step binary search for the largest shared cluster scale.
- Deterministic fallback rows if the minimum pack cannot fit.
- Topic-ID-seeded local spiral candidate fields.
- Stable topic phases and immutable prompt indices.
- Per-cluster miniature width and density derived from the packed rectangle.

Still worth validating visually:

- Extremely uneven topic sizes.
- Narrow/mobile viewports where the `650px` corridor leaves very small side bins.
- Whether local spiral candidates should be replaced by exact measured tag rectangles in a later refinement.

## Important constraints

- Never intentionally hide a planner tag.
- Never overlap planner tags.
- Preserve topic ownership even when two terms contain identical text.
- Keep every layout stable during sequential prompts.
- Preserve geometric markers in screenshots as real DOM elements.
- Keep screenshot export as high-resolution lossless PNG.
- Preserve multiline planner terms and readout formatting.

## Private prompt behavior

- Open it from the speech-bubble button, recording setup, or `Cmd/Ctrl+Shift+P` while this app has focus.
- The prompt uses Document Picture-in-Picture so it stays above browser tabs, other windows, and fullscreen content where the browser/OS permits Picture-in-Picture.
- Prompt text, opacity, and font size are stored locally under `screenRecorderPrivatePrompt`.
- A browser cannot exclude one arbitrary window from monitor/window capture. When the prompt is open, recording therefore fails closed unless `MediaStreamTrack.getSettings().displaySurface` reports `browser`.
- The capture chooser is biased toward tab capture and monitor capture/surface switching are disabled when supported.
- Current Chrome or Edge is required; unsupported browsers show the launcher as unavailable.

## Validation checklist

- Test 1, 2, 4, 8, and 12 selected topics.
- Test uneven groups: one topic with many terms and several with few.
- Test duplicate term text across different topics.
- Test long multiline terms.
- Test direct tags before and after planner prompts.
- Confirm screenshot markers and text are not clipped.
- Confirm facecam and non-facecam recordings retain correct seek duration.
