import type { Feature, FeatureCollection, MultiLineString, MultiPolygon, LineString, Polygon } from "geojson";

export type AsBuiltMatchStatus = "Matched" | "Partially matched" | "Unmatched" | "Requires validation";

export type AsBuiltProperties = {
  id: string;
  sourceObjectName: string;
  geometryRole: "alignment" | "footprint";
  sourceColour: string;
  deliveryState: "completed-as-built";
  geometrySource: string;
  geometrySourceDate: string;
  geometryMatchStatus: AsBuiltMatchStatus;
  matchScope: string;
};

export type AsBuiltGeometry = LineString | MultiLineString | Polygon | MultiPolygon;
export type AsBuiltFeature = Feature<AsBuiltGeometry, AsBuiltProperties>;
export type AsBuiltCollection = FeatureCollection<AsBuiltGeometry, AsBuiltProperties>;

export type AsBuiltSummary = {
  sourceDate: string;
  sourceCrs: string;
  outputCrs: string;
  placemarkCount: number;
  outputFeatureCount: number;
  bounds: [number, number, number, number];
  genericObjectNameCount: number;
  invalidCoordinateCount: number;
  invalidRingCount: number;
  geometryMatchStatus: AsBuiltMatchStatus;
  matchScope: string;
  validation: {
    coordinatesWithinWgs84: boolean;
    abuDhabiExtent: boolean;
    packageIdentityAvailable: boolean;
  };
};

let asBuiltPromise: Promise<[AsBuiltCollection, AsBuiltSummary]> | null = null;

export function loadAsBuilt() {
  if (!asBuiltPromise) {
    asBuiltPromise = Promise.all([
      fetch("/data/asbuilt-packages-1-4.geojson").then((response) => {
        if (!response.ok) throw new Error("As-built geometry could not be loaded");
        return response.json() as Promise<AsBuiltCollection>;
      }),
      fetch("/data/asbuilt-packages-1-4-summary.json").then((response) => {
        if (!response.ok) throw new Error("As-built geometry summary could not be loaded");
        return response.json() as Promise<AsBuiltSummary>;
      })
    ]);
  }
  return asBuiltPromise;
}
