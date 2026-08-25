import type { Feature, FeatureCollection, Geometry } from "geojson";

export type RegionCode = "all" | "ADM" | "AAM" | "DRM";
export type InventoryClass = "all" | "Cycle track" | "Active-mobility path" | "Unclassified track polygon";

export type InventoryProperties = {
  id: string;
  region: string;
  regionAr: string;
  municipality: Exclude<RegionCode, "all">;
  featureClass: Exclude<InventoryClass, "all">;
  name: string;
  nameAr: string | null;
  facilityAr: string | null;
  lengthM: number;
  widthM: number | null;
  status: string | null;
  condition: string | null;
  material: string | null;
  surfaceColor: string | null;
  direction: string | null;
  lighting: string | null;
  shading: string | null;
  planting: string | null;
  parking: string | null;
  bikeSpaces: number | null;
  city: string | null;
  zone: string | null;
  dataSource: string | null;
  comparableCharacteristics: boolean;
};

export type InventoryFeature = Feature<Geometry, InventoryProperties>;
export type InventoryCollection = FeatureCollection<Geometry, InventoryProperties>;

export type RegionSummary = {
  code: Exclude<RegionCode, "all">;
  name: string;
  nameAr: string;
  geometryType: "mixed-path-lines" | "cycle-track-polygons";
  bounds: [number, number, number, number];
  recordCount: number;
  explicitCycleRecordCount: number;
  recordedLengthKm: number;
  explicitCycleLengthKm: number;
  averageWidthM: number | null;
  coverage: Record<string, number>;
  distributions: Record<string, Record<string, number>>;
};

export type InventorySummary = {
  asOf: string;
  methodology: {
    programmeScope: string;
    inventory: string;
    comparability: string;
  };
  regions: RegionSummary[];
};

let inventoryPromise: Promise<[InventoryCollection, InventorySummary]> | null = null;

export function loadInventory() {
  if (!inventoryPromise) {
    inventoryPromise = Promise.all([
      fetch("/data/cycling-inventory.geojson").then((response) => {
        if (!response.ok) throw new Error("Cycling inventory could not be loaded");
        return response.json() as Promise<InventoryCollection>;
      }),
      fetch("/data/cycling-inventory-summary.json").then((response) => {
        if (!response.ok) throw new Error("Cycling inventory summary could not be loaded");
        return response.json() as Promise<InventorySummary>;
      })
    ]);
  }
  return inventoryPromise;
}

export const regionColors: Record<Exclude<RegionCode, "all">, string> = {
  ADM: "#52d6c0",
  AAM: "#72b9f2",
  DRM: "#e4bc72"
};

export function regionLabel(code: RegionCode, locale: "en" | "ar") {
  const labels = {
    all: { en: "All regions", ar: "جميع المناطق" },
    ADM: { en: "Abu Dhabi", ar: "أبوظبي" },
    AAM: { en: "Al Ain", ar: "العين" },
    DRM: { en: "Al Dhafrah", ar: "الظفرة" }
  } as const;
  return labels[code][locale];
}
