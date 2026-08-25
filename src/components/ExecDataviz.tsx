import { Building2, CircleDot, Route as RouteIcon, TriangleRight, Waypoints } from "lucide-react";
import { networkRoutes } from "../data/network";
import { formatForecast, routeLabel } from "../i18n";
import { CountUp } from "./CountUp";

type Locale = "en" | "ar";

const monthOffset: Record<string, number> = {
  "Dec 2025": 0,
  "Feb 2026": 2,
  "Apr 2026": 4,
  "Mar 2027": 15,
  "Mar 2028": 27,
  "Apr 2029": 40
};

export function ForecastTimeline({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const nodes = ["Feb 2026", "Apr 2026", "Mar 2027", "Mar 2028", "Apr 2029"].map((date) => {
    const routes = networkRoutes.filter((route) => route.forecast === date);
    return {
      date,
      position: (monthOffset[date] / 40) * 100,
      length: routes.reduce((total, route) => total + route.plannedKm, 0),
      label: routes.map((route) => routeLabel(route, locale)).join(" · "),
      color: routes[0]?.color ?? "#e7c688"
    };
  });
  return (
    <div className="forecast-timeline" aria-label={ar ? "الجدول الزمني للتوقعات" : "Forecast timeline"}>
      <div className="ft-scale"><span>{ar ? "اليوم" : "Today"}</span><span>2027</span><span>2029</span></div>
      <div className="ft-track">
        <span className="ft-fill" /><span className="ft-start" />
        {nodes.map((node, index) => (
          <div className="ft-node" key={node.date} style={{ left: `${node.position}%`, ["--d" as string]: `${index * 120}ms` }}>
            <span className="ft-dot" style={{ background: node.color }} />
            <div className="ft-tip"><b>{formatForecast(node.date, locale)}</b><span>{node.label}</span><em>{node.length.toFixed(1)} km</em></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function structureTotals() {
  const patterns: Record<string, RegExp> = {
    bridges: /(\d+)\s*bridge/gi,
    underpasses: /(\d+)\s*underpass/gi,
    culverts: /(\d+)\s*culvert/gi,
    ramps: /(\d+)\s*(access )?ramp/gi
  };
  const totals = { bridges: 0, underpasses: 0, culverts: 0, ramps: 0 };
  networkRoutes.forEach((route) => {
    const structures = route.structures;
    if (!structures) return;
    Object.entries(patterns).forEach(([key, pattern]) => {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(structures)) !== null) totals[key as keyof typeof totals] += Number(match[1] ?? 0);
    });
  });
  return totals;
}

export function StructuresContractors({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const totals = structureTotals();
  const structures = [
    { icon: Building2, value: totals.bridges, label: ar ? "جسور" : "Bridges" },
    { icon: TriangleRight, value: totals.underpasses, label: ar ? "أنفاق سفلية" : "Underpasses" },
    { icon: Waypoints, value: totals.culverts, label: ar ? "عبّارات" : "Culverts" },
    { icon: CircleDot, value: totals.ramps, label: ar ? "منحدرات وصول" : "Access ramps" }
  ];
  const contractors = Array.from(networkRoutes.reduce((map, route) => {
    const name = route.contractor.split("/")[0].trim();
    const row = map.get(name) ?? { name, planned: 0, completed: 0, count: 0 };
    row.planned += route.plannedKm;
    row.completed += route.completedKm;
    row.count += 1;
    map.set(name, row);
    return map;
  }, new Map<string, { name: string; planned: number; completed: number; count: number }>()).values());

  return (
    <div className="struct-contract">
      <div className="struct-card">
        <p className="eyebrow">{ar ? "الأعمال الإنشائية" : "Structures planned"}</p>
        <div className="struct-grid">
          {structures.map(({ icon: Icon, value, label }) => <div className="struct-item" key={label}><Icon className="h-5 w-5 text-palm" /><strong><CountUp value={value} /></strong><span>{label}</span></div>)}
        </div>
      </div>
      <div className="contract-card">
        <p className="eyebrow">{ar ? "المقاولون" : "Contractor accountability"}</p>
        <div className="contract-list">
          {contractors.map((row) => {
            const completion = Math.round((row.completed / row.planned) * 100);
            return <div className="contract-row" key={row.name}><div className="contract-head"><RouteIcon className="h-4 w-4 text-palm" /><strong>{row.name}</strong><em>{row.count}</em></div><div className="contract-bar"><span style={{ width: `${completion}%` }} /></div><small>{row.completed.toFixed(0)} / {row.planned.toFixed(0)} km · {completion}%</small></div>;
          })}
        </div>
      </div>
    </div>
  );
}
