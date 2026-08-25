/**
 * Exhaustive data-layer QA for the Network/GIS region × class filter matrix.
 *
 * It checks every feature against all 16 filter combinations and confirms that
 * each regional "all mapped classes" result is the exact union of its three
 * specific classes, including every verified cycle-track ID.
 */

import { readFile } from "node:fs/promises";

const regions = ["all", "ADM", "AAM", "DRM"];
const classes = ["all", "Cycle track", "Active-mobility path", "Unclassified track polygon"];
const inventory = JSON.parse(await readFile(new URL("../public/data/cycling-inventory.geojson", import.meta.url), "utf8"));

function matches(feature, region, featureClass) {
  const properties = feature.properties;
  return (region === "all" || properties.municipality === region)
    && (featureClass === "all" || properties.featureClass === featureClass);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const ids = new Set();
let featureChecks = 0;
for (const feature of inventory.features) {
  const { id, municipality, featureClass } = feature.properties;
  assert(!ids.has(id), `Duplicate feature ID: ${id}`);
  ids.add(id);
  assert(regions.includes(municipality), `${id}: invalid municipality ${municipality}`);
  assert(classes.includes(featureClass), `${id}: invalid feature class ${featureClass}`);
  for (const region of regions) {
    for (const category of classes) {
      const expected = (region === "all" || municipality === region)
        && (category === "all" || featureClass === category);
      assert(matches(feature, region, category) === expected, `${id}: filter mismatch for ${region}/${category}`);
      featureChecks += 1;
    }
  }
}

for (const region of regions) {
  const all = inventory.features.filter((feature) => matches(feature, region, "all"));
  const specific = classes.slice(1).flatMap((category) => inventory.features.filter((feature) => matches(feature, region, category)));
  const allIds = new Set(all.map((feature) => feature.properties.id));
  const specificIds = new Set(specific.map((feature) => feature.properties.id));
  const cycles = inventory.features.filter((feature) => matches(feature, region, "Cycle track"));
  assert(allIds.size === specificIds.size, `${region}: all mapped classes is not the union of specific classes`);
  for (const id of specificIds) assert(allIds.has(id), `${region}: all mapped classes omits ${id}`);
  for (const feature of cycles) assert(allIds.has(feature.properties.id), `${region}: verified cycle track missing from all mapped classes`);
  console.log(`${region}: ${allIds.size} all / ${cycles.length} verified cycle tracks`);
}

console.log(`PASS: ${inventory.features.length} features, ${featureChecks.toLocaleString()} feature-filter checks, 16 region × class combinations.`);
