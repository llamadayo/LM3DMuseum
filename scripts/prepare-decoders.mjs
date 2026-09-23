import { cp, mkdir, copyFile, rm } from "node:fs/promises";
import { dirname } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const threeRoot = dirname(dirname(require.resolve("three")));
await rm("public/decoders", { recursive: true, force: true });
await mkdir("public/decoders", { recursive: true });
await cp(`${threeRoot}/examples/jsm/libs/draco/gltf`, "public/decoders/draco", {
  recursive: true,
});
await cp(`${threeRoot}/examples/jsm/libs/basis`, "public/decoders/basis", {
  recursive: true,
});
// model-viewer loads the URL through a classic script tag, so use the UMD/CJS build.
await copyFile(
  `${dirname(require.resolve("meshoptimizer"))}/meshopt_decoder.cjs`,
  "public/decoders/meshopt_decoder.js",
);
await copyFile(`${threeRoot}/LICENSE`, "public/decoders/THREE-LICENSE.txt");
await copyFile(
  `${dirname(require.resolve("meshoptimizer"))}/LICENSE.md`,
  "public/decoders/MESHOPT-LICENSE.txt",
);
console.log("Pinned Draco, KTX2 and Meshopt decoders copied locally.");
