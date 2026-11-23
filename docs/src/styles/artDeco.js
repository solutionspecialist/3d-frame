// Art deco: 45° canted outline, outer band, double window line, a sunburst fan on every side, nested
// diamonds in the corners. Fans and diamonds scale with the border; fan count follows side length.
import { helpers } from "../geom.js";

const REF_BORDER = 10.7;   // border (beyond the pocket) the motif sizes were drawn for
const FAN_PITCH = 43;      // mm of side length per fan, at scale 1 (card: 1 per side; 2x6 strip: 3, or 2 at an 18 mm border)
const R1 = 1.2, R2 = 1.8;  // relief heights: line work / fans and diamonds
const CANT = 8.0;          // 45° outline corner, mm at scale 1
const RING = 1.0, GAP = 0.8;   // nested corner: ring width (>= 0.8 at full relief depth) and gap to the centre
const NEST_MIN = 2.5;          // mm across the nested centre; below it "nested" prints as one solid diamond

export default {
  id: "art-deco",
  name: "Art deco",
  minBorder: REF_BORDER,   // fans need this much room
  params: [
    { key: "scale", label: "Motif scale", type: "auto-number", default: "auto", min: 1, max: 2.5, step: 0.05,
      help: "auto: grows with the border" },
    { key: "fansLong", label: "Fans per long side", type: "auto-int", default: "auto", min: 0, max: 8 },
    { key: "fansShort", label: "Fans per short side", type: "auto-int", default: "auto", min: 0, max: 8 },
    { key: "corner", label: "Corner motif", type: "select", default: "nested",
      options: [["nested", "Nested diamond (solid below a 12 mm border)"], ["diamond", "Diamond"], ["none", "None"]] },
  ],

  resolve(g, sp) {
    const s = sp.scale === "auto" || sp.scale == null ? Math.max(1, g.SIDE / REF_BORDER) : Number(sp.scale);
    const count = (v, L) => v === "auto" || v == null ? Math.max(1, Math.floor(L / (FAN_PITCH * s))) : Number(v);
    return { s, nLong: count(sp.fansLong, 2 * g.WIN_Z), nShort: count(sp.fansShort, 2 * g.WIN_X), corner: sp.corner || "nested" };
  },

  validate(g, sp) {
    const r = this.resolve(g, sp), err = [];
    const fanW = 23 * r.s;
    if (r.nLong && 2 * g.WIN_Z / r.nLong < fanW) err.push(`Too many fans on the long sides: each needs ${fanW.toFixed(0)} mm.`);
    if (r.nShort && 2 * g.WIN_X / r.nShort < fanW) err.push(`Too many fans on the short sides: each needs ${fanW.toFixed(0)} mm.`);
    return err;
  },

  outline(M, g, sp) {
    const { poly } = helpers(M), { s } = this.resolve(g, sp), c = CANT * s, X = g.OUT_X, Y = g.OUT_Z;
    return poly([[-X + c, -Y], [X - c, -Y], [X, -Y + c], [X, Y - c], [X - c, Y], [-X + c, Y], [-X, Y - c], [-X, -Y + c]]);
  },

  /** Largest corner diamond that fits the field untrimmed (top-right corner; mirrored for the rest).
   *  The field's corner is pinched between the window offset's square corner P and the outline's 45°
   *  cant, both at 45° to the diamond's axes, so the diamond sits on the diagonal through P. With L1
   *  radius R and centre P + (t, t): P outside needs 2t >= R; the cant needs 2t + R <= A; the straight
   *  field edges need t + R <= m. Largest R: t = R/2, R = min(A/2, 2m/3). k = half-side before the 45°
   *  turn (R = k√2). kIn = the nested version's solid centre, a 0.8 mm gap inside the ring. */
  cornerDiamond(g, s) {
    const { WIN_X, WIN_Z, OUT_X, OUT_Z } = g, c = CANT * s;
    const px = WIN_X + 3.7, py = WIN_Z + 3.7, m = OUT_X - 3.6 - px;
    const A = (OUT_X + OUT_Z - c - 3.6 * Math.SQRT2) - (px + py);
    const R = Math.min(A / 2, 2 * m / 3) - 0.01, t = R / 2, k = R / Math.SQRT2;
    return { cx: px + t, cy: py + t, k, kIn: k - (RING + GAP) * s };
  },

  relief(M, g, sp, O) {
    const { CS, rect, poly, circle, off, rot45, mirror4, clean } = helpers(M);
    const { s, nLong, nShort, corner } = this.resolve(g, sp);
    const { WIN_X, WIN_Z, OUT_X, OUT_Z } = g;
    const W = rect(-WIN_X, -WIN_Z, WIN_X, WIN_Z);
    const band = off(O, -0.8).subtract(off(O, -2.8));
    const ring1 = off(W, 1.2).subtract(W);
    const ring2 = off(W, 2.9).subtract(off(W, 2.0));
    const field = off(O, -3.6).subtract(off(W, 3.7));
    const fan = (cx, cy, ang0) => {
      const parts = [circle(5.6 * s, cx, cy).subtract(circle(4.0 * s, cx, cy))];
      const d0 = 3.6 * Math.PI / 180, d1 = 3.2 * Math.PI / 180, r0 = 6.4 * s, r1 = 11.0 * s;
      for (let i = 0; i < 9; i++) {
        const a = (ang0 + 10 + i * 160 / 8) * Math.PI / 180;
        parts.push(poly([[cx + r0 * Math.cos(a - d0), cy + r0 * Math.sin(a - d0)], [cx + r1 * Math.cos(a - d1), cy + r1 * Math.sin(a - d1)],
                         [cx + r1 * Math.cos(a + d1), cy + r1 * Math.sin(a + d1)], [cx + r0 * Math.cos(a + d0), cy + r0 * Math.sin(a + d0)]]));
      }
      return CS.union(parts);
    };
    const along = (n, half) => Array.from({ length: n }, (_, i) => -half + 2 * half * (i + 0.5) / n);
    const fans = [];
    for (const x of along(nShort, WIN_X)) fans.push(fan(x, -WIN_Z, 180), fan(x, WIN_Z, 0));
    for (const y of along(nLong, WIN_Z)) fans.push(fan(-WIN_X, y, 90), fan(WIN_X, y, -90));
    const lvl1 = [band, ring1, ring2], lvl2 = [];
    if (fans.length) lvl2.push(CS.union(fans).intersect(field));
    if (corner !== "none") {
      const d = this.cornerDiamond(g, s), sq = k => rot45(rect(d.cx - k, d.cy - k, d.cx + k, d.cy + k), d.cx, d.cy);
      if (corner === "nested" && 2 * Math.SQRT2 * d.kIn >= NEST_MIN) {
        lvl1.push(mirror4(sq(d.k).subtract(sq(d.k - RING * s))));
        lvl2.push(mirror4(sq(d.kIn)));
      } else lvl2.push(mirror4(sq(d.k)));
    }
    const L1all = clean(CS.union(lvl1));
    if (!lvl2.length) return [{ shape: L1all, height: R1 }];
    const L2 = clean(CS.union(lvl2));
    return [{ shape: L1all.subtract(L2), height: R1 }, { shape: L2, height: R2 }];
  },
};
