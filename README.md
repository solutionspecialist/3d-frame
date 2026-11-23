# 3d-frame

Parametric, 3D-printable fridge frames for business cards and photos. Change the size, magnets and
style in the browser, preview in 3D, download a 3MF, slice it yourself.

**Live:** https://solutionspecialist.github.io/3d-frame/

## What it makes

A frame that holds a card or photo behind a lip on all four sides. The card drops in through a slot in
the top edge, and magnets glue into pockets on the back. It hangs portrait or landscape (never slot-down).
It prints upright, slot on top, with an optional snap-off fin on the back to keep it from wobbling.

## Printing

- Open the **3MF** (the STL is the same part for other tools). Keep the orientation it loads in.
- Set **75% overhang speed and external bridge speed to 10 mm/s.** The window's top edge prints as
  an overhanging wall, not a bridge, so the bridge settings don't apply.
- Brim on, supports off. Cut the fin tabs and sand them flat. Glue the magnets flush (press the back onto
  paper on the fridge while the glue cures).
- Proven on a Sovol SV06 Plus in PETG: 0.3 mm clearance per side, and the 46 mm window bridge at the speed
  above. Other printers: print the **test piece** (top 20 mm) first.

## Settings

| Group | Setting | Notes |
|---|---|---|
| Card or photo | width, height, thickness | measure yours |
| Fit | clearance, lip over card, border | border empty = smallest the magnets and style allow |
| Magnets | diameter, thickness, count (2/4/6) | pockets get +0.3 mm diameter, +0.05 mm depth for glue |
| Style | style, plus the style's own settings | art deco: motif scale, fans per side, corner motif |
| Printing | fin, fin depth, test piece | |

The page refuses settings that would not print, such as walls under 1.2 mm, magnets too close to an
edge, or a frame too big for the bed. It warns about risky ones, such as a window bridge beyond what has
been proven.

## Code

```
src/core.js          pocket, slot, window, magnets, chamfer, fin, print orientation (style-independent)
src/styles/*.js      a style = outline + relief shapes + its own settings
src/geom.js          shared 2-D/3-D helpers; the 45° no-overhang relief rule
src/export.js        3MF (keeps vertex identity), STL, ZIP
web/index.html       the page
test/                regression + function tests
tools/build-site.mjs assembles docs/ for GitHub Pages
```

Geometry runs on [manifold-3d](https://github.com/elalish/manifold); the preview uses three.js.

```
npm install
npm test        # 18 tests: reference volumes/sizes, card fit, magnets, closed solid, style settings
npm run site    # rebuild docs/ after changing src/ or web/
```

### Adding a style

A style module exports `{ id, name, minBorder, params, resolve, validate, outline, relief }` (see
`src/styles/artDeco.js`). It only draws 2-D shapes: `outline` returns the silhouette and `relief` returns
`[{ shape, height }]`. The core turns relief into solids with no overhang over 45°, and removes features
under 0.8 mm. Rules every style must follow:

- The outline contains the pocket and magnet columns (checked).
- The bottom edge is flat, and bed corners are 45° or steeper.
- The outline is convex (checked; the perimeter chamfer is a hull).
- The style looks right turned 90°, for portrait and landscape.

Register the style in `src/styles/index.js`.

### Reference values

`test/fixtures.json` holds volumes and sizes from the original build123d model, the version that was
printed and checked. The JavaScript reproduces them to within 0.0001 %. Any change to the core or to
art deco must keep them unless the change is deliberate.
