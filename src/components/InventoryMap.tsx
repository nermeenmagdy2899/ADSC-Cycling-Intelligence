import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "maplibre-gl";
import {
  AlertTriangle,
  Box,
  Check,
  ChevronDown,
  Expand,
  Layers3,
  Map as MapIcon,
  MapPin,
  Minimize,
  Minus,
  Plus,
  RotateCcw,
  Satellite,
  Search,
  X
} from "lucide-react";
import type { FilterSpecification, GeoJSONSource, Map as MapboxMap, StyleSpecification } from "maplibre-gl";
import type { FeatureCollection, LineString, Position } from "geojson";
import type { InventoryClass, InventoryCollection, InventoryFeature, RegionCode } from "../data/inventory";
import { regionColors, regionLabel } from "../data/inventory";
import type { AsBuiltCollection } from "../data/asbuilt";
import type { NetworkRoute } from "../data/network";
import { distanceUnit, inventoryClassLabel, inventoryFeatureLabel, routeLabel, statusText } from "../i18n";

type Props = {
  data: InventoryCollection;
  locale: "en" | "ar";
  theme: "dark" | "light";
  region: RegionCode;
  featureClass: InventoryClass;
  selectedId: string | null;
  condition?: string;
  programmeRoutes?: NetworkRoute[];
  mainRoutes?: NetworkRoute[];
  asBuilt?: AsBuiltCollection | null;
  selectedProgrammeId?: string | null;
  onSelect: (feature: InventoryFeature | null) => void;
  onSelectProgramme?: (routeId: string | null) => void;
  onClassChange: (value: InventoryClass) => void;
};

type Basemap = "streets" | "satellite";
type ViewMode = "2d" | "2.5d" | "3d";

const interactiveLayers = [
  "programme-route-line",
  "programme-reference-line",
  "inventory-verified-polygon-fill",
  "inventory-other-polygon-fill",
  "inventory-unclassified-polygon-fill",
  "inventory-verified-line",
  "inventory-other-line"
];
const inventoryContextLayerIds = [
  "inventory-unclassified-polygon-fill",
  "inventory-unclassified-polygon-outline",
  "inventory-other-polygon-fill",
  "inventory-other-polygon-outline",
  "inventory-verified-polygon-fill",
  "inventory-verified-polygon-glow",
  "inventory-verified-polygon-outline",
  "inventory-other-line",
  "inventory-verified-line-glow",
  "inventory-verified-line"
] as const;
const inventorySelectionLayerIds = [
  "inventory-selected-polygon",
  "inventory-selected-line"
] as const;
const inventoryClasses: InventoryClass[] = ["all", "Cycle track", "Active-mobility path", "Unclassified track polygon"];
const verifiedFilter: FilterSpecification = ["==", ["get", "featureClass"], "Cycle track"];
const mobilityFilter: FilterSpecification = ["==", ["get", "featureClass"], "Active-mobility path"];
const unclassifiedFilter: FilterSpecification = ["==", ["get", "featureClass"], "Unclassified track polygon"];
const emptyInventoryData: InventoryCollection = { type: "FeatureCollection", features: [] };
type ProgrammeRouteCollection = FeatureCollection<LineString, { id: string; name: string; label: string; color: string; status: string; workInProgressKm: number; currentProgramme: boolean; currentSourceGap: boolean }>;
const emptyProgrammeData: ProgrammeRouteCollection = { type: "FeatureCollection", features: [] };
const emptyAsBuiltData: AsBuiltCollection = { type: "FeatureCollection", features: [] };

function programmeCollection(routes: NetworkRoute[]): ProgrammeRouteCollection {
  return {
    type: "FeatureCollection",
    features: routes.map((route) => ({
      type: "Feature",
      id: route.id,
      properties: { id: route.id, name: route.name, label: route.label, color: route.color, status: route.status, workInProgressKm: route.workInProgressKm, currentProgramme: route.currentProgramme, currentSourceGap: Boolean(route.currentSourceGap) },
      geometry: { type: "LineString", coordinates: route.coordinates }
    }))
  };
}

function createStyle(): StyleSpecification {
  const raster = (tiles: string[], attribution: string) => ({ type: "raster" as const, tiles, tileSize: 256, attribution });
  return {
    version: 8,
    glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
    sources: {
      streets: raster([
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
      ], "© Esri"),
      "dark-streets": raster([
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
      ], "© Esri"),
      "dark-labels": raster([
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
      ], ""),
      osm: raster([
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      ], "© OpenStreetMap contributors"),
      satellite: raster([
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      ], "© Esri"),
      "satellite-labels": raster([
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
      ], "")
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": "#e9eef4" } },
      { id: "base-streets", type: "raster", source: "streets", layout: { visibility: "visible" }, paint: { "raster-opacity": 1, "raster-saturation": -0.08, "raster-contrast": 0.04 } },
      { id: "base-dark-streets", type: "raster", source: "dark-streets", layout: { visibility: "none" }, paint: { "raster-opacity": 1, "raster-saturation": -0.1, "raster-contrast": 0.06 } },
      { id: "base-dark-labels", type: "raster", source: "dark-labels", layout: { visibility: "none" }, paint: { "raster-opacity": 0.94 } },
      { id: "base-osm", type: "raster", source: "osm", layout: { visibility: "none" }, paint: { "raster-opacity": 0.94, "raster-saturation": -0.35 } },
      { id: "base-satellite", type: "raster", source: "satellite", layout: { visibility: "none" }, paint: { "raster-opacity": 0.82, "raster-saturation": -0.2 } },
      { id: "base-satellite-labels", type: "raster", source: "satellite-labels", layout: { visibility: "none" }, paint: { "raster-opacity": 0.78 } }
    ]
  };
}

function coordinatesOf(feature: InventoryFeature) {
  const coordinates: Position[] = [];
  const visit = (value: unknown) => {
    if (!Array.isArray(value)) return;
    if (typeof value[0] === "number" && typeof value[1] === "number") coordinates.push(value as Position);
    else value.forEach(visit);
  };
  visit((feature.geometry as { coordinates?: unknown }).coordinates);
  return coordinates;
}

function syncInventorySources(map: MapboxMap, features: InventoryFeature[]) {
  const polygons: InventoryCollection = {
    type: "FeatureCollection",
    features: features.filter((feature) => feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon")
  };
  const lines: InventoryCollection = {
    type: "FeatureCollection",
    features: features.filter((feature) => feature.geometry.type === "LineString" || feature.geometry.type === "MultiLineString")
  };
  (map.getSource("cycling-polygons") as GeoJSONSource | undefined)?.setData(polygons);
  (map.getSource("cycling-lines") as GeoJSONSource | undefined)?.setData(lines);
}

function boundsFor(features: InventoryFeature[]) {
  const bounds = new mapboxgl.LngLatBounds();
  features.forEach((feature) => coordinatesOf(feature).forEach((point) => bounds.extend([point[0], point[1]])));
  return bounds.isEmpty() ? null : bounds;
}

function scheduleMapMutation(map: MapboxMap, mutation: () => void) {
  let active = true;
  const run = () => {
    if (active) mutation();
  };
  if (map.getLayer("inventory-selected-line")) run();
  else map.once("load", run);
  return () => {
    active = false;
    map.off("load", run);
  };
}

export function InventoryMap({
  data,
  locale,
  theme,
  region,
  featureClass,
  selectedId,
  condition = "all",
  programmeRoutes = [],
  mainRoutes = [],
  asBuilt = null,
  selectedProgrammeId = null,
  onSelect,
  onSelectProgramme,
  onClassChange
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const programmeRoutesRef = useRef(programmeRoutes);
  const asBuiltRef = useRef<AsBuiltCollection>(asBuilt ?? emptyAsBuiltData);
  const localeRef = useRef(locale);
  const dataRef = useRef(data);
  const onSelectRef = useRef(onSelect);
  const onSelectProgrammeRef = useRef(onSelectProgramme);
  const selectedInventoryRef = useRef(selectedId);
  const selectedProgrammeRef = useRef(selectedProgrammeId);
  const filteredRef = useRef<InventoryFeature[]>([]);
  const cameraFeaturesRef = useRef<InventoryFeature[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const hoveredId = useRef<string | number | null>(null);
  const mapIdleHandlerRef = useRef<(() => void) | null>(null);
  const mapBusyTimerRef = useRef<number | null>(null);
  const basemapErrorTimesRef = useRef<number[]>([]);
  const basemapFallbackRef = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [mapBusy, setMapBusy] = useState(false);
  const [basemap, setBasemap] = useState<Basemap>("streets");
  const [basemapFallback, setBasemapFallback] = useState(false);
  const [basemapIssue, setBasemapIssue] = useState(false);
  const [scopeVisible, setScopeVisible] = useState(true);
  const [referenceVisible, setReferenceVisible] = useState(true);
  const [completedVisible, setCompletedVisible] = useState(true);
  const [wipVisible, setWipVisible] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("2.5d");
  const [layersVisible, setLayersVisible] = useState(true);
  const [layerPanelOpen, setLayerPanelOpen] = useState(false);
  const [verifiedBrowserOpen, setVerifiedBrowserOpen] = useState(false);
  const [verifiedQuery, setVerifiedQuery] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(7.3);
  const [cameraCenter, setCameraCenter] = useState<[number, number]>([54.45, 24.35]);

  programmeRoutesRef.current = programmeRoutes;
  asBuiltRef.current = asBuilt ?? emptyAsBuiltData;
  localeRef.current = locale;
  dataRef.current = data;
  onSelectRef.current = onSelect;
  onSelectProgrammeRef.current = onSelectProgramme;
  basemapFallbackRef.current = basemapFallback;
  selectedInventoryRef.current = selectedId;
  selectedProgrammeRef.current = selectedProgrammeId;

  const regionFiltered = useMemo(() => data.features.filter((feature) => (
    (region === "all" || feature.properties.municipality === region)
    && (condition === "all" || feature.properties.condition === condition)
  )), [condition, data.features, region]);
  const filtered = useMemo(() => regionFiltered.filter((feature) => (
    featureClass === "all" || feature.properties.featureClass === featureClass
  )), [featureClass, regionFiltered]);
  const cameraFeatures = filtered.length > 0 ? filtered : regionFiltered;
  const programmeVisible = layersVisible && (featureClass === "all" || Boolean(selectedProgrammeId));
  filteredRef.current = filtered;
  cameraFeaturesRef.current = cameraFeatures;

  const verifiedTracks = useMemo(() => {
    const query = verifiedQuery.trim().toLocaleLowerCase(locale === "ar" ? "ar-AE" : "en-GB");
    return regionFiltered
      .filter((feature) => feature.properties.featureClass === "Cycle track")
      .filter((feature) => {
        if (!query) return true;
        return [feature.properties.id, feature.properties.name, feature.properties.nameAr, feature.properties.region, feature.properties.regionAr, feature.properties.city, feature.properties.zone]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase(locale === "ar" ? "ar-AE" : "en-GB").includes(query));
      })
      .sort((a, b) => {
        const regionOrder = a.properties.municipality.localeCompare(b.properties.municipality);
        if (regionOrder !== 0) return regionOrder;
        const aName = locale === "ar" ? a.properties.nameAr || a.properties.name : a.properties.name;
        const bName = locale === "ar" ? b.properties.nameAr || b.properties.name : b.properties.name;
        return aName.localeCompare(bName, locale === "ar" ? "ar" : "en", { numeric: true });
      });
  }, [locale, regionFiltered, verifiedQuery]);
  const visibleVerifiedTracks = verifiedTracks.slice(0, 40);

  const beginMapTransition = useCallback((map: MapboxMap) => {
    if (mapIdleHandlerRef.current) map.off("idle", mapIdleHandlerRef.current);
    if (mapBusyTimerRef.current != null) window.clearTimeout(mapBusyTimerRef.current);
    setMapBusy(true);
    const finish = () => {
      map.off("idle", finish);
      if (mapIdleHandlerRef.current === finish) mapIdleHandlerRef.current = null;
      if (mapBusyTimerRef.current != null) window.clearTimeout(mapBusyTimerRef.current);
      mapBusyTimerRef.current = null;
      setMapBusy(false);
    };
    mapIdleHandlerRef.current = finish;
    map.once("idle", finish);
    mapBusyTimerRef.current = window.setTimeout(finish, 4200);
  }, []);

  const fitFeatures = useCallback((features: InventoryFeature[], duration = 850) => {
    const map = mapRef.current;
    const bounds = boundsFor(features);
    if (!map || !bounds) return;
    const safeDuration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : duration;
    beginMapTransition(map);
    map.stop();
    map.fitBounds(bounds, { padding: { top: 88, right: 80, bottom: 90, left: 80 }, duration: safeDuration, maxZoom: 14.8 });
  }, [beginMapTransition]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    setLoaded(false);
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: createStyle(),
      center: [54.45, 24.35],
      zoom: 7.3,
      pitch: 45,
      bearing: -10,
      minZoom: 5.5,
      maxZoom: 19,
      attributionControl: false,
      dragPan: true,
      scrollZoom: true,
      doubleClickZoom: true,
      keyboard: true,
      pitchWithRotate: true,
      dragRotate: true,
      touchZoomRotate: true
    });
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");
    map.on("load", () => {
      map.addSource("cycling-polygons", { type: "geojson", data: emptyInventoryData, generateId: true });
      map.addSource("cycling-lines", { type: "geojson", data: emptyInventoryData, generateId: true });
      map.addSource("asbuilt-packages", { type: "geojson", data: asBuiltRef.current, generateId: true });
      map.addSource("programme-routes", { type: "geojson", data: programmeCollection(programmeRoutesRef.current) });
      map.addLayer({
        id: "programme-route-glow",
        type: "line",
        source: "programme-routes",
        filter: ["==", ["get", "currentProgramme"], true],
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 6, 5, 13, 8],
          "line-opacity": 0.12,
          "line-blur": 4
        }
      });
      map.addLayer({
        id: "programme-route-line",
        type: "line",
        source: "programme-routes",
        filter: ["==", ["get", "currentProgramme"], true],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#d8e4ec",
          "line-width": ["interpolate", ["linear"], ["zoom"], 6, 2, 13, 3.8],
          "line-opacity": 0.72,
          "line-dasharray": [2.2, 1.4]
        }
      });
      map.addLayer({
        id: "programme-reference-glow",
        type: "line",
        source: "programme-routes",
        filter: ["==", ["get", "currentSourceGap"], true],
        paint: {
          "line-color": "#f7e2b0",
          "line-width": ["interpolate", ["linear"], ["zoom"], 6, 5, 13, 9],
          "line-opacity": 0.18,
          "line-blur": 4
        }
      });
      map.addLayer({
        id: "programme-reference-line",
        type: "line",
        source: "programme-routes",
        filter: ["==", ["get", "currentSourceGap"], true],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#f7e2b0",
          "line-width": ["interpolate", ["linear"], ["zoom"], 6, 2.4, 13, 4.2],
          "line-opacity": 0.96,
          "line-dasharray": [1.2, 1.6]
        }
      });
      map.addLayer({
        id: "programme-wip-glow",
        type: "line",
        source: "programme-routes",
        filter: ["all", [">", ["get", "workInProgressKm"], 0], ["==", ["get", "currentProgramme"], true]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#9fcf36", "line-width": ["interpolate", ["linear"], ["zoom"], 6, 6, 13, 10], "line-opacity": 0.16, "line-blur": 4 }
      });
      map.addLayer({
        id: "programme-wip-line",
        type: "line",
        source: "programme-routes",
        filter: ["all", [">", ["get", "workInProgressKm"], 0], ["==", ["get", "currentProgramme"], true]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#9fcf36", "line-width": ["interpolate", ["linear"], ["zoom"], 6, 2.4, 13, 4.2], "line-opacity": 0.88, "line-dasharray": [1.2, 1.2] }
      });
      map.addLayer({
        id: "asbuilt-footprint-fill",
        type: "fill",
        source: "asbuilt-packages",
        filter: ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]],
        paint: { "fill-color": "#32d4bd", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 7, 0.12, 14, 0.32] }
      });
      map.addLayer({
        id: "asbuilt-footprint-outline",
        type: "line",
        source: "asbuilt-packages",
        filter: ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]],
        paint: { "line-color": "#56e4cf", "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.7, 14, 2], "line-opacity": 0.72 }
      });
      map.addLayer({
        id: "asbuilt-alignment-glow",
        type: "line",
        source: "asbuilt-packages",
        filter: ["in", ["geometry-type"], ["literal", ["LineString", "MultiLineString"]]],
        paint: { "line-color": "#32d4bd", "line-width": ["interpolate", ["linear"], ["zoom"], 7, 3, 14, 7], "line-opacity": 0.16, "line-blur": 3 }
      });
      map.addLayer({
        id: "asbuilt-alignment-line",
        type: "line",
        source: "asbuilt-packages",
        filter: ["in", ["geometry-type"], ["literal", ["LineString", "MultiLineString"]]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#56e4cf", "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.9, 14, 2.2], "line-opacity": 0.82 }
      });
      map.addLayer({
        id: "programme-route-selected",
        type: "line",
        source: "programme-routes",
        filter: ["==", ["get", "id"], ""],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#ffffff", "line-width": 5.5, "line-opacity": 0.92, "line-blur": 0.2 }
      });
      map.addLayer({
        id: "inventory-unclassified-polygon-fill",
        type: "fill",
        source: "cycling-polygons",
        filter: unclassifiedFilter,
        paint: {
          "fill-color": "#d3a957",
          "fill-opacity": ["interpolate", ["linear"], ["zoom"], 5.5, ["case", ["boolean", ["feature-state", "hover"], false], 0.34, 0.06], 13, ["case", ["boolean", ["feature-state", "hover"], false], 0.34, 0.18]]
        }
      });
      map.addLayer({
        id: "inventory-unclassified-polygon-outline",
        type: "line",
        source: "cycling-polygons",
        filter: unclassifiedFilter,
        paint: {
          "line-color": "#d3a957",
          "line-width": ["interpolate", ["linear"], ["zoom"], 5.5, 0.6, 13, 2],
          "line-opacity": ["interpolate", ["linear"], ["zoom"], 5.5, 0.42, 13, 0.78]
        }
      });
      map.addLayer({
        id: "inventory-other-polygon-fill",
        type: "fill",
        source: "cycling-polygons",
        filter: mobilityFilter,
        paint: {
          "fill-color": "#94a3b8",
          "fill-opacity": ["interpolate", ["linear"], ["zoom"], 5.5, ["case", ["boolean", ["feature-state", "hover"], false], 0.58, 0.14], 13, ["case", ["boolean", ["feature-state", "hover"], false], 0.58, 0.32]]
        }
      });
      map.addLayer({
        id: "inventory-other-polygon-outline",
        type: "line",
        source: "cycling-polygons",
        filter: mobilityFilter,
        paint: {
          "line-color": "#b4becb",
          "line-width": ["interpolate", ["linear"], ["zoom"], 5.5, 1.1, 13, 3],
          "line-opacity": 0.86,
          "line-dasharray": [1.6, 1.4]
        }
      });
      map.addLayer({
        id: "inventory-verified-polygon-fill",
        type: "fill",
        source: "cycling-polygons",
        filter: verifiedFilter,
        paint: {
          "fill-color": ["match", ["get", "municipality"], "ADM", regionColors.ADM, "AAM", regionColors.AAM, "DRM", regionColors.DRM, "#52d6c0"],
          "fill-opacity": ["interpolate", ["linear"], ["zoom"], 5.5, ["case", ["boolean", ["feature-state", "hover"], false], 0.72, 0.16], 13, ["case", ["boolean", ["feature-state", "hover"], false], 0.72, 0.48]]
        }
      });
      map.addLayer({
        id: "inventory-verified-polygon-glow",
        type: "line",
        source: "cycling-polygons",
        filter: verifiedFilter,
        paint: {
          "line-color": ["match", ["get", "municipality"], "ADM", regionColors.ADM, "AAM", regionColors.AAM, "DRM", regionColors.DRM, "#52d6c0"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 5.5, 2.8, 13, 7.5],
          "line-opacity": 0.22,
          "line-blur": 2.5
        }
      });
      map.addLayer({
        id: "inventory-verified-polygon-outline",
        type: "line",
        source: "cycling-polygons",
        filter: verifiedFilter,
        paint: {
          "line-color": ["match", ["get", "municipality"], "ADM", regionColors.ADM, "AAM", regionColors.AAM, "DRM", regionColors.DRM, "#52d6c0"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 5.5, 1.4, 13, 4.5],
          "line-opacity": 1
        }
      });
      map.addLayer({
        id: "inventory-other-line",
        type: "line",
        source: "cycling-lines",
        filter: mobilityFilter,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#aab6c5",
          "line-width": ["interpolate", ["linear"], ["zoom"], 5.5, ["case", ["boolean", ["feature-state", "hover"], false], 5, 2], 13, ["case", ["boolean", ["feature-state", "hover"], false], 5, 4]],
          "line-opacity": 0.86,
          "line-dasharray": [2, 1.5]
        }
      });
      map.addLayer({
        id: "inventory-verified-line-glow",
        type: "line",
        source: "cycling-lines",
        filter: verifiedFilter,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["match", ["get", "municipality"], "ADM", regionColors.ADM, "AAM", regionColors.AAM, "DRM", regionColors.DRM, "#72b9f2"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 5.5, 5, 13, 10],
          "line-opacity": 0.2,
          "line-blur": 4
        }
      });
      map.addLayer({
        id: "inventory-verified-line",
        type: "line",
        source: "cycling-lines",
        filter: verifiedFilter,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["match", ["get", "municipality"], "ADM", regionColors.ADM, "AAM", regionColors.AAM, "DRM", regionColors.DRM, "#72b9f2"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 5.5, ["case", ["boolean", ["feature-state", "hover"], false], 7, 2.8], 13, ["case", ["boolean", ["feature-state", "hover"], false], 7, 6]],
          "line-opacity": 1
        }
      });
      map.addLayer({
        id: "inventory-selected-polygon",
        type: "line",
        source: "cycling-polygons",
        filter: ["==", ["get", "id"], ""],
        paint: { "line-color": "#ffffff", "line-width": 4, "line-opacity": 1 }
      });
      map.addLayer({
        id: "inventory-selected-line",
        type: "line",
        source: "cycling-lines",
        filter: ["==", ["get", "id"], ""],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#ffffff", "line-width": 7, "line-opacity": 1 }
      });
      syncInventorySources(map, filteredRef.current);
      setLoaded(true);
      requestAnimationFrame(() => {
        const selectedInventory = data.features.find((feature) => feature.properties.id === selectedInventoryRef.current);
        if (selectedInventory) {
          fitFeatures([selectedInventory], 0);
          return;
        }
        const selectedRoute = programmeRoutesRef.current.find((route) => route.id === selectedProgrammeRef.current);
        if (!selectedRoute) {
          fitFeatures(cameraFeaturesRef.current, 0);
          return;
        }
        const selectedBounds = new mapboxgl.LngLatBounds();
        selectedRoute.coordinates.forEach((coordinate) => selectedBounds.extend(coordinate));
        beginMapTransition(map);
        map.fitBounds(selectedBounds, { padding: { top: 104, right: 90, bottom: 96, left: 90 }, duration: 0, maxZoom: 13.5 });
      });
    });

    map.on("mousemove", (event) => {
      const availableLayers = interactiveLayers.filter((id) => Boolean(map.getLayer(id)));
      const features = availableLayers.length ? map.queryRenderedFeatures(event.point, { layers: availableLayers }) : [];
      const hit = features[0];
      map.getCanvas().style.cursor = hit ? "pointer" : "grab";
      if (hoveredId.current !== null) {
        map.removeFeatureState({ source: "cycling-polygons", id: hoveredId.current }, "hover");
        map.removeFeatureState({ source: "cycling-lines", id: hoveredId.current }, "hover");
      }
      if (!hit || hit.source === "programme-routes" || hit.id === undefined) {
        hoveredId.current = null;
        return;
      }
      hoveredId.current = hit.id;
      map.setFeatureState({ source: hit.source === "cycling-lines" ? "cycling-lines" : "cycling-polygons", id: hit.id }, { hover: true });
    });

    map.on("click", (event) => {
      const availableLayers = interactiveLayers.filter((layerId) => Boolean(map.getLayer(layerId)));
      const hit = availableLayers.length ? map.queryRenderedFeatures(event.point, { layers: availableLayers })[0] : null;
      if (!hit) {
        popupRef.current?.remove();
        onSelectRef.current(null);
        onSelectProgrammeRef.current?.(null);
        return;
      }
      const id = String(hit.properties?.id ?? "");
      if (hit.source === "programme-routes") {
        const route = programmeRoutesRef.current.find((item) => item.id === id);
        onSelectRef.current(null);
        onSelectProgrammeRef.current?.(id);
        if (!route) return;
        const activeLocale = localeRef.current;
        const node = document.createElement("div");
        node.className = "inventory-popup-content";
        const title = document.createElement("strong");
        title.textContent = routeLabel(route, activeLocale);
        const detail = document.createElement("span");
        detail.textContent = route.currentProgramme
          ? `${route.completedKm.toFixed(1)} / ${route.plannedKm.toFixed(1)} ${distanceUnit(activeLocale)} · ${route.progressPct}%`
          : (activeLocale === "ar" ? "محاذاة مرجعية من أساس التصميم 2022 · ليست هندسة تنفيذ فعلي حالية" : "2022 BOD reference alignment · not current As-Built geometry");
        node.append(title, detail);
        popupRef.current?.remove();
        popupRef.current = new mapboxgl.Popup({ offset: 12, closeButton: false }).setLngLat(event.lngLat).setDOMContent(node).addTo(map);
        return;
      }
      const feature = dataRef.current.features.find((item) => item.properties.id === id) ?? null;
      onSelectProgrammeRef.current?.(null);
      onSelectRef.current(feature);
      if (!feature) return;
      const activeLocale = localeRef.current;
      const node = document.createElement("div");
      node.className = "inventory-popup-content";
      const title = document.createElement("strong");
      title.textContent = inventoryFeatureLabel(feature, activeLocale);
      const detail = document.createElement("span");
      detail.textContent = `${activeLocale === "ar" ? feature.properties.regionAr : feature.properties.region} · ${inventoryClassLabel(feature.properties.featureClass, activeLocale)} · ${(feature.properties.lengthM / 1000).toFixed(2)} ${distanceUnit(activeLocale)}`;
      node.append(title, detail);
      popupRef.current?.remove();
      popupRef.current = new mapboxgl.Popup({ offset: 12, closeButton: false }).setLngLat(event.lngLat).setDOMContent(node).addTo(map);
    });

    map.on("moveend", () => {
      const center = map.getCenter();
      setZoomLevel(map.getZoom());
      setCameraCenter([center.lng, center.lat]);
    });

    mapRef.current = map;
    map.on("error", (event) => {
      const message = event.error instanceof Error ? event.error.message : String(event.error ?? "Unknown map error");
      console.warn("Cycling basemap error:", message);
      if (!/(ajax|fetch|network|request|response|status|tile)/i.test(message)) return;
      const now = Date.now();
      basemapErrorTimesRef.current = [...basemapErrorTimesRef.current.filter((time) => now - time < 6000), now];
      if (basemapErrorTimesRef.current.length >= 2 && !basemapFallbackRef.current) {
        basemapFallbackRef.current = true;
        setBasemapFallback(true);
        setBasemapIssue(true);
      }
    });
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      if (mapIdleHandlerRef.current) map.off("idle", mapIdleHandlerRef.current);
      mapIdleHandlerRef.current = null;
      if (mapBusyTimerRef.current != null) window.clearTimeout(mapBusyTimerRef.current);
      mapBusyTimerRef.current = null;
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [beginMapTransition, data, fitFeatures]);

  useEffect(() => {
    const updateFullscreen = () => setFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    return scheduleMapMutation(map, () => {
      syncInventorySources(map, filtered);
      if (!selectedId && !selectedProgrammeId) fitFeatures(cameraFeatures);
    });
  }, [cameraFeatures, fitFeatures, loaded, selectedId, selectedProgrammeId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    return scheduleMapMutation(map, () => {
      const source = map.getSource("programme-routes") as GeoJSONSource | undefined;
      source?.setData(programmeCollection(programmeRoutes));
    });
  }, [loaded, programmeRoutes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    return scheduleMapMutation(map, () => {
      const source = map.getSource("asbuilt-packages") as GeoJSONSource | undefined;
      source?.setData(asBuilt ?? emptyAsBuiltData);
    });
  }, [asBuilt, loaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    return scheduleMapMutation(map, () => {
      const filter: FilterSpecification = ["==", ["get", "id"], selectedId ?? ""];
      map.setFilter("inventory-selected-polygon", filter);
      map.setFilter("inventory-selected-line", filter);
      if (selectedId) {
        const feature = data.features.find((item) => item.properties.id === selectedId);
        if (feature) {
          popupRef.current?.remove();
          const featureBounds = boundsFor([feature]);
          if (featureBounds) {
            popupRef.current = new mapboxgl.Popup({ offset: 12, closeButton: false })
              .setLngLat(featureBounds.getCenter())
              .setText(inventoryFeatureLabel(feature, localeRef.current))
              .addTo(map);
          }
          fitFeatures([feature], 700);
        }
      }
    });
  }, [data.features, fitFeatures, loaded, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    return scheduleMapMutation(map, () => {
      const filter: FilterSpecification = ["==", ["get", "id"], selectedProgrammeId ?? ""];
      map.setFilter("programme-route-selected", filter);
      if (!selectedProgrammeId) return;
      const route = programmeRoutes.find((item) => item.id === selectedProgrammeId);
      if (!route) return;
      const bounds = new mapboxgl.LngLatBounds();
      route.coordinates.forEach((coordinate) => bounds.extend(coordinate));
      const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 700;
      beginMapTransition(map);
      map.stop();
      map.fitBounds(bounds, { padding: { top: 104, right: 90, bottom: 96, left: 90 }, duration, maxZoom: 13.5 });
    });
  }, [beginMapTransition, loaded, programmeRoutes, selectedProgrammeId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    return scheduleMapMutation(map, () => {
      const useDarkStreets = theme === "dark";
      map.setPaintProperty("background", "background-color", basemap === "satellite" || useDarkStreets ? "#07131e" : "#e9eef4");
      ["base-streets", "base-dark-streets", "base-dark-labels", "base-osm", "base-satellite", "base-satellite-labels"].forEach((id) => map.setLayoutProperty(id, "visibility", "none"));
      if (basemapFallback) {
        map.setLayoutProperty("base-osm", "visibility", "visible");
        map.setPaintProperty("base-osm", "raster-brightness-max", theme === "dark" ? 0.48 : 1);
        map.setPaintProperty("base-osm", "raster-brightness-min", theme === "dark" ? 0.08 : 0);
        map.setPaintProperty("base-osm", "raster-saturation", theme === "dark" ? -0.82 : -0.35);
        map.setPaintProperty("base-osm", "raster-contrast", theme === "dark" ? 0.22 : 0.04);
      } else if (basemap === "satellite") {
        map.setLayoutProperty("base-satellite", "visibility", "visible");
        map.setLayoutProperty("base-satellite-labels", "visibility", "visible");
        map.setPaintProperty("base-satellite", "raster-brightness-max", theme === "dark" ? 0.68 : 1);
        map.setPaintProperty("base-satellite", "raster-saturation", theme === "dark" ? -0.35 : -0.2);
      } else if (useDarkStreets) {
        map.setLayoutProperty("base-dark-streets", "visibility", "visible");
        map.setLayoutProperty("base-dark-labels", "visibility", "visible");
      } else map.setLayoutProperty("base-streets", "visibility", "visible");
    });
  }, [basemap, basemapFallback, loaded, theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    return scheduleMapMutation(map, () => {
      const showContext = layersVisible && !selectedId && !selectedProgrammeId;
      inventoryContextLayerIds.forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", showContext ? "visible" : "none");
      });
      inventorySelectionLayerIds.forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", layersVisible && Boolean(selectedId) ? "visible" : "none");
      });
      ["programme-route-glow", "programme-route-line"].forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", programmeVisible && scopeVisible ? "visible" : "none");
      });
      ["programme-reference-glow", "programme-reference-line"].forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", programmeVisible && referenceVisible ? "visible" : "none");
      });
      ["programme-wip-glow", "programme-wip-line"].forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", programmeVisible && wipVisible ? "visible" : "none");
      });
      ["asbuilt-footprint-fill", "asbuilt-footprint-outline", "asbuilt-alignment-glow", "asbuilt-alignment-line"].forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", programmeVisible && completedVisible && !selectedId ? "visible" : "none");
      });
      const selectedProgramme = programmeRoutes.find((route) => route.id === selectedProgrammeId);
      const selectedLayerVisible = programmeVisible && (!selectedProgramme?.currentSourceGap || referenceVisible);
      if (map.getLayer("programme-route-selected")) map.setLayoutProperty("programme-route-selected", "visibility", selectedLayerVisible ? "visible" : "none");
    });
  }, [completedVisible, layersVisible, loaded, programmeRoutes, programmeVisible, referenceVisible, scopeVisible, selectedId, selectedProgrammeId, wipVisible]);

  const setMode = (mode: ViewMode) => {
    setViewMode(mode);
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 700;
    const camera = mode === "2d" ? { pitch: 0, bearing: 0 } : mode === "2.5d" ? { pitch: 45, bearing: -10 } : { pitch: 62, bearing: -18 };
    const map = mapRef.current;
    if (!map) return;
    beginMapTransition(map);
    map.stop();
    map.easeTo({ ...camera, duration });
  };

  const resetView = () => {
    popupRef.current?.remove();
    fitFeatures(cameraFeatures);
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement === frameRef.current) await document.exitFullscreen();
    else await frameRef.current?.requestFullscreen?.();
  };

  const chooseBasemap = (value: Basemap) => {
    basemapErrorTimesRef.current = [];
    basemapFallbackRef.current = false;
    setBasemapIssue(false);
    setBasemapFallback(false);
    setBasemap(value);
  };

  const retryBasemap = () => {
    basemapErrorTimesRef.current = [];
    basemapFallbackRef.current = false;
    setBasemapIssue(false);
    setBasemapFallback(false);
    mapRef.current?.triggerRepaint();
  };

  const labels = locale === "ar" ? {
    streets: "الخريطة", satellite: "القمر الصناعي", layers: "طبقة المسارات", trackLayers: "فئات المسارات", layerHint: "طبقات البرنامج الحالية والمخزون البلدي",
    currentProgramme: "برنامج أغسطس 2026 والمراجع", showAllProgramme: "عرض طبقات البرنامج كلها", scopeLayer: "نطاق البرنامج الحالي", completedLayer: "الهندسة المنفذة", wipLayer: "مسارات قيد التنفيذ", referenceLayer: "HSCT · محاذاة مرجعية 2022", referenceWarning: "محاذاة HSCT مأخوذة من أساس التصميم 2022 للمرجع فقط، وليست هندسة تنفيذ فعلي حالية.", packageMatchWarning: "هندسة التنفيذ للحزم 1-4 مجمعة؛ فصل الحزم يحتاج إلى مطابقة معتمدة.", municipalInventory: "المخزون البلدي الاختياري",
    showLayers: "إظهار طبقة المسارات", hideLayers: "إخفاء طبقة المسارات", expandLayers: "توسيع مفتاح فئات المسارات", collapseLayers: "طي مفتاح فئات المسارات", browseVerified: "فتح مستكشف المسارات الموثقة", mainTracks: "هيكل مسارات البرنامج", mainTracksHint: "اختر مساراً لعرض بياناته المتاحة وحالة المصدر", currentSourceGap: "يتطلب تحديث المصدر الحالي", noMainTracks: "لا توجد مسارات برنامج رئيسية ضمن المرشحات الحالية.", municipalTracks: "المسارات البلدية التفصيلية", municipalHint: "سجلات هندسية تفصيلية من مصادر البلديات", finderHelp: "ابحث في السجلات البلدية الموثقة وانتقل إلى هندستها.", findTrack: "ابحث عن مسار بلدي أو موقع", clearSearch: "مسح البحث", noMatches: "لا توجد مسارات موثقة مطابقة للمرشحات الحالية.", moreMatches: "استخدم البحث لتضييق قائمة المسارات.", trackFootprint: "مساحة مسار", trackAlignment: "محاذاة مسار", reset: "إعادة ضبط نطاق المرشح", fullscreen: "ملء الشاشة", exitFullscreen: "الخروج من ملء الشاشة", view: "منظور الخريطة", zoomIn: "تكبير", zoomOut: "تصغير", updating: "جارٍ تحديد موقع المسار وتحميل الخريطة", noGeometry: "لا توجد هندسة مسارات مطابقة لهذه البلدية والفئة.", showAllClasses: "عرض كل الفئات", fallbackTitle: "تم تشغيل خريطة احتياطية", fallbackText: "تعذر تحميل بعض مربعات الخريطة الأساسية؛ تظل هندسة المسارات متاحة.", retry: "إعادة المحاولة"
  } : {
    streets: "Streets", satellite: "Satellite", layers: "Track layer", trackLayers: "Track layers", layerHint: "Current programme, historical reference, and optional municipal inventory",
    currentProgramme: "August 2026 programme & references", showAllProgramme: "Show all programme layers", scopeLayer: "Current programme scope", completedLayer: "Completed as-built geometry", wipLayer: "Routes with work in progress", referenceLayer: "HSCT · 2022 reference alignment", referenceWarning: "The HSCT alignment comes from the 2022 Basis of Design for reference only; it is not current As-Built geometry.", packageMatchWarning: "Packages 1-4 as-built geometry is aggregated; the package split requires an approved crosswalk.", municipalInventory: "Optional municipal inventory",
    showLayers: "Show track layers", hideLayers: "Hide track layers", expandLayers: "Expand track-layer legend", collapseLayers: "Collapse track-layer legend", browseVerified: "Open verified-track explorer", mainTracks: "Programme route structure", mainTracksHint: "Select a route to inspect its available data and source status", currentSourceGap: "Requires current source update", noMainTracks: "No main programme tracks match the current filters.", municipalTracks: "Detailed municipal tracks", municipalHint: "Source geometry records supplied by the municipalities", finderHelp: "Search verified municipal records and fly to their source geometry.", findTrack: "Search municipal track or place", clearSearch: "Clear track search", noMatches: "No verified tracks match the current filters.", moreMatches: "Use search to narrow the track list.", trackFootprint: "Track footprint", trackAlignment: "Track alignment", reset: "Reset to filtered extent", fullscreen: "Fullscreen", exitFullscreen: "Exit fullscreen", view: "Map perspective", zoomIn: "Zoom in", zoomOut: "Zoom out", updating: "Locating track and loading map context", noGeometry: "No mapped track geometry matches this municipality and class.", showAllClasses: "Show all classes", fallbackTitle: "Fallback map active", fallbackText: "Some primary basemap tiles could not load; track geometry remains available.", retry: "Retry"
  };
  const classLabels = Object.fromEntries(inventoryClasses.map((value) => [value, inventoryClassLabel(value, locale)])) as Record<InventoryClass, string>;
  const selectLayerClass = (value: InventoryClass) => {
    setLayersVisible(true);
    if (value !== "Cycle track") setVerifiedBrowserOpen(false);
    onClassChange(value);
  };
  const toggleVerifiedBrowser = () => {
    setLayersVisible(true);
    if (featureClass !== "Cycle track") onClassChange("Cycle track");
    setVerifiedBrowserOpen((value) => !value);
  };
  const trackName = (feature: InventoryFeature) => inventoryFeatureLabel(feature, locale);
  const locateVerifiedTrack = (feature: InventoryFeature) => {
    if (featureClass !== "Cycle track") onClassChange("Cycle track");
    onSelectProgramme?.(null);
    onSelect(feature);
  };
  const locateMainTrack = (route: NetworkRoute) => {
    onSelect(null);
    onSelectProgramme?.(route.id);
  };
  const mainTrackProgress = (route: NetworkRoute) => route.progressPct;
  const allProgrammeLayersVisible = scopeVisible && completedVisible && wipVisible && referenceVisible;
  const setAllProgrammeLayers = () => {
    const next = !allProgrammeLayersVisible;
    setScopeVisible(next);
    setCompletedVisible(next);
    setWipVisible(next);
    setReferenceVisible(next);
  };

  return (
      <div className="inventory-map" ref={frameRef} data-lenis-prevent data-theme={theme} data-region={region} data-feature-class={featureClass} data-filtered-count={filtered.length} data-programme-count={programmeRoutes.length} data-main-track-count={mainRoutes.length} data-asbuilt-feature-count={asBuilt?.features.length ?? 0} data-layers-visible={layersVisible} data-programme-scope-visible={scopeVisible} data-reference-visible={referenceVisible} data-asbuilt-visible={completedVisible} data-wip-visible={wipVisible} data-selection-focus={selectedProgrammeId ? "programme" : selectedId ? "inventory" : "none"} data-basemap={basemap} data-basemap-health={basemapFallback ? "fallback" : "primary"} data-map-busy={mapBusy} data-view-mode={viewMode} data-zoom={zoomLevel.toFixed(2)} data-center={`${cameraCenter[0].toFixed(4)},${cameraCenter[1].toFixed(4)}`} data-fullscreen={fullscreen} data-render-mode="source-geometry">
      <div ref={containerRef} className="inventory-map-canvas" />
      {!loaded ? <div className="inventory-map-loading"><span /><b>{locale === "ar" ? "جارٍ تحميل بيانات المسارات" : "Loading track inventory"}</b></div> : null}
      {loaded && mapBusy ? <div className="inventory-map-transition" role="status" aria-live="polite"><span /><b>{labels.updating}</b></div> : null}
      {loaded && !mapBusy && !filtered.length ? <div className="inventory-map-empty" role="status"><Layers3 /><strong>{labels.noGeometry}</strong>{featureClass !== "all" ? <button type="button" onClick={() => selectLayerClass("all")}>{labels.showAllClasses}</button> : null}</div> : null}
      {basemapIssue ? <div className="inventory-map-notice" role="status"><AlertTriangle /><span><strong>{labels.fallbackTitle}</strong><small>{labels.fallbackText}</small></span><button type="button" onClick={retryBasemap}>{labels.retry}</button></div> : null}
      <div className="inventory-map-view-modes" role="group" aria-label={labels.view}>
        {(["2d", "2.5d", "3d"] as ViewMode[]).map((mode) => (
          <button className={viewMode === mode ? "is-active" : ""} key={mode} onClick={() => setMode(mode)} aria-pressed={viewMode === mode}>
            {mode === "2d" ? <MapIcon /> : mode === "2.5d" ? <Layers3 /> : <Box />}
            <span>{locale === "ar" ? (mode === "2d" ? "ثنائي" : mode === "2.5d" ? "شبه ثلاثي" : "ثلاثي") : (mode === "2d" ? "2D" : mode === "2.5d" ? "2.5D" : "3D")}</span>
          </button>
        ))}
      </div>
      <div className="inventory-map-toolbar" role="group" aria-label={labels.streets}>
        <button className={basemap === "streets" ? "is-active" : ""} onClick={() => chooseBasemap("streets")} title={labels.streets}><MapIcon /><span>{labels.streets}</span></button>
        <button className={basemap === "satellite" ? "is-active" : ""} onClick={() => chooseBasemap("satellite")} title={labels.satellite}><Satellite /><span>{labels.satellite}</span></button>
        <div className="inventory-layer-trigger">
          <button className={layersVisible ? "is-active" : ""} onClick={() => setLayersVisible((value) => !value)} title={layersVisible ? labels.hideLayers : labels.showLayers} aria-label={layersVisible ? labels.hideLayers : labels.showLayers} aria-pressed={layersVisible}><Layers3 /><span>{labels.layers}</span></button>
          <button className={`inventory-layer-panel-toggle ${layerPanelOpen ? "is-open" : ""}`} onClick={() => setLayerPanelOpen((value) => !value)} title={layerPanelOpen ? labels.collapseLayers : labels.expandLayers} aria-label={layerPanelOpen ? labels.collapseLayers : labels.expandLayers} aria-expanded={layerPanelOpen} aria-controls="inventory-track-layer-panel"><ChevronDown /></button>
        </div>
      </div>
      {layerPanelOpen ? <section className="inventory-layer-panel" id="inventory-track-layer-panel" aria-label={labels.trackLayers}>
        <header>
          <span><Layers3 /><span><strong>{labels.trackLayers}</strong><small>{labels.layerHint}</small></span></span>
          <i className={layersVisible ? "is-visible" : ""}>{layersVisible ? (locale === "ar" ? "ظاهرة" : "Visible") : (locale === "ar" ? "مخفية" : "Hidden")}</i>
        </header>
        <div className="inventory-programme-layers" aria-label={labels.currentProgramme}>
          <strong>{labels.currentProgramme}</strong>
          <button type="button" className={allProgrammeLayersVisible ? "is-active" : ""} onClick={setAllProgrammeLayers} aria-pressed={allProgrammeLayersVisible}><Layers3 /><span>{labels.showAllProgramme}</span><i>{allProgrammeLayersVisible ? <Check /> : null}</i></button>
          <button type="button" className={scopeVisible ? "is-active" : ""} onClick={() => setScopeVisible((value) => !value)} aria-pressed={scopeVisible}><span className="programme-layer-swatch is-scope" /><span>{labels.scopeLayer}</span><i>{scopeVisible ? <Check /> : null}</i></button>
          <button type="button" className={completedVisible ? "is-active" : ""} onClick={() => setCompletedVisible((value) => !value)} aria-pressed={completedVisible}><span className="programme-layer-swatch is-completed" /><span>{labels.completedLayer}</span><i>{completedVisible ? <Check /> : null}</i></button>
          <button type="button" className={wipVisible ? "is-active" : ""} onClick={() => setWipVisible((value) => !value)} aria-pressed={wipVisible}><span className="programme-layer-swatch is-wip" /><span>{labels.wipLayer}</span><i>{wipVisible ? <Check /> : null}</i></button>
          <button type="button" className={referenceVisible ? "is-active" : ""} onClick={() => setReferenceVisible((value) => !value)} aria-pressed={referenceVisible}><span className="programme-layer-swatch is-reference" /><span>{labels.referenceLayer}</span><i>{referenceVisible ? <Check /> : null}</i></button>
          <small className="inventory-reference-warning">{labels.referenceWarning}</small>
          <small>{labels.packageMatchWarning}</small>
        </div>
        <div className="inventory-layer-subheading"><strong>{labels.municipalInventory}</strong><button type="button" onClick={() => setLayersVisible((value) => !value)} aria-pressed={layersVisible}>{layersVisible ? (locale === "ar" ? "إخفاء" : "Hide") : (locale === "ar" ? "إظهار" : "Show")}</button></div>
        <div className="inventory-layer-options">
          {inventoryClasses.map((value) => {
            const selected = featureClass === value;
            const modifier = value === "all" ? "all" : value === "Cycle track" ? "cycle" : value === "Active-mobility path" ? "path" : "polygon";
            const isVerified = value === "Cycle track";
            return <div className="inventory-layer-option-group" key={value}>
              <div className={`inventory-layer-row ${isVerified ? "has-browser" : ""}`}>
                <button className={`inventory-layer-select ${selected ? "is-active" : ""}`} onClick={() => selectLayerClass(value)} aria-pressed={selected} data-layer-class={value}>
                  <span className={`inventory-layer-swatch is-${modifier}`}>{value === "all" ? <Layers3 /> : null}</span>
                  <span>{classLabels[value]}</span>
                  <i aria-hidden="true">{selected ? <Check /> : null}</i>
                </button>
                {isVerified ? <button className={`inventory-layer-browser-toggle ${verifiedBrowserOpen ? "is-open" : ""}`} onClick={toggleVerifiedBrowser} title={labels.browseVerified} aria-label={labels.browseVerified} aria-expanded={verifiedBrowserOpen} aria-controls="inventory-verified-track-browser"><ChevronDown /></button> : null}
              </div>
              {isVerified && verifiedBrowserOpen ? <section className="inventory-verified-browser" id="inventory-verified-track-browser" aria-label={labels.browseVerified}>
                <header className="inventory-main-track-heading"><span><strong>{labels.mainTracks}</strong><small>{labels.mainTracksHint}</small></span></header>
                <div className="inventory-main-track-results">
                  {mainRoutes.map((route) => {
                    const selectedTrack = selectedProgrammeId === route.id;
                    return <button key={route.id} className={selectedTrack ? "is-selected" : ""} onClick={() => locateMainTrack(route)} aria-pressed={selectedTrack} data-main-track-id={route.id}>
                      <i style={{ background: route.color }} />
                      <span><strong>{routeLabel(route, locale)}</strong><small>{route.currentSourceGap ? labels.currentSourceGap : statusText[locale][route.status]}</small></span>
                      <em>{route.currentSourceGap ? (locale === "ar" ? "فجوة مصدر" : "Source gap") : `${mainTrackProgress(route)}%`}</em>
                      {route.currentSourceGap ? <AlertTriangle /> : <MapPin />}
                    </button>;
                  })}
                  {!mainRoutes.length ? <span className="inventory-verified-empty">{labels.noMainTracks}</span> : null}
                </div>
                <details className="inventory-municipal-track-browser">
                  <summary><span><strong>{labels.municipalTracks}</strong><small>{labels.municipalHint}</small></span><ChevronDown /></summary>
                  <div>
                    <p>{labels.finderHelp}</p>
                    <label className="inventory-verified-search">
                      <Search />
                      <input value={verifiedQuery} onChange={(event) => setVerifiedQuery(event.target.value)} placeholder={labels.findTrack} aria-label={labels.findTrack} />
                      {verifiedQuery ? <button type="button" onClick={() => setVerifiedQuery("")} title={labels.clearSearch} aria-label={labels.clearSearch}><X /></button> : null}
                    </label>
                    <div className="inventory-verified-results">
                      {visibleVerifiedTracks.map((feature) => {
                        const selectedTrack = selectedId === feature.properties.id;
                        const geometryLabel = feature.geometry.type === "LineString" || feature.geometry.type === "MultiLineString" ? labels.trackAlignment : labels.trackFootprint;
                        return <button key={feature.properties.id} className={selectedTrack ? "is-selected" : ""} onClick={() => locateVerifiedTrack(feature)} aria-pressed={selectedTrack} data-track-id={feature.properties.id}>
                          <i style={{ background: regionColors[feature.properties.municipality] }} />
                          <span><strong><span>{trackName(feature)}</span><em>{feature.properties.id}</em></strong><small>{regionLabel(feature.properties.municipality, locale)} · {geometryLabel} · {(feature.properties.lengthM / 1000).toFixed(2)} {distanceUnit(locale)}</small></span>
                          <MapPin />
                        </button>;
                      })}
                      {!visibleVerifiedTracks.length ? <span className="inventory-verified-empty">{labels.noMatches}</span> : null}
                      {verifiedTracks.length > visibleVerifiedTracks.length ? <span className="inventory-verified-more">{labels.moreMatches}</span> : null}
                    </div>
                  </div>
                </details>
              </section> : null}
            </div>;
          })}
        </div>
      </section> : null}
      <div className="inventory-map-zoom" role="group" aria-label={labels.view}>
        <button onClick={() => { mapRef.current?.stop(); mapRef.current?.zoomIn({ duration: 300 }); }} title={labels.zoomIn} aria-label={labels.zoomIn}><Plus /></button>
        <button onClick={() => { mapRef.current?.stop(); mapRef.current?.zoomOut({ duration: 300 }); }} title={labels.zoomOut} aria-label={labels.zoomOut}><Minus /></button>
        <button onClick={resetView} title={labels.reset} aria-label={labels.reset}><RotateCcw /></button>
        <button onClick={toggleFullscreen} title={fullscreen ? labels.exitFullscreen : labels.fullscreen} aria-label={fullscreen ? labels.exitFullscreen : labels.fullscreen}>{fullscreen ? <Minimize /> : <Expand />}</button>
      </div>
      <div className="inventory-map-legend">
        {programmeRoutes.length && programmeVisible ? <span className="inventory-programme-key"><i />{locale === "ar" ? "طبقات البرنامج" : "Programme layers"}</span> : null}
        {referenceVisible && programmeRoutes.some((route) => route.currentSourceGap) && programmeVisible ? <span className="inventory-hsct-reference-key"><i />{locale === "ar" ? "HSCT · مرجع 2022" : "HSCT · 2022 reference"}</span> : null}
        {(["ADM", "AAM", "DRM"] as const).map((code) => <span key={code}><i style={{ background: regionColors[code] }} />{locale === "ar" ? regionLabel(code, locale) : code}</span>)}
        <em>{locale === "ar" ? "هندسة بلدية موثقة" : "Source-qualified municipal geometry"}</em>
      </div>
    </div>
  );
}
