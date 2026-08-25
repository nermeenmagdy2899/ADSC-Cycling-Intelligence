# ADSC Cycling Dashboard Data Methodology

## Source Boundaries

The dashboard keeps three analytical domains separate:

1. **Planned programme scope and progress** come from `ADSC I Progress Status I Dec 2025 (3).pdf`.
2. **Network vision and design intent** come from `2022_08_05_Design_AD CyclingNetwork_BOD-Lores.pdf`.
3. **Current municipal GIS inventory and characteristics** come from the AAM, ADM, and DRM FileGDB and Excel sources.

The application does not sum these domains together. A planned programme kilometre is not treated as the same measure as a municipal inventory feature or source-recorded inventory length.

## Verified Programme Metrics

- Planned scope: **409.7 km**, calculated from detailed route values in the December 2025 progress deck.
- Completed asphalt: **219.0 km**.
- Remaining delivery: **190.7 km**, derived as planned minus completed.
- Approved programme budget: **AED 1.7bn**.
- Required programme budget: **AED 4.0bn**.
- Funding gap: **AED 2.3bn**, derived from the two verified programme figures.

The contract table reproduces the source-listed values. It is not totalled because Track 2 Section B mixes a base and optional overall scope and HSCT remains TBC.

## Municipal Inventory

The reproducible conversion script is `scripts/build_inventory.py`. It:

- reads the supplied AAM, ADM, and DRM FileGDB layers;
- transforms source coordinate systems to WGS84;
- validates source topology and repairs only invalid geometries with a topology-preserving `make_valid` operation before output;
- retains source-defined geometry and selected characteristic fields;
- writes `public/data/cycling-inventory.geojson` and `public/data/cycling-inventory-summary.json`.

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

The map architecture adapts the ADSC GIS Intelligence pattern rather than copying its application:

- one map controller component owns map lifecycle and resize handling;
- UI state drives basemap, region, class, selection, layer visibility, and perspective;
- filters and highlight layers are independent from narrative route selection;
- keyless CARTO streets and Esri satellite layers avoid a token-dependent blank canvas;
- selected features fly to their geometry and expose source-backed details;
- responsive controls remain outside the data layer and preserve touch pan/zoom.
