# Roadmap

Done: v1 (core + art deco style, border/scale/fan settings, 3MF/STL, tests, GitHub Pages).

## Next

- Validate on the fridge: magnet hold in portrait and landscape.
- Build in a Web Worker so the page stays responsive (builds take 3–6 s).
- CI: run `npm test` on every push.
- Shareable links to a configuration.

## Bridges (needed before large photos)

The window's top edge is an unsupported span: 46 mm is proven on one printer at 10 mm/s overhang speed.
4×6 prints need ~97 mm. Test pieces will compare span length × strategy (snap-off struts, deeper lip,
slicer supports) and set proven limits.

## v2: formats and styles

- Presets: business card, 2×6 photo strip, Instax mini/square/wide, Polaroid 600/i-Type, 4×6.
- Styles: brutalist; organic (needs a chamfer that works on non-convex outlines).

## Later: for everyone

- Printer profiles (bed size, proven bridge).
- A clearance test-piece generator for your printer.
- Mounting for non-magnetic surfaces: keyhole hanger, adhesive, desk stand.

Contributions welcome; new styles follow "Adding a style" in the [README](README.md).
