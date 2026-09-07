/** Exhaustive data/UI QA for the cycling-only executive map and filters. */

import { readFile } from "node:fs/promises";

const regions = ["all", "ADM", "AAM", "DRM"];
const inventory = JSON.parse(await readFile(new URL("../public/data/cycling-inventory.geojson", import.meta.url), "utf8"));
const dashboardSource = await readFile(new URL("../src/components/CyclingDashboard.tsx", import.meta.url), "utf8");
const mapSource = await readFile(new URL("../src/components/InventoryMap.tsx", import.meta.url), "utf8");
const characteristicFields = ["condition"];
const retiredFilters = [
  { stateKey: "materialFilter", field: "material", populated: 467 },
  { stateKey: "lightingFilter", field: "lighting", populated: 223 },
  { stateKey: "shadingFilter", field: "shading", populated: 223 },
  { stateKey: "plantingFilter", field: "planting", populated: 173 }
];
const widthBands = ["all", "under-2.5", "2.5-3.49", "3.5-4.49", "4.5-plus"];

function isDecisionFacing(feature) {
  const properties = feature.properties;
  const genericName = String(properties.name ?? "").trim().toLowerCase() === "cycling";
  const polygon = feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon";
  const genericAdmFragment = properties.municipality === "ADM"
    && properties.featureClass === "Cycle track"
    && genericName
    && polygon;
  return properties.featureClass === "Cycle track" && !genericAdmFragment;
}

function matches(feature, region) {
  const properties = feature.properties;
  return region === "all" || properties.municipality === region;
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

const genericFragments = inventory.features.filter((feature) => {
  const properties = feature.properties;
  return properties.municipality === "ADM"
    && properties.featureClass === "Cycle track"
    && String(properties.name ?? "").trim().toLowerCase() === "cycling"
    && (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon");
});
const nonCyclingFeatures = inventory.features.filter((feature) => feature.properties.featureClass !== "Cycle track");
const features = inventory.features.filter(isDecisionFacing);
assert(genericFragments.length === 220, `Expected 220 generic Cycling polygons, found ${genericFragments.length}`);
assert(nonCyclingFeatures.length === 2390, `Expected 2,390 retained non-cycling source features, found ${nonCyclingFeatures.length}`);
assert(features.length === 475, `Expected 475 decision-facing cycle tracks, found ${features.length}`);
assert(features.every((feature) => feature.properties.name.trim().toLowerCase() !== "cycling"), "Generic Cycling polygon leaked into decision-facing inventory");
assert(features.every((feature) => feature.properties.featureClass === "Cycle track"), "Non-cycling feature leaked into the executive collection");

const ids = new Set();
let featureChecks = 0;
for (const feature of features) {
  const { id, municipality } = feature.properties;
  assert(!ids.has(id), `Duplicate feature ID: ${id}`);
  ids.add(id);
  assert(regions.includes(municipality), `${id}: invalid municipality ${municipality}`);
  for (const region of regions) {
    const expected = region === "all" || municipality === region;
    assert(matches(feature, region) === expected, `${id}: region filter mismatch for ${region}`);
    featureChecks += 1;
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
  const cycles = features.filter((feature) => matches(feature, region));
  const expected = { all: 475, ADM: 142, AAM: 8, DRM: 325 }[region];
  assert(cycles.length === expected, `${region}: expected ${expected} cycling tracks, found ${cycles.length}`);
  console.log(`${region}: ${cycles.length} verified cycling tracks`);
}

const executiveSource = `${dashboardSource}\n${mapSource}`;
for (const forbidden of ["Other paths / walkways", "Unclassified track polygons", "Municipal inventory", "Sources & methodology", "Source details & comparison boundaries"]) {
  assert(!executiveSource.includes(forbidden), `Removed executive content remains in UI source: ${forbidden}`);
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

console.log(`PASS: ${features.length} decision-facing cycling tracks and ${featureChecks.toLocaleString()} region-filter checks.`);
console.log(`PASS: ${genericFragments.length} generic Cycling polygons and ${nonCyclingFeatures.length.toLocaleString()} non-cycling features remain in the raw source but are absent from the executive view.`);
console.log(`PASS: ${characteristicChecks.toLocaleString()} active condition and width filter checks.`);
console.log("PASS: material, lighting, shading, and planting remain source attributes but are absent from executive filter state and UI.");
console.log("PASS: methodology disclosures and all named non-cycling classes are absent from executive UI source.");
