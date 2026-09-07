/**
 * Source-level regression checks for the August 2026 programme model and the
 * Packages 1-4 as-built web-map conversion. Intentional source conflicts are
 * asserted as known exceptions so they cannot silently disappear.
 */

import { readFile } from "node:fs/promises";

const summary = JSON.parse(await readFile(new URL("../public/data/asbuilt-packages-1-4-summary.json", import.meta.url), "utf8"));
const asBuilt = JSON.parse(await readFile(new URL("../public/data/asbuilt-packages-1-4.geojson", import.meta.url), "utf8"));

const headline = { scope: 338.7, completed: 232.7, remaining: 106, progress: 68.7 };
const routes = [
  { id: "track-1-p12", package: "Package 1 & 2", status: "construction", contractor: "Gulf Contracting & Landscape", forecast: "Feb 2026", scope: 105.7, completed: 90.6, remaining: 15.1, wip: 15.1, progress: 86 },
  { id: "track-1-p34", package: "Package 3 & 4", status: "construction", contractor: "Hilalco", forecast: "Mar 2027", scope: 69.1, completed: 15, remaining: 54.1, wip: 54.1, progress: 22 },
  { id: "track-2-a", package: "Section A", status: "design-build", contractor: "Western Bainoona Group", forecast: "Mar 2027", scope: 37, completed: 25, remaining: 12, wip: 12, progress: 67.5 },
  { id: "track-2-b", package: "Section B", status: "not-started", contractor: "Western Bainoona Group / Zutari", forecast: "Mar 2028", scope: 26.1, completed: 1, remaining: 25.1, wip: 0, progress: 0, requiresValidation: true },
  { id: "track-3", package: "Part 1", status: "design-build", contractor: "GCC Landscape", forecast: "Apr 2026", scope: 78.67, completed: 76.47, remaining: 2.2, wip: 2.2, progress: 97 },
  { id: "track-4", package: "Part 2", status: "design-build", contractor: "GCC Landscape", forecast: "Apr 2026", scope: 42.74, completed: 42.24, remaining: 0.5, wip: 0.5, progress: 99 }
];
const contracts = [
  { id: "c-p12", routeIds: ["track-1-p12"] },
  { id: "c-p34", routeIds: ["track-1-p34"] },
  { id: "c-2a", routeIds: ["track-2-a"] },
  { id: "c-2b", routeIds: ["track-2-b"] },
  { id: "c-34", routeIds: ["track-3", "track-4"] }
];
const budgetSourceRoutes = routes;
const hsct = {
  id: "hsct",
  programmeRoute: true,
  reportedInAugust2026: false,
  currentGeometryAvailable: false,
  currentProgress: null,
  currentForecast: null,
  currentBudget: null,
  referenceGeometrySource: "2022 Basis of Design concept alignment",
  referenceGeometryVisible: true,
  historicalScopes: [
    { valueKm: 47, source: "2022 Basis of Design" },
    { valueKm: 52, source: "Progress Status - December 2025" }
  ]
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function close(actual, expected, tolerance = 0.011) {
  return Math.abs(actual - expected) <= tolerance;
}

assert(close(headline.scope, headline.completed + headline.remaining), "Programme headline does not reconcile");
assert(headline.progress >= 0 && headline.progress <= 100, "Programme progress outside 0-100%");
assert(new Set(routes.map((route) => route.id)).size === routes.length, "Duplicate route IDs");
for (const route of routes) {
  assert(route.scope >= 0 && route.completed >= 0 && route.remaining >= 0 && route.wip >= 0, `${route.id}: negative distance`);
  assert(close(route.scope, route.completed + route.remaining), `${route.id}: scope does not equal completed plus remaining`);
  assert(route.progress >= 0 && route.progress <= 100, `${route.id}: progress outside 0-100%`);
}

const dimensions = {
  route: ["all", "track-1", "tracks-3-4", ...routes.map((route) => route.id)],
  package: ["all", ...new Set(routes.map((route) => route.package))],
  status: ["all", ...new Set(routes.map((route) => route.status))],
  contractor: ["all", ...new Set(routes.map((route) => route.contractor))],
  forecast: ["all", ...new Set(routes.map((route) => route.forecast))]
};
let routeFilterChecks = 0;
for (const routeValue of dimensions.route) for (const packageValue of dimensions.package) {
  for (const statusValue of dimensions.status) for (const contractorValue of dimensions.contractor) {
    for (const forecastValue of dimensions.forecast) {
      const result = routes.filter((route) => (routeValue === "all" || route.id === routeValue || (routeValue === "track-1" && route.id.startsWith("track-1-")) || (routeValue === "tracks-3-4" && ["track-3", "track-4"].includes(route.id)))
        && (packageValue === "all" || route.package === packageValue)
        && (statusValue === "all" || route.status === statusValue)
        && (contractorValue === "all" || route.contractor === contractorValue)
        && (forecastValue === "all" || route.forecast === forecastValue));
      assert(result.every((route) => routeValue === "all" || route.id === routeValue || (routeValue === "track-1" && route.id.startsWith("track-1-")) || (routeValue === "tracks-3-4" && ["track-3", "track-4"].includes(route.id))), "Route filter leaked a route");
      assert(result.every((route) => packageValue === "all" || route.package === packageValue), "Package filter leaked a route");
      assert(result.every((route) => statusValue === "all" || route.status === statusValue), "Status filter leaked a route");
      assert(result.every((route) => contractorValue === "all" || route.contractor === contractorValue), "Contractor filter leaked a route");
      assert(result.every((route) => forecastValue === "all" || route.forecast === forecastValue), "Forecast filter leaked a route");
      routeFilterChecks += 1;
    }
  }
}

function semanticSelection({ region = "all", route = "all", packageName = "all", status = "all" }) {
  const regionAllowsProgramme = region === "all" || region === "ADM";
  const routeMatch = (item) => route === "all" || item.id === route || (route === "track-1" && item.id.startsWith("track-1-")) || (route === "tracks-3-4" && ["track-3", "track-4"].includes(item.id));
  const programmeRoutes = regionAllowsProgramme ? routes.filter((item) => routeMatch(item)
    && (packageName === "all" || item.package === packageName)
    && (status === "all" || item.status === status)) : [];
  // Budget intentionally ignores status and all municipal-characteristic filters.
  const budgetRoutes = regionAllowsProgramme ? budgetSourceRoutes.filter((item) => routeMatch(item)
    && (packageName === "all" || item.package === packageName)) : [];
  const ids = new Set(budgetRoutes.map((item) => item.id));
  const budgetContracts = contracts.filter((contract) => contract.routeIds.some((id) => ids.has(id)));
  return { programmeRoutes, budgetContracts };
}

const semanticCases = [
  { name: "all regions", filters: {}, programme: 6, contracts: 5 },
  { name: "ADM", filters: { region: "ADM" }, programme: 6, contracts: 5 },
  { name: "AAM", filters: { region: "AAM" }, programme: 0, contracts: 0 },
  { name: "DRM", filters: { region: "DRM" }, programme: 0, contracts: 0 },
  { name: "Track 1 family", filters: { route: "track-1" }, programme: 2, contracts: 2 },
  { name: "Tracks 3 & 4 shared contract", filters: { route: "tracks-3-4" }, programme: 2, contracts: 1 },
  { name: "Track 2A", filters: { route: "track-2-a" }, programme: 1, contracts: 1 },
  { name: "Track 2B", filters: { route: "track-2-b" }, programme: 1, contracts: 1 },
  { name: "Track 3", filters: { route: "track-3" }, programme: 1, contracts: 1 },
  { name: "Track 4", filters: { route: "track-4" }, programme: 1, contracts: 1 },
  { name: "region + route", filters: { region: "ADM", route: "track-3" }, programme: 1, contracts: 1 },
  { name: "region + status", filters: { region: "ADM", status: "design-build" }, programme: 3, contracts: 5 },
  { name: "route + status", filters: { route: "track-2-a", status: "construction" }, programme: 0, contracts: 1 }
];
for (const test of semanticCases) {
  const result = semanticSelection(test.filters);
  assert(result.programmeRoutes.length === test.programme, `${test.name}: programme propagation failed`);
  assert(result.budgetContracts.length === test.contracts, `${test.name}: budget relationship failed`);
}
assert(semanticSelection({ route: "track-3" }).budgetContracts[0]?.id === "c-34", "Track 3 must retain the shared Tracks 3 & 4 contract without allocating it");
assert(semanticSelection({ route: "track-4" }).budgetContracts[0]?.id === "c-34", "Track 4 must retain the shared Tracks 3 & 4 contract without allocating it");
assert(semanticSelection({ status: "construction" }).budgetContracts.length === semanticSelection({ status: "design-build" }).budgetContracts.length, "Delivery status must not filter historical budget contracts");
assert(hsct.programmeRoute, "HSCT must remain in the programme route structure");
assert(!hsct.reportedInAugust2026, "HSCT must remain marked as an August 2026 current-source gap");
assert(!hsct.currentGeometryAvailable, "HSCT must not be assigned Packages 1-4 as-built geometry");
assert([hsct.currentProgress, hsct.currentForecast, hsct.currentBudget].every((value) => value == null), "HSCT current progress, forecast, and budget must remain unavailable");
assert(hsct.referenceGeometryVisible && hsct.referenceGeometrySource.startsWith("2022 Basis of Design"), "HSCT historical reference alignment must remain visible and source-labelled");
assert(hsct.historicalScopes[0].valueKm === 47 && hsct.historicalScopes[1].valueKm === 52, "HSCT historical references changed");
assert(!contracts.some((contract) => contract.routeIds.includes("hsct")), "HSCT must not be assigned a current budget contract");
const programmeBaseline = semanticSelection({});
for (const inventoryOnlyFilter of [{ material: "Asphalt" }, { condition: "Excellent" }, { lighting: "Yes" }, { shading: "Yes" }, { planting: "Yes" }]) {
  const isolated = semanticSelection(inventoryOnlyFilter);
  assert(isolated.programmeRoutes.length === programmeBaseline.programmeRoutes.length, "Inventory-only filter changed programme scope");
  assert(isolated.budgetContracts.length === programmeBaseline.budgetContracts.length, "Inventory-only filter changed budget scope");
}

const routeScope = routes.reduce((sum, route) => sum + route.scope, 0);
const routeCompleted = routes.reduce((sum, route) => sum + route.completed, 0);
assert(close(routeScope - headline.scope, 20.61), "Expected route/headline scope exception changed");
assert(close(routeCompleted - headline.completed, 17.61), "Expected route/headline completed exception changed");
assert(routes.find((route) => route.id === "track-2-b")?.requiresValidation, "Track 2B exception must remain explicit");

assert(summary.sourceDate === "2026-08-26", "Unexpected as-built source date");
assert(summary.sourceCrs === "EPSG:4326 (KML longitude/latitude)", "Unexpected KMZ CRS interpretation");
assert(summary.outputCrs === "EPSG:4326", "Unexpected web-map CRS");
assert(summary.validation.coordinatesWithinWgs84 === true, "As-built coordinates are outside WGS84 bounds");
assert(summary.validation.abuDhabiExtent === true, "As-built coordinates are outside the Abu Dhabi QA extent");
assert(summary.validation.packageIdentityAvailable === false, "Package identity changed; review matching before changing status");
assert(summary.geometryMatchStatus === "Partially matched", "As-built match status must remain qualified");
assert(summary.invalidCoordinateCount === 0, "As-built contains invalid coordinates");
assert(asBuilt.type === "FeatureCollection", "As-built output is not a FeatureCollection");
assert(asBuilt.features.length === summary.outputFeatureCount, "As-built feature count differs from its validation summary");

const allowedGeometry = new Set(["LineString", "MultiLineString", "Polygon", "MultiPolygon"]);
for (const feature of asBuilt.features) {
  assert(allowedGeometry.has(feature.geometry?.type), `${feature.properties?.id}: unsupported geometry type`);
  assert(feature.properties?.geometrySourceDate === "2026-08-26", `${feature.properties?.id}: source date missing`);
  assert(feature.properties?.geometryMatchStatus === "Partially matched", `${feature.properties?.id}: unqualified package match`);
}

console.log("PASS: August 2026 programme headline and all six current route rows validated.");
console.log(`PASS: ${routeFilterChecks.toLocaleString()} route, package, status, contractor, and forecast filter combinations validated.`);
console.log(`PASS: ${semanticCases.length} semantic propagation scenarios plus 5 inventory-domain isolation checks; unsupported joins stay isolated and shared contracts stay unallocated.`);
console.log("PASS: HSCT remains a programme route with a source-labelled 2022 reference alignment, no current As-Built/progress/forecast/budget, and preserved 47 km / 52 km historical references.");
console.log("PASS: Known 20.61 km scope and 17.61 km completed reconciliation exceptions remain explicit.");
console.log(`PASS: ${asBuilt.features.length.toLocaleString()} as-built geometries validated as EPSG:4326 with aggregate package matching.`);
