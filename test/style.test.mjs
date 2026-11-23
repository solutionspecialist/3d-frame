// Settings with no reference model: border width, motif scale, fan counts, corner motif.
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import Module from "manifold-3d";
import { buildFrame, validate, derive } from "../src/core.js";
import { closedSolid, to3MF } from "../src/export.js";
import { byId } from "../src/styles/index.js";

const M = await Module(); M.setup();
const deco = byId("art-deco");

test("fan count follows side length", () => {
  const card = deco.resolve(derive({}, deco), {});
  assert.ok(Math.abs(card.s - 1) < 1e-9);
  assert.deepEqual([card.nLong, card.nShort], [1, 1]);
  const strip = deco.resolve(derive({ CARD_W: 50.8, CARD_H: 152.4 }, deco), {});
  assert.equal(strip.nLong, 3);
  const photo = deco.resolve(derive({ CARD_W: 101.6, CARD_H: 152.4 }, deco), {});
  assert.deepEqual([photo.nLong, photo.nShort], [3, 2]);
});

test("motif scale follows the border; count shrinks as motifs grow", () => {
  const r = deco.resolve(derive({ BORDER: 18 }, deco), {});
  assert.ok(Math.abs(r.s - 18 / 10.7) < 1e-9);
  const r2 = deco.resolve(derive({ CARD_W: 50.8, CARD_H: 152.4, BORDER: 18 }, deco), {});
  assert.equal(r2.nLong, Math.floor(147.4 / (45 * r2.s)));
});

test("border below the minimum is raised, with a warning", () => {
  const v = validate({ BORDER: 5 }, deco, {}, M);
  assert.equal(v.g.SIDE, v.g.sideMin);
  assert.ok(v.warn.some(w => w.startsWith("Border raised")));
});

test("too many fans is refused", () => {
  const v = validate({}, deco, { fansLong: 6 }, M);
  assert.ok(v.err.some(e => e.includes("Too many fans")));
});

const cases = {
  wide_border: [{ BORDER: 18 }, {}],
  strip_wide: [{ CARD_W: 50.8, CARD_H: 152.4, CARD_T: 0.25, MAG_N: 6, BORDER: 16 }, {}],
  photo_4x6: [{ CARD_W: 101.6, CARD_H: 152.4, CARD_T: 0.25, MAG_N: 6 }, {}],
  plain: [{}, { fansLong: 0, fansShort: 0, corner: "none" }],
  diamond_only: [{ BORDER: 14 }, { corner: "diamond", fansLong: 2 }],   // 2 x 30 mm fans on an 83.5 mm side
};
for (const [name, [params, sp]] of Object.entries(cases)) {
  test(`${name}: builds a closed solid the card fits`, () => {
    const v = validate(params, deco, sp, M);
    assert.deepEqual(v.err, []);
    const { part, g } = buildFrame(M, params, deco, sp);
    assert.equal(part.status(), "NoError");
    assert.equal(part.decompose().length, 1);
    assert.ok(closedSolid(part).ok);
    const { p, T_CAV, FLOOR_Z, OUT_Z } = g;
    const card = M.Manifold.cube([p.CARD_T, p.CARD_W, p.CARD_H], true)
      .translate([-(p.T_LIP + T_CAV / 2), 0, FLOOR_Z + p.CARD_H / 2 + OUT_Z]);
    assert.ok(part.intersect(card).volume() < 1e-6);
    writeFileSync(`/tmp/style_${name}.3mf`, to3MF(part, name));   // for the printability tooling
  });
}
