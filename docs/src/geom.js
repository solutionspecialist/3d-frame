// 2-D / 3-D helpers shared by the core and the styles. All 2-D shapes are manifold CrossSections in
// the frame's own plane: x across the card, y up (portrait, print up).

export const SEG = 512;   // segments per full circle

// Support offsets per unit of relief depth: (sideways a, down b) with b = sqrt(1 + a^2), i.e. on the
// 3-D 45° cone. |a| <= 1: a larger sideways reach let a point "support" itself from another part of the
// same piece across open air. A finite set is conservative, and every facet it makes contains a 45°
// line, so no facet overhangs more than 45°.
export const SUPPORT = [0, 0.5, -0.5, 1, -1].map(a => [a, Math.sqrt(1 + a * a)]);

export function helpers(M) {
  const { CrossSection: CS, Manifold: MF } = M;
  const h = {
    CS, MF,
    rect: (x0, y0, x1, y1) => CS.ofPolygons([[[x0, y0], [x1, y0], [x1, y1], [x0, y1]]]),
    poly: pts => CS.ofPolygons([pts], "NonZero"),                 // either winding
    circle: (r, cx = 0, cy = 0) => CS.circle(r, SEG).translate([cx, cy]),
    off: (cs, d) => cs.offset(d, "Miter", 5),
    rot45: (cs, cx, cy) => cs.translate([-cx, -cy]).rotate(45).translate([cx, cy]),
    mirror4: cs => CS.union([cs, cs.mirror([1, 0]), cs.mirror([0, 1]), cs.mirror([1, 0]).mirror([0, 1])]),
    prism: (cs, z0, z1) => MF.extrude(cs, z1 - z0).translate([0, 0, z0]),
    // column-major 4x4 from three column vectors + translation
    mat: cols => [...cols[0], 0, ...cols[1], 0, ...cols[2], 0, ...cols[3], 1],
    /** Thin features out: an opening by `r` (removes anything narrower than 2r). */
    clean: (cs, r = 0.39) => cs.offset(-r, "Miter", 5).offset(r, "Miter", 5).intersect(cs),
  };
  /** Relief standing out of the front face (toward -Z) by `height`, no overhang over 45°: a point at
   *  depth t is kept if its piece holds a point on the 45° cone below it (SUPPORT). Built per piece,
   *  so one piece never counts as support for another across a gap. */
  h.relief = (cs, height) => cs.decompose().map(piece => {
    const straight = MF.extrude(piece, height);
    const keep = MF.union(SUPPORT.map(([a, b]) => straight.transform(h.mat([[1, 0, 0], [0, 1, 0], [-a, b, 1], [0, 0, 0]]))));
    return straight.intersect(keep).transform(h.mat([[1, 0, 0], [0, 1, 0], [0, 0, -1], [0, 0, 0]]));
  });
  return h;
}
