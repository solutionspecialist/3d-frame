// Assemble the static site into docs/ (GitHub Pages serves main:/docs): page, sources, vendored libraries.
import { cpSync, mkdirSync, rmSync } from "node:fs";
const root = new URL("..", import.meta.url).pathname, out = root + "docs/";
rmSync(out, { recursive: true, force: true });
mkdirSync(out + "vendor", { recursive: true });
cpSync(root + "web/index.html", out + "index.html");
cpSync(root + "src", out + "src", { recursive: true });
for (const [from, to] of [["node_modules/manifold-3d/manifold.js", "manifold.js"], ["node_modules/manifold-3d/manifold.wasm", "manifold.wasm"],
  ["node_modules/three/build/three.module.js", "three.module.js"], ["node_modules/three/examples/jsm/controls/OrbitControls.js", "OrbitControls.js"]])
  cpSync(root + from, out + "vendor/" + to);
cpSync(root + "web/.nojekyll", out + ".nojekyll");
console.log("site written to docs/");
