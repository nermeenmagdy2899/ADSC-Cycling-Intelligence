import { useEffect, useMemo, useRef, useState } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Bike,
  BookOpenText,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  Layers,
  Languages,
  Map,
  MapPinned,
  Moon,
  Route,
  Search,
  Sun,
  Timer,
  Waypoints
} from "lucide-react";
import { LengthChart, ProgressChart } from "./components/Charts";
import { MetricCard } from "./components/MetricCard";
import { NetworkMap } from "./components/NetworkMap";
import { StoryExperience } from "./components/StoryExperience";
import { AmbientBackground } from "./components/AmbientBackground";
import { ProjectAssistant } from "./components/ProjectAssistant";
import { Preloader } from "./components/Preloader";
import {
  dashboardIcons,
  designPrinciples,
  documents,
  gallery,
  milestones,
  networkRoutes,
  personas,
  routeTypeCopy,
  strategyPrinciples
} from "./data/network";
import type { RouteType } from "./data/network";
import { useNetworkStore } from "./store/useNetworkStore";
import { uiCopy } from "./i18n";

gsap.registerPlugin(ScrollTrigger);

const nav = ["Story"];
const routeTypeOrder: RouteType[] = ["type-01", "type-02", "type-03", "hsct"];
const routeTypeDetails: Record<RouteType, { title: string; purpose: string; characteristics: string[]; users: string[]; visual: "urban" | "connector" | "mainland" | "loop" }> = {
  "type-01": {
    title: "Urban At-Grade Network",
    purpose: "Fine-grain Abu Dhabi Island access for daily trips, parks, bus stops, mosques, waterfronts, and local destinations.",
    characteristics: ["Street corridor retrofit", "20 kph design speed", "2-3 m island tracks", "High destination density"],
    users: ["Recreational", "Explorer", "Utility", "Sports"],
    visual: "urban"
  },
  "type-02": {
    title: "Strategic Island Connectors",
    purpose: "Longer links between Abu Dhabi Island, Yas, Saadiyat, Jubail, Fahid, universities, and bridge crossings.",
    characteristics: ["Bridge and underpass structures", "20-40 kph operating context", "Phased base and optional scopes", "Inter-island continuity"],
    users: ["Recreational", "Utility", "Sports"],
    visual: "connector"
  },
  "type-03": {
    title: "Mainland Long-Distance Corridors",
    purpose: "High-capacity utility and sport routes across mainland corridors toward Al Qudra and Al Wathba.",
    characteristics: ["Rest and hydration nodes", "Rural 40 kph sections", "Long-distance continuity", "Bridges and underpasses"],
    users: ["Utility", "Sports"],
    visual: "mainland"
  },
  hsct: {
    title: "High-Speed Cycle Track",
    purpose: "Dedicated elevated closed-loop sports facility designed for controlled high-speed cycling around Abu Dhabi Island.",
    characteristics: ["Closed sports loop", "40 kph design speed", "7 m clear track", "Controlled access ramps"],
    users: ["Sports"],
    visual: "loop"
  }
};
const navAr: Record<string, string> = {
  Story: "\u0627\u0644\u0642\u0635\u0629",
  Overview: "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629",
  Vision: "\u0627\u0644\u0631\u0624\u064a\u0629",
  Design: "\u0645\u0628\u0627\u062f\u0626 \u0627\u0644\u062a\u0635\u0645\u064a\u0645",
  Users: "\u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u0648\u0646",
  Network: "\u0627\u0644\u0634\u0628\u0643\u0629",
  Routes: "\u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062a",
  Dashboard: "\u0644\u0648\u062d\u0629 \u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629",
  Analytics: "\u0627\u0644\u062a\u062d\u0644\u064a\u0644\u0627\u062a",
  Timeline: "\u0627\u0644\u062c\u062f\u0648\u0644 \u0627\u0644\u0632\u0645\u0646\u064a",
  Gallery: "\u0627\u0644\u0645\u0639\u0631\u0636",
  Documents: "\u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a"
};

const copy = {
  en: {
    heroEyebrow: "Abu Dhabi Sports Council",
    heroTitle: "Abu Dhabi Cycling Network",
    heroText: "Route alignments, cycling typologies, construction progress, and forecast milestones in one executive spatial story.",
    heroCta: "Explore the Network",
    overviewTitle: "From city-scale vision to delivery intelligence.",
    overviewText: "Built from the 2022 Basis of Design and the December 2025 Progress Status deck, this experience translates static reports into a living project room.",
    networkTitle: "Route Alignments within the Abu Dhabi Cycling Network",
    galleryTitle: "Actual report imagery for design, construction, HSCT, and project progress.",
    documentsTitle: "Original PDFs remain searchable, openable, and downloadable as source evidence.",
    language: "AR"
  },
  ar: {
    heroEyebrow: "\u0645\u062c\u0644\u0633 \u0623\u0628\u0648\u0638\u0628\u064a \u0627\u0644\u0631\u064a\u0627\u0636\u064a",
    heroTitle: "\u0634\u0628\u0643\u0629 \u0623\u0628\u0648\u0638\u0628\u064a \u0644\u0644\u062f\u0631\u0627\u062c\u0627\u062a",
    heroText: "\u0642\u0635\u0629 \u0645\u0643\u0627\u0646\u064a\u0629 \u062a\u0646\u0641\u064a\u0630\u064a\u0629 \u0644\u0634\u0628\u0643\u0629 \u0627\u0644\u062f\u0631\u0627\u062c\u0627\u062a \u0648\u062a\u0642\u062f\u0645 \u0627\u0644\u0625\u0646\u0634\u0627\u0621 \u0648\u0627\u0644\u0645\u0639\u0627\u0644\u0645 \u0627\u0644\u0645\u0633\u062a\u0642\u0628\u0644\u064a\u0629.",
    heroCta: "\u0627\u0633\u062a\u0643\u0634\u0641 \u0627\u0644\u0634\u0628\u0643\u0629",
    overviewTitle: "\u0645\u0646 \u0631\u0624\u064a\u0629 \u0627\u0644\u0645\u062f\u064a\u0646\u0629 \u0625\u0644\u0649 \u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u062a\u0646\u0641\u064a\u0630.",
    overviewText: "\u062a\u062c\u0631\u0628\u0629 \u062a\u0641\u0627\u0639\u0644\u064a\u0629 \u0645\u0628\u0646\u064a\u0629 \u0639\u0644\u0649 \u062a\u0642\u0627\u0631\u064a\u0631 \u0627\u0644\u0645\u0634\u0631\u0648\u0639.",
    networkTitle: "\u0645\u062d\u0627\u0648\u0631 \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062a \u0636\u0645\u0646 \u0634\u0628\u0643\u0629 \u0623\u0628\u0648\u0638\u0628\u064a \u0644\u0644\u062f\u0631\u0627\u062c\u0627\u062a",
    galleryTitle: "\u0635\u0648\u0631 \u0645\u0646 \u062a\u0642\u0627\u0631\u064a\u0631 \u0627\u0644\u0645\u0634\u0631\u0648\u0639",
    documentsTitle: "\u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a \u0627\u0644\u0623\u0635\u0644\u064a\u0629 \u0644\u0644\u0645\u0634\u0631\u0648\u0639",
    language: "EN"
  }
};

export default function App() {
  const { theme, setTheme, query, setQuery, locale, setLocale, visibleTypes, setVisibleTypes, setSelectedRouteId, setPlayback, presenter, setPresenter } = useNetworkStore();
  const [activePersona, setActivePersona] = useState(personas[0].name);
  const [galleryFilter, setGalleryFilter] = useState("All");
  const [booting, setBooting] = useState(true);
  const t = copy[locale];

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

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale, theme]);

  // Presenter mode = true fullscreen presentation where the browser allows it.
  // Only a *user-initiated* exit from an engaged fullscreen (Esc / browser chrome,
  // at least ~1s after entering) leaves presenter mode; a denied or instantly
  // dropped fullscreen keeps presenter styling active.
  const fullscreenEngagedAt = useRef(0);
  useEffect(() => {
    const onFullscreenChange = () => {
      if (document.fullscreenElement) {
        fullscreenEngagedAt.current = performance.now();
      } else if (fullscreenEngagedAt.current && performance.now() - fullscreenEngagedAt.current > 1000) {
        fullscreenEngagedAt.current = 0;
        setPresenter(false);
      } else {
        fullscreenEngagedAt.current = 0;
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [setPresenter]);

  useEffect(() => {
    if (presenter) {
      document.documentElement.requestFullscreen?.().catch(() => {
        /* fullscreen can be denied (iframe/no gesture) — presenter styling still applies */
      });
      document.getElementById("story")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, [presenter]);

  useEffect(() => {
    const lenis = new Lenis({ smoothWheel: true, lerp: 0.08 });
    let raf = 0;
    const tick = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".reveal").forEach((item) => {
        gsap.fromTo(
          item,
          { opacity: 0, y: 36 },
          { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: item, start: "top 82%" } }
        );
      });
      gsap.to(".hero-line", { strokeDashoffset: 0, duration: 4, repeat: -1, yoyo: true, ease: "power2.inOut" });
    });
    return () => ctx.revert();
  }, []);

  const filteredGallery = galleryFilter === "All" ? gallery : gallery.filter((item) => item.tag === galleryFilter);
  const documentMatches = documents.filter((doc) => [doc.title, doc.text, doc.source].join(" ").toLowerCase().includes(query.toLowerCase()));
  const selectRouteType = (type: RouteType) => {
    const firstRoute = networkRoutes.find((route) => route.type === type);
    setVisibleTypes([type]);
    if (firstRoute) setSelectedRouteId(firstRoute.id);
    setPlayback("playing");
    document.getElementById("network")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const showAllRouteTypes = () => {
    setVisibleTypes(routeTypeOrder);
    setPlayback("playing");
    document.getElementById("network")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className={`app-shell min-h-screen ${presenter ? "is-presenter" : ""}`} data-design="lumen">
      {booting ? <Preloader onDone={() => setBooting(false)} /> : null}
      {presenter ? (
        <div className="presenter-bar" role="status">
          <span className="presenter-dot" />
          <strong>{locale === "ar" ? "وضع العرض" : "Presenter mode"}</strong>
          <small>{locale === "ar" ? "الأسهم للتنقل · مسافة للجولة · Esc للخروج" : "Arrows to navigate · Space to fly · Esc to exit"}</small>
          <button onClick={() => setPresenter(false)}>{locale === "ar" ? "خروج" : "Exit"}</button>
        </div>
      ) : null}
      <AmbientBackground />
      <Hero
        locale={locale}
        t={t}
        theme={theme}
        toggleLanguage={() => setLocale(locale === "en" ? "ar" : "en")}
        toggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
      />
      <StoryExperience />
      <ProjectAssistant />

      {false && (
      <div className="hidden" aria-hidden="true">
      <section id="overview" className="section">
        <div className="section-heading reveal">
          <p className="eyebrow">Overview</p>
          <h2>{t.overviewTitle}</h2>
          <p>{t.overviewText}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Total planned network" value={`${totals.planned.toFixed(1)} km`} detail="Tracks, connectors, and HSCT scope represented in the project status and design material." icon={Waypoints} />
          <MetricCard label="Completed asphalt" value={`${totals.completed.toFixed(1)} km`} detail="Reported completed kilometers across active construction and design-build packages." icon={CheckCircle2} tone="blue" />
          <MetricCard label="Remaining delivery" value={`${totals.remaining.toFixed(1)} km`} detail="Scope to progress through construction, optional connections, and HSCT budget allocation." icon={Timer} tone="gold" />
          <MetricCard label="Network completion" value={`${totals.percent}%`} detail="Portfolio completion based on completed asphalt against planned length." icon={BarChart3} tone="coral" />
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {milestones.slice(0, 3).map((item) => (
            <article className="panel reveal p-5" key={item.title}>
              <p className="text-sm text-palm">{item.date}</p>
              <h3 className="mt-3 text-xl font-semibold">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 opacity-70">{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="vision" className="section bg-ink text-pearl dark:bg-[#0b1514]">
        <div className="section-heading reveal">
          <p className="eyebrow">Vision</p>
          <h2>Seven planning principles become an interactive operating language.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-7">
          {strategyPrinciples.map(({ title, copy, icon: Icon }, index) => (
            <motion.article
              className="panel min-h-64 p-4"
              key={title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.04 }}
              whileHover={{ scale: 1.04 }}
            >
              <Icon className="h-8 w-8 text-palm" />
              <h3 className="mt-8 text-lg font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/60">{copy}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section id="design" className="section">
        <div className="section-heading reveal">
          <p className="eyebrow">Design Principles</p>
          <h2>Fifteen design principles expressed as a responsive decision matrix.</h2>
        </div>
        <div className="principle-grid">
          {designPrinciples.map((principle, index) => (
            <motion.button className="principle-card" key={principle} whileHover={{ y: -8 }} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{principle}</strong>
            </motion.button>
          ))}
        </div>
      </section>

      <section id="users" className="section bg-asphalt text-pearl">
        <div className="section-heading reveal">
          <p className="eyebrow">User Groups</p>
          <h2>Personas reveal different requirements as the network shifts from leisure to performance.</h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="space-y-3">
            {personas.map(({ name, icon: Icon }) => (
              <button key={name} onClick={() => setActivePersona(name)} className={`persona-tab ${activePersona === name ? "is-active" : ""}`}>
                <Icon className="h-5 w-5" />
                <span>{name}</span>
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            {personas
              .filter((persona) => persona.name === activePersona)
              .map((persona) => (
                <motion.article
                  key={persona.name}
                  className="panel grid gap-6 p-6 md:grid-cols-[1fr_320px]"
                  initial={{ opacity: 0, x: 28 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -28 }}
                >
                  <div>
                    <p className="eyebrow">Persona</p>
                    <h3 className="mt-3 text-4xl font-semibold">{persona.name}</h3>
                    <p className="mt-4 max-w-2xl text-lg leading-8 text-white/70">{persona.summary}</p>
                    <div className="mt-8 grid gap-3 md:grid-cols-2">
                      {persona.requirements.map((requirement) => (
                        <div className="rounded-md border border-white/10 bg-white/6 p-4" key={requirement}>
                          {requirement}
                        </div>
                      ))}
                    </div>
                  </div>
                  <Illustration />
                </motion.article>
              ))}
          </AnimatePresence>
        </div>
      </section>

      <section id="network" className="pt-20">
        <div className="section-heading reveal px-6 md:px-12">
          <p className="eyebrow">Network</p>
          <h2>{t.networkTitle}</h2>
        </div>
        <NetworkMap />
      </section>

      <section id="routes" className="section">
        <div className="section-heading reveal">
          <p className="eyebrow">Route Types</p>
          <h2>Use typologies as live GIS filters, not just labels.</h2>
          <p>Each route type has a different job in the network. Select one to isolate its routes on the map, fly into the first matching track, and compare the delivery KPIs behind that typology.</p>
        </div>
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button className={`chip ${visibleTypes.length === routeTypeOrder.length ? "is-active" : ""}`} onClick={showAllRouteTypes}>
            <MapPinned className="mr-2 inline h-4 w-4" />
            Show all on map
          </button>
          {routeTypeOrder.map((type) => (
            <button className={`chip ${visibleTypes.length === 1 && visibleTypes[0] === type ? "is-active" : ""}`} key={type} onClick={() => selectRouteType(type)}>
              {type.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-4">
          {routeTypeOrder.map((type) => {
            const routes = networkRoutes.filter((route) => route.type === type);
            const planned = routes.reduce((sum, route) => sum + route.plannedKm, 0);
            const completed = routes.reduce((sum, route) => sum + route.completedKm, 0);
            const active = visibleTypes.length === 1 && visibleTypes[0] === type;
            const detail = routeTypeDetails[type];
            return (
              <motion.article className={`route-type-card ${active ? "is-active" : ""}`} key={type} whileHover={{ y: -6 }} layout>
                <button className="block w-full text-left" onClick={() => selectRouteType(type)}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-palm">{type.toUpperCase()}</p>
                      <h3 className="mt-2 text-2xl font-semibold">{detail.title}</h3>
                    </div>
                    <Route className="h-6 w-6 text-palm" />
                  </div>
                  <RouteTypeVisual color={routes[0]?.color ?? "#c8a65a"} variant={detail.visual} />
                  <p className="mt-4 text-sm leading-6 opacity-70">{detail.purpose}</p>
                  <p className="mt-3 text-xs leading-5 opacity-55">{routeTypeCopy[type]}</p>
                </button>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <div className="route-type-stat">
                    <span>Routes</span>
                    <strong>{routes.length}</strong>
                  </div>
                  <div className="route-type-stat">
                    <span>Planned</span>
                    <strong>{planned.toFixed(1)} km</strong>
                  </div>
                  <div className="route-type-stat">
                    <span>Done</span>
                    <strong>{completed.toFixed(1)} km</strong>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="route-type-pill bg-dune/15 text-dune">Live GIS filter</span>
                  {detail.users.map((user) => (
                    <span className="route-type-pill" key={user}>{user}</span>
                  ))}
                </div>
                <div className="mt-5 space-y-2">
                  {detail.characteristics.map((item) => (
                    <div className="flex items-center gap-2 text-sm opacity-75" key={item}>
                      <span className="h-1.5 w-1.5 rounded-full bg-palm" />
                      {item}
                    </div>
                  ))}
                </div>
                <button className="button mt-6 w-full justify-center" onClick={() => selectRouteType(type)}>
                  Filter GIS Map
                </button>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section id="dashboard" className="section bg-ink text-pearl">
        <div className="section-heading reveal">
          <p className="eyebrow">Construction Dashboard</p>
          <h2>Executive delivery status at package, contractor, forecast, and completion levels.</h2>
        </div>
        <div className="dashboard-grid">
          <div className="panel p-5 md:col-span-2">
            <ProgressChart />
          </div>
          <div className="panel p-5">
            <LengthChart />
          </div>
          {networkRoutes.map((route) => {
            const pct = Math.round((route.completedKm / route.plannedKm) * 100);
            return (
              <article className="panel p-4" key={route.id}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">{route.label}</h3>
                  <span className="status-pill">{pct}%</span>
                </div>
                <p className="mt-3 text-sm text-white/60">{route.packageName} - {route.forecast}</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: route.color }} />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="analytics" className="section">
        <div className="section-heading reveal">
          <p className="eyebrow">Analytics</p>
          <h2>Portfolio comparisons, KPIs, and delivery signals designed for fast executive scanning.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Packages" value="7" detail="Package groups and route sections represented from the Dec 2025 status deck." icon={dashboardIcons.Blocks} />
          <MetricCard label="Forecast range" value="2026-2029" detail="Near-term island/mainland delivery through HSCT long horizon." icon={CalendarDays} tone="gold" />
          <MetricCard label="Design completion" value="90%" detail="HSCT schematic design status reported at 90% completion." icon={BookOpenText} tone="blue" />
          <MetricCard label="Budget signal" value="1.7B / 4B" detail="Approved budget against needed budget from project highlight slide." icon={BarChart3} tone="coral" />
        </div>
      </section>

      <section id="timeline" className="section bg-[#eef2eb] dark:bg-[#111b19]">
        <div className="section-heading reveal">
          <p className="eyebrow">Timeline</p>
          <h2>Scroll through the strategy, design, construction, and forecast horizon.</h2>
        </div>
        <div className="timeline">
          {milestones.map((item) => (
            <article className="timeline-card" key={item.title}>
              <p>{item.date}</p>
              <h3>{item.title}</h3>
              <span>{item.copy}</span>
            </article>
          ))}
        </div>
      </section>

      <section id="gallery" className="section">
        <div className="section-heading reveal">
          <p className="eyebrow">Gallery</p>
          <h2>{t.galleryTitle}</h2>
        </div>
        <div className="mb-6 flex flex-wrap gap-2">
          {["All", ...new Set(gallery.map((item) => item.tag))].map((tag) => (
            <button className={`chip ${galleryFilter === tag ? "is-active" : ""}`} key={tag} onClick={() => setGalleryFilter(tag)}>
              {tag}
            </button>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {filteredGallery.map((item) => (
            <article className="gallery-card" key={item.title}>
              <img src={item.image} alt="" loading="lazy" />
              <div>
                <p>{item.tag}</p>
                <h3>{item.title}</h3>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="documents" className="section bg-ink text-pearl">
        <div className="section-heading reveal">
          <p className="eyebrow">Documents</p>
          <h2>{t.documentsTitle}</h2>
        </div>
        <div className="mb-6 flex max-w-2xl items-center gap-3 rounded-md border border-white/10 bg-white/10 px-4 py-3">
          <Search className="h-5 w-5 text-white/50" />
          <input className="w-full bg-transparent text-sm outline-none placeholder:text-white/40" placeholder="Search source documents" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {documentMatches.map((doc) => (
            <article className="panel p-5" key={doc.href}>
              <FileText className="h-7 w-7 text-palm" />
              <p className="mt-5 text-sm text-white/50">{doc.date} - {doc.source}</p>
              <h3 className="mt-2 text-2xl font-semibold">{doc.title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/60">{doc.text}</p>
              <div className="mt-6 flex gap-2">
                <a className="button" href={doc.href} target="_blank" rel="noreferrer">
                  Open <ChevronRight className="h-4 w-4" />
                </a>
                <a className="icon-button" href={doc.href} download aria-label={`Download ${doc.title}`}>
                  <Download className="h-4 w-4" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <AIPanel />
      </div>
      )}
    </main>
  );
}

function Hero({
  locale,
  t,
  theme,
  toggleLanguage,
  toggleTheme
}: {
  locale: "en" | "ar";
  t: (typeof copy)["en"];
  theme: string;
  toggleLanguage: () => void;
  toggleTheme: () => void;
}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  return (
    <section id="hero" ref={sectionRef} className="hero">
      <div className="hero-display-controls display-controls" aria-label={uiCopy[locale].displayOptions}>
        <button className="display-control" aria-label={`${uiCopy[locale].language}: ${t.language}`} title={uiCopy[locale].language} onClick={toggleLanguage}>
          <Languages className="h-4 w-4" />
          <span>{t.language}</span>
        </button>
        <button className="display-control is-icon" aria-label={theme === "dark" ? uiCopy[locale].lightMode : uiCopy[locale].darkMode} title={theme === "dark" ? uiCopy[locale].lightMode : uiCopy[locale].darkMode} onClick={toggleTheme}>
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>
      <div className="hero-map-grid" />
      <div className="hero-hover-field" aria-hidden="true">
        {Array.from({ length: 9 }).map((_, index) => (
          <span key={index} style={{ ["--i" as string]: index }} />
        ))}
      </div>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true">
        <path
          className="hero-line"
          d="M-40 620 C 170 530, 250 705, 410 580 S 640 330, 820 420 S 1030 700, 1190 520 S 1390 300, 1490 380"
          fill="none"
          stroke="var(--gold)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray="1600"
          strokeDashoffset="1600"
        />
      </svg>
      <button className="hero-bike" aria-label={locale === "ar" ? "مؤشر دراجة متحرك" : "Animated cycling marker"}>
        <span className="hero-bike-trail" />
        <span className="hero-bike-core">
          <Bike className="h-5 w-5" />
        </span>
        <span className="hero-bike-label">{locale === "ar" ? "انطلق عبر الشبكة" : "Ride the network"}</span>
      </button>
      <div className="hero-content relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 pb-16 pt-20 md:px-10">
        <motion.img className="hero-brand-mark" src={theme === "dark" ? "/images/adsc-logo-white-official.svg" : "/images/adsc-logo-official.svg"} alt={t.heroEyebrow} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} />
        <motion.p className="eyebrow" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {t.heroEyebrow}
        </motion.p>
        <motion.h1 className="mt-5 max-w-5xl text-6xl font-semibold leading-[0.94] md:text-8xl" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {t.heroTitle}
        </motion.h1>
        <motion.p className="hero-summary mt-7 max-w-2xl text-xl leading-8" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          {t.heroText}
        </motion.p>
        <motion.a className="button mt-9 w-fit" href="#story" onClick={() => window.dispatchEvent(new CustomEvent("adcn:open-step", { detail: "network" }))} initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          {t.heroCta} <Map className="h-4 w-4" />
        </motion.a>
      </div>
    </section>
  );
}

function Illustration() {
  return (
    <div className="relative min-h-72 overflow-hidden rounded-md bg-[#101c1a]">
      <div className="absolute inset-x-8 bottom-16 h-2 rounded-full bg-palm/80 shadow-glow" />
      <motion.div className="absolute bottom-20 left-10 h-16 w-16 rounded-full border-4 border-dune" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 5, ease: "linear" }} />
      <motion.div className="absolute bottom-20 right-14 h-16 w-16 rounded-full border-4 border-lagoon" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 5, ease: "linear" }} />
      <motion.div className="absolute bottom-36 left-1/2 h-20 w-24 -translate-x-1/2 rounded-t-full border-t-4 border-palm" animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2.6 }} />
    </div>
  );
}

function RouteTypeVisual({
  color,
  variant
}: {
  color: string;
  variant: "urban" | "connector" | "mainland" | "loop";
}) {
  const paths = {
    urban: ["M54 92 H292", "M82 48 H260", "M128 25 V128", "M214 25 V128"],
    connector: ["M42 118 C106 38 162 40 218 92 S292 132 320 44"],
    mainland: ["M34 128 C96 110 132 72 198 76 S286 54 326 24"],
    loop: ["M78 82 C78 24 268 24 268 82 S78 140 78 82"]
  } satisfies Record<string, string[]>;

  return (
    <div className="route-type-visual" aria-hidden="true">
      <svg viewBox="0 0 360 160" className="h-full w-full">
        <defs>
          <linearGradient id={`route-glow-${variant}`} x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.85" />
            <stop offset="100%" stopColor="#c8a65a" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <path d="M24 132 C72 104 112 116 148 92 S228 48 336 42" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="22" strokeLinecap="round" />
        <path d="M24 32 H336 M24 80 H336 M24 128 H336 M72 18 V142 M144 18 V142 M216 18 V142 M288 18 V142" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
        <circle cx="78" cy="116" r="20" fill={color} opacity="0.08" />
        <circle cx="278" cy="46" r="28" fill={color} opacity="0.07" />
        {paths[variant].map((path, index) => (
          <motion.path
            d={path}
            fill="none"
            key={path}
            stroke={`url(#route-glow-${variant})`}
            strokeDasharray="1"
            strokeLinecap="round"
            strokeWidth={variant === "loop" ? 9 : 7}
            initial={{ pathLength: 0, opacity: 0.35 }}
            whileInView={{ pathLength: 1, opacity: 1 }}
            viewport={{ once: false, amount: 0.6 }}
            transition={{ duration: 1.2, delay: index * 0.12, ease: "easeInOut" }}
          />
        ))}
        <circle cx="54" cy="92" r="5" fill={color} />
        <circle cx="320" cy={variant === "connector" ? 44 : variant === "mainland" ? 24 : 82} r="5" fill={color} />
      </svg>
    </div>
  );
}

function AIPanel() {
  const [prompt, setPrompt] = useState("Which track is closest to completion?");
  const answer = useMemo(() => {
    if (prompt.toLowerCase().includes("contractor")) return "GCC Landscape leads Track 3 and Track 4, Western Bainoona Group appears on Track 1 P3-4 and Track 2, and Gulf Contracting & Landscape / Hilalco cover Track 1 P1-2.";
    if (prompt.toLowerCase().includes("track 1") && prompt.toLowerCase().includes("track 2")) return "Track 1 has 174.8 km planned with 97.0 km complete. Track 2 has 62.0 km planned with 10.0 km complete, with Section B still not started.";
    return "Track 4 is closest to completion at roughly 99%, with 41.75 km completed out of 42.24 km and forecast completion in April 2026.";
  }, [prompt]);
  return (
    <section className="section bg-[#ecf4f0] dark:bg-[#0b1514]">
      <div className="section-heading reveal">
        <p className="eyebrow">AI Panel</p>
        <h2>Optional project intelligence layer for executive questions.</h2>
      </div>
      <div className="panel p-5">
        <div className="flex items-center gap-3">
          <Bot className="h-6 w-6 text-palm" />
          <input className="w-full bg-transparent text-lg outline-none" value={prompt} onChange={(event) => setPrompt(event.target.value)} />
        </div>
        <p className="mt-5 rounded-md bg-palm/10 p-4 text-sm leading-6 opacity-75">{answer}</p>
      </div>
    </section>
  );
}
