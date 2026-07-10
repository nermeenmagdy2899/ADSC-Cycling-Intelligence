import { Building2, CircleDot, Route as RouteIcon, TriangleRight, Waypoints } from "lucide-react";
import { networkRoutes, programme } from "../data/network";
import { formatForecast, routeLabel } from "../i18n";
import { CountUp } from "./CountUp";

type Locale = "en" | "ar";

/* ── Forecast timeline (Dec 2025 → Apr 2029) ─────────────────────────── */

const MONTHS: Record<string, number> = {
  "Dec 2025": 0,
  "Feb 2026": 2,
  "Apr 2026": 4,
  "Mar 2027": 15,
  "Mar 2028": 27,
  "Apr 2029": 40
};
const SPAN = 40;

export function ForecastTimeline({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const dates = ["Feb 2026", "Apr 2026", "Mar 2027", "Mar 2028", "Apr 2029"];
  const nodes = dates.map((date) => {
    const routes = networkRoutes.filter((route) => route.forecast === date);
    const km = routes.reduce((sum, route) => sum + route.plannedKm, 0);
    return {
      date,
      pos: (MONTHS[date] / SPAN) * 100,
      km,
      labels: routes.map((route) => routeLabel(route, locale)).join(" · "),
      color: routes[0]?.color ?? "#e7c688"
    };
  });

  return (
    <div className="forecast-timeline" aria-label={ar ? "الجدول الزمني للتوقعات" : "Forecast timeline"}>
      <div className="ft-scale">
        <span>{ar ? "اليوم" : "Today"}</span>
        <span>2027</span>
        <span>2029</span>
      </div>
      <div className="ft-track">
        <span className="ft-fill" />
        <span className="ft-start" title={ar ? "اليوم" : "Today"} />
        {nodes.map((node, index) => (
          <div className="ft-node" key={node.date} style={{ left: `${node.pos}%`, ["--d" as string]: `${index * 140}ms`, ["--row" as string]: `${index % 2}` }}>
            <span className="ft-dot" style={{ background: node.color }} />
            <div className="ft-tip">
              <b>{formatForecast(node.date, locale)}</b>
              <span>{node.labels}</span>
              <em>{node.km.toFixed(1)} km</em>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Structures + contractor accountability ──────────────────────────── */

function countStructures() {
  const keys: Record<string, RegExp> = {
    bridges: /(\d+)\s*bridge/gi,
    underpasses: /(\d+)\s*underpass/gi,
    culverts: /(\d+)\s*culvert/gi,
    ramps: /(\d+)\s*(access )?ramp/gi
  };
  const totals: Record<string, number> = { bridges: 0, underpasses: 0, culverts: 0, ramps: 0 };
  networkRoutes.forEach((route) => {
    if (!route.structures) return;
    for (const [key, re] of Object.entries(keys)) {
      let match: RegExpExecArray | null;
      re.lastIndex = 0;
      while ((match = re.exec(route.structures)) !== null) totals[key] += Number(match[1]);
    }
  });
  return totals;
}

export function StructuresContractors({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const s = countStructures();
  const structureItems = [
    { icon: Building2, value: s.bridges, label: ar ? "جسور" : "Bridges" },
    { icon: TriangleRight, value: s.underpasses, label: ar ? "أنفاق سفلية" : "Underpasses" },
    { icon: Waypoints, value: s.culverts, label: ar ? "عبّارات" : "Culverts" },
    { icon: CircleDot, value: s.ramps, label: ar ? "منحدرات وصول" : "Access ramps" }
  ];

  const byContractor = Array.from(
    networkRoutes.reduce((map, route) => {
      const name = route.contractor.split("/")[0].trim();
      const entry = map.get(name) ?? { name, planned: 0, completed: 0, count: 0 };
      entry.planned += route.plannedKm;
      entry.completed += route.completedKm;
      entry.count += 1;
      map.set(name, entry);
      return map;
    }, new Map<string, { name: string; planned: number; completed: number; count: number }>()).values()
  ).sort((a, b) => b.planned - a.planned);

  return (
    <div className="struct-contract">
      <div className="struct-card">
        <p className="eyebrow">{ar ? "الأعمال الإنشائية" : "Structures delivered & planned"}</p>
        <div className="struct-grid">
          {structureItems.map(({ icon: Icon, value, label }) => (
            <div className="struct-item" key={label}>
              <Icon className="h-5 w-5 text-palm" />
              <strong>
                <CountUp value={value} />
              </strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="contract-card">
        <p className="eyebrow">{ar ? "المقاولون" : "Contractor accountability"}</p>
        <div className="contract-list">
          {byContractor.map((entry) => {
            const pct = Math.round((entry.completed / entry.planned) * 100);
            return (
              <div className="contract-row" key={entry.name}>
                <div className="contract-head">
                  <RouteIcon className="h-4 w-4 text-palm" />
                  <strong>{entry.name}</strong>
                  <em>{entry.count} {ar ? "مسار" : entry.count === 1 ? "route" : "routes"}</em>
                </div>
                <div className="contract-bar">
                  <span style={{ width: `${pct}%` }} />
                </div>
                <small>
                  {entry.completed.toFixed(0)} / {entry.planned.toFixed(0)} km · {pct}%
                </small>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Radial budget gauge ─────────────────────────────────────────────── */

export function BudgetGauge({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const pct = Math.round((programme.approvedBudgetBn / programme.neededBudgetBn) * 100);
  return (
    <div className="budget-gauge">
      <div className="budget-dial" style={{ ["--deg" as string]: `${pct * 3.6}deg` }}>
        <div className="budget-dial-inner">
          <b>
            <CountUp value={pct} suffix="%" />
          </b>
          <small>{ar ? "ممولة" : "funded"}</small>
        </div>
      </div>
      <div className="budget-gauge-meta">
        <span>{ar ? "الميزانية المعتمدة مقابل المطلوبة" : "Budget approved vs. needed"}</span>
        <strong>
          <CountUp value={programme.approvedBudgetBn} decimals={1} prefix={ar ? "" : "AED "} suffix={ar ? " مليار" : "B"} />
          {" / "}
          {programme.neededBudgetBn}
          {ar ? " مليار" : "B"}
        </strong>
        <p>
          {ar
            ? `فجوة ${100 - pct}% تفصل بين اليوم والشبكة الكاملة مع الوجهة الرياضية المميزة.`
            : `A ${100 - pct}% gap stands between today and the full network with a signature sports destination.`}
        </p>
      </div>
    </div>
  );
}
