// Mesh export: 3MF (keeps vertex identity: the closed solid arrives as built), STL, ZIP.

export function toSTL(manifold, name = "frame") {
  const mesh = manifold.getMesh();
  const { vertProperties: v, triVerts: t, numProp: np } = mesh;
  const nTri = t.length / 3, buf = new ArrayBuffer(84 + 50 * nTri), dv = new DataView(buf);
  const hdr = `${name} - 3d-frame`.slice(0, 79);
  for (let i = 0; i < hdr.length; i++) dv.setUint8(i, hdr.charCodeAt(i));
  dv.setUint32(80, nTri, true);
  let o = 84;
  for (let i = 0; i < nTri; i++) {
    const P = [0, 1, 2].map(j => [0, 1, 2].map(a => v[t[3 * i + j] * np + a]));
    const u = P[1].map((x, a) => x - P[0][a]), w = P[2].map((x, a) => x - P[0][a]);
    let n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const l = Math.hypot(...n) || 1; n = n.map(x => x / l);
    for (const x of n) { dv.setFloat32(o, x, true); o += 4; }
    for (const pt of P) for (const x of pt) { dv.setFloat32(o, x, true); o += 4; }
    dv.setUint16(o, 0, true); o += 2;
  }
  return new Uint8Array(buf);
}

// ------------------------------------------------------------------ mesh by vertex identity
// manifold's mesh is closed by vertex INDEX; its float32 positions can put two distinct vertices on
// the same point (they differ in double precision). STL keeps only positions, so readers merge them
// and see pinched edges. 3MF keeps indices, so the solid arrives exactly as built.
export function meshArrays(manifold) {
  const m = manifold.getMesh(), np = m.numProp, V = m.vertProperties, T = m.triVerts;
  const nV = V.length / np, canon = Int32Array.from({ length: nV }, (_, i) => i);
  const from = m.mergeFromVert || [], to = m.mergeToVert || [];
  for (let i = 0; i < from.length; i++) canon[from[i]] = to[i];
  const newId = new Int32Array(nV).fill(-1), verts = [];
  for (let i = 0; i < nV; i++) if (canon[i] === i) { newId[i] = verts.length / 3; verts.push(V[i * np], V[i * np + 1], V[i * np + 2]); }
  const tris = Array.from(T, v => newId[canon[v]]);
  return { verts, tris };
}

/** Edge check by vertex identity: every edge in exactly two triangles = closed, watertight solid. */
export function closedSolid(manifold) {
  const { tris } = meshArrays(manifold), c = new Map();
  for (let t = 0; t < tris.length; t += 3) for (let j = 0; j < 3; j++) {
    const a = tris[t + j], b = tris[t + (j + 1) % 3], k = a < b ? a * 4294967296 + b : b * 4294967296 + a;
    c.set(k, (c.get(k) || 0) + 1);
  }
  let bad = 0; for (const n of c.values()) if (n !== 2) bad++;
  return { edges: c.size, bad, ok: bad === 0 };
}

const enc = s => new TextEncoder().encode(s);

export function to3MF(manifold, name = "frame") {
  const { verts, tris } = meshArrays(manifold);
  const vs = [], ts = [];
  for (let i = 0; i < verts.length; i += 3) vs.push(`<vertex x="${verts[i]}" y="${verts[i + 1]}" z="${verts[i + 2]}"/>`);
  for (let i = 0; i < tris.length; i += 3) ts.push(`<triangle v1="${tris[i]}" v2="${tris[i + 1]}" v3="${tris[i + 2]}"/>`);
  const model = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
<metadata name="Title">${name}</metadata>
<resources><object id="1" type="model" name="${name}"><mesh>
<vertices>${vs.join("")}</vertices>
<triangles>${ts.join("")}</triangles>
</mesh></object></resources>
<build><item objectid="1"/></build>
</model>`;
  return zip([
    { name: "[Content_Types].xml", data: enc(`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>`) },
    { name: "_rels/.rels", data: enc(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>`) },
    { name: "3D/3dmodel.model", data: enc(model) },
  ]);
}

// minimal ZIP writer, stored (no compression): enough for 3MF and for the download bundle
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = d => { let c = 0xffffffff; for (let i = 0; i < d.length; i++) c = CRC[(c ^ d[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
export function zip(files) {
  const parts = [], central = []; let off = 0;
  for (const f of files) {
    const name = enc(f.name), d = f.data, crc = crc32(d);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(8, 0, true);
    h.setUint32(14, crc, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true); h.setUint16(26, name.length, true);
    parts.push(new Uint8Array(h.buffer), name, d);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true);
    c.setUint32(16, crc, true); c.setUint32(20, d.length, true); c.setUint32(24, d.length, true);
    c.setUint16(28, name.length, true); c.setUint32(42, off, true);
    central.push(new Uint8Array(c.buffer), name);
    off += 30 + name.length + d.length;
  }
  const cSize = central.reduce((s, a) => s + a.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
  e.setUint32(12, cSize, true); e.setUint32(16, off, true);
  const all = [...parts, ...central, new Uint8Array(e.buffer)], out = new Uint8Array(all.reduce((s, a) => s + a.length, 0));
  let o = 0; for (const a of all) { out.set(a, o); o += a.length; }
  return out;
}
