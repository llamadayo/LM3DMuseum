import { readdir, stat, readFile } from "node:fs/promises";
import { join } from "node:path";
const entries = JSON.parse(await readFile("src/data/exhibits.json", "utf8"));
const ids = new Set();
for (const item of entries) {
  if (!item.id || ids.has(item.id))
    throw new Error(`Missing or duplicate exhibit ID: ${item.id}`);
  ids.add(item.id);
  for (const key of [
    "title",
    "subtitle",
    "summary",
    "alt",
    "creator",
    "source",
    "license",
    "licenseUrl",
  ])
    if (!item[key]) throw new Error(`${item.id}: missing ${key}`);
  if (
    !Array.isArray(item.description) ||
    !item.description.length ||
    !Number.isFinite(item.order)
  )
    throw new Error(`${item.id}: invalid description/order`);
  for (const key of ["model", "poster"]) {
    const path = item[key];
    if (!path) throw new Error(`${item.id}: missing ${key}`);
    if (path.startsWith("https://")) {
      console.warn(
        `${item.id}: external ${key}, validate CORS before publishing`,
      );
      continue;
    }
    if (
      /^[a-z][a-z\d+.-]*:/i.test(path) ||
      path.startsWith("//") ||
      path.split("/").includes("..")
    )
      throw new Error(`Unsafe asset path: ${path}`);
    const file = await readFile(join("public", path.replace(/^\/+/, "")));
    if (
      key === "model" &&
      (file.toString("ascii", 0, 4) !== "glTF" ||
        file.readUInt32LE(4) !== 2 ||
        file.readUInt32LE(8) !== file.length)
    )
      throw new Error(`Invalid GLB: ${path}`);
  }
}
async function walk(dir) {
  let total = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isSymbolicLink())
      throw new Error(`Symlinks are not supported: ${path}`);
    if (entry.isDirectory()) total += await walk(path);
    else {
      const { size } = await stat(path);
      total += size;
      if (size > 100 * 1024 * 1024)
        throw new Error(
          `${path} exceeds the 100 MiB repository-file budget. Use optimized assets or external storage.`,
        );
      if (size > 20 * 1024 * 1024)
        console.warn(
          `Optimize if visually acceptable: ${path} (${(size / 1024 / 1024).toFixed(1)} MiB)`,
        );
    }
  }
  return total;
}
const total = await walk("dist");
if (total > 1_000_000_000)
  throw new Error("Published site exceeds the conservative 1 GB Pages budget.");
if (total > 800_000_000)
  console.warn("Published site is approaching the 1 GB Pages budget.");
console.log(
  `${entries.length} valid exhibits; build size ${(total / 1024 / 1024).toFixed(2)} MiB.`,
);
