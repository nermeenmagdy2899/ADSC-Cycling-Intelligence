import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection, LineString, Polygon } from "geojson";
import mapboxgl from "mapbox-gl";
import { Bike, Camera, Layers3, Maximize2, Pause, Play, RotateCcw, Satellite, Search, X } from "lucide-react";
import { networkRoutes } from "../data/network";
import type { RouteType } from "../data/network";
import { formatForecast, mapPlaceNames, routeDescription, routeLabel, routeLabels, routeName, routeTypeDescription, routeTypeName, statusText, uiCopy } from "../i18n";
import { useNetworkStore } from "../store/useNetworkStore";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

type RouteFeatureCollection = FeatureCollection<LineString, { id: string; color: string; type: RouteType; name: string; label: string }>;

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

export function NetworkMap({ variant = "full" }: { variant?: "full" | "story" }) {
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
  const { selectedRouteId, setSelectedRouteId, soloRouteId, setSoloRouteId, visibleTypes, toggleType, playback, setPlayback, speed, setSpeed, theme, locale, tour, setTour } = useNetworkStore();
  const c = uiCopy[locale];
  const selected = networkRoutes.find((route) => route.id === selectedRouteId) ?? networkRoutes[0];
  const selectRoute = useCallback(
    (id: string) => {
      setTour(false); // a manual route pick takes control back from the auto-tour
      setSelectedRouteId(id);
      setSoloRouteId(null);
      setPlayback("playing");
      setRestartKey((current) => current + 1);
    },
    [setPlayback, setSelectedRouteId, setSoloRouteId, setTour]
  );

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
    if (!mapboxgl.accessToken) {
      setLoaded(false);
      return;
    }

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: theme === "light" ? "mapbox://styles/mapbox/light-v11" : "mapbox://styles/mapbox/navigation-night-v1",
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
        paint: { "fill-color": theme === "light" ? "#d7e4f2" : "#091b31", "fill-opacity": theme === "light" ? 0.38 : 0.56 }
      });
      map.addLayer({
        id: "context-land",
        type: "fill",
        source: "context",
        filter: ["!=", ["get", "kind"], "water"],
        paint: {
          "fill-color": ["match", ["get", "kind"], "island", theme === "light" ? "#ffffff" : "#111c2c", "mainland", theme === "light" ? "#e1e9f5" : "#0b1320", theme === "light" ? "#e1e9f5" : "#0b1320"],
          "fill-opacity": theme === "light" ? 0.64 : 0.86
        }
      });
      map.addLayer({
        id: "context-outline",
        type: "line",
        source: "context",
        paint: { "line-color": theme === "light" ? "rgba(10,22,38,0.16)" : "rgba(231,198,136,0.14)", "line-width": 1 }
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
        if (id) selectRoute(id);
      });
      setLoaded(true);
    });

    mapRef.current = map;
    return () => {
      cancelAnimationFrame(rafRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, [selectRoute]);

  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource("routes") as mapboxgl.GeoJSONSource | undefined;
    if (!map || !loaded || !source) return;
    source.setData(routeData);
  }, [loaded, routeData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const visibleIds = soloRouteId
      ? [soloRouteId]
      : (variant === "story" ? networkRoutes : networkRoutes.filter((route) => visibleTypes.includes(route.type))).map((route) => route.id);
    const filter: mapboxgl.FilterSpecification = ["in", ["get", "id"], ["literal", visibleIds]];
    map.setFilter("routes-line", filter);
    map.setFilter("routes-glow", filter);
    map.setFilter("routes-draw", ["all", filter, ["==", ["get", "id"], selectedRouteId]]);
  }, [loaded, selectedRouteId, soloRouteId, variant, visibleTypes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    map.setPaintProperty("routes-line", "line-width", ["case", ["==", ["get", "id"], selectedRouteId], 8, variant === "story" ? 5 : 4]);
    map.setPaintProperty("routes-line", "line-opacity", ["case", ["==", ["get", "id"], selectedRouteId], 1, variant === "story" ? 0.76 : 0.94]);
    map.setPaintProperty("routes-glow", "line-width", ["case", ["==", ["get", "id"], selectedRouteId], 25, variant === "story" ? 15 : 12]);
    map.setPaintProperty("routes-glow", "line-opacity", ["case", ["==", ["get", "id"], selectedRouteId], 0.42, variant === "story" ? 0.2 : 0.14]);
    map.setFilter("routes-draw", ["==", ["get", "id"], selectedRouteId]);
    frameRef.current = 0;
    const bounds = new mapboxgl.LngLatBounds();
    selected.coordinates.forEach((coordinate) => bounds.extend(coordinate));
    map.fitBounds(bounds, { padding: 120, duration: 1300, pitch: 52, bearing: -24 });
  }, [loaded, selected, selectedRouteId, restartKey, variant]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    cancelAnimationFrame(rafRef.current);
    const animate = () => {
      if (playback === "playing") frameRef.current = Math.min(1, frameRef.current + speed * 0.006);
      const head = Math.min(0.998, Math.max(0.002, frameRef.current));
      map.setPaintProperty("routes-draw", "line-gradient", [
        "interpolate",
        ["linear"],
        ["line-progress"],
        Math.max(0, head - 0.002),
        selected.color,
        head,
        selected.color,
        Math.min(1, head + 0.002),
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
    mapRef.current?.setStyle(mode === "satellite" ? "mapbox://styles/mapbox/satellite-streets-v12" : theme === "light" ? "mapbox://styles/mapbox/light-v11" : "mapbox://styles/mapbox/navigation-night-v1");
  }

  const mapStage = (
    <div
      ref={mapStageRef}
      className={`gis-map-stage ${theme === "light" ? "is-light" : ""}`}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--mx", `${((event.clientX - rect.left) / rect.width) * 100}%`);
        event.currentTarget.style.setProperty("--my", `${((event.clientY - rect.top) / rect.height) * 100}%`);
      }}
    >
      <div ref={mapContainer} className="absolute inset-0" />
      <div className="map-ambient-field" aria-hidden="true" />
      <div className="map-scan-ribbon" aria-hidden="true" />
      <GeoJsonRouteOverlay
        hoveredRouteId={hoveredRouteId}
        onHover={setHoveredRouteId}
        locale={locale}
        onSelect={selectRoute}
        playback={playback}
        restartKey={restartKey}
        routes={overlayRoutes}
        selectedRouteId={selectedRouteId}
        speed={speed}
        visibleTypes={visibleTypes}
        keepAllRoutes={variant === "story"}
        soloRouteId={soloRouteId}
        theme={theme}
        zoomEnabled={variant === "story" || !mapboxgl.accessToken}
      />
      {tour ? (
        <div className="tour-hud" role="status">
          <span className="tour-live">
            <i />
            {c.liveTour}
          </span>
          <strong>{routeName(selected, locale)}</strong>
          <div className="tour-hud-meta">
            <span>
              {networkRoutes.findIndex((route) => route.id === selected.id) + 1} / {networkRoutes.length}
            </span>
            <em>
              {selectedPercent}% {c.complete}
            </em>
            <b>{formatForecast(selected.forecast, locale)}</b>
          </div>
          <div className="tour-hud-bar">
            <span style={{ width: `${((networkRoutes.findIndex((route) => route.id === selected.id) + 1) / networkRoutes.length) * 100}%` }} />
          </div>
        </div>
      ) : null}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            theme === "light"
              ? "radial-gradient(circle at 45% 35%, rgba(154,107,31,0.1), transparent 32%), linear-gradient(180deg, rgba(255,255,255,0.04), rgba(225,233,245,0.2))"
              : "radial-gradient(circle at 45% 35%, rgba(231,198,136,0.12), transparent 30%), linear-gradient(180deg, rgba(2,4,10,0.04), rgba(2,4,10,0.34))"
        }}
      />
      <div className="pointer-events-none absolute left-1/2 top-4 z-10 hidden -translate-x-1/2 items-center gap-3 rounded-md border border-white/10 bg-obsidian/72 px-4 py-3 text-pearl shadow-panel backdrop-blur-xl lg:flex">
        <Bike className="h-5 w-5 text-palm" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-palm">{c.mapBadgeTitle}</p>
          <p className="text-xs text-white/55">{c.mapBadgeText}</p>
        </div>
      </div>
    </div>
  );

  if (variant === "story") {
    return (
      <div className="story-map-frame">
        {mapStage}
        <div className="story-map-footer">
          <div>
            <p>{statusText[locale][selected.status]}</p>
            <strong>{routeName(selected, locale)}</strong>
          </div>
          <div>
            <span>{selectedPercent}% {c.complete}</span>
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full" style={{ width: `${selectedPercent}%`, background: selected.color }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden border-y border-white/10 bg-obsidian px-4 py-5 md:px-6">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:72px_72px]" />
      <div className="relative z-10 grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)_340px] 2xl:grid-cols-[370px_minmax(0,1fr)_370px]">
        <aside className="floating-panel max-h-[760px] overflow-auto p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">{c.gisControlRoom}</p>
              <h3 className="mt-2 text-2xl font-semibold">{c.networkMap}</h3>
            </div>
            <Layers3 className="h-5 w-5 text-palm" />
          </div>
          <div className="mt-5 flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2">
            <Search className="h-4 w-4 text-white/40" />
            <input className="w-full bg-transparent text-sm outline-none placeholder:text-white/40" value={search} placeholder={c.searchRoutes} onChange={(event) => setSearch(event.target.value)} />
            {search ? <button aria-label="Clear search" onClick={() => setSearch("")}><X className="h-4 w-4 text-white/50" /></button> : null}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className={`map-mode ${mapMode === "streets" ? "is-active" : ""}`} onClick={() => setBaseMap("streets")}>
              <Camera className="h-4 w-4" /> {c.streets}
            </button>
            <button className={`map-mode ${mapMode === "satellite" ? "is-active" : ""}`} onClick={() => setBaseMap("satellite")}>
              <Satellite className="h-4 w-4" /> {c.satellite}
            </button>
          </div>
          <div className="mt-5 space-y-2">
            {(["type-01", "type-02", "type-03", "hsct"] as const).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setSoloRouteId(null);
                  toggleType(type);
                }}
                className={`flex w-full items-center justify-between rounded-md border px-3 py-3 text-left text-sm transition ${
                  visibleTypes.includes(type) ? "border-palm/50 bg-palm/10 text-white" : "border-white/10 bg-white/5 text-white/50"
                }`}
              >
                <span>{routeTypeName[locale][type]}</span>
                <span className="text-xs">{visibleTypes.includes(type) ? c.visible : c.hidden}</span>
              </button>
            ))}
          </div>
          <div className="mt-5 max-h-48 space-y-2 overflow-auto pr-1">
            {filteredRoutes.map((route) => (
              <button
                key={route.id}
                className={`route-search-result ${route.id === selectedRouteId ? "is-active" : ""}`}
                onClick={() => selectRoute(route.id)}
              >
                <span style={{ background: route.color }} />
                {routeLabel(route, locale)}
              </button>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center">
            <MiniStat label={c.visible} value={String(networkRoutes.filter((route) => visibleTypes.includes(route.type)).length)} />
            <MiniStat label={c.tracks} value="7" />
            <MiniStat label={c.source} value="GeoJSON" />
          </div>
          <p className="mt-5 text-sm leading-6 text-white/60">{routeTypeDescription[locale][selected.type]}</p>
        </aside>

        {mapStage}

        <aside className="floating-panel max-h-[760px] overflow-auto p-4 xl:sticky xl:top-24">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">{statusText[locale][selected.status]}</p>
              <h3 className="mt-2 text-2xl font-semibold">{routeName(selected, locale)}</h3>
            </div>
            <button className="icon-button" aria-label={c.fullscreenMap} onClick={() => mapStageRef.current?.requestFullscreen()}>
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-4 text-sm leading-6 text-white/70">{routeDescription(selected, locale)}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {selected.photos.map((photo) => (
              <img className="h-24 w-full rounded-md border border-white/10 object-cover" src={photo} alt="" loading="lazy" key={photo} />
            ))}
          </div>
          <div className="mt-5 rounded-md border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs uppercase tracking-[0.2em] text-white/45">{c.completion}</span>
              <strong className="text-palm">{selectedPercent}%</strong>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full" style={{ width: `${selectedPercent}%`, background: selected.color }} />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Detail label={c.planned} value={`${selected.plannedKm} km`} />
            <Detail label={c.completed} value={`${selected.completedKm} km`} />
            <Detail label={c.forecast} value={formatForecast(selected.forecast, locale)} />
            <Detail label={c.speed} value={selected.designSpeed} />
          </div>
          <div className="mt-4 rounded-md bg-white/5 p-3 text-sm text-white/60">
            <span className="text-white">{c.contractor}:</span> {selected.contractor}
          </div>
          {selected.structures ? (
            <div className="mt-2 rounded-md bg-white/5 p-3 text-sm text-white/60">
              <span className="text-white">{c.structures}:</span> {selected.structures}
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {selected.users.map((user) => (
              <span className="rounded-full border border-palm/25 bg-palm/10 px-2.5 py-1 text-xs text-palm" key={user}>
                {user}
              </span>
            ))}
          </div>
          {hoveredRouteId ? <p className="mt-3 text-xs uppercase tracking-[0.2em] text-dune">{c.hover}: {routeLabel(networkRoutes.find((route) => route.id === hoveredRouteId) ?? selected, locale)}</p> : null}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/50">
              <span>{playback === "playing" ? c.drawingRoute : c.routePaused}</span>
              <span>{speed.toFixed(1)}x</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="icon-button" title={playback === "playing" ? c.pauseRoute : c.playRoute} aria-label={playback === "playing" ? c.pauseRoute : c.playRoute} onClick={() => setPlayback(playback === "playing" ? "paused" : "playing")}>
                {playback === "playing" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button className="icon-button" title={c.restartRoute} aria-label={c.restartRoute} onClick={() => { setPlayback("playing"); setRestartKey((current) => current + 1); }}>
                <RotateCcw className="h-4 w-4" />
              </button>
              <input className="w-full accent-palm" aria-label={c.routeDrawSpeed} title={c.routeDrawSpeed} type="range" min="0.4" max="3" step="0.1" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function GeoJsonRouteOverlay({
  hoveredRouteId,
  locale,
  onHover,
  onSelect,
  playback,
  restartKey,
  routes,
  selectedRouteId,
  soloRouteId,
  speed,
  visibleTypes,
  keepAllRoutes = false,
  theme,
  zoomEnabled = false
}: {
  hoveredRouteId: string | null;
  locale: "en" | "ar";
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  playback: "playing" | "paused";
  restartKey: number;
  routes: Array<{ id: string; type: RouteType; label: string; color: string; coordinates: [number, number][]; path: string }>;
  selectedRouteId: string;
  soloRouteId: string | null;
  speed: number;
  visibleTypes: RouteType[];
  keepAllRoutes?: boolean;
  theme: "dark" | "light";
  zoomEnabled?: boolean;
}) {
  const light = theme === "light";
  const places = mapPlaceNames[locale];
  const svgRef = useRef<SVGSVGElement | null>(null);
  const cameraRef = useRef({ x: 0, y: 0, w: 1000, h: 620 });
  const cameraRafRef = useRef(0);

  // Cinematic camera: tween the SVG viewBox toward the selected route's
  // padded bounding box (clamped so zoom stays modest and labels readable).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let target = { x: 0, y: 0, w: 1000, h: 620 };
    const route = zoomEnabled ? routes.find((item) => item.id === selectedRouteId) : undefined;
    if (route) {
      const points = route.coordinates.map((coordinate) => projectOverlayPoint(coordinate));
      const xs = points.map((point) => point[0]);
      const ys = points.map((point) => point[1]);
      let minX = Math.min(...xs);
      let maxX = Math.max(...xs);
      let minY = Math.min(...ys);
      let maxY = Math.max(...ys);
      const padX = Math.max(110, (maxX - minX) * 0.45);
      const padY = Math.max(110, (maxY - minY) * 0.45);
      minX -= padX;
      maxX += padX;
      minY -= padY;
      maxY += padY;
      let width = maxX - minX;
      let height = maxY - minY;
      // Cap the zoom at ~1.7x so context labels stay legible.
      const MIN_W = 580;
      const MIN_H = 360;
      if (width < MIN_W) {
        minX -= (MIN_W - width) / 2;
        width = MIN_W;
      }
      if (height < MIN_H) {
        minY -= (MIN_H - height) / 2;
        height = MIN_H;
      }
      // preserveAspectRatio="slice" crops whichever axis is proportionally
      // smaller than the stage — pre-expand that axis so the route's endpoints
      // and labels survive the cover-crop.
      const stageAspect = svg.clientHeight > 0 ? svg.clientWidth / svg.clientHeight : 1000 / 620;
      if (width / height < stageAspect) {
        const expanded = height * stageAspect;
        minX -= (expanded - width) / 2;
        width = expanded;
      } else {
        const expanded = width / stageAspect;
        minY -= (expanded - height) / 2;
        height = expanded;
      }
      width = Math.min(width, 1000);
      height = Math.min(height, 620);
      minX = Math.max(0, Math.min(minX, 1000 - width));
      minY = Math.max(0, Math.min(minY, 620 - height));
      target = { x: minX, y: minY, w: width, h: height };
    }

    cancelAnimationFrame(cameraRafRef.current);
    const apply = (view: { x: number; y: number; w: number; h: number }) => {
      cameraRef.current = view;
      svg.setAttribute("viewBox", `${view.x.toFixed(1)} ${view.y.toFixed(1)} ${view.w.toFixed(1)} ${view.h.toFixed(1)}`);
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      apply(target);
      return;
    }
    const from = { ...cameraRef.current };
    const start = performance.now();
    const DURATION = 950;
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / DURATION);
      const eased = ease(progress);
      apply({
        x: from.x + (target.x - from.x) * eased,
        y: from.y + (target.y - from.y) * eased,
        w: from.w + (target.w - from.w) * eased,
        h: from.h + (target.h - from.h) * eased
      });
      if (progress < 1) cameraRafRef.current = requestAnimationFrame(tick);
    };
    cameraRafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(cameraRafRef.current);
  }, [selectedRouteId, routes, zoomEnabled]);
  const mapBase = light
    ? {
        background: "#eef3fb",
        waterStart: "#c8d8ec",
        waterEnd: "#f5f8fc",
        landStart: "#ffffff",
        landEnd: "#e1e9f5",
        island: "#ffffff",
        secondaryIsland: "#e8f0fa",
        mainland: "#dfe8f4",
        grid: "rgba(10,22,38,0.11)",
        road: "rgba(10,22,38,0.18)",
        roadCore: "rgba(10,22,38,0.4)",
        dashed: "rgba(154,107,31,0.45)",
        label: "rgba(10,22,38,0.62)",
        labelStrong: "rgba(10,22,38,0.78)",
        patternOpacity: 0.035
      }
    : {
        background: "#02040a",
        waterStart: "#091b31",
        waterEnd: "#02040a",
        landStart: "#0b1320",
        landEnd: "#070d18",
        island: "#111c2c",
        secondaryIsland: "#0b1320",
        mainland: "#070d18",
        grid: "rgba(255,255,255,0.055)",
        road: "rgba(255,255,255,0.11)",
        roadCore: "rgba(255,255,255,0.3)",
        dashed: "rgba(231,198,136,0.34)",
        label: "rgba(255,255,255,0.46)",
        labelStrong: "rgba(255,255,255,0.62)",
        patternOpacity: 0.055
      };
  return (
    <svg ref={svgRef} className="absolute inset-0 z-[1] h-full w-full" viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid slice" role="img" aria-label="ADCN GeoJSON route overlay">
      <defs>
        <filter id="geojson-route-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="geojson-water" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={mapBase.waterStart} stopOpacity={light ? 0.9 : 0.82} />
          <stop offset="100%" stopColor={mapBase.waterEnd} stopOpacity={light ? 0.75 : 0.36} />
        </linearGradient>
        <linearGradient id="geojson-land" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={mapBase.landStart} />
          <stop offset="100%" stopColor={mapBase.landEnd} />
        </linearGradient>
        <filter id="map-label-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#02040a" floodOpacity="0.85" />
        </filter>
        <pattern id="cycle-lane-mark" width="34" height="34" patternUnits="userSpaceOnUse" patternTransform="rotate(-22)">
          <path d="M8 17 H25 M20 12 L26 17 L20 22" fill="none" stroke="rgba(255,255,255,0.26)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="1000" height="620" fill={mapBase.background} />
      <path d="M0 0 H1000 V382 C902 360 834 308 720 314 C588 321 530 262 402 283 C286 302 174 375 0 346 Z" fill="url(#geojson-water)" opacity="0.9" />
      <path d="M118 358 C208 300 350 300 462 330 C553 354 620 415 742 410 C844 406 918 430 1000 468 L1000 620 L0 620 L0 421 C43 409 83 389 118 358 Z" fill="url(#geojson-land)" opacity="0.98" />
      <path d="M255 286 C315 252 424 254 492 288 C550 317 566 373 504 406 C434 443 318 430 252 389 C190 351 198 319 255 286 Z" fill={mapBase.island} stroke="rgba(93,211,158,0.32)" strokeWidth="2" opacity="0.92" />
      <path d="M574 240 C626 205 720 207 786 244 C835 272 817 322 751 344 C685 366 596 347 559 307 C531 277 539 259 574 240 Z" fill={mapBase.secondaryIsland} stroke="rgba(70,199,212,0.3)" strokeWidth="2" opacity="0.86" />
      <path d="M742 405 C828 372 934 396 1000 432 V620 H616 C650 520 681 431 742 405 Z" fill={mapBase.mainland} opacity="0.92" />
      <path d="M178 360 C272 314 372 326 460 352 C540 376 608 414 704 410 C776 407 840 386 926 410" fill="none" stroke={light ? "rgba(21,50,43,0.34)" : "rgba(255,255,255,0.22)"} strokeDasharray="10 13" strokeWidth="2" />
      <path d="M62 250 C180 220 286 244 378 210 S566 154 700 196 S850 248 958 206" fill="none" stroke={mapBase.road} strokeWidth="13" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <path d="M62 250 C180 220 286 244 378 210 S566 154 700 196 S850 248 958 206" fill="none" stroke={mapBase.roadCore} strokeWidth="1.4" strokeLinecap="round" strokeDasharray="18 16" vectorEffect="non-scaling-stroke" />
      <path d="M94 478 C224 420 334 430 452 466 S702 538 882 472" fill="none" stroke={mapBase.road} strokeWidth="10" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <path d="M146 342 C226 298 320 300 414 326 S572 400 728 382" fill="none" stroke={mapBase.dashed} strokeWidth="2" strokeDasharray="14 16" />
      <path d="M210 516 H932" stroke={mapBase.grid} strokeWidth="1" strokeDasharray="2 10" />
      <path d="M210 112 V572 M388 92 V572 M566 92 V572 M744 92 V572 M922 92 V572" stroke={mapBase.grid} strokeWidth="1" />
      <path d="M36 158 H964 M36 300 H964 M36 442 H964" stroke={mapBase.grid} strokeWidth="1" />
      <circle cx="575" cy="255" r="42" fill="rgba(93,211,158,0.1)" />
      <circle cx="745" cy="310" r="52" fill="rgba(70,199,212,0.08)" />
      <circle cx="360" cy="376" r="58" fill="rgba(216,197,138,0.09)" />
      <rect x="0" y="0" width="1000" height="620" fill="url(#cycle-lane-mark)" opacity={mapBase.patternOpacity} />
      <g className="map-context-labels" filter="url(#map-label-glow)" style={{ ["--map-label-color" as string]: mapBase.label, ["--map-label-strong" as string]: mapBase.labelStrong }}>
        <text x="330" y="436">{places.island}</text>
        <text x="548" y="200">{places.yasSaadiyat}</text>
        <text x="622" y="556">{places.mainland}</text>
        <g transform="translate(575 255)">
          <circle r="5" />
          <text x="12" y="4">{places.yas}</text>
        </g>
        <g transform="translate(706 308)">
          <circle r="5" />
          <text x="12" y="4">{places.saadiyat}</text>
        </g>
        <g transform="translate(390 388)">
          <circle r="5" />
          <text x="12" y="4">{places.corniche}</text>
        </g>
        <g transform="translate(742 478)">
          <circle r="5" />
          <text x="12" y="4">{places.wathba}</text>
        </g>
      </g>
      {routes
        .filter((route) => (soloRouteId ? route.id === soloRouteId : keepAllRoutes || visibleTypes.includes(route.type)))
        .map((route) => {
          const selected = route.id === selectedRouteId;
          const hovered = route.id === hoveredRouteId;
          const filterActive = visibleTypes.length < 4;
          const routeVisible = visibleTypes.includes(route.type);
          const routeOpacity = selected ? 0.98 : hovered ? 0.92 : routeVisible ? 0.78 : filterActive ? 0.18 : 0.58;
          const glowOpacity = selected ? 0.44 : hovered ? 0.34 : routeVisible ? 0.22 : filterActive ? 0.04 : 0.14;
          const [startX, startY] = projectOverlayPoint(route.coordinates[0]);
          const [endX, endY] = projectOverlayPoint(route.coordinates[route.coordinates.length - 1]);
          return (
            <g key={route.id} onClick={() => onSelect(route.id)} onMouseEnter={() => onHover(route.id)} onMouseLeave={() => onHover(null)} className="cursor-pointer">
              <path className="geojson-route-glow" d={route.path} fill="none" stroke={route.color} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={glowOpacity} strokeWidth={selected ? 26 : hovered ? 20 : 14} filter="url(#geojson-route-glow)" vectorEffect="non-scaling-stroke" />
              <path className="geojson-route-line" d={route.path} fill="none" stroke={route.color} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={routeOpacity} strokeWidth={selected ? 8 : hovered ? 6.5 : 4.8} vectorEffect="non-scaling-stroke" />
              <circle cx={startX} cy={startY} r={selected ? 7 : 5} fill={light ? "#eef3fb" : "#02040a"} stroke={route.color} strokeWidth="3" />
              <circle cx={endX} cy={endY} r={selected ? 7 : 5} fill={route.color} stroke="#ffffff" strokeOpacity="0.75" strokeWidth="2" />
              {selected ? <circle className="route-head-pulse" cx={endX} cy={endY} r="10" fill="none" stroke={route.color} strokeWidth="2" /> : null}
              {(selected || hovered) ? (
                <g transform={`translate(${endX + 12} ${endY - 12})`}>
                  <rect width={(routeLabels[locale][route.id] ?? route.label).length * 7.4 + 20} height="28" rx="6" fill="rgba(7,17,15,0.82)" stroke={route.color} strokeOpacity="0.55" />
                  <text x="10" y="18" fill="#ffffff" fontSize="11" fontWeight="700">{routeLabels[locale][route.id] ?? route.label}</text>
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
                  vectorEffect="non-scaling-stroke"
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
