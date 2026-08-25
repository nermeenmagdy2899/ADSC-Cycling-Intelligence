"""Build browser-ready cycling inventory layers from the supplied FileGDB sources.

The script intentionally keeps programme scope/progress outside this inventory.
It writes only source-defined municipal GIS records and a compact profile used by
the executive dashboard.
"""

from __future__ import annotations

import json
import tempfile
import zipfile
from collections import Counter
from pathlib import Path
from typing import Any

import fiona
from pyproj import Transformer
from shapely import make_valid
from shapely.geometry import mapping, shape
from shapely.ops import transform


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = Path(r"D:\Alchemy\ADSC")
SOURCE_ZIP = next(SOURCE_ROOT.glob("AD-CYCLING-DASHBOARD*/Tracks/GDB.zip"))
OUTPUT_DIR = ROOT / "public" / "data"

REGIONS = {
    "AAM_Tracks.gdb": {
        "code": "AAM",
        "name": "Al Ain",
        "nameAr": "العين",
        "layer": "TRACK_CENTERLINE",
        "kind": "mixed-path-lines",
        "epsg": 32640,
    },
    "ADM_Tracks.gdb": {
        "code": "ADM",
        "name": "Abu Dhabi",
        "nameAr": "أبوظبي",
        "layer": "TRACKPOLYGON",
        "kind": "cycle-track-polygons",
        "epsg": 32640,
    },
    "DRM_Tracks.gdb": {
        "code": "DRM",
        "name": "Al Dhafrah",
        "nameAr": "الظفرة",
        "layer": "TRACK_POLYGON",
        "kind": "cycle-track-polygons",
        "epsg": 32639,
    },
}

MISSING = {None, "", " ", "<Null>", "N/A", "NA", "Undefined"}


def clean(value: Any) -> Any:
    if value in MISSING:
        return None
    return value.strip() if isinstance(value, str) else value


def yes_no(value: Any) -> str | None:
    value = clean(value)
    if value is None:
        return None
    token = str(value).strip().lower()
    if token in {"yes", "y", "1", "true"}:
        return "Yes"
    if token in {"no", "n", "0", "false"}:
        return "No"
    return str(value)


def title_case(value: Any) -> str | None:
    value = clean(value)
    return str(value).strip().title() if value is not None else None


def material(value: Any) -> str | None:
    value = clean(value)
    if value is None:
        return None
    token = str(value).strip().lower().replace(" ", "")
    if "asphalt" in token or token == "asp":
        return "Asphalt"
    if token in {"aspacrlpnt", "acrylic", "acrylcsurf", "acrylicpnt"}:
        return "Acrylic surface"
    if "concrete" in token:
        return "Concrete"
    if "rubber" in token or "rbr" in token:
        return "Rubber"
    if "tile" in token:
        return "Tiled"
    return str(value).strip().title()


def counter(rows: list[dict[str, Any]], field: str) -> dict[str, int]:
    values = Counter(str(row[field]) for row in rows if row.get(field) is not None)
    return dict(values.most_common())


def pct(value: int, total: int) -> float:
    return round((value / total) * 100, 1) if total else 0


def build() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    features: list[dict[str, Any]] = []
    regional_rows: dict[str, list[dict[str, Any]]] = {}
    regional_bounds: dict[str, list[float]] = {}

    with tempfile.TemporaryDirectory() as temp_dir:
        with zipfile.ZipFile(SOURCE_ZIP) as archive:
            archive.extractall(temp_dir)

        for gdb in sorted(Path(temp_dir).rglob("*.gdb")):
            config = REGIONS[gdb.name]
            rows: list[dict[str, Any]] = []
            with fiona.open(gdb, layer=config["layer"]) as source:
                source_epsg = source.crs.to_epsg()
                if source_epsg != config["epsg"]:
                    raise ValueError(
                        f"{config['code']} expected EPSG:{config['epsg']}, received {source.crs}"
                    )
                transformer = Transformer.from_crs(source.crs, "EPSG:4326", always_xy=True)
                for index, feature in enumerate(source, start=1):
                    source_props = dict(feature["properties"])
                    geometry = shape(feature["geometry"])
                    if geometry.is_empty:
                        raise ValueError(f"{config['code']} feature {index} is empty before transformation")
                    if not geometry.is_valid:
                        geometry = make_valid(geometry)
                    if geometry.is_empty or not geometry.is_valid:
                        raise ValueError(f"{config['code']} feature {index} could not be repaired before transformation")
                    tolerance = 1.5 if config["code"] == "AAM" else 0.15
                    geometry = geometry.simplify(tolerance, preserve_topology=True)
                    geometry = transform(transformer.transform, geometry)
                    if geometry.is_empty or not geometry.is_valid:
                        raise ValueError(f"{config['code']} feature {index} is invalid after transformation")
                    min_x, min_y, max_x, max_y = geometry.bounds
                    if not (50 <= min_x <= max_x <= 60 and 20 <= min_y <= max_y <= 30):
                        raise ValueError(
                            f"{config['code']} feature {index} is outside valid WGS84 UAE bounds: {geometry.bounds}"
                        )
                    bounds = regional_bounds.setdefault(config["code"], [min_x, min_y, max_x, max_y])
                    bounds[0] = min(bounds[0], min_x)
                    bounds[1] = min(bounds[1], min_y)
                    bounds[2] = max(bounds[2], max_x)
                    bounds[3] = max(bounds[3], max_y)

                    if config["code"] == "AAM":
                        facility_ar = clean(source_props.get("المرف"))
                        is_cycle = facility_ar == "مسار الدراجات الهوائية"
                        length_m = float(source_props.get("Shape_Length") or 0)
                        props = {
                            "id": f"AAM-{source_props.get('OBJECTID', index)}",
                            "region": config["name"],
                            "regionAr": config["nameAr"],
                            "municipality": config["code"],
                            "featureClass": "Cycle track" if is_cycle else "Active-mobility path",
                            "name": "Al Ain cycle track" if is_cycle else "Al Ain path",
                            "nameAr": clean(source_props.get("اسم_ا")),
                            "facilityAr": facility_ar,
                            "lengthM": round(length_m, 2),
                            "widthM": None,
                            "status": None,
                            "condition": None,
                            "material": None,
                            "surfaceColor": None,
                            "direction": None,
                            "lighting": None,
                            "shading": None,
                            "planting": None,
                            "parking": None,
                            "bikeSpaces": None,
                            "city": "Al Ain",
                            "zone": clean(source_props.get("المنط")),
                            "dataSource": "AAM track centerline geodatabase",
                            "comparableCharacteristics": False,
                        }
                    else:
                        length_m = float(source_props.get("ASSET_LENGTH") or 0)
                        track_name = clean(source_props.get("TRACK_NAME"))
                        road_name = clean(source_props.get("ROADNAME_EN"))
                        unit_type = clean(source_props.get("UNITTYPE"))
                        classification_text = " ".join(str(value).lower() for value in [unit_type, track_name] if value)
                        is_cycle = "cycle" in classification_text or "cycling" in classification_text or "bicycle" in classification_text
                        is_other_path = "jog" in classification_text or "walk" in classification_text
                        feature_class = "Cycle track" if is_cycle else "Active-mobility path" if is_other_path else "Unclassified track polygon"
                        props = {
                            "id": f"{config['code']}-{index}",
                            "region": config["name"],
                            "regionAr": config["nameAr"],
                            "municipality": config["code"],
                            "featureClass": feature_class,
                            "name": track_name or road_name or f"{config['name']} track segment {index}",
                            "nameAr": clean(source_props.get("ROADNAME_AR")),
                            "facilityAr": None,
                            "lengthM": round(length_m, 2),
                            "widthM": round(float(source_props.get("WIDTH") or 0), 2) or None,
                            "status": title_case(source_props.get("STATUS")),
                            "condition": title_case(source_props.get("CONDITION")),
                            "material": material(source_props.get("MATERIAL_TYPE")),
                            "surfaceColor": title_case(source_props.get("SURFACE_COLOR")),
                            "direction": title_case(source_props.get("DIRECTION")),
                            "lighting": yes_no(source_props.get("LIGHTING")),
                            "shading": yes_no(source_props.get("SHADING")),
                            "planting": yes_no(source_props.get("PLANTING")),
                            "parking": yes_no(source_props.get("PARKING_AVAILABILITY")),
                            "bikeSpaces": clean(source_props.get("BIKE_SPACES_NO")),
                            "city": clean(source_props.get("CITYNAME")),
                            "zone": clean(source_props.get("ZONE_OR_DISTRICT_NAME")),
                            "dataSource": clean(source_props.get("DATA_SOURCE")),
                            "comparableCharacteristics": is_cycle,
                        }

                    rows.append(props)
                    features.append({"type": "Feature", "geometry": mapping(geometry), "properties": props})
            regional_rows[config["code"]] = rows

    geojson = {"type": "FeatureCollection", "features": features}
    (OUTPUT_DIR / "cycling-inventory.geojson").write_text(
        json.dumps(geojson, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )

    regions = []
    for code, rows in regional_rows.items():
        config = next(value for value in REGIONS.values() if value["code"] == code)
        characteristic_fields = [
            "status",
            "condition",
            "material",
            "surfaceColor",
            "direction",
            "lighting",
            "shading",
            "planting",
            "parking",
            "bikeSpaces",
            "widthM",
        ]
        explicit_cycles = [row for row in rows if row["featureClass"] == "Cycle track"]
        comparable_rows = explicit_cycles if code in {"ADM", "DRM"} else []
        lengths = [float(row["lengthM"]) for row in rows if row.get("lengthM") is not None]
        widths = [float(row["widthM"]) for row in comparable_rows if row.get("widthM")]
        regions.append(
            {
                "code": code,
                "name": config["name"],
                "nameAr": config["nameAr"],
                "geometryType": config["kind"],
                "bounds": [round(value, 6) for value in regional_bounds[code]],
                "recordCount": len(rows),
                "explicitCycleRecordCount": len(explicit_cycles),
                "recordedLengthKm": round(sum(lengths) / 1000, 2),
                "explicitCycleLengthKm": round(sum(float(row["lengthM"]) for row in explicit_cycles) / 1000, 2),
                "averageWidthM": round(sum(widths) / len(widths), 2) if widths else None,
                "coverage": {
                    field: pct(sum(row.get(field) is not None for row in comparable_rows), len(comparable_rows))
                    for field in characteristic_fields
                },
                "distributions": {
                    "condition": counter(comparable_rows, "condition"),
                    "material": counter(comparable_rows, "material"),
                    "direction": counter(comparable_rows, "direction"),
                    "lighting": counter(comparable_rows, "lighting"),
                    "shading": counter(comparable_rows, "shading"),
                    "planting": counter(comparable_rows, "planting"),
                    "parking": counter(comparable_rows, "parking"),
                    "featureClass": counter(rows, "featureClass"),
                },
            }
        )

    summary = {
        "asOf": "Source files supplied 23 August 2026",
        "methodology": {
            "programmeScope": "Excluded from municipal inventory totals; reported separately from the December 2025 programme deck.",
            "inventory": "Municipal geodatabase records transformed from their source CRS to WGS84. Length uses the source-defined Shape_Length for AAM and ASSET_LENGTH for ADM/DRM. Cycle-track KPIs include only records explicitly identified as cycling in source attributes.",
            "comparability": "ADM and DRM share the same structured schema, but their characteristic comparisons include only records explicitly classified as cycling. AAM is a mixed walkway/cycle-track centerline inventory and is not included in cross-region characteristic comparisons.",
        },
        "regions": regions,
    }
    (OUTPUT_DIR / "cycling-inventory-summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"Wrote {len(features):,} features to {OUTPUT_DIR}")


if __name__ == "__main__":
    build()
