// Art deco: 45° canted outline, outer band, double window line, a sunburst fan on every side, nested
// diamonds in the corners. Fans and diamonds scale with the border; fan count follows side length.
import { helpers } from "../geom.js";

const REF_BORDER = 10.7;   // border (beyond the pocket) the motif sizes were drawn for
const FAN_PITCH = 45;      // mm of side length per fan, at scale 1
const R1 = 1.2, R2 = 1.8;  // relief heights: line work / fans and diamonds

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
      options: [["nested", "Nested diamond"], ["diamond", "Diamond"], ["none", "None"]] },
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
    const { poly } = helpers(M), { s } = this.resolve(g, sp), c = 8.0 * s, X = g.OUT_X, Y = g.OUT_Z;
    return poly([[-X + c, -Y], [X - c, -Y], [X, -Y + c], [X, Y - c], [X - c, Y], [-X + c, Y], [-X, Y - c], [-X, -Y + c]]);
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
      const cx = (WIN_X + 3.7 + OUT_X - 3.6) / 2, cy = (WIN_Z + 3.7 + OUT_Z - 3.6) / 2 - 1.0 * s;
      const sq = k => rect(cx - k * s, cy - k * s, cx + k * s, cy + k * s);
      lvl2.push(mirror4(rot45(sq(2.6), cx, cy).intersect(field)));
      if (corner === "nested") lvl1.push(mirror4(rot45(sq(4.4), cx, cy).subtract(rot45(sq(3.4), cx, cy)).intersect(field)));
    }
    const L1all = clean(CS.union(lvl1));
    if (!lvl2.length) return [{ shape: L1all, height: R1 }];
    const L2 = clean(CS.union(lvl2));
    return [{ shape: L1all.subtract(L2), height: R1 }, { shape: L2, height: R2 }];
  },
};
