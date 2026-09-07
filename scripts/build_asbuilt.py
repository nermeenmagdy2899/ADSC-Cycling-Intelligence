"""Convert the supplied Packages 1-4 As-Built KMZ into web-map GeoJSON.

The KMZ is already geographic KML (longitude, latitude in WGS84). Its CAD
objects are generic Polyline/Hatch features and do not carry reliable package
identifiers. The conversion therefore preserves the source geometry and style
colour while marking every object as only partially matched to the aggregate
Track 1 Packages 1-4 scope.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import zipfile
from collections import Counter
from datetime import date
from pathlib import Path
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = Path(r"D:\Alchemy\ADSC\AD-CYCLING-DASHBOARD'\Package 1 ,2 ,3 &4 As- Built).kmz")
DEFAULT_OUTPUT = ROOT / "public" / "data" / "asbuilt-packages-1-4.geojson"
DEFAULT_SUMMARY = ROOT / "public" / "data" / "asbuilt-packages-1-4-summary.json"
SOURCE_DATE = date(2026, 8, 26).isoformat()


def coordinates(element: ET.Element | None) -> list[list[float]]:
    if element is None or not element.text:
        return []
    result: list[list[float]] = []
    for value in element.text.split():
        parts = value.split(",")
        if len(parts) < 2:
            continue
        try:
            point = [round(float(parts[0]), 8), round(float(parts[1]), 8)]
        except ValueError:
            continue
        if not result or point != result[-1]:
            result.append(point)
    return result


def kml_colour(value: str) -> str:
    value = value.strip().lower()
    if len(value) != 8:
        return "#56d6bd"
    return f"#{value[6:8]}{value[4:6]}{value[2:4]}"


def first_text(parent: ET.Element, path: str, ns: dict[str, str]) -> str:
    element = parent.find(path, ns)
    return (element.text or "").strip() if element is not None else ""


def line_geometry(placemark: ET.Element, ns: dict[str, str]) -> dict | None:
    lines: list[list[list[float]]] = []
    for line in placemark.findall(".//k:LineString", ns):
        points = coordinates(line.find("k:coordinates", ns))
        if len(points) >= 2:
            lines.append(points)
    if not lines:
        return None
    return {"type": "LineString", "coordinates": lines[0]} if len(lines) == 1 else {"type": "MultiLineString", "coordinates": lines}


def polygon_geometry(placemark: ET.Element, ns: dict[str, str]) -> tuple[dict | None, int]:
    polygons: list[list[list[list[float]]]] = []
    invalid_rings = 0
    for polygon in placemark.findall(".//k:Polygon", ns):
        outer = coordinates(polygon.find("k:outerBoundaryIs/k:LinearRing/k:coordinates", ns))
        if len(outer) < 3:
            invalid_rings += 1
            continue
        if outer[0] != outer[-1]:
            outer.append(outer[0])
        rings = [outer]
        for inner in polygon.findall("k:innerBoundaryIs/k:LinearRing/k:coordinates", ns):
            ring = coordinates(inner)
            if len(ring) < 3:
                invalid_rings += 1
                continue
            if ring[0] != ring[-1]:
                ring.append(ring[0])
            rings.append(ring)
        polygons.append(rings)
    if not polygons:
        return None, invalid_rings
    geometry = {"type": "Polygon", "coordinates": polygons[0]} if len(polygons) == 1 else {"type": "MultiPolygon", "coordinates": polygons}
    return geometry, invalid_rings


def iter_points(value):
    if isinstance(value, list) and len(value) >= 2 and all(isinstance(item, (int, float)) for item in value[:2]):
        yield value
    elif isinstance(value, list):
        for item in value:
            yield from iter_points(item)


def build(source: Path, output: Path, summary_path: Path) -> None:
    with zipfile.ZipFile(source) as archive:
        kml_name = next(name for name in archive.namelist() if name.lower().endswith(".kml"))
        root = ET.fromstring(archive.read(kml_name))

    namespace = root.tag.split("}")[0].lstrip("{")
    ns = {"k": namespace}
    features: list[dict] = []
    style_counts: Counter[str] = Counter()
    role_counts: Counter[str] = Counter()
    bounds = [180.0, 90.0, -180.0, -90.0]
    invalid_coordinates = 0
    invalid_rings = 0
    generic_names = 0

    for index, placemark in enumerate(root.findall(".//k:Placemark", ns), start=1):
        name = first_text(placemark, "k:name", ns) or f"Unnamed object {index}"
        colour_value = first_text(placemark, ".//k:LineStyle/k:color", ns) or first_text(placemark, ".//k:PolyStyle/k:color", ns)
        source_colour = kml_colour(colour_value)
        style_counts[source_colour] += 1
        if name.startswith(("Polyline", "Hatch")):
            generic_names += 1

        geometries = [("alignment", line_geometry(placemark, ns))]
        polygon, ring_issues = polygon_geometry(placemark, ns)
        invalid_rings += ring_issues
        geometries.append(("footprint", polygon))

        for role, geometry in geometries:
            if geometry is None:
                continue
            points = list(iter_points(geometry["coordinates"]))
            valid_points = [point for point in points if -180 <= point[0] <= 180 and -90 <= point[1] <= 90]
            invalid_coordinates += len(points) - len(valid_points)
            if len(valid_points) != len(points):
                continue
            for longitude, latitude in valid_points:
                bounds[0] = min(bounds[0], longitude)
                bounds[1] = min(bounds[1], latitude)
                bounds[2] = max(bounds[2], longitude)
                bounds[3] = max(bounds[3], latitude)
            role_counts[role] += 1
            identifier = f"ASBUILT-{index:05d}-{'L' if role == 'alignment' else 'P'}"
            features.append({
                "type": "Feature",
                "id": identifier,
                "properties": {
                    "id": identifier,
                    "sourceObjectName": name,
                    "geometryRole": role,
                    "sourceColour": source_colour,
                    "deliveryState": "completed-as-built",
                    "geometrySource": "Packages 1-4 As-Built KMZ",
                    "geometrySourceDate": SOURCE_DATE,
                    "geometryMatchStatus": "Partially matched",
                    "matchScope": "Track 1 Packages 1-4 aggregate; package split not identified",
                },
                "geometry": geometry,
            })

    output.parent.mkdir(parents=True, exist_ok=True)
    collection = {
        "type": "FeatureCollection",
        "name": "Packages 1-4 As-Built",
        "properties": {
            "crs": "EPSG:4326",
            "geometrySource": "Packages 1-4 As-Built KMZ",
            "geometrySourceDate": SOURCE_DATE,
            "geometryMatchStatus": "Partially matched",
        },
        "features": features,
    }
    output.write_text(json.dumps(collection, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    summary = {
        "source": str(source),
        "sourceDate": SOURCE_DATE,
        "sourceSha256": source_hash,
        "sourceCrs": "EPSG:4326 (KML longitude/latitude)",
        "outputCrs": "EPSG:4326",
        "placemarkCount": len(root.findall(".//k:Placemark", ns)),
        "outputFeatureCount": len(features),
        "geometryRoles": dict(sorted(role_counts.items())),
        "sourceColours": dict(sorted(style_counts.items())),
        "bounds": bounds,
        "genericObjectNameCount": generic_names,
        "invalidCoordinateCount": invalid_coordinates,
        "invalidRingCount": invalid_rings,
        "geometryMatchStatus": "Partially matched",
        "matchScope": "Track 1 Packages 1-4 aggregate; individual package identity requires client reconciliation",
        "validation": {
            "coordinatesWithinWgs84": invalid_coordinates == 0,
            "abuDhabiExtent": 52 <= bounds[0] <= bounds[2] <= 57 and 22 <= bounds[1] <= bounds[3] <= 27,
            "packageIdentityAvailable": False,
        },
    }
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(features):,} features to {output}")
    print(json.dumps(summary, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--summary", type=Path, default=DEFAULT_SUMMARY)
    args = parser.parse_args()
    build(args.source, args.output, args.summary)


if __name__ == "__main__":
    main()
