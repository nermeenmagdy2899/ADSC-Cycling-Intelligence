import { useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection, LineString, Polygon } from "geojson";
import mapboxgl from "mapbox-gl";
import { Bike, Camera, Layers3, Maximize2, Pause, Play, RotateCcw, Satellite, Search, X } from "lucide-react";
import { networkRoutes, routeTypeCopy, statusLabels } from "../data/network";
import type { RouteType } from "../data/network";
import { useNetworkStore } from "../store/useNetworkStore";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

type RouteFeatureCollection = FeatureCollection<LineString, { id: string; color: string; type: RouteType; name: string; label: string }>;

const localStyle: mapboxgl.Style = {
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#07110f" } }]
};

const contextGeojson: FeatureCollection<Polygon, { name: string; kind: "water" | "island" | "mainland" }> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Arabian Gulf", kind: "water" },
      geometry: {
        type: "Polygon",
        coordinates: [[[54.15, 24.85], [55.55, 24.85], [55.55, 24.1], [54.15, 24.1], [54.15, 24.85]]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Abu Dhabi Island", kind: "island" },
      geometry: {
        type: "Polygon",
        coordinates: [[[54.27, 24.52], [54.55, 24.55], [54.6, 24.45], [54.52, 24.35], [54.31, 24.37], [54.24, 24.45], [54.27, 24.52]]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Mainland", kind: "mainland" },
      geometry: {
        type: "Polygon",
        coordinates: [[[54.42, 24.36], [55.55, 24.86], [55.55, 24.1], [54.38, 24.1], [54.42, 24.36]]]
      }
    }
  ]
};

const fallbackRoutes: RouteFeatureCollection = {
  type: "FeatureCollection",
  features: networkRoutes.map((route) => ({
    type: "Feature",
    id: route.id,
    properties: { id: route.id, color: route.color, type: route.type, name: route.name, label: route.label },
    geometry: { type: "LineString", coordinates: route.coordinates }
  }))
};

const overlayBounds = {
  minLng: 54.18,
  maxLng: 55.42,
  minLat: 24.12,
  maxLat: 24.9
};

function projectOverlayPoint([lng, lat]: [number, number]) {
  const x = ((lng - overlayBounds.minLng) / (overlayBounds.maxLng - overlayBounds.minLng)) * 1000;
  const y = 620 - ((lat - overlayBounds.minLat) / (overlayBounds.maxLat - overlayBounds.minLat)) * 620;
  return [x, y] as const;
}

export function NetworkMap() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapStageRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const frameRef = useRef(0);
  const rafRef = useRef(0);
  const [loaded, setLoaded] = useState(false);
  const [hoveredRouteId, setHoveredRouteId] = useState<string | null>(null);
  const [routeData, setRouteData] = useState<RouteFeatureCollection>(fallbackRoutes);
  const [mapMode, setMapMode] = useState<"streets" | "satellite">("streets");
  const [search, setSearch] = useState("");
  const [restartKey, setRestartKey] = useState(0);
  const { selectedRouteId, setSelectedRouteId, visibleTypes, toggleType, playback, setPlayback, speed, setSpeed } = useNetworkStore();
  const selected = networkRoutes.find((route) => route.id === selectedRouteId) ?? networkRoutes[0];

  const filteredRoutes = useMemo(
    () => networkRoutes.filter((route) => route.name.toLowerCase().includes(search.toLowerCase()) || route.label.toLowerCase().includes(search.toLowerCase())),
    [search]
  );
  const overlayRoutes = useMemo(
    () =>
      routeData.features.map((feature) => ({
        id: feature.properties.id,
        type: feature.properties.type,
        label: feature.properties.label,
        color: feature.properties.color,
        coordinates: feature.geometry.coordinates as [number, number][],
        path: feature.geometry.coordinates
          .map((coordinate, index) => {
            const [x, y] = projectOverlayPoint(coordinate as [number, number]);
            return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
          })
          .join(" ")
      })),
    [routeData]
  );
  const selectedPercent = Math.round((selected.completedKm / selected.plannedKm) * 100);

  useEffect(() => {
    let mounted = true;
    fetch("/data/adcn-routes.geojson")
      .then((response) => response.json())
      .then((data: RouteFeatureCollection) => {
        if (mounted) setRouteData(data);
      })
      .catch(() => {
        if (mounted) setRouteData(fallbackRoutes);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapboxgl.accessToken ? "mapbox://styles/mapbox/dark-v11" : localStyle,
      center: [54.68, 24.48],
      zoom: 8.6,
      pitch: 42,
      bearing: -22,
      antialias: true
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "bottom-right");
    map.addControl(new mapboxgl.ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-left");

    map.on("load", () => {
      map.addSource("context", { type: "geojson", data: contextGeojson });
      map.addLayer({
        id: "context-water",
        type: "fill",
        source: "context",
        filter: ["==", ["get", "kind"], "water"],
        paint: { "fill-color": "#0d3532", "fill-opacity": 0.5 }
      });
      map.addLayer({
        id: "context-land",
        type: "fill",
        source: "context",
        filter: ["!=", ["get", "kind"], "water"],
        paint: { "fill-color": ["match", ["get", "kind"], "island", "#13302b", "mainland", "#18221f", "#18221f"], "fill-opacity": 0.88 }
      });
      map.addLayer({
        id: "context-outline",
        type: "line",
        source: "context",
        paint: { "line-color": "rgba(255,255,255,0.12)", "line-width": 1 }
      });
      map.addSource("routes", { type: "geojson", data: routeData, lineMetrics: true });
      map.addLayer({
        id: "routes-glow",
        type: "line",
        source: "routes",
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["case", ["==", ["get", "id"], selectedRouteId], 22, 12],
          "line-opacity": ["case", ["==", ["get", "id"], selectedRouteId], 0.34, 0.14],
          "line-blur": 7
        }
      });
      map.addLayer({
        id: "routes-line",
        type: "line",
        source: "routes",
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["case", ["==", ["get", "id"], selectedRouteId], 7, 4],
          "line-opacity": 0.94
        }
      });
      map.addLayer({
        id: "routes-hover",
        type: "line",
        source: "routes",
        filter: ["==", ["get", "id"], ""],
        paint: { "line-color": "#ffffff", "line-width": 10, "line-opacity": 0.26 }
      });
      map.addLayer({
        id: "routes-draw",
        type: "line",
        source: "routes",
        filter: ["==", ["get", "id"], selectedRouteId],
        paint: {
          "line-width": 9,
          "line-opacity": 0.9,
          "line-gradient": ["interpolate", ["linear"], ["line-progress"], 0, "#ffffff", 0.02, "rgba(255,255,255,0)"]
        }
      });

      map.on("mouseenter", "routes-line", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "routes-line", () => {
        map.getCanvas().style.cursor = "";
        setHoveredRouteId(null);
        map.setFilter("routes-hover", ["==", ["get", "id"], ""]);
      });
      map.on("mousemove", "routes-line", (event) => {
        const id = event.features?.[0]?.properties?.id as string | undefined;
        if (!id) return;
        setHoveredRouteId(id);
        map.setFilter("routes-hover", ["==", ["get", "id"], id]);
      });
      map.on("click", "routes-line", (event) => {
        const id = event.features?.[0]?.properties?.id as string | undefined;
        if (id) setSelectedRouteId(id);
      });
      setLoaded(true);
    });

    mapRef.current = map;
    return () => {
      cancelAnimationFrame(rafRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, [setSelectedRouteId]);

  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource("routes") as mapboxgl.GeoJSONSource | undefined;
    if (!map || !loaded || !source) return;
    source.setData(routeData);
  }, [loaded, routeData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const visibleIds = networkRoutes.filter((route) => visibleTypes.includes(route.type)).map((route) => route.id);
    const filter: mapboxgl.FilterSpecification = ["in", ["get", "id"], ["literal", visibleIds]];
    map.setFilter("routes-line", filter);
    map.setFilter("routes-glow", filter);
    map.setFilter("routes-draw", ["all", filter, ["==", ["get", "id"], selectedRouteId]]);
  }, [loaded, selectedRouteId, visibleTypes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    map.setPaintProperty("routes-line", "line-width", ["case", ["==", ["get", "id"], selectedRouteId], 7, 4]);
    map.setPaintProperty("routes-glow", "line-width", ["case", ["==", ["get", "id"], selectedRouteId], 22, 12]);
    map.setPaintProperty("routes-glow", "line-opacity", ["case", ["==", ["get", "id"], selectedRouteId], 0.34, 0.14]);
    map.setFilter("routes-draw", ["==", ["get", "id"], selectedRouteId]);
    frameRef.current = 0;
    const bounds = new mapboxgl.LngLatBounds();
    selected.coordinates.forEach((coordinate) => bounds.extend(coordinate));
    map.fitBounds(bounds, { padding: 120, duration: 1300, pitch: 52, bearing: -24 });
  }, [loaded, selected, selectedRouteId, restartKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    cancelAnimationFrame(rafRef.current);
    const animate = () => {
      if (playback === "playing") frameRef.current = Math.min(1, frameRef.current + speed * 0.006);
      const head = frameRef.current;
      map.setPaintProperty("routes-draw", "line-gradient", [
        "interpolate",
        ["linear"],
        ["line-progress"],
        Math.max(0, head - 0.001),
        selected.color,
        head,
        selected.color,
        Math.min(1, head + 0.001),
        "rgba(255,255,255,0)"
      ]);
      if (head < 1 || playback === "paused") rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loaded, playback, speed, selected.color, selectedRouteId, restartKey]);

  function setBaseMap(mode: "streets" | "satellite") {
    setMapMode(mode);
    if (!mapboxgl.accessToken) return;
    mapRef.current?.setStyle(mode === "satellite" ? "mapbox://styles/mapbox/satellite-streets-v12" : "mapbox://styles/mapbox/dark-v11");
  }

  return (
    <div className="relative overflow-hidden border-y border-white/10 bg-obsidian px-4 py-5 md:px-6">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:72px_72px]" />
      <div className="relative z-10 grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)_340px] 2xl:grid-cols-[370px_minmax(0,1fr)_370px]">
        <aside className="floating-panel max-h-[760px] overflow-auto p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">GIS Control Room</p>
              <h3 className="mt-2 text-2xl font-semibold">Network map</h3>
            </div>
            <Layers3 className="h-5 w-5 text-palm" />
          </div>
          <div className="mt-5 flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2">
            <Search className="h-4 w-4 text-white/40" />
            <input className="w-full bg-transparent text-sm outline-none placeholder:text-white/40" value={search} placeholder="Search routes" onChange={(event) => setSearch(event.target.value)} />
            {search ? <button aria-label="Clear search" onClick={() => setSearch("")}><X className="h-4 w-4 text-white/50" /></button> : null}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className={`map-mode ${mapMode === "streets" ? "is-active" : ""}`} onClick={() => setBaseMap("streets")}>
              <Camera className="h-4 w-4" /> Streets
            </button>
            <button className={`map-mode ${mapMode === "satellite" ? "is-active" : ""}`} onClick={() => setBaseMap("satellite")}>
              <Satellite className="h-4 w-4" /> Satellite
            </button>
          </div>
          <div className="mt-5 space-y-2">
            {(["type-01", "type-02", "type-03", "hsct"] as const).map((type) => (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`flex w-full items-center justify-between rounded-md border px-3 py-3 text-left text-sm transition ${
                  visibleTypes.includes(type) ? "border-palm/50 bg-palm/10 text-white" : "border-white/10 bg-white/5 text-white/50"
                }`}
              >
                <span>{type.toUpperCase()}</span>
                <span className="text-xs">{visibleTypes.includes(type) ? "Visible" : "Hidden"}</span>
              </button>
            ))}
          </div>
          <div className="mt-5 max-h-48 space-y-2 overflow-auto pr-1">
            {filteredRoutes.map((route) => (
              <button
                key={route.id}
                className={`route-search-result ${route.id === selectedRouteId ? "is-active" : ""}`}
                onClick={() => setSelectedRouteId(route.id)}
              >
                <span style={{ background: route.color }} />
                {route.label}
              </button>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center">
            <MiniStat label="Visible" value={String(networkRoutes.filter((route) => visibleTypes.includes(route.type)).length)} />
            <MiniStat label="Tracks" value="7" />
            <MiniStat label="Source" value="GeoJSON" />
          </div>
          <p className="mt-5 text-sm leading-6 text-white/60">{routeTypeCopy[selected.type]}</p>
        </aside>

        <div ref={mapStageRef} className="gis-map-stage">
          <div ref={mapContainer} className="absolute inset-0" />
          <GeoJsonRouteOverlay
            hoveredRouteId={hoveredRouteId}
            onHover={setHoveredRouteId}
            onSelect={setSelectedRouteId}
            playback={playback}
            restartKey={restartKey}
            routes={overlayRoutes}
            selectedRouteId={selectedRouteId}
            speed={speed}
            visibleTypes={visibleTypes}
          />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_45%_35%,rgba(93,211,158,0.12),transparent_30%),linear-gradient(180deg,rgba(8,16,15,0.04),rgba(8,16,15,0.34))]" />
          <div className="pointer-events-none absolute left-1/2 top-4 z-10 hidden -translate-x-1/2 items-center gap-3 rounded-md border border-white/10 bg-obsidian/72 px-4 py-3 text-pearl shadow-panel backdrop-blur-xl lg:flex">
            <Bike className="h-5 w-5 text-palm" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-palm">Mapbox GIS + GeoJSON routes</p>
              <p className="text-xs text-white/55">Zoom, pan, hover, click, filter, fly-to, and animate route delivery.</p>
            </div>
          </div>
        </div>

        <aside className="floating-panel max-h-[760px] overflow-auto p-4 xl:sticky xl:top-24">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">{statusLabels[selected.status]}</p>
              <h3 className="mt-2 text-2xl font-semibold">{selected.name}</h3>
            </div>
            <button className="icon-button" aria-label="Fullscreen map" onClick={() => mapStageRef.current?.requestFullscreen()}>
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-4 text-sm leading-6 text-white/70">{selected.description}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {selected.photos.map((photo) => (
              <img className="h-24 w-full rounded-md border border-white/10 object-cover" src={photo} alt="" loading="lazy" key={photo} />
            ))}
          </div>
          <div className="mt-5 rounded-md border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs uppercase tracking-[0.2em] text-white/45">Completion</span>
              <strong className="text-palm">{selectedPercent}%</strong>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full" style={{ width: `${selectedPercent}%`, background: selected.color }} />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Detail label="Planned" value={`${selected.plannedKm} km`} />
            <Detail label="Completed" value={`${selected.completedKm} km`} />
            <Detail label="Forecast" value={selected.forecast} />
            <Detail label="Speed" value={selected.designSpeed} />
          </div>
          <div className="mt-4 rounded-md bg-white/5 p-3 text-sm text-white/60">
            <span className="text-white">Contractor:</span> {selected.contractor}
          </div>
          {selected.structures ? (
            <div className="mt-2 rounded-md bg-white/5 p-3 text-sm text-white/60">
              <span className="text-white">Structures:</span> {selected.structures}
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {selected.users.map((user) => (
              <span className="rounded-full border border-palm/25 bg-palm/10 px-2.5 py-1 text-xs text-palm" key={user}>
                {user}
              </span>
            ))}
          </div>
          {hoveredRouteId ? <p className="mt-3 text-xs uppercase tracking-[0.2em] text-dune">Hover: {networkRoutes.find((route) => route.id === hoveredRouteId)?.label}</p> : null}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/50">
              <span>{playback === "playing" ? "Drawing route" : "Route paused"}</span>
              <span>{speed.toFixed(1)}x</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="icon-button" title={playback === "playing" ? "Pause route draw" : "Play route draw"} aria-label={playback === "playing" ? "Pause route draw" : "Play route draw"} onClick={() => setPlayback(playback === "playing" ? "paused" : "playing")}>
                {playback === "playing" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button className="icon-button" title="Restart route draw" aria-label="Restart route draw" onClick={() => { setPlayback("playing"); setRestartKey((current) => current + 1); }}>
                <RotateCcw className="h-4 w-4" />
              </button>
              <input className="w-full accent-palm" aria-label="Route draw speed" title="Route draw speed" type="range" min="0.4" max="3" step="0.1" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function GeoJsonRouteOverlay({
  hoveredRouteId,
  onHover,
  onSelect,
  playback,
  restartKey,
  routes,
  selectedRouteId,
  speed,
  visibleTypes
}: {
  hoveredRouteId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  playback: "playing" | "paused";
  restartKey: number;
  routes: Array<{ id: string; type: RouteType; label: string; color: string; coordinates: [number, number][]; path: string }>;
  selectedRouteId: string;
  speed: number;
  visibleTypes: RouteType[];
}) {
  return (
    <svg className="absolute inset-0 z-[1] h-full w-full" viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid slice" role="img" aria-label="ADCN GeoJSON route overlay">
      <defs>
        <filter id="geojson-route-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="geojson-water" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#0d3532" stopOpacity="0.66" />
          <stop offset="100%" stopColor="#07110f" stopOpacity="0.18" />
        </linearGradient>
        <pattern id="cycle-lane-mark" width="34" height="34" patternUnits="userSpaceOnUse" patternTransform="rotate(-22)">
          <path d="M8 17 H25 M20 12 L26 17 L20 22" fill="none" stroke="rgba(255,255,255,0.26)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="1000" height="620" fill="#07110f" />
      <path d="M0 0 H1000 V350 C882 318 824 266 705 282 C590 296 528 238 410 254 C280 272 174 350 0 326 Z" fill="url(#geojson-water)" opacity="0.78" />
      <path d="M150 355 C226 306 342 294 448 318 C552 342 628 396 768 382 C860 374 928 400 1000 432 L1000 620 L0 620 L0 410 C55 400 98 388 150 355 Z" fill="#18231f" opacity="0.95" />
      <path d="M178 360 C272 314 372 326 460 352 C540 376 608 414 704 410 C776 407 840 386 926 410" fill="none" stroke="rgba(255,255,255,0.16)" strokeDasharray="10 13" strokeWidth="2" />
      <path d="M62 250 C180 220 286 244 378 210 S566 154 700 196 S850 248 958 206" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="13" strokeLinecap="round" />
      <path d="M94 478 C224 420 334 430 452 466 S702 538 882 472" fill="none" stroke="rgba(255,255,255,0.075)" strokeWidth="10" strokeLinecap="round" />
      <path d="M146 342 C226 298 320 300 414 326 S572 400 728 382" fill="none" stroke="rgba(216,197,138,0.28)" strokeWidth="2" strokeDasharray="14 16" />
      <circle cx="575" cy="255" r="42" fill="rgba(93,211,158,0.08)" />
      <circle cx="745" cy="310" r="52" fill="rgba(70,199,212,0.07)" />
      <circle cx="360" cy="376" r="58" fill="rgba(216,197,138,0.08)" />
      <rect x="0" y="0" width="1000" height="620" fill="url(#cycle-lane-mark)" opacity="0.08" />
      <g className="text-[12px] font-semibold uppercase tracking-[0.22em]">
        <text x="278" y="368" fill="rgba(255,255,255,0.42)">Abu Dhabi Island</text>
        <text x="548" y="260" fill="rgba(255,255,255,0.32)">Yas / Saadiyat connectors</text>
        <text x="650" y="486" fill="rgba(255,255,255,0.28)">Mainland corridors</text>
      </g>
      {routes
        .filter((route) => visibleTypes.includes(route.type))
        .map((route) => {
          const selected = route.id === selectedRouteId;
          const hovered = route.id === hoveredRouteId;
          const [startX, startY] = projectOverlayPoint(route.coordinates[0]);
          const [endX, endY] = projectOverlayPoint(route.coordinates[route.coordinates.length - 1]);
          return (
            <g key={route.id} onClick={() => onSelect(route.id)} onMouseEnter={() => onHover(route.id)} onMouseLeave={() => onHover(null)} className="cursor-pointer">
              <path d={route.path} fill="none" stroke={route.color} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={selected ? 0.34 : hovered ? 0.28 : 0.16} strokeWidth={selected ? 24 : hovered ? 18 : 12} filter="url(#geojson-route-glow)" />
              <path d={route.path} fill="none" stroke={route.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={selected ? 7 : hovered ? 6 : 4} />
              <circle cx={startX} cy={startY} r={selected ? 7 : 5} fill="#07110f" stroke={route.color} strokeWidth="3" />
              <circle cx={endX} cy={endY} r={selected ? 7 : 5} fill={route.color} stroke="#ffffff" strokeOpacity="0.75" strokeWidth="2" />
              {(selected || hovered) ? (
                <g transform={`translate(${endX + 12} ${endY - 12})`}>
                  <rect width="78" height="28" rx="6" fill="rgba(7,17,15,0.82)" stroke={route.color} strokeOpacity="0.55" />
                  <text x="10" y="18" fill="#ffffff" fontSize="11" fontWeight="700">{route.label}</text>
                </g>
              ) : null}
              {selected ? (
                <path
                  key={`${route.id}-${restartKey}`}
                  className="geojson-route-draw"
                  d={route.path}
                  fill="none"
                  stroke="#ffffff"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                  style={{
                    animationDuration: `${Math.max(1, 5 / speed)}s`,
                    animationPlayState: playback === "playing" ? "running" : "paused"
                  }}
                />
              ) : null}
            </g>
          );
        })}
    </svg>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/5 p-2">
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/6 p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-white/40">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
