# Tasks

Bite-sized work for coding sessions. ROADMAP.md is the public outline; this file is the to-do list.
Rules for doing a task are in CLAUDE.md. Do them in order unless "Depends on" says otherwise.

Statuses: `ready` (a coding session can start), `needs decision` (owner decides first, in a planning
session), `manual` (the owner does it, not code), `done (PR #n)`.

---

## Next

### T1 · CI runs the tests on every PR
- Status: done (this PR)
- Files: `.github/workflows/test.yml`, `CLAUDE.md`, `TASKS.md`
- Done when: the PR shows a green "test" check; a PR that edits src/ without rebuilding docs/ shows red.

### T2 · Owner: require the check before merging
- Status: manual
- Do: GitHub → Settings → Branches → add a rule for `main`: require a pull request, require the
  status check "test" to pass.
- Done when: the merge button on a PR with a red check is blocked.

### M1 · Fridge test: magnet hold in portrait and landscape
- Status: manual
- Do: print the default business-card frame, hang it both ways for a day, bump it once.
- Record: holds / slides / falls, for each orientation. If it slides, a task to change magnet count or
  depth comes out of this; nothing is coded until then.

### T3 · Build logic as a pure function (first step toward the Web Worker)
- Status: needs decision
- Depends on: T1
- Files (write): `src/build.js` (new), `test/build.test.mjs` (new)
- Files (read): `src/core.js`, `src/export.js`, `src/styles/index.js`, `web/index.html` (the `regenerate` function)
- Do: move what `regenerate()` does with the engine into
  `runBuild(M, { params, styleId, styleParams, coupon }) → { err, warn, size, closed, mesh, part }`,
  so the worker (T4) is a thin wrapper and the logic is testable in Node. Don't change the page yet.
- Decided: validation that needs the engine (convex outline, magnet pockets) runs inside `runBuild`;
  the page keeps calling `validate(..., null)` for instant readouts before a build.
- Open decisions:
  - Exports: does each build also return 3MF and STL bytes (simple; a few MB transferred per
    build), or does the worker keep the last part and make bytes on request (one more message type)?
- Done when: new tests pass: default card → no errors, size matches the reference fixture; invalid
  params (magnet count 3) → error, no mesh; `closed.ok` true for the default. Existing 20 tests still pass.

### T4 · Run the build in a Web Worker
- Status: needs decision (blocked by T3's decision)
- Depends on: T3
- Files (write): `web/build-worker.js` (new), `web/index.html` (the generate and download sections only),
  `tools/build-site.mjs` (copy the worker into docs/), `docs/` (regenerated)
- Do: the worker loads the engine once, answers each build message with `runBuild`'s result.
  The page sends messages instead of building.
- Open decisions: none beyond T3's.
- Done when: `npm test` passes; `npm run site` puts `build-worker.js` in docs/.
- Not verifiable here (owner checks in a browser): the page stays responsive while typing during a
  4×6 build; readouts and 3D view match the old page for the default card; downloads still work on
  GitHub Pages and inside claude.ai.

### T5 · Drop stale builds
- Status: ready (after T4)
- Depends on: T4
- Files (write): `web/index.html` (generate section), `docs/` (regenerated)
- Do: number each build request; when a result arrives for a request that is no longer the newest,
  discard it (free its part) and show nothing. Show "Building…" until the newest result arrives.
- Done when: `npm test` passes.
- Not verifiable here: type quickly through several widths; the preview ends on the last value,
  never an earlier one.

### T6 · Encode settings in a link (pure functions)
- Status: needs decision
- Depends on: T1
- Files (write): `src/share.js` (new), `test/share.test.mjs` (new)
- Do: `encode({ params, style, styleParams, coupon }) → string` and `decode(string) → state | null`.
- Open decisions:
  - Format: readable (`#CARD_W=54&CARD_H=86&style=artdeco`) or compact (base64 of the JSON)?
    Readable is longer but people can see and edit it.
  - Only values that differ from the defaults (shorter links, but the meaning of a link changes if a
    default changes), or every value?
  - A version number in the link, so a future change can read old links?
- Done when: tests pass for a round trip of the default and of a changed state; garbage, an empty
  string or an unknown key → null or ignored (no throw); unknown style id → default style.

### T7 · Shareable link on the page
- Status: ready (after T6 and T5)
- Depends on: T6, T5 (both edit `web/index.html`)
- Files (write): `web/index.html` (`load`, the copy button), `docs/` (regenerated)
- Do: on load, settings from the link win over saved settings. "Copy parameters" becomes
  "Copy link" (the address with the encoded settings).
- Done when: `npm test` passes.
- Not verifiable here: open a copied link in a private window; it builds the same frame.

---

## v2: formats and styles

### T8 · Preset sizes (data only)
- Status: needs decision
- Files (write): `src/presets.js` (new), `test/presets.test.mjs` (new)
- Do: list of `{ id, name, CARD_W, CARD_H, CARD_T }`; a test that every preset validates
  (warnings allowed, no errors).
- Open decisions:
  - Dimensions: business card, 2×6 strip, Instax mini/square/wide, Polaroid 600/i-Type, 4×6. Values
    come from your own measurements or from the maker's published sizes. A coding session must not guess.
  - 4×6 needs a ~97 mm bridge (proven: 46 mm). Ship the preset now, with a warning, or hold it until
    the bridge work is done?

### T9 · Preset picker on the page
- Status: ready (after T8)
- Depends on: T8, T7
- Files (write): `web/index.html`, `docs/` (regenerated)
- Do: a select above the card size fields; choosing one fills width, height and thickness. Editing
  a field afterwards leaves the select on "Custom".
- Not verifiable here: each preset builds in the browser and shows the expected warnings.

### T10 · Brutalist style
- Status: needs decision
- Files (write): `src/styles/brutalist.js` (new), `src/styles/index.js` (register), `test/style.test.mjs`
  (add cases), `docs/` (regenerated)
- Do: follow "Adding a style" in the README.
- Open decisions: what it looks like. A sketch or a written description of the outline and relief
  (and the style's own settings) is needed before coding. The coding session must not design it.

---

## Needs definition (planning, not tasks yet)

- **Bridges for large photos.** First: list the strategies (snap-off struts, deeper lip, slicer
  supports) and the test-piece matrix to print. The code task (a test-piece generator) follows from that.
- **Organic style.** Needs a perimeter chamfer for non-convex outlines. This changes `core.js` and
  maybe the reference values: a core design task, not a style task.
- Later items in ROADMAP.md (printer profiles, clearance test piece, non-magnetic mounting).
