// Fridge frame core: everything that does not depend on the style. The card pocket and top slot,
// the window and lip, magnet pockets, the perimeter chamfer, the fin, print orientation.
//
// Build frame: X = across the card, Y = up (portrait, print up), Z = depth (lip front face at Z = 0,
// relief toward -Z, back/fridge face at Z = D). Exported in print frame: width along printer Y,
// depth along printer X, bed at Z = 0.
import { helpers } from "./geom.js";

export const DEFAULTS = {
  CARD_W: 51.0, CARD_H: 88.5, CARD_T: 0.45,
  CLR: 0.3, OVERLAP: 2.5, WALL: 1.2, T_LIP: 1.2, T_BACK_MIN: 1.2,
  BORDER: "auto",                          // solid border beyond the pocket; auto = smallest allowed
  MAG_DIA: 8.0, MAG_T: 1.75, MAG_CLR: 0.3, MAG_GLUE: 0.05, MAG_N: 4, MAG_INSET: 15.25,
  FIN: true, FIN_T: 1.2, FIN_GAP: 0.6, FIN_D: 15.0, FIN_TOP_GAP: 5.0,
  TAB_W: 0.8, TAB_H: 2.0, TAB_START: 10.25, TAB_PITCH: 20.0,
  CH: 0.5, LEAD: 0.5, COUPON_H: 20.0,
};
export const PRINTER = { name: "Sovol SV06 Plus", x: 300, y: 300, z: 340, margin: 5 };
export const PROVEN_BRIDGE = 46.0;   // mm, PETG, overhang + external bridge speed 10 mm/s (2026-11-22)

export function derive(params, style) {
  const p = { ...DEFAULTS, ...params };
  p.MAG_D = p.MAG_DIA + p.MAG_CLR;
  p.MAG_DEPTH = p.MAG_T + p.MAG_GLUE;
  const sideMin = Math.max(p.MAG_D + 2 * p.WALL, style ? style.minBorder || 0 : 0);
  const SIDE = p.BORDER === "auto" || p.BORDER == null || p.BORDER === "" ? sideMin : Math.max(sideMin, Number(p.BORDER));
  const T_CAV = p.CARD_T + 2 * p.CLR;
  p.T_BACK = Math.max(p.T_BACK_MIN, p.MAG_DEPTH + p.WALL - p.T_LIP - T_CAV);   // WALL in front of a thick magnet
  const D = p.T_LIP + T_CAV + p.T_BACK;
  const CAV_X = p.CARD_W / 2 + p.CLR, WIN_X = p.CARD_W / 2 - p.OVERLAP, WIN_Z = p.CARD_H / 2 - p.OVERLAP;
  const OUT_X = CAV_X + SIDE, OUT_Z = WIN_Z + (OUT_X - WIN_X), FLOOR_Z = -p.CARD_H / 2;
  const MAG_X = CAV_X + SIDE / 2, k = Math.floor(p.MAG_N / 2), zmax = OUT_Z - p.MAG_INSET;
  const zs = k === 1 ? [0] : Array.from({ length: k }, (_, i) => -zmax + 2 * zmax * i / (k - 1));
  const MAGS = [-1, 1].flatMap(sx => zs.map(z => [sx * MAG_X, z]));
  const zTop = OUT_Z - p.FIN_TOP_GAP, TAB_Z = [];
  for (let z = -OUT_Z + p.TAB_START; z <= zTop - 10.0; z += p.TAB_PITCH) TAB_Z.push(z);
  return { p, SIDE, sideMin, T_CAV, D, CAV_X, WIN_X, WIN_Z, OUT_X, OUT_Z, FLOOR_Z, MAG_X, MAGS, TAB_Z, zTop };
}

/** Checks before building. With M (the geometry engine) it also tests shapes: style outline convex
 *  and holding every magnet pocket with WALL to spare. */
export function validate(params, style, styleParams = {}, M = null) {
  const g = derive(params, style), { p } = g, err = [], warn = [];
  if (p.CARD_W < 30 || p.CARD_H < 30) err.push("Card/photo must be at least 30 × 30 mm.");
  if (!(p.CARD_T > 0 && p.CARD_T <= 3)) err.push("Thickness must be between 0 and 3 mm.");
  if (p.CLR < 0.1) err.push("Clearance below 0.1 mm per side will not fit a real card.");
  if (p.OVERLAP < 1) err.push("Lip overlap under 1 mm will not hold the card.");
  if (g.WIN_X < 10 || g.WIN_Z < 10) err.push("Lip overlap leaves a window smaller than 20 mm.");
  if (![2, 4, 6].includes(p.MAG_N)) err.push("Magnet count must be 2, 4 or 6.");
  if (p.MAG_DIA < 3 || p.MAG_T < 0.5) err.push("Magnet must be at least 3 mm across and 0.5 mm thick.");
  if (p.BORDER !== "auto" && p.BORDER != null && p.BORDER !== "" && Number(p.BORDER) < g.sideMin)
    warn.push(`Border raised to ${g.sideMin.toFixed(1)} mm: the minimum for these magnets and this style.`);
  const r = p.MAG_D / 2, tip = r * Math.SQRT2;
  const zs = [...new Set(g.MAGS.map(m => m[1]))].sort((a, b) => a - b);
  for (let i = 1; i < zs.length; i++) if (zs[i] - zs[i - 1] < r + tip + p.WALL) { err.push("Magnets too close together for this frame height: use fewer."); break; }
  if (style) err.push(...style.validate(g, styleParams));
  if (M && style && !err.length) {
    const h = helpers(M), O = style.outline(M, g, styleParams);
    if (Math.abs(M.CrossSection.hull([O]).area() - O.area()) > 1e-6 * O.area())
      err.push("This style's outline is not convex: the perimeter chamfer needs a convex outline.");
    const pk = h.CS.union(g.MAGS.map(([x, z]) => teardrop(h, r, x, z)));
    if (pk.subtract(h.off(O, -p.WALL + 1e-3)).area() > 1e-6) err.push("A magnet pocket runs too close to the outline: fewer magnets, a smaller magnet or a wider border.");
  }
  const depth = g.D + 1.8 + (p.FIN ? p.FIN_GAP + p.FIN_D : 0);
  const bb = [depth, 2 * g.OUT_X, 2 * g.OUT_Z], lim = [PRINTER.x, PRINTER.y, PRINTER.z].map(v => v - 2 * PRINTER.margin);
  if (bb.some((v, i) => v > lim[i])) err.push(`Too big for the ${PRINTER.name} (${lim.join(" × ")} mm usable).`);
  const span = 2 * g.WIN_X;
  if (span > PROVEN_BRIDGE) warn.push(`Window top is a ${span.toFixed(1)} mm bridge: longer than the ${PROVEN_BRIDGE} mm proven. Print the test piece first.`);
  if (span > 30) warn.push("Set 75% overhang speed and external bridge speed to 10 mm/s: the window top prints as overhanging walls.");
  const ratio = 2 * g.OUT_Z / (g.D + 1.8);
  if (!p.FIN && ratio > 10) warn.push(`No fin: ${ratio.toFixed(0)}:1 tall-to-deep. Expect wobble near the top; use a brim at least.`);
  if (p.MAG_N === 2) warn.push("Two magnets: fine on the fridge, but it can swing if bumped.");
  return { err, warn, g, bbox: bb };
}

function teardrop(h, r, x, z) {   // tip up so the pocket roof prints without support
  const k = r / Math.SQRT2;
  return h.CS.union([h.circle(r, x, z), h.poly([[x - k, z + k], [x + k, z + k], [x, z + r * Math.SQRT2]])]);
}

export function buildFrame(M, params, style, styleParams = {}, { coupon = false } = {}) {
  const h = helpers(M), { CS, MF, rect, poly, off, prism, mat } = h;
  const g = derive(params, style), { p } = g;
  const { D, T_CAV, CAV_X, WIN_X, WIN_Z, OUT_Z, FLOOR_Z } = g;
  const O = style.outline(M, g, styleParams);

  // body: slab with 45° perimeter chamfer front and back (hull: outline is convex)
  const ch = p.CH;
  let part = MF.hull([prism(off(O, -ch), 0, D), prism(O, ch, D - ch)]);
  // one cutter for window, pocket and slot lead-in (they share faces)
  const windowCut = prism(rect(-WIN_X, -WIN_Z, WIN_X, WIN_Z), -1, p.T_LIP);
  const cavity = prism(rect(-CAV_X, FLOOR_Z, CAV_X, OUT_Z + 1), p.T_LIP, p.T_LIP + T_CAV);
  const L = p.LEAD, y0 = p.T_LIP, y1 = p.T_LIP + T_CAV;
  const wedge = MF.extrude(poly([[y0 - L, OUT_Z + 0.01], [y1 + L, OUT_Z + 0.01], [y1, OUT_Z - L], [y0, OUT_Z - L]]), 2 * CAV_X)
    .transform(mat([[0, 0, 1], [0, 1, 0], [1, 0, 0], [-CAV_X, 0, 0]]));
  part = part.subtract(MF.union([windowCut, cavity, wedge]));
  const r = p.MAG_D / 2;
  part = part.subtract(MF.union(g.MAGS.map(([x, z]) => prism(teardrop(h, r, x, z), D - p.MAG_DEPTH, D + 1))));
  const reliefs = style.relief(M, g, styleParams, O).flatMap(({ shape, height }) => h.relief(shape, height));
  part = MF.union([part, ...reliefs]);
  if (p.FIN && !coupon) {
    const fin = MF.cube([p.FIN_T, g.zTop + OUT_Z, p.FIN_D]).translate([-p.FIN_T / 2, -OUT_Z, D + p.FIN_GAP]);
    const tabs = g.TAB_Z.map(z => MF.cube([p.TAB_W, p.TAB_H, p.FIN_GAP + 0.02]).translate([-p.TAB_W / 2, z - p.TAB_H / 2, D - 0.01]));
    part = MF.union([part, fin, ...tabs]);
  }
  let lift = OUT_Z;
  if (coupon) {
    const z0 = OUT_Z - p.COUPON_H;
    part = part.intersect(MF.cube([4000, 1000, 4000]).translate([-2000, z0, -2000]));
    lift = -z0;
  }
  part = part.transform(mat([[0, 1, 0], [0, 0, 1], [-1, 0, 0], [0, 0, lift]]));   // to print frame
  return { part, g };
}
