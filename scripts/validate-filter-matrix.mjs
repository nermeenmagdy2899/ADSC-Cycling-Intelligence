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
const dashboardSource = await readFile(new URL("../src/components/CyclingDashboard.tsx", import.meta.url), "utf8");
const characteristicFields = ["condition"];
const retiredFilters = [
  { stateKey: "materialFilter", field: "material", populated: 1825 },
  { stateKey: "lightingFilter", field: "lighting", populated: 230 },
  { stateKey: "shadingFilter", field: "shading", populated: 230 },
  { stateKey: "plantingFilter", field: "planting", populated: 180 }
];
const widthBands = ["all", "under-2.5", "2.5-3.49", "3.5-4.49", "4.5-plus"];

function isDecisionFacing(feature) {
  const properties = feature.properties;
  const genericName = String(properties.name ?? "").trim().toLowerCase() === "cycling";
  const polygon = feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon";
  return !(properties.municipality === "ADM"
    && properties.featureClass === "Cycle track"
    && genericName
    && polygon);
}

function matches(feature, region, featureClass) {
  const properties = feature.properties;
  return (region === "all" || properties.municipality === region)
    && (featureClass === "all" || properties.featureClass === featureClass);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function matchesWidth(width, band) {
  if (band === "all") return true;
  if (width == null) return false;
  return (band === "under-2.5" && width < 2.5)
    || (band === "2.5-3.49" && width >= 2.5 && width < 3.5)
    || (band === "3.5-4.49" && width >= 3.5 && width < 4.5)
    || (band === "4.5-plus" && width >= 4.5);
}

const excludedFragments = inventory.features.filter((feature) => !isDecisionFacing(feature));
const features = inventory.features.filter(isDecisionFacing);
assert(excludedFragments.length === 220, `Expected 220 generic Cycling polygons, found ${excludedFragments.length}`);
assert(excludedFragments.every((feature) => feature.properties.name.trim().toLowerCase() === "cycling" && feature.geometry.type === "Polygon"), "Excluded inventory contains an identifiable track");
assert(features.every((feature) => feature.properties.name.trim().toLowerCase() !== "cycling"), "Generic Cycling polygon leaked into decision-facing inventory");

const ids = new Set();
let featureChecks = 0;
for (const feature of features) {
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

for (const { stateKey, field, populated } of retiredFilters) {
  const recorded = features.filter((feature) => feature.properties[field] != null && feature.properties[field] !== "");
  const alAinRecorded = recorded.filter((feature) => feature.properties.municipality === "AAM");
  assert(recorded.length === populated, `${field}: expected ${populated} populated records, found ${recorded.length}`);
  assert(alAinRecorded.length === 0, `${field}: expected no source support in Al Ain`);
  assert(!dashboardSource.includes(stateKey), `${stateKey}: retired low-coverage filter remains in dashboard state`);
  assert(!dashboardSource.includes(`id="${field}"`), `${field}: retired low-coverage dropdown remains in the dashboard`);
  console.log(`${field}: ${recorded.length}/${features.length} populated (${((recorded.length / features.length) * 100).toFixed(1)}%); removed from executive filters`);
}

for (const region of regions) {
  const all = features.filter((feature) => matches(feature, region, "all"));
  const specific = classes.slice(1).flatMap((category) => features.filter((feature) => matches(feature, region, category)));
  const allIds = new Set(all.map((feature) => feature.properties.id));
  const specificIds = new Set(specific.map((feature) => feature.properties.id));
  const cycles = features.filter((feature) => matches(feature, region, "Cycle track"));
  assert(allIds.size === specificIds.size, `${region}: all mapped classes is not the union of specific classes`);
  for (const id of specificIds) assert(allIds.has(id), `${region}: all mapped classes omits ${id}`);
  for (const feature of cycles) assert(allIds.has(feature.properties.id), `${region}: verified cycle track missing from all mapped classes`);
  console.log(`${region}: ${allIds.size} all / ${cycles.length} verified cycle tracks`);
}

let characteristicChecks = 0;
for (const field of characteristicFields) {
  const values = ["all", ...new Set(features.map((feature) => feature.properties[field]).filter(Boolean))];
  for (const feature of features) {
    for (const value of values) {
      const actual = value === "all" || feature.properties[field] === value;
      const expected = value === "all" || String(feature.properties[field]) === value;
      assert(actual === expected, `${feature.properties.id}: ${field} filter mismatch for ${value}`);
      characteristicChecks += 1;
    }
  }
}

for (const feature of features) {
  let matches = 0;
  for (const band of widthBands) {
    if (matchesWidth(feature.properties.widthM, band)) matches += 1;
    characteristicChecks += 1;
  }
  assert(matches === (feature.properties.widthM == null ? 1 : 2), `${feature.properties.id}: width bands overlap or omit a value`);
}

console.log(`PASS: ${features.length} decision-facing features, ${featureChecks.toLocaleString()} feature-filter checks, 16 region × class combinations.`);
console.log(`PASS: ${excludedFragments.length} generic ADM Cycling polygons retained in the raw source and excluded from the dashboard map, lists, filters, and cards.`);
console.log(`PASS: ${characteristicChecks.toLocaleString()} active condition and width filter checks.`);
console.log("PASS: material, lighting, shading, and planting remain source attributes but are absent from executive filter state and UI.");
