# ADSC Cycling Dashboard Data Methodology

## Source Boundaries

The dashboard keeps five analytical domains separate:

1. **Current programme scope and progress** come from `Progress Layout_compressed August 26.pdf`, modified 26 August 2026.
2. **Completed as-built geometry** comes from `Package 1 ,2 ,3 &4 As- Built).kmz`.
3. **Current municipal GIS inventory and characteristics** come from the AAM, ADM, and DRM FileGDB and Excel sources.
4. **Budget, contract, contractor, and forecast references** come from `ADSC I Progress Status I Dec 2025 (3).pdf` and are visibly dated as historical.
5. **Network vision and design intent** come from `2022_08_05_Design_AD CyclingNetwork_BOD-Lores.pdf` and are historical context only.

The application does not sum these domains together. A planned programme kilometre is not treated as the same measure as a municipal inventory feature or source-recorded inventory length.

## Current Programme Headline

- Programme scope: **338.7 km**.
- Completed: **232.7 km**.
- Remaining / ongoing: **106.0 km**.
- Overall delivery: **68.7%**.
- Bridges: **12 total / 5 completed / 7 ongoing**.
- Underpasses: **1 total / 1 completed / 0 ongoing**.

These are the authoritative executive headline values. The route rows on the same August layout sum to 359.31 km scope and 250.31 km completed, exceeding the headline by 20.61 km and 17.61 km respectively. The dashboard preserves both grains, labels route-filtered KPIs as route-table values, and does not force a reconciliation.

## Historical Funding Reference

- Approved programme budget: **AED 1.7bn**.
- Required programme budget: **AED 4.0bn**.
- Funding gap: **AED 2.3bn**, derived from the two verified programme figures.

The values above and the contract table are from December 2025. The contract table is not totalled because Track 2 Section B mixes a base and optional overall scope. No current HSCT budget is inferred or displayed.

### HSCT current-source gap

HSCT remains a valid route in the programme structure. It is not reported in the 26 August 2026 progress source, and the Packages 1–4 As-Built KMZ does not provide HSCT geometry. The map displays the concept alignment from the 2022 Basis of Design as a dashed, source-labelled historical reference layer; it is never presented as current or As-Built geometry. The dashboard leaves current progress, forecast, and budget unavailable rather than interpreting the gap as cancellation. Historical scope references remain visible and separately labelled: 47 km in the 2022 Basis of Design and 52 km in the December 2025 Progress Status.

## Semantic Filter Relationships

The dashboard stores all active filters in one state object, then projects that state into source-qualified analytical domains:

- **Programme:** region, route, package, delivery status, contractor, and forecast update programme KPIs, route layers, route details, delivery progress, and executive attention. The unfiltered All Regions and Abu Dhabi views both retain the authoritative August 2026 headline.
- **Cycling-track characteristics:** region, condition, and width update the explicitly classified cycling geometry, searchable cycling-track list, and cycling-characteristic summaries.
- **Budget:** region, route, and package filter the December 2025 contract references only when an explicit route-to-contract mapping exists. Delivery status and municipal characteristics never filter budget values. Programme-wide approved, required, and gap values are not allocated to routes.

No route-to-inventory crosswalk exists in the supplied sources. Route, package, and delivery filters therefore do not recalculate municipal characteristics; characteristic filters do not recalculate programme delivery. The interface states this relationship boundary wherever an active filter is intentionally not propagated.

### Removed executive filters

Material, lighting, shading, and planting remain preserved as source attributes and are shown in selected-track details where recorded, but they are not presented as executive filters. A feature-level audit of the 475 decision-facing cycling tracks found:

- Material is populated for 467 tracks (98.3%) overall, but for 0 of 8 Al Ain cycling tracks; the wider retained source also contains non-normalized spellings and categories.
- Lighting is populated for 223 tracks (46.9%) overall and for 0 of 8 Al Ain cycling tracks.
- Shading is populated for 223 tracks (46.9%) overall and for 0 of 8 Al Ain cycling tracks.
- Planting is populated for 173 tracks (36.4%) overall and for 0 of 8 Al Ain cycling tracks.

None of the four attributes exists on the August 2026 programme-route source, and no source-backed route-to-inventory crosswalk is available. Keeping them as global filters would therefore imply a relationship that the supplied evidence does not support.

## As-built KMZ

The reproducible conversion script is `scripts/build_asbuilt.py`. It:

- reads KML geometry directly from the supplied KMZ;
- verifies that the coordinates are already longitude/latitude WGS84 and within the Abu Dhabi extent;
- preserves source line and polygon geometry rather than simplifying it into synthetic routes;
- omits invalid rings while reporting them in the source summary;
- writes `public/data/asbuilt-packages-1-4.geojson` and `public/data/asbuilt-packages-1-4-summary.json`.

The KMZ contains generic CAD object names such as Polyline and Hatch and no reliable package identifier. It is therefore matched only to Packages 1–4 in aggregate. It is not duplicated or hardcoded into separate Package 1–2 and Package 3–4 layers.

## Municipal Inventory

The reproducible conversion script is `scripts/build_inventory.py`. It:

- reads the supplied AAM, ADM, and DRM FileGDB layers;
- transforms source coordinate systems to WGS84;
- validates source topology and repairs only invalid geometries with a topology-preserving `make_valid` operation before output;
- retains source-defined geometry and selected characteristic fields;
- writes `public/data/cycling-inventory.geojson` and `public/data/cycling-inventory-summary.json`.

The executive dashboard surfaces only the 475 features explicitly classified as cycle tracks and excludes 2,390 pedestrian, active-mobility, and unclassified features. The ADM source also contains 220 generic cycle-track polygons named only `Cycling`; these are excluded because they are polygon fragments rather than identifiable tracks. All excluded geometry remains in the raw GeoJSON for auditability and future reconciliation.

### Abu Dhabi / ADM

- 2,715 polygons in the source `TRACKPOLYGON` layer.
- 362 records are explicitly identified as cycling by `UNITTYPE` or `TRACK_NAME`, totalling 65.52 km of source-recorded cycling length.
- Other source polygons remain available as an **unclassified track polygon** context layer and are not included in cycling KPIs.
- Structured characteristic fields include width, condition, material, direction, lighting, shading, planting, parking, and bike spaces.

### Al Dhafrah / DRM

- 332 polygons in the source `TRACK_POLYGON` layer.
- 325 records are explicitly identified as cycling, totalling 36.62 km of source-recorded cycling length.
- Records explicitly typed as jogging tracks remain visible as other active-mobility paths and are excluded from cycling KPIs.
- Uses the same core characteristic schema as ADM and is included in comparable characteristic analysis.

### Al Ain / AAM

- 38 centerline records covering mixed paths.
- 8 records are explicitly classified as bicycle tracks, totalling 38.27 km.
- 30 records are walkways or wider active-mobility paths.
- AAM is mapped with a clear classification but excluded from ADM/DRM characteristic comparisons because its schema and record definition differ.

## Map Reuse

The map architecture adapts the ADSC GIS Intelligence interaction pattern:

- one map controller component owns map lifecycle and resize handling;
- UI state drives basemap, region, class, programme route, selection, layer visibility, and perspective;
- programme scope, completed as-built geometry, routes with work in progress, and optional municipal inventory remain independently toggleable;
- filters and highlight layers are independent from narrative route selection;
- keyless CARTO streets and Esri satellite layers avoid a token-dependent blank canvas;
- selected features fly to their geometry and expose source-backed details;
- responsive controls remain outside the data layer and preserve touch pan/zoom.
