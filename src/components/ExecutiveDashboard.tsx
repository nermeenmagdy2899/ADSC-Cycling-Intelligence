import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Banknote, BarChart3, CalendarDays, CheckCircle2, CircleDollarSign, Clock3, Layers3, Route, ShieldAlert, Timer, Waypoints } from "lucide-react";
import { DeliveryCurve, LengthChart, ProgressChart } from "./Charts";
import { CountUp } from "./CountUp";
import { milestones, networkRoutes, programme } from "../data/network";
import type { RouteStatus, RouteType } from "../data/network";
import { formatForecast, routeLabel, routeTypeName, statusText } from "../i18n";
import { useNetworkStore } from "../store/useNetworkStore";

type DashboardView = "overview" | "scope" | "progress" | "budget";
type StatusFilter = "all" | RouteStatus;

const routeTypes: RouteType[] = ["type-01", "type-02", "type-03", "hsct"];

const dashboardCopy = {
  en: {
    title: "Executive Programme Dashboard",
    subtitle: "Scope, delivery progress, contractor accountability, forecasts, and funding readiness.",
    overview: "Executive Overview",
    scope: "Scope",
    progress: "Progress",
    budget: "Budget",
    planned: "Planned network",
    completed: "Completed",
    remaining: "Remaining",
    completion: "Portfolio completion",
    attention: "Leadership attention",
    delivery: "Delivery horizon",
    scopeMix: "Network scope by route",
    typeMix: "Route type portfolio",
    contractor: "Contractor",
    packageProgress: "Package progress",
    all: "All packages",
    approved: "Approved budget",
    required: "Required budget",
    gap: "Funding gap",
    funded: "Programme funded",
    hsctDesign: "HSCT design progress",
    budgetNote: "Package-level budget allocation is not included in the source progress deck.",
    source: "December 2025 Progress Status",
    nearComplete: "Track 4 is at 99% completion.",
    decision: "Track 2B and HSCT remain the key approval and funding decisions.",
    selectRoute: "Select route on map"
  },
  ar: {
    title: "\u0644\u0648\u062d\u0629 \u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u062a\u0646\u0641\u064a\u0630\u064a\u0629 \u0644\u0644\u0628\u0631\u0646\u0627\u0645\u062c",
    subtitle: "\u0627\u0644\u0646\u0637\u0627\u0642\u060c \u0648\u0627\u0644\u062a\u0642\u062f\u0645\u060c \u0648\u0645\u0633\u0624\u0648\u0644\u064a\u0629 \u0627\u0644\u0645\u0642\u0627\u0648\u0644\u064a\u0646\u060c \u0648\u0627\u0644\u062a\u0648\u0642\u0639\u0627\u062a\u060c \u0648\u062c\u0627\u0647\u0632\u064a\u0629 \u0627\u0644\u062a\u0645\u0648\u064a\u0644.",
    overview: "\u0627\u0644\u0645\u0644\u062e\u0635 \u0627\u0644\u062a\u0646\u0641\u064a\u0630\u064a",
    scope: "\u0627\u0644\u0646\u0637\u0627\u0642",
    progress: "\u0627\u0644\u062a\u0642\u062f\u0645",
    budget: "\u0627\u0644\u0645\u064a\u0632\u0627\u0646\u064a\u0629",
    planned: "\u0627\u0644\u0634\u0628\u0643\u0629 \u0627\u0644\u0645\u062e\u0637\u0637\u0629",
    completed: "\u0627\u0644\u0645\u0646\u062c\u0632",
    remaining: "\u0627\u0644\u0645\u062a\u0628\u0642\u064a",
    completion: "\u0625\u0646\u062c\u0627\u0632 \u0627\u0644\u0645\u062d\u0641\u0638\u0629",
    attention: "\u0627\u0647\u062a\u0645\u0627\u0645 \u0627\u0644\u0642\u064a\u0627\u062f\u0629",
    delivery: "\u0623\u0641\u0642 \u0627\u0644\u062a\u0633\u0644\u064a\u0645",
    scopeMix: "\u0646\u0637\u0627\u0642 \u0627\u0644\u0634\u0628\u0643\u0629 \u062d\u0633\u0628 \u0627\u0644\u0645\u0633\u0627\u0631",
    typeMix: "\u0645\u062d\u0641\u0638\u0629 \u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062a",
    contractor: "\u0627\u0644\u0645\u0642\u0627\u0648\u0644",
    packageProgress: "\u062a\u0642\u062f\u0645 \u0627\u0644\u062d\u0632\u0645",
    all: "\u062c\u0645\u064a\u0639 \u0627\u0644\u062d\u0632\u0645",
    approved: "\u0627\u0644\u0645\u064a\u0632\u0627\u0646\u064a\u0629 \u0627\u0644\u0645\u0639\u062a\u0645\u062f\u0629",
    required: "\u0627\u0644\u0645\u064a\u0632\u0627\u0646\u064a\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629",
    gap: "\u0641\u062c\u0648\u0629 \u0627\u0644\u062a\u0645\u0648\u064a\u0644",
    funded: "\u0646\u0633\u0628\u0629 \u0627\u0644\u062a\u0645\u0648\u064a\u0644",
    hsctDesign: "\u062a\u0642\u062f\u0645 \u062a\u0635\u0645\u064a\u0645 HSCT",
    budgetNote: "\u0644\u0627 \u064a\u062a\u0636\u0645\u0646 \u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u062a\u0642\u062f\u0645 \u062a\u0648\u0632\u064a\u0639\u0627\u064b \u0644\u0644\u0645\u064a\u0632\u0627\u0646\u064a\u0629 \u0639\u0644\u0649 \u0645\u0633\u062a\u0648\u0649 \u0627\u0644\u062d\u0632\u0645.",
    source: "\u062d\u0627\u0644\u0629 \u0627\u0644\u062a\u0642\u062f\u0645 - \u062f\u064a\u0633\u0645\u0628\u0631 2025",
    nearComplete: "\u0628\u0644\u063a \u0625\u0646\u062c\u0627\u0632 \u0627\u0644\u0645\u0633\u0627\u0631 4 \u0646\u0633\u0628\u0629 99%.",
    decision: "\u064a\u0638\u0644 \u0627\u0644\u0645\u0633\u0627\u0631 2B \u0648HSCT \u0623\u0628\u0631\u0632 \u0642\u0631\u0627\u0631\u0627\u062a \u0627\u0644\u0627\u0639\u062a\u0645\u0627\u062f \u0648\u0627\u0644\u062a\u0645\u0648\u064a\u0644.",
    selectRoute: "\u0627\u062e\u062a\u0631 \u0627\u0644\u0645\u0633\u0627\u0631 \u0639\u0644\u0649 \u0627\u0644\u062e\u0631\u064a\u0637\u0629"
  }
} as const;

export function ExecutiveDashboard({ locale }: { locale: "en" | "ar" }) {
  const [view, setView] = useState<DashboardView>("overview");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const reduceMotion = useReducedMotion();
  const { setSelectedRouteId, setSoloRouteId, setPlayback } = useNetworkStore();
  const t = dashboardCopy[locale];

  const totals = useMemo(() => {
    const planned = networkRoutes.reduce((sum, route) => sum + route.plannedKm, 0);
    const completed = networkRoutes.reduce((sum, route) => sum + route.completedKm, 0);
    return { planned, completed, remaining: planned - completed, percent: Math.round((completed / planned) * 100) };
  }, []);

  const filteredRoutes = statusFilter === "all" ? networkRoutes : networkRoutes.filter((route) => route.status === statusFilter);
  const fundedPct = (programme.approvedBudgetBn / programme.neededBudgetBn) * 100;
  const fundingGap = programme.neededBudgetBn - programme.approvedBudgetBn;

  const selectRoute = (routeId: string) => {
    setSelectedRouteId(routeId);
    setSoloRouteId(routeId);
    setPlayback("playing");
  };

  const tabs: Array<{ id: DashboardView; label: string; icon: typeof BarChart3 }> = [
    { id: "overview", label: t.overview, icon: BarChart3 },
    { id: "scope", label: t.scope, icon: Layers3 },
    { id: "progress", label: t.progress, icon: CheckCircle2 },
    { id: "budget", label: t.budget, icon: Banknote }
  ];

  return (
    <div className="executive-dashboard-shell">
      <header className="executive-dashboard-heading">
        <div>
          <p>{t.source}</p>
          <h3>{t.title}</h3>
          <span>{t.subtitle}</span>
        </div>
        <div className="executive-dashboard-pulse" aria-label={`${totals.percent}% ${t.completion}`}>
          <strong>{totals.percent}%</strong>
          <span>{t.completion}</span>
        </div>
      </header>

      <div className="executive-dashboard-tabs" role="tablist" aria-label={t.title}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} role="tab" aria-label={label} aria-selected={view === id} className={view === id ? "is-active" : ""} onClick={() => setView(id)}>
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          className="executive-dashboard-view"
          data-dashboard-view={view}
          key={view}
          role="tabpanel"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(4px)" }}
          transition={{ duration: reduceMotion ? 0.1 : 0.42, ease: [0.16, 1, 0.3, 1] }}
        >
          {view === "overview" ? (
            <>
              <div className="dashboard-kpi-grid">
                <DashboardKpi index={0} icon={Waypoints} label={t.planned} value={totals.planned} suffix=" km" decimals={1} />
                <DashboardKpi index={1} icon={CheckCircle2} label={t.completed} value={totals.completed} suffix=" km" decimals={1} />
                <DashboardKpi index={2} icon={Timer} label={t.remaining} value={totals.remaining} suffix=" km" decimals={1} />
                <DashboardKpi index={3} icon={BarChart3} label={t.completion} value={totals.percent} suffix="%" />
              </div>
              <div className="dashboard-overview-grid">
                <section className="dashboard-insight-card">
                  <p>{t.attention}</p>
                  <div><CheckCircle2 className="h-4 w-4" /><span>{t.nearComplete}</span></div>
                  <div><ShieldAlert className="h-4 w-4" /><span>{t.decision}</span></div>
                </section>
                <section className="dashboard-milestone-card">
                  <p>{t.delivery}</p>
                  {milestones.slice(-4).map((item) => (
                    <div key={item.date}><CalendarDays className="h-4 w-4" /><strong>{formatForecast(item.date, locale)}</strong><span>{item.title.replace(" Forecast", "")}</span></div>
                  ))}
                </section>
              </div>
            </>
          ) : null}

          {view === "scope" ? (
            <div className="dashboard-scope-layout">
              <div className="dashboard-type-grid">
                {routeTypes.map((type) => {
                  const routes = networkRoutes.filter((route) => route.type === type);
                  const planned = routes.reduce((sum, route) => sum + route.plannedKm, 0);
                  const completed = routes.reduce((sum, route) => sum + route.completedKm, 0);
                  return <div key={type}><Route className="h-4 w-4" /><span>{routeTypeName[locale][type]}</span><strong>{planned.toFixed(1)} km</strong><small>{Math.round((completed / planned) * 100)}% {t.completed}</small></div>;
                })}
              </div>
              <section className="dashboard-chart-card"><p>{t.scopeMix}</p><LengthChart height={225} /></section>
            </div>
          ) : null}

          {view === "progress" ? (
            <div className="dashboard-progress-layout">
              <div className="dashboard-status-filter" aria-label={t.packageProgress}>
                {(["all", "construction", "design-build", "design", "not-started"] as StatusFilter[]).map((status) => (
                  <button className={statusFilter === status ? "is-active" : ""} key={status} onClick={() => setStatusFilter(status)}>
                    {status === "all" ? t.all : statusText[locale][status]}
                  </button>
                ))}
              </div>
              <div className="dashboard-progress-grid">
                <section className="dashboard-chart-card"><p>{t.packageProgress}</p><ProgressChart height={230} /></section>
                <div className="dashboard-package-list">
                  {filteredRoutes.map((route) => {
                    const pct = Math.round((route.completedKm / route.plannedKm) * 100);
                    return (
                      <button key={route.id} onClick={() => selectRoute(route.id)} title={t.selectRoute}>
                        <i style={{ background: route.color }} />
                        <span><strong>{routeLabel(route, locale)}</strong><small>{route.contractor}</small></span>
                        <em>{pct}%</em>
                        <b><span style={{ width: `${pct}%`, background: route.color }} /></b>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {view === "budget" ? (
            <div className="dashboard-budget-layout">
              <section className="dashboard-funding-card">
                <div className="dashboard-funding-ring" style={{ ["--funded" as string]: `${fundedPct * 3.6}deg` }}><strong>{fundedPct.toFixed(1)}%</strong><span>{t.funded}</span></div>
                <div className="dashboard-budget-bars">
                  <BudgetRow label={t.approved} value={programme.approvedBudgetBn} max={programme.neededBudgetBn} />
                  <BudgetRow label={t.required} value={programme.neededBudgetBn} max={programme.neededBudgetBn} />
                  <BudgetRow label={t.gap} value={fundingGap} max={programme.neededBudgetBn} tone="risk" />
                </div>
              </section>
              <section className="dashboard-readiness-card">
                <CircleDollarSign className="h-5 w-5" />
                <p>{t.hsctDesign}</p>
                <strong>{programme.hsctDesignPct}%</strong>
                <div><span style={{ width: `${programme.hsctDesignPct}%` }} /></div>
                <small><Clock3 className="h-4 w-4" />{t.budgetNote}</small>
              </section>
              <section className="dashboard-chart-card dashboard-delivery-curve"><p>{t.delivery}</p><DeliveryCurve height={210} /></section>
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function DashboardKpi({ icon: Icon, label, value, suffix, decimals = 0, index }: { icon: typeof Waypoints; label: string; value: number; suffix: string; decimals?: number; index: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className="dashboard-kpi"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: reduceMotion ? 0.1 : 0.48, delay: reduceMotion ? 0 : 0.08 + index * 0.08, ease: [0.16, 1, 0.3, 1] }}
    >
      <Icon className="h-6 w-6" />
      <span>{label}</span>
      <strong><CountUp value={value} decimals={decimals} suffix={suffix} /></strong>
    </motion.div>
  );
}

function BudgetRow({ label, value, max, tone = "default" }: { label: string; value: number; max: number; tone?: "default" | "risk" }) {
  return <div className={`dashboard-budget-row ${tone === "risk" ? "is-risk" : ""}`}><span>{label}</span><strong>AED {value.toFixed(1)}B</strong><div><i style={{ width: `${(value / max) * 100}%` }} /></div></div>;
}
