import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BarChart3, Bike, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Compass, FileText, Flag, Gauge, Heart, Landmark, Route, Sparkles, Timer, Trophy, Users, Waypoints } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DeliveryCurve, LengthChart, ProgressChart } from "./Charts";
import { CountUp } from "./CountUp";
import { BudgetGauge, ForecastTimeline, StructuresContractors } from "./ExecDataviz";
import { NetworkMap } from "./NetworkMap";
import { ExecutiveDashboard } from "./ExecutiveDashboard";
import { designPrinciples, milestones, networkRoutes, personas, programme, strategyPrinciples } from "../data/network";
import type { RouteType } from "../data/network";
import { formatForecast, personaAr, routeLabel, routeName, routeTypeDescription, routeTypeName, statusText, storyText, strategyPrincipleAr, uiCopy } from "../i18n";
import { useNetworkStore } from "../store/useNetworkStore";

type StoryStep = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  routeId: string;
  visibleTypes: RouteType[];
  metric: string;
  metricLabel: string;
  source: string;
  camera: string;
};

const allTypes: RouteType[] = ["type-01", "type-02", "type-03", "hsct"];

const storySteps: StoryStep[] = [
  {
    id: "vision",
    eyebrow: "Project Vision",
    title: "Abu Dhabi Cycling Network Vision",
    body: "The project turns Abu Dhabi's active mobility ambition into a legible network of island streets, strategic connectors, mainland corridors, and a signature high-speed cycling loop.",
    routeId: "track-1-p12",
    visibleTypes: allTypes,
    metric: "UCI",
    metricLabel: "Bike City context",
    source: "Active Recreation and Cycling Strategy / Basis of Design",
    camera: "Portfolio overview"
  },
  {
    id: "value",
    eyebrow: "Why It Matters",
    title: "A city that moves — health, tourism, and sport",
    body: "Beyond kilometres of asphalt, the network is an investment in Abu Dhabi's active life: the first UCI Bike City in Asia, a destination for sports tourism, and everyday safe mobility.",
    routeId: "hsct",
    visibleTypes: allTypes,
    metric: "1st",
    metricLabel: "UCI Bike City in Asia",
    source: "Active Recreation & Cycling Strategy",
    camera: "The value case"
  },
  {
    id: "principles",
    eyebrow: "Planning Principles",
    title: "Planning Principles",
    body: "Impact, creativity, accessibility, inclusion, benefit, achievability, and demographic fit become the operating language for the network.",
    routeId: "track-1-p12",
    visibleTypes: ["type-01"],
    metric: "7",
    metricLabel: "Planning principles",
    source: "2022 Basis of Design",
    camera: "Planning framework"
  },
  {
    id: "users",
    eyebrow: "User Groups",
    title: "Cycling User Groups",
    body: "Recreational riders, explorers, utility cyclists, and sports cyclists each create different requirements for speed, directness, comfort, rest, access, and safety.",
    routeId: "track-1-p34",
    visibleTypes: ["type-01"],
    metric: "4",
    metricLabel: "User groups",
    source: "Basis of Design user group framework",
    camera: "Island coverage"
  },
  {
    id: "strategy",
    eyebrow: "Network Strategy",
    title: "Route Alignments within the Abu Dhabi Cycling Network",
    body: "The map moves from urban at-grade streets to inter-island connectors, long-distance mainland routes, and the high-speed cycle track.",
    routeId: "track-2-b",
    visibleTypes: allTypes,
    metric: "7",
    metricLabel: "Tracked alignments",
    source: "Route Alignment figure and progress deck",
    camera: "Network families"
  },
  {
    id: "route-types",
    eyebrow: "Route Types",
    title: "Cycling Route Types",
    body: "Route types become live map filters: select a family to isolate its geography, status, and role in the wider mobility vision.",
    routeId: "track-2-a",
    visibleTypes: ["type-02"],
    metric: "62 km",
    metricLabel: "Strategic connectors",
    source: "Track 2 package status",
    camera: "Yas / Saadiyat connectors"
  },
  {
    id: "network",
    eyebrow: "Network Map",
    title: "Network Alignment Plan",
    body: "Routes, package status, contractors, forecasts, and design intent are synchronized so leadership can explore the programme spatially.",
    routeId: "track-3",
    visibleTypes: allTypes,
    metric: "280+ km",
    metricLabel: "Portfolio scope",
    source: "PDF route maps and digitized GeoJSON",
    camera: "Network command view"
  },
  {
    id: "progress",
    eyebrow: "Construction Progress",
    title: "Construction Progress Status",
    body: "Completed asphalt, package progress, contractor accountability, structure status, and forecast milestones are connected directly to the selected routes.",
    routeId: "track-3",
    visibleTypes: ["type-03"],
    metric: "70.26 km",
    metricLabel: "Track 3 complete",
    source: "December 2025 Progress Status",
    camera: "Mainland delivery"
  },
  {
    id: "future",
    eyebrow: "Future Milestones",
    title: "Forecast Completion Milestones",
    body: "Forecast milestones move from island packages and mainland delivery toward Track 2B and the High-Speed Cycle Track, giving leadership a clear view of what happens next.",
    routeId: "hsct",
    visibleTypes: ["hsct"],
    metric: "2029",
    metricLabel: "HSCT forecast",
    source: "HSCT design and budget horizon",
    camera: "Signature sports loop"
  },
  {
    id: "ask",
    eyebrow: "The Road Ahead",
    title: "The decision in front of leadership",
    body: "Two signature moves remain: complete the island-to-island connection (Track 2B) and deliver the High-Speed Cycle Track. Both are designed and ready — they await approval and budget to move into construction.",
    routeId: "hsct",
    visibleTypes: ["type-02", "hsct"],
    metric: "1.7B → 4B",
    metricLabel: "AED approved vs. needed",
    source: "December 2025 budget highlight",
    camera: "The ask"
  }
];

export function StoryExperience() {
  const navRef = useRef<HTMLDivElement | null>(null);
  const mapColumnRef = useRef<HTMLDivElement | null>(null);
  const [activeStepId, setActiveStepId] = useState(storySteps[0].id);
  const [deckDirection, setDeckDirection] = useState(1);
  const reduceMotion = useReducedMotion();
  const { selectedRouteId, setSelectedRouteId, setSoloRouteId, setVisibleTypes, setPlayback, locale, tour, setTour, presenter, setPresenter } = useNetworkStore();
  const c = uiCopy[locale];
  const localizedSteps = useMemo(
    () =>
      storySteps.map((step) => ({
        ...step,
        ...(storyText[locale].find((item) => item.id === step.id) ?? {})
      })),
    [locale]
  );

  const totals = useMemo(() => {
    const planned = networkRoutes.reduce((sum, route) => sum + route.plannedKm, 0);
    const completed = networkRoutes.reduce((sum, route) => sum + route.completedKm, 0);
    return {
      planned,
      completed,
      remaining: planned - completed,
      percent: Math.round((completed / planned) * 100)
    };
  }, []);

  const activeStep = localizedSteps.find((step) => step.id === activeStepId) ?? localizedSteps[0];
  const activeIndex = localizedSteps.findIndex((step) => step.id === activeStepId);
  const progress = ((activeIndex + 1) / localizedSteps.length) * 100;

  const activePackages = networkRoutes.filter((route) => route.status === "construction" || route.status === "design-build").length;
  const closestRoute = [...networkRoutes].sort((a, b) => b.completedKm / b.plannedKm - a.completedKm / a.plannedKm)[0];
  const closestPct = Math.round((closestRoute.completedKm / closestRoute.plannedKm) * 100);
  const kpiNotes =
    locale === "ar"
      ? {
          planned: `${networkRoutes.length} مسارات`,
          completed: `${totals.percent}% من الشبكة`,
          remaining: `${activePackages} حزم قيد التنفيذ`,
          completion: `${routeLabel(closestRoute, locale)} عند ${closestPct}%`
        }
      : {
          planned: `${networkRoutes.length} tracks`,
          completed: `${totals.percent}% of network`,
          remaining: `${activePackages} packages active`,
          completion: `${routeLabel(closestRoute, locale)} at ${closestPct}%`
        };

  const activateStep = (step: StoryStep) => {
    setActiveStepId(step.id);
    // Each chapter drives the map: fly to its route and spotlight its route families.
    setSelectedRouteId(step.routeId);
    setVisibleTypes(step.visibleTypes);
    setSoloRouteId(null);
    setPlayback("playing");
  };

  const goToStep = (step: StoryStep) => {
    setTour(false);
    const nextIndex = localizedSteps.findIndex((item) => item.id === step.id);
    setDeckDirection(nextIndex >= activeIndex ? 1 : -1);
    activateStep(step);
  };

  useEffect(() => {
    const onOpenStep = (event: Event) => {
      const requestedId = (event as CustomEvent<string>).detail;
      const requestedStep = localizedSteps.find((step) => step.id === requestedId);
      if (requestedStep) goToStep(requestedStep);
    };
    window.addEventListener("adcn:open-step", onOpenStep);
    return () => window.removeEventListener("adcn:open-step", onOpenStep);
    // localizedSteps changes only when the locale changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, activeIndex]);

  // Keep the active chapter chip in view inside the horizontal chapter nav.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const chip = nav.querySelector<HTMLButtonElement>("button.is-active");
    if (!chip) return;
    nav.scrollTo({ left: chip.offsetLeft - nav.clientWidth / 2 + chip.clientWidth / 2, behavior: "smooth" });
  }, [activeStepId]);

  // "Fly the network" — cinematic auto-tour: bring the map into view, then ride
  // through every route immediately, spotlighting one family at a time.
  useEffect(() => {
    if (!tour) return;
    mapColumnRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    let index = networkRoutes.findIndex((route) => route.id === selectedRouteId);
    const advance = () => {
      index = (index + 1) % networkRoutes.length;
      const route = networkRoutes[index];
      setSoloRouteId(null);
      setVisibleTypes([route.type]);
      setSelectedRouteId(route.id);
      setPlayback("playing");
    };
    advance(); // first hop happens immediately, not 5s later
    const id = window.setInterval(advance, 5200);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour]);

  // Keyboard navigation for live presentation.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        const dir = event.key === "ArrowRight" ? 1 : -1;
        const idx = localizedSteps.findIndex((step) => step.id === activeStepId);
        const next = Math.min(localizedSteps.length - 1, Math.max(0, idx + dir));
        goToStep(localizedSteps[next]);
      } else if (event.key === " " && (presenter || tour)) {
        // Space toggles the tour only in presenter mode (or stops a running tour);
        // otherwise it must keep its native page-scroll behavior.
        event.preventDefault();
        setTour(!tour);
      } else if (event.key.toLowerCase() === "p") {
        setPresenter(!presenter);
      } else if (event.key === "Escape") {
        setTour(false);
        setPresenter(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStepId, localizedSteps, tour, presenter]);

  const renderActivePreview = () => {
    switch (activeStep.id) {
      case "vision":
        return <NetworkGlobe locale={locale} />;
      case "value":
        return <ValueBeat locale={locale} />;
      case "principles":
        return <PrinciplesPreview locale={locale} />;
      case "users":
        return <UserGroupPreview locale={locale} />;
      case "strategy":
        return <NetworkStrategyPreview locale={locale} />;
      case "route-types":
        return (
          <RouteTypePreview
            locale={locale}
            onSelectType={(type) => {
              const firstRoute = networkRoutes.find((route) => route.type === type);
              setSoloRouteId(null);
              setVisibleTypes([type]);
              if (firstRoute) setSelectedRouteId(firstRoute.id);
              setPlayback("playing");
            }}
          />
        );
      case "network":
        return (
          <NetworkFocusPreview
            locale={locale}
            onSelectRoute={(routeId, type) => {
              setSelectedRouteId(routeId);
              setSoloRouteId(routeId);
              setVisibleTypes([type]);
              setPlayback("playing");
            }}
          />
        );
      case "progress":
        return <ExecutiveDashboard locale={locale} />;
      case "future":
        return (
          <>
            <ForecastTimeline key={`timeline-${activeStep.id}`} locale={locale} />
            <MilestonePreview locale={locale} />
            <CompletionInsights locale={locale} />
          </>
        );
      case "ask":
        return <TheAsk locale={locale} />;
      default:
        return null;
    }
  };

  const physicalDirection = deckDirection * (locale === "ar" ? -1 : 1);
  const previousStep = activeIndex > 0 ? localizedSteps[activeIndex - 1] : null;
  const nextStep = activeIndex < localizedSteps.length - 1 ? localizedSteps[activeIndex + 1] : null;

  return (
    <section id="story" className="story-shell">
      <div className="story-top-chrome">
        <div className="story-primary-heading">
          <p className="eyebrow">{c.liveSpatialStory}</p>
          <h1>{storyText[locale].find((step) => step.id === "strategy")?.title}</h1>
          <span className="story-camera-badge">{activeStep.camera}</span>
        </div>
        <div className="story-chapter-nav" aria-label={c.chapterNav} ref={navRef}>
          <div className="story-progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
          {localizedSteps.map((step, index) => (
              <button className={step.id === activeStepId ? "is-active" : ""} key={step.id} onClick={() => goToStep(step)} aria-current={step.id === activeStepId ? "step" : undefined}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {step.eyebrow}
            </button>
          ))}
        </div>
      </div>

      <div className={`story-layout ${activeStep.id === "progress" ? "is-dashboard" : ""}`}>
        <div className="story-map-column" ref={mapColumnRef}>
          <NetworkMap variant="story" />
        </div>

        <div className="story-content-column">
          <div className={`story-deck ${activeStep.id === "progress" ? "is-dashboard" : ""}`}>
            <div className="story-deck-route" aria-hidden="true">
              <span />
              <motion.i
                animate={{ left: `calc(${progress}% - 13px)` }}
                transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 180, damping: 24 }}
              >
                <Bike className="h-4 w-4" />
              </motion.i>
            </div>
            <AnimatePresence initial={false} mode="popLayout" custom={physicalDirection}>
              <motion.article
                className="story-panel is-active"
                data-story-step={activeStep.id}
                id={activeStep.id === "progress" ? "dashboard" : `story-${activeStep.id}`}
                key={activeStep.id}
                custom={physicalDirection}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: physicalDirection * 72, scale: 0.97, filter: "blur(8px)" }}
                animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: physicalDirection * -48, scale: 0.985, filter: "blur(5px)" }}
                transition={reduceMotion ? { duration: 0.12 } : { duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              >
                {activeStep.id === "progress" ? (
                  <ExecutiveDashboard locale={locale} />
                ) : (
                <motion.div
                  className="story-panel-content"
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: reduceMotion ? 0 : 0.045, delayChildren: reduceMotion ? 0 : 0.08 } }
                  }}
                >
                  <motion.div className="flex items-center justify-between gap-4" variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
                    <p className="eyebrow">{activeStep.eyebrow}</p>
                    <span className="story-step-count">{String(activeIndex + 1).padStart(2, "0")}</span>
                  </motion.div>
                  <motion.h3 variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}>{activeStep.title}</motion.h3>
                  <motion.p variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}>{activeStep.body}</motion.p>
                  <motion.div className="story-panel-meta" variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
                    <div className="story-source-note">
                      <FileText className="h-4 w-4 text-palm" />
                      <span>{activeStep.source}</span>
                    </div>
                    <div className="story-panel-metric">
                      <strong>{activeStep.metric}</strong>
                      <span>{activeStep.metricLabel}</span>
                    </div>
                  </motion.div>
                  <motion.div className="story-panel-preview" variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}>
                    {renderActivePreview()}
                  </motion.div>
                </motion.div>
                )}
              </motion.article>
            </AnimatePresence>
            <div className="story-deck-controls" aria-label={c.chapterPosition}>
              <button onClick={() => previousStep && goToStep(previousStep)} disabled={!previousStep} aria-label={c.previousChapter}>
                {locale === "ar" ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                <span>{c.previousChapter}</span>
              </button>
              <strong>{String(activeIndex + 1).padStart(2, "0")} / {String(localizedSteps.length).padStart(2, "0")}</strong>
              <button onClick={() => nextStep && goToStep(nextStep)} disabled={!nextStep} aria-label={c.nextChapter}>
                <span>{c.nextChapter}</span>
                {locale === "ar" ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StoryKpi({
  icon: Icon,
  label,
  value,
  decimals = 0,
  suffix = "",
  note
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  note?: string;
}) {
  return (
    <div className="story-kpi">
      <Icon className="h-5 w-5 text-palm" />
      <div>
        <span>{label}</span>
        <strong>
          <CountUp value={value} decimals={decimals} suffix={suffix} />
        </strong>
        {note ? <em className="story-kpi-note">{note}</em> : null}
      </div>
    </div>
  );
}

function PrinciplesPreview({ locale }: { locale: "en" | "ar" }) {
  const c = uiCopy[locale];
  return (
    <div className="story-mini-grid">
      {strategyPrinciples.map(({ title, icon: Icon }) => (
        <div className="story-mini-card" key={title}>
          <Icon className="h-4 w-4 text-palm" />
          <span>{locale === "ar" ? strategyPrincipleAr[title] : title}</span>
        </div>
      ))}
      <div className="story-mini-card">
        <Sparkles className="h-4 w-4 text-dune" />
        <span>{designPrinciples.length} {c.designPrinciples}</span>
      </div>
    </div>
  );
}

function UserGroupPreview({ locale }: { locale: "en" | "ar" }) {
  return (
    <div className="story-persona-grid">
      {personas.map(({ name, icon: Icon, requirements }) => (
        <div className="story-persona-card" key={name}>
          <Icon className="h-5 w-5 text-palm" />
          <strong>{locale === "ar" ? personaAr[name]?.name : name}</strong>
          <span>{(locale === "ar" ? personaAr[name]?.requirements ?? requirements : requirements).slice(0, 3).join(" / ")}</span>
        </div>
      ))}
    </div>
  );
}

function NetworkStrategyPreview({ locale }: { locale: "en" | "ar" }) {
  const rows = [
    { label: locale === "ar" ? "وصول الجزيرة" : "Island access", value: routeTypeName[locale]["type-01"], icon: Bike },
    { label: locale === "ar" ? "روابط استراتيجية" : "Strategic links", value: routeTypeName[locale]["type-02"], icon: Route },
    { label: locale === "ar" ? "محاور البر الرئيسي" : "Mainland distance", value: routeTypeName[locale]["type-03"], icon: Compass },
    { label: locale === "ar" ? "رياضة مميزة" : "Signature sport", value: routeTypeName[locale].hsct, icon: Gauge }
  ];
  return (
    <div className="story-strategy-diagram">
      {rows.map(({ label, value, icon: Icon }) => (
        <div key={value}>
          <Icon className="h-5 w-5 text-palm" />
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

function NetworkGlobe({ locale }: { locale: "en" | "ar" }) {
  const c = uiCopy[locale];
  return (
    <div className="story-globe-card" aria-hidden="true">
      <div className="story-globe">
        <span />
        <span />
        <span />
      </div>
      <div>
        <strong>{c.fromStrategy}</strong>
        <p>{c.fromStrategyText}</p>
      </div>
    </div>
  );
}

function RouteTypePreview({ locale, onSelectType }: { locale: "en" | "ar"; onSelectType: (type: RouteType) => void }) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="story-route-type-list">
      {allTypes.map((type) => (
        <motion.button key={type} onClick={() => onSelectType(type)} whileHover={reduceMotion ? undefined : { y: -3 }} whileTap={reduceMotion ? undefined : { scale: 0.985 }}>
          <Route className="h-4 w-4" />
          <span>{routeTypeName[locale][type]}</span>
          <small>{routeTypeDescription[locale][type]}</small>
        </motion.button>
      ))}
    </div>
  );
}

function NetworkFocusPreview({ locale, onSelectRoute }: { locale: "en" | "ar"; onSelectRoute: (routeId: string, type: RouteType) => void }) {
  const c = uiCopy[locale];
  const reduceMotion = useReducedMotion();
  return (
    <div className="story-network-focus">
      {networkRoutes.map((route) => {
        const pct = Math.round((route.completedKm / route.plannedKm) * 100);
        return (
          <motion.button key={route.id} onClick={() => onSelectRoute(route.id, route.type)} whileHover={reduceMotion ? undefined : { y: -3 }} whileTap={reduceMotion ? undefined : { scale: 0.985 }}>
            <span style={{ background: route.color }} />
            <strong>{routeLabel(route, locale)}</strong>
            <small>{pct}% {c.complete}</small>
          </motion.button>
        );
      })}
    </div>
  );
}

function ExecutiveProgressDashboard({ locale }: { locale: "en" | "ar" }) {
  const c = uiCopy[locale];
  const completed = networkRoutes.reduce((sum, route) => sum + route.completedKm, 0);
  const planned = networkRoutes.reduce((sum, route) => sum + route.plannedKm, 0);
  const remaining = planned - completed;
  const percent = Math.round((completed / planned) * 100);
  const activePackages = networkRoutes.filter((route) => route.status === "construction" || route.status === "design-build").length;
  const completedPackages = networkRoutes.filter((route) => route.completedKm >= route.plannedKm * 0.995).length;
  const designPackages = networkRoutes.filter((route) => route.status === "design-build").length;
  const notStartedPackages = networkRoutes.filter((route) => route.status === "not-started").length;
  const contractors = Array.from(new Set(networkRoutes.map((route) => route.contractor.split("/")[0].trim())));
  const nextForecast = milestones.find((item) => item.date.includes("Feb 2026")) ?? milestones[0];
  const kpis = [
    { label: c.totalPlanned, value: planned, decimals: 1, suffix: " km", icon: Waypoints },
    { label: c.completedAsphalt, value: completed, decimals: 1, suffix: " km", icon: CheckCircle2 },
    { label: c.remainingScope, value: remaining, decimals: 1, suffix: " km", icon: Timer },
    { label: c.portfolioCompletion, value: percent, decimals: 0, suffix: "%", icon: BarChart3 },
    { label: c.activePackages, value: activePackages, decimals: 0, suffix: "", icon: Flag },
    { label: c.completedPackages, value: completedPackages, decimals: 0, suffix: "", icon: CheckCircle2 },
    { label: c.designBuild, value: designPackages, decimals: 0, suffix: "", icon: FileText },
    { label: c.notStarted, value: notStartedPackages, decimals: 0, suffix: "", icon: CalendarDays },
    { label: c.nextForecast, value: formatForecast(nextForecast.date, locale), decimals: 0, suffix: "", icon: CalendarDays }
  ];

  return (
    <div className="exec-dashboard">
      <div className="exec-dashboard-header">
        <div>
          <p className="eyebrow">{c.progressStatus}</p>
          <strong>{c.execDashboard}</strong>
          <span>{c.execDashboardText}</span>
        </div>
        <div className="exec-gauge" style={{ ["--value" as string]: `${percent * 3.6}deg` }}>
          <b>{percent}%</b>
          <small>{c.complete}</small>
        </div>
      </div>
      <div className="exec-kpi-grid">
        {kpis.map(({ label, value, decimals, suffix, icon: Icon }) => (
          <div className="exec-kpi" key={label}>
            <Icon className="h-4 w-4 text-palm" />
            <span>{label}</span>
            <strong>{typeof value === "number" ? <CountUp value={value} decimals={decimals} suffix={suffix} /> : value}</strong>
          </div>
        ))}
      </div>
      <div className="exec-summary-strip">
        <div>
          <span>{c.contractors}</span>
          <strong>{contractors.length}</strong>
          <small>{contractors.join(" / ")}</small>
        </div>
        <div>
          <span>{c.forecastWindow}</span>
          <strong>2026-2029</strong>
          <small>{locale === "ar" ? "حزم الجزيرة، محاور البر الرئيسي، المسار 2B، وHSCT." : "Island packages, mainland corridors, Track 2B, and HSCT."}</small>
        </div>
        <div>
          <span>{c.leadershipFocus}</span>
          <strong>Track 2B + HSCT</strong>
          <small>{locale === "ar" ? "الاعتمادات المستقبلية، أفق الميزانية، والوجهة الرياضية الاستراتيجية." : "Future approvals, budget horizon, and strategic sports destination."}</small>
        </div>
      </div>
      <div className="exec-curve-card">
        <p className="eyebrow">{locale === "ar" ? "منحنى التسليم التراكمي" : "Cumulative delivery — network km over time"}</p>
        <DeliveryCurve />
      </div>
      <div className="exec-chart-grid">
        <div>
          <p className="eyebrow">{c.progressByRoute}</p>
          <ProgressChart />
        </div>
        <div>
          <p className="eyebrow">{c.plannedScopeMix}</p>
          <LengthChart />
        </div>
      </div>
      <StructuresContractors locale={locale} />
      <div className="exec-status-grid">
        {(["construction", "design-build", "design", "not-started"] as const).map((status) => {
          const routes = networkRoutes.filter((route) => route.status === status);
          const km = routes.reduce((sum, route) => sum + route.plannedKm, 0);
          return (
            <div key={status}>
              <span>{statusText[locale][status]}</span>
              <strong>{routes.length}</strong>
              <small>{km.toFixed(1)} {c.plannedKm}</small>
            </div>
          );
        })}
      </div>
      <div className="exec-package-list">
        {networkRoutes.map((route) => {
          const pct = Math.round((route.completedKm / route.plannedKm) * 100);
          return (
            <div className="exec-package-row" key={route.id}>
              <div>
                <strong>{routeLabel(route, locale)}</strong>
                <span>{route.contractor}</span>
              </div>
              <div className="exec-package-progress">
                <small>{statusText[locale][route.status]} / {formatForecast(route.forecast, locale)}</small>
                <div><span style={{ width: `${pct}%`, background: route.color }} /></div>
              </div>
              <b>{pct}%</b>
            </div>
          );
        })}
      </div>
      <div className="exec-milestone-grid">
        {milestones.slice(-4).map((item) => (
          <div key={item.title}>
            <CalendarDays className="h-4 w-4 text-palm" />
            <span>{formatForecast(item.date, locale)}</span>
            <strong>{locale === "ar" ? arabicMilestoneTitle(item.title) : item.title}</strong>
            <small>{locale === "ar" ? arabicMilestoneCopy(item.copy) : item.copy}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExecutiveInsights({ locale }: { locale: "en" | "ar" }) {
  const insights = locale === "ar"
    ? [
        "المسار 4 شبه مكتمل ويمكن عرضه كنجاح قريب المدى.",
        "المسار 1 حزم 1-2 هو أقوى مؤشر إنجاز داخل الجزيرة للجمهور.",
        "المسار 2B وHSCT قرارات قيادية مستقبلية مرتبطة بالاعتمادات والميزانية."
      ]
    : [
        "Track 4 is effectively complete and ready to be framed as near-term success.",
        "Track 1 P1-2 is the strongest island delivery signal for public-facing progress.",
        "Track 2B and HSCT are future-facing leadership decisions tied to approvals and budget."
      ];
  return (
    <div className="exec-insight-list">
      {insights.map((insight, index) => (
        <div key={insight}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <p>{insight}</p>
        </div>
      ))}
    </div>
  );
}

function MilestonePreview({ locale }: { locale: "en" | "ar" }) {
  return (
    <div className="space-y-3">
      {milestones.slice(-4).map((item) => (
        <div className="story-milestone" key={item.title}>
          <CalendarDays className="h-4 w-4 text-palm" />
          <div>
            <strong>{formatForecast(item.date, locale)}</strong>
            <span>{locale === "ar" ? arabicMilestoneTitle(item.title) : item.title}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function CompletionInsights({ locale }: { locale: "en" | "ar" }) {
  const c = uiCopy[locale];
  const ordered = [...networkRoutes].sort((a, b) => b.completedKm / b.plannedKm - a.completedKm / a.plannedKm);
  const next = networkRoutes.filter((route) => route.forecast.includes("2026"));
  const later = networkRoutes.filter((route) => route.forecast.includes("2028") || route.forecast.includes("2029"));
  const insights =
    locale === "ar"
      ? [
          `${routeName(ordered[0], locale)} هو الأقرب للاكتمال بنسبة ${Math.round((ordered[0].completedKm / ordered[0].plannedKm) * 100)}%.`,
          `نافذة 2026 تشمل ${next.map((route) => routeLabel(route, locale)).join("، ")} وهي قصة الإنجاز الأقرب.`,
          `القرارات الأطول مدى تتركز في ${later.map((route) => routeLabel(route, locale)).join(" و ")} حتى ${formatForecast("Apr 2029", locale)}.`
        ]
      : [
          `${routeName(ordered[0], locale)} is closest to completion at ${Math.round((ordered[0].completedKm / ordered[0].plannedKm) * 100)}%.`,
          `The 2026 window includes ${next.map((route) => routeLabel(route, locale)).join(", ")} and forms the nearest delivery story.`,
          `Longer-horizon leadership decisions concentrate in ${later.map((route) => routeLabel(route, locale)).join(" and ")} through ${formatForecast("Apr 2029", locale)}.`
        ];

  return (
    <div className="exec-insight-list">
      <div>
        <span><Sparkles className="h-5 w-5" /></span>
        <p><strong>{c.aiInsights}</strong><br />{c.aiInsightsText}</p>
      </div>
      {insights.map((insight, index) => (
        <div key={insight}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <p>{insight}</p>
        </div>
      ))}
    </div>
  );
}

function ValueBeat({ locale }: { locale: "en" | "ar" }) {
  const plannedKm = Math.round(networkRoutes.reduce((sum, route) => sum + route.plannedKm, 0));
  const pillars =
    locale === "ar"
      ? [
          { icon: Trophy, title: "مدينة UCI للدراجات", stat: `الأولى في آسيا · ${programme.uciBikeCityYear}` },
          { icon: Heart, title: "صحة وعافية", stat: `${plannedKm} كم تنقل آمن` },
          { icon: Landmark, title: "سياحة رياضية", stat: "وجهة HSCT المميزة" },
          { icon: Bike, title: "تنقل نشط", stat: "4 فئات مستخدمين" }
        ]
      : [
          { icon: Trophy, title: "UCI Bike City", stat: `First in Asia · ${programme.uciBikeCityYear}` },
          { icon: Heart, title: "Health & wellbeing", stat: `${plannedKm} km of safe travel` },
          { icon: Landmark, title: "Sports tourism", stat: "Signature HSCT destination" },
          { icon: Bike, title: "Active mobility", stat: "4 user groups served" }
        ];
  return (
    <div className="value-beat">
      {pillars.map(({ icon: Icon, title, stat }) => (
        <div className="value-pillar" key={title}>
          <Icon className="h-5 w-5 text-palm" />
          <strong>{title}</strong>
          <span>{stat}</span>
        </div>
      ))}
    </div>
  );
}

function TheAsk({ locale }: { locale: "en" | "ar" }) {
  const ar = locale === "ar";
  const t2b = networkRoutes.find((route) => route.id === "track-2-b") ?? networkRoutes[0];
  const hsct = networkRoutes.find((route) => route.id === "hsct") ?? networkRoutes[0];
  const decisions = [
    { route: t2b, need: ar ? "بانتظار الاعتمادات وقرارات النطاق الاختياري" : "Awaiting approvals & optional-scope decisions" },
    { route: hsct, need: ar ? `التصميم ${programme.hsctDesignPct}% · بانتظار الميزانية` : `Design ${programme.hsctDesignPct}% complete · awaiting budget` }
  ];
  return (
    <div className="ask-beat">
      <div className="ask-decisions">
        {decisions.map(({ route, need }) => (
          <div className="ask-card" key={route.id}>
            <div className="ask-card-head">
              <span className="ask-dot" style={{ background: route.color }} />
              <strong>{routeLabel(route, locale)}</strong>
              <em>{route.plannedKm} km</em>
            </div>
            <p>{need}</p>
            <div className="ask-card-foot">
              <CalendarDays className="h-4 w-4 text-palm" />
              <span>
                {ar ? "التوقع" : "Forecast"}: {formatForecast(route.forecast, locale)}
              </span>
            </div>
          </div>
        ))}
      </div>
      <BudgetGauge locale={locale} />
    </div>
  );
}

function arabicMilestoneTitle(title: string) {
  const titles: Record<string, string> = {
    "Track 1 P1-2 Forecast": "توقع المسار 1 حزم 1-2",
    "Track 3 and 4 Forecast": "توقع المسارين 3 و4",
    "Track 2B Forecast": "توقع المسار 2B",
    "HSCT Forecast": "توقع HSCT"
  };
  return titles[title] ?? title;
}

function arabicMilestoneCopy(copy: string) {
  const copies: Record<string, string> = {
    "105.7 km island package forecast completion.": "توقع إنجاز حزمة الجزيرة بطول 105.7 كم.",
    "Mainland routes forecast completion after advanced asphalt progress.": "توقع إنجاز محاور البر الرئيسي بعد تقدم كبير في الأسفلت.",
    "Island-to-island connection forecast after approvals and optional scope decisions.": "توقع رابط الجزر بعد الاعتمادات وقرارات النطاق الاختياري.",
    "High-speed sports loop forecast after design and budget allocation.": "توقع الحلقة الرياضية عالية السرعة بعد التصميم واعتماد الميزانية."
  };
  return copies[copy] ?? copy;
}
