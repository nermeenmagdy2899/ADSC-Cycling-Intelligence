"""Audit source FileGDB geometries against browser GeoJSON output.

This is a read-only validation utility. It verifies that each source layer is
declared in its native CRS, is transformed once to EPSG:4326, and retains the
same geometry after the dashboard's documented simplification step. It also
reports unusually long *source* segments so they can be distinguished from
rendering artefacts.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Iterable

import fiona
from pyproj import Geod, Transformer
from shapely import make_valid
from shapely.geometry import shape
from shapely.ops import transform


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_GDB_ROOT = Path(os.environ.get("GIS_SOURCE", r"D:\Alchemy\ADSC\AD-CYCLING-DASHBOARD'\Tracks\GDB"))
OUTPUT = ROOT / "public" / "data" / "cycling-inventory.geojson"
GEOD = Geod(ellps="WGS84")

REGIONS = {
    "AAM": {"gdb": "AAM_Tracks.gdb", "layer": "TRACK_CENTERLINE", "id_field": "OBJECTID", "tolerance": 1.5, "epsg": 32640},
    "ADM": {"gdb": "ADM_Tracks.gdb", "layer": "TRACKPOLYGON", "id_field": None, "tolerance": 0.15, "epsg": 32640},
    "DRM": {"gdb": "DRM_Tracks.gdb", "layer": "TRACK_POLYGON", "id_field": None, "tolerance": 0.15, "epsg": 32639},
}


def sequences(geometry) -> Iterable[list[tuple[float, float]]]:
    """Yield independent coordinate sequences without joining multipart parts."""
    geometry_type = geometry.geom_type
    if geometry_type == "LineString":
        yield [(point[0], point[1]) for point in geometry.coords]
    elif geometry_type == "MultiLineString":
        for line in geometry.geoms:
            yield from sequences(line)
    elif geometry_type == "Polygon":
        yield [(point[0], point[1]) for point in geometry.exterior.coords]
        for ring in geometry.interiors:
            yield [(point[0], point[1]) for point in ring.coords]
    elif geometry_type == "MultiPolygon":
        for polygon in geometry.geoms:
            yield from sequences(polygon)


def longest_segment_m(geometry) -> float:
    longest = 0.0
    for line in sequences(geometry):
        for first, second in zip(line, line[1:]):
            _, _, distance = GEOD.inv(first[0], first[1], second[0], second[1])
            longest = max(longest, distance)
    return longest


def dashboard_id(region: str, index: int, properties: dict) -> str:
    if region == "AAM":
        return f"AAM-{properties.get('OBJECTID', index)}"
    return f"{region}-{index}"


def audit(region: str, gdb_root: Path, output_features: dict[str, dict]) -> None:
    config = REGIONS[region]
    gdb = gdb_root / config["gdb"]
    with fiona.open(gdb, layer=config["layer"]) as source:
        print(f"{region}: source CRS = {source.crs.to_string()} | feature count = {len(source)}")
        if source.crs.to_epsg() != config["epsg"]:
            raise RuntimeError(f"{region}: expected EPSG:{config['epsg']}, found {source.crs}")
        transformer = Transformer.from_crs(source.crs, "EPSG:4326", always_xy=True)
        long_segments: list[tuple[str, float]] = []
        mismatches = 0
        for index, feature in enumerate(source, start=1):
            props = dict(feature["properties"])
            identifier = dashboard_id(region, index, props)
            source_geometry = shape(feature["geometry"])
            if not source_geometry.is_valid:
                source_geometry = make_valid(source_geometry)
            expected = transform(transformer.transform, source_geometry.simplify(config["tolerance"], preserve_topology=True))
            output = output_features.get(identifier)
            if output is None:
                mismatches += 1
                continue
            actual = shape(output["geometry"])
            if not expected.equals_exact(actual, tolerance=1e-8):
                mismatches += 1
            gap = longest_segment_m(expected)
            if gap > 1000:
                long_segments.append((identifier, gap))
        print(f"{region}: transform parity mismatches = {mismatches}; source long segments (>1 km) = {len(long_segments)}")
        for identifier, gap in sorted(long_segments, key=lambda item: item[1], reverse=True)[:10]:
            print(f"  {identifier}: {gap / 1000:.3f} km")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--region", choices=REGIONS, default="AAM")
    parser.add_argument("--gdb-root", type=Path, default=DEFAULT_GDB_ROOT)
    args = parser.parse_args()
    features = json.loads(OUTPUT.read_text(encoding="utf-8"))["features"]
    output_features = {feature["properties"]["id"]: feature for feature in features}
    audit(args.region, args.gdb_root, output_features)


if __name__ == "__main__":
    main()
