// Regression + function tests. Fixtures are the original build123d model's volumes and sizes: any change
// to the core or the art deco style must still reproduce them unless the change is deliberate.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Module from "manifold-3d";
import { buildFrame, validate } from "../src/core.js";
import { closedSolid } from "../src/export.js";
import { byId } from "../src/styles/index.js";

const M = await Module(); M.setup();
const style = byId("art-deco");
const FIX = JSON.parse(readFileSync(new URL("./fixtures.json", import.meta.url)));

for (const [name, f] of Object.entries(FIX)) {
  if (name.startsWith("_")) continue;
  test(`${name}: matches the reference model`, () => {
    const v = validate(f.params, style, f.style, M);
    assert.deepEqual(v.err, [], "validation errors");
    const { part } = buildFrame(M, f.params, style, f.style, { coupon: !!f.coupon });
    assert.equal(part.status(), "NoError");
    assert.equal(part.decompose().length, 1, "one body");
    const bb = part.boundingBox(), size = [0, 1, 2].map(i => bb.max[i] - bb.min[i]);
    size.forEach((s, i) => assert.ok(Math.abs(s - f.bbox[i]) < 1e-3, `bbox[${i}] ${s} vs ${f.bbox[i]}`));
    assert.ok(Math.abs(bb.min[2]) < 1e-6, "sits on the bed");
    const dv = (part.volume() - f.volume) / f.volume;
    assert.ok(Math.abs(dv) < 1e-4, `volume ${part.volume().toFixed(3)} vs ${f.volume.toFixed(3)} (${(dv * 100).toFixed(4)}%)`);
    assert.ok(closedSolid(part).ok, "closed solid by vertex identity");
  });
}

// functional probes, design frame -> print frame: printX = -depth, printY = x, printZ = height + OUT_Z
for (const name of ["card", "strip", "mag10x3", "odd"]) {
  test(`${name}: card fits, slides out, magnets seat`, () => {
    const f = FIX[name];
    const { part, g } = buildFrame(M, f.params, style, f.style);
    const { p, T_CAV, FLOOR_Z, OUT_Z, D } = g, MF = M.Manifold;
    const at = (x, y, z) => [-y, x, z + OUT_Z];
    const box = (cx, cy, cz, sx, sy, sz) => MF.cube([sy, sx, sz], true).translate(at(cx, cy, cz));
    const EPS = 1e-6;   // mm3: boolean round-off, far below anything physical
    const hit = s => { const v = part.intersect(s).volume(); return v < EPS ? 0 : v; };
    const yc = p.T_LIP + T_CAV / 2;
    const card = (dx = 0, dy = 0, dz = 0) => box(dx, yc + dy, FLOOR_Z + p.CARD_H / 2 + dz, p.CARD_W, p.CARD_T, p.CARD_H);
    assert.equal(hit(card()), 0, "seated card touches nothing");
    for (const d of [p.CLR - 0.01, -(p.CLR - 0.01)]) { assert.equal(hit(card(d)), 0, "side play"); assert.equal(hit(card(0, d)), 0, "depth play"); }
    assert.ok(hit(card(p.CLR + 0.05)) > 0, "clearance is not larger than set");
    assert.ok(hit(card(0, 0, -0.05)) > 0, "card rests on the floor");
    for (let dz = 0; dz <= p.CARD_H + 30; dz += 5) assert.equal(hit(card(0, 0, dz)), 0, `slides out (blocked at +${dz})`);
    // lip holds it: the window is narrower than the card on every side
    assert.ok(2 * g.WIN_X < p.CARD_W && 2 * g.WIN_Z < p.CARD_H);
    for (const [x, z] of g.MAGS) {
      const disc = MF.cylinder(p.MAG_T, p.MAG_DIA / 2, p.MAG_DIA / 2, 256)
        .transform([0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 1]).translate(at(x, D - p.MAG_DEPTH, z));
      assert.equal(hit(disc), 0, `magnet at ${x.toFixed(1)}, ${z.toFixed(1)} seats`);
    }
  });
}
