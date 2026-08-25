import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  Bike,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Gauge,
  Info,
  Languages,
  Layers3,
  ListFilter,
  MapPinned,
  Milestone,
  Moon,
  RefreshCcw,
  Route,
  Search,
  ShieldCheck,
  Sun,
  Target,
  Waypoints,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CountUp } from "./CountUp";
import { InventoryMap } from "./InventoryMap";
import { loadInventory, regionColors, regionLabel, type InventoryClass, type InventoryCollection, type InventoryFeature, type InventorySummary, type RegionCode } from "../data/inventory";
import { networkRoutes, programme, type NetworkRoute, type RouteStatus } from "../data/network";
import {
  budgetBillions,
  distanceUnit,
  formatForecast,
  inventoryClassLabel,
  inventoryFeatureLabel,
  inventoryValueLabel,
  metreUnit,
  routeContractorLabel,
  routeDesignSpeedLabel,
  routeLabel,
  routePackageLabel,
  routeStructuresLabel,
  statusText
} from "../i18n";
import { useNetworkStore } from "../store/useNetworkStore";

type FilterValue = string | "all";
type SelectedTrack = { kind: "programme"; route: NetworkRoute } | { kind: "inventory"; feature: InventoryFeature } | null;
type FilterOption = { value: string; label: string; count?: number; disabled?: boolean };
type ProgrammeFilterKey = "routeFilter" | "packageFilter" | "statusFilter" | "contractorFilter" | "forecastFilter";
type InventoryFilterKey = "region" | "conditionFilter" | "materialFilter";

const statusOptions: RouteStatus[] = ["construction", "design-build", "design", "not-started"];

const contracts = [
  { id: "c-p12", routeIds: ["track-1-p12"], name: "Track 1 · Packages 1 & 2", nameAr: "المسار 1 · الحزمتان 1 و2", valueM: 168, display: "AED 168m", displayAr: "168 مليون درهم" },
  { id: "c-p34", routeIds: ["track-1-p34"], name: "Track 1 · Packages 3 & 4", nameAr: "المسار 1 · الحزمتان 3 و4", valueM: 185, display: "AED 185m", displayAr: "185 مليون درهم" },
  { id: "c-2a", routeIds: ["track-2-a"], name: "Track 2 · Section A", nameAr: "المسار 2 · القسم أ", valueM: 445, display: "AED 445m", displayAr: "445 مليون درهم" },
  { id: "c-2b", routeIds: ["track-2-b"], name: "Track 2 · Section B", nameAr: "المسار 2 · القسم ب", valueM: 130, display: "AED 130m base", displayAr: "130 مليون درهم — النطاق الأساسي", note: "AED 889m overall scope listed separately", noteAr: "نطاق إجمالي بقيمة 889 مليون درهم مدرج بشكل منفصل" },
  { id: "c-34", routeIds: ["track-3", "track-4"], name: "Tracks 3 & 4", nameAr: "المساران 3 و4", valueM: 328, display: "AED 328m", displayAr: "328 مليون درهم" },
  { id: "c-hsct", routeIds: ["hsct"], name: "High-Speed Cycle Track", nameAr: "مسار الدراجات عالي السرعة", valueM: null, display: "TBC", displayAr: "يحدد لاحقاً" }
] as const;

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b));
}

function progressOf(route: NetworkRoute) {
  return route.plannedKm > 0 ? (route.completedKm / route.plannedKm) * 100 : 0;
}

function monthValue(value: string) {
  const parsed = Date.parse(`1 ${value}`);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function fmt(value: number, decimals = 1) {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(value);
}

function matchesProgramme(route: NetworkRoute, filters: Record<ProgrammeFilterKey, string>) {
  return (filters.routeFilter === "all" || route.id === filters.routeFilter)
    && (filters.packageFilter === "all" || route.packageName === filters.packageFilter)
    && (filters.statusFilter === "all" || route.status === filters.statusFilter)
    && (filters.contractorFilter === "all" || route.contractor === filters.contractorFilter)
    && (filters.forecastFilter === "all" || route.forecast === filters.forecastFilter);
}

function matchesInventory(feature: InventoryFeature, filters: Record<InventoryFilterKey, string> & { featureClass: InventoryClass }) {
  return (filters.region === "all" || feature.properties.municipality === filters.region)
    && (filters.featureClass === "all" || feature.properties.featureClass === filters.featureClass)
    && (filters.conditionFilter === "all" || feature.properties.condition === filters.conditionFilter)
    && (filters.materialFilter === "all" || feature.properties.material === filters.materialFilter);
}

export function CyclingDashboard() {
  const { locale, theme, setLocale, setTheme } = useNetworkStore();
  const isAr = locale === "ar";
  const [inventory, setInventory] = useState<InventoryCollection | null>(null);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [region, setRegion] = useState<RegionCode>("all");
  const [featureClass, setFeatureClass] = useState<InventoryClass>("all");
  const [routeFilter, setRouteFilter] = useState<FilterValue>("all");
  const [packageFilter, setPackageFilter] = useState<FilterValue>("all");
  const [statusFilter, setStatusFilter] = useState<FilterValue>("all");
  const [contractorFilter, setContractorFilter] = useState<FilterValue>("all");
  const [conditionFilter, setConditionFilter] = useState<FilterValue>("all");
  const [materialFilter, setMaterialFilter] = useState<FilterValue>("all");
  const [forecastFilter, setForecastFilter] = useState<FilterValue>("all");
  const [query, setQuery] = useState("");
  const [selectedFeature, setSelectedFeature] = useState<InventoryFeature | null>(null);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadInventory()
      .then(([collection, profile]) => {
        if (!active) return;
        setInventory(collection);
        setSummary(profile);
      })
      .catch(() => active && setLoadError(true));
    return () => { active = false; };
  }, []);

  const inventoryOptions = useMemo(() => ({
    conditions: unique(inventory?.features.map((feature) => feature.properties.condition) ?? []),
    materials: unique(inventory?.features.map((feature) => feature.properties.material) ?? [])
  }), [inventory]);

  const routeOptions = useMemo(() => ({
    packages: unique(networkRoutes.map((route) => route.packageName)),
    contractors: unique(networkRoutes.map((route) => route.contractor)),
    forecasts: unique(networkRoutes.map((route) => route.forecast)).sort((a, b) => monthValue(a) - monthValue(b))
  }), []);

  const programmeFilterState = useMemo<Record<ProgrammeFilterKey, string>>(() => ({
    routeFilter, packageFilter, statusFilter, contractorFilter, forecastFilter
  }), [contractorFilter, forecastFilter, packageFilter, routeFilter, statusFilter]);
  const inventoryFilterState = useMemo<Record<InventoryFilterKey, string> & { featureClass: InventoryClass }>(() => ({
    region, conditionFilter, materialFilter, featureClass
  }), [conditionFilter, featureClass, materialFilter, region]);

  const programmeCount = useCallback((field: ProgrammeFilterKey, value: string) => networkRoutes.filter((route) => (
    matchesProgramme(route, { ...programmeFilterState, [field]: value })
  )).length, [programmeFilterState]);
  const inventoryCount = useCallback((field: InventoryFilterKey, value: string) => (inventory?.features ?? []).filter((feature) => (
    matchesInventory(feature, { ...inventoryFilterState, [field]: value })
  )).length, [inventory, inventoryFilterState]);

  const filteredRoutes = useMemo(() => (
    region === "all" || region === "ADM"
      ? networkRoutes.filter((route) => matchesProgramme(route, programmeFilterState))
      : []
  ), [programmeFilterState, region]);

  const filteredInventory = useMemo(() => inventory?.features.filter((feature) => matchesInventory(feature, inventoryFilterState)) ?? [], [inventory, inventoryFilterState]);
  const programmeRoutesForMap = useMemo(() => (
    selectedFeature || region === "AAM" || region === "DRM" ? [] : filteredRoutes
  ), [filteredRoutes, region, selectedFeature]);

  useEffect(() => {
    if (selectedProgrammeId && !filteredRoutes.some((route) => route.id === selectedProgrammeId)) setSelectedProgrammeId(null);
  }, [filteredRoutes, selectedProgrammeId]);

  useEffect(() => {
    if (selectedFeature && !filteredInventory.some((feature) => feature.properties.id === selectedFeature.properties.id)) setSelectedFeature(null);
  }, [filteredInventory, selectedFeature]);

  const totals = useMemo(() => {
    const planned = filteredRoutes.reduce((sum, route) => sum + route.plannedKm, 0);
    const completed = filteredRoutes.reduce((sum, route) => sum + route.completedKm, 0);
    return { planned, completed, remaining: planned - completed, progress: planned > 0 ? (completed / planned) * 100 : 0 };
  }, [filteredRoutes]);

  const nextMilestone = useMemo(() => [...filteredRoutes].sort((a, b) => monthValue(a.forecast) - monthValue(b.forecast))[0] ?? null, [filteredRoutes]);
  const selected: SelectedTrack = selectedProgrammeId
    ? { kind: "programme", route: networkRoutes.find((route) => route.id === selectedProgrammeId) ?? networkRoutes[0] }
    : selectedFeature ? { kind: "inventory", feature: selectedFeature } : null;

  const filteredContracts = useMemo(() => {
    const ids = new Set(filteredRoutes.map((route) => route.id));
    return contracts.filter((contract) => contract.routeIds.some((id) => ids.has(id)));
  }, [filteredRoutes]);

  const hasFilters = [region, featureClass, routeFilter, packageFilter, statusFilter, contractorFilter, conditionFilter, materialFilter, forecastFilter].some((value) => value !== "all");
  const resetFilters = () => {
    setRegion("all"); setFeatureClass("all"); setRouteFilter("all"); setPackageFilter("all"); setStatusFilter("all");
    setContractorFilter("all"); setConditionFilter("all"); setMaterialFilter("all"); setForecastFilter("all"); setQuery("");
    setSelectedFeature(null); setSelectedProgrammeId(null);
  };

  const selectProgramme = useCallback((id: string | null) => {
    setSelectedFeature(null);
    setSelectedProgrammeId(id);
  }, []);

  const selectInventory = useCallback((feature: InventoryFeature | null) => {
    setSelectedProgrammeId(null);
    setSelectedFeature(feature);
    if (feature) setRouteFilter("all");
  }, []);

  const changeRegion = useCallback((value: RegionCode) => {
    setRegion(value);
    setSelectedFeature(null);
    if (value === "AAM" || value === "DRM") {
      setSelectedProgrammeId(null);
      setRouteFilter("all");
    }
  }, []);

  const focusInventory = useCallback((feature: InventoryFeature) => {
    setSelectedProgrammeId(null);
    setSelectedFeature(feature);
    setRouteFilter("all");
  }, []);

  const regionFilterOptions: FilterOption[] = (["all", "ADM", "AAM", "DRM"] as RegionCode[]).map((value) => {
    const count = inventoryCount("region", value);
    return { value, label: regionLabel(value, locale), count };
  });
  const routeFilterOptions: FilterOption[] = [
    { value: "all", label: isAr ? "جميع مسارات البرنامج" : "All programme routes", count: programmeCount("routeFilter", "all") },
    ...networkRoutes.map((route) => {
      const count = programmeCount("routeFilter", route.id);
      return { value: route.id, label: routeLabel(route, locale), count, disabled: count === 0 };
    })
  ];
  const packageFilterOptions: FilterOption[] = [
    { value: "all", label: isAr ? "جميع الحزم" : "All packages", count: programmeCount("packageFilter", "all") },
    ...routeOptions.packages.map((value) => { const count = programmeCount("packageFilter", value); const route = networkRoutes.find((item) => item.packageName === value); return { value, label: route ? routePackageLabel(route, locale) : value, count, disabled: count === 0 }; })
  ];
  const statusFilterOptions: FilterOption[] = [
    { value: "all", label: isAr ? "جميع الحالات" : "All statuses", count: programmeCount("statusFilter", "all") },
    ...statusOptions.map((value) => { const count = programmeCount("statusFilter", value); return { value, label: statusText[locale][value], count, disabled: count === 0 }; })
  ];
  const contractorFilterOptions: FilterOption[] = [
    { value: "all", label: isAr ? "جميع المقاولين" : "All contractors", count: programmeCount("contractorFilter", "all") },
    ...routeOptions.contractors.map((value) => { const count = programmeCount("contractorFilter", value); const route = networkRoutes.find((item) => item.contractor === value); return { value, label: route ? routeContractorLabel(route, locale) : value, count, disabled: count === 0 }; })
  ];
  const forecastFilterOptions: FilterOption[] = [
    { value: "all", label: isAr ? "جميع التوقعات" : "All forecast dates", count: programmeCount("forecastFilter", "all") },
    ...routeOptions.forecasts.map((value) => { const count = programmeCount("forecastFilter", value); return { value, label: formatForecast(value, locale), count, disabled: count === 0 }; })
  ];
  const conditionFilterOptions: FilterOption[] = [
    { value: "all", label: isAr ? "جميع الحالات المسجلة" : "All recorded conditions", count: inventoryCount("conditionFilter", "all") },
    ...inventoryOptions.conditions.map((value) => { const count = inventoryCount("conditionFilter", value); return { value, label: inventoryValueLabel(value, locale), count, disabled: Boolean(inventory) && count === 0 }; })
  ];
  const materialFilterOptions: FilterOption[] = [
    { value: "all", label: isAr ? "جميع المواد" : "All recorded materials", count: inventoryCount("materialFilter", "all") },
    ...inventoryOptions.materials.map((value) => { const count = inventoryCount("materialFilter", value); return { value, label: inventoryValueLabel(value, locale), count, disabled: Boolean(inventory) && count === 0 }; })
  ];

  return (
    <section id="dashboard" className="cycling-dashboard-section executive-cycling-dashboard">
      <nav className="cycling-app-bar executive-app-bar" aria-label={isAr ? "التنقل الرئيسي" : "Primary navigation"}>
        <a className="cycling-brand" href="#dashboard" aria-label={isAr ? "لوحة ذكاء شبكة الدراجات" : "Cycling Intelligence dashboard"}>
          <img src="/images/adsc-logo.svg" alt="" />
          <span><strong>{isAr ? "ذكاء شبكة الدراجات" : "Cycling Intelligence"}</strong><small>{isAr ? "لوحة نظم المعلومات الجغرافية التنفيذية" : "Executive GIS dashboard"}</small></span>
        </a>
        <div className="cycling-app-status"><i /><span>{isAr ? "بيانات موثقة من المصدر" : "Source-qualified data"}</span><small>{isAr ? "حالة التقدم · ديسمبر 2025" : "Progress status · Dec 2025"}</small></div>
        <div className="cycling-app-actions">
          <a href="#map-workspace"><MapPinned /><span>{isAr ? "الخريطة" : "Map"}</span></a>
          <button onClick={() => setLocale(isAr ? "en" : "ar")} aria-label={isAr ? "English" : "العربية"}><Languages /><span>{isAr ? "EN" : "AR"}</span></button>
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? (isAr ? "الوضع الفاتح" : "Light mode") : (isAr ? "الوضع الداكن" : "Dark mode")}>{theme === "dark" ? <Sun /> : <Moon />}</button>
        </div>
      </nav>

      <main className="executive-dashboard-shell">
        <header className="executive-dashboard-intro">
          <div><p>{isAr ? "شبكة الدراجات · غرفة القرار" : "CYCLING NETWORK · DECISION ROOM"}</p><h1>{isAr ? "لوحة تنفيذ شبكة أبوظبي" : "Abu Dhabi Cycling Executive Dashboard"}</h1><span>{isAr ? "نظرة موحدة على التنفيذ والتمويل والمخزون المكاني." : "One coordinated view of delivery, funding, and mapped network inventory."}</span></div>
          <details className="executive-methodology executive-methodology-top">
            <summary><Info />{isAr ? "المصادر والمنهجية" : "Sources & methodology"}<ChevronDown /></summary>
            <MethodologyContent summary={summary} locale={locale} />
          </details>
        </header>

        <section className="executive-filter-band" aria-labelledby="global-filter-title">
          <div className="executive-section-label"><ListFilter /><span><strong id="global-filter-title">{isAr ? "مرشحات موحدة" : "Global filters"}</strong><small>{isAr ? "تعمل على جميع المكونات المدعومة بالمصدر" : "Updates every source-supported view"}</small></span></div>
          <div className="executive-filter-grid">
            <FilterDropdown id="region" locale={locale} label={isAr ? "المنطقة" : "Region"} value={region} options={regionFilterOptions} onChange={(value) => changeRegion(value as RegionCode)} />
            <FilterDropdown id="route" locale={locale} label={isAr ? "المسار" : "Track / route"} value={routeFilter} options={routeFilterOptions} onChange={(value) => { setRouteFilter(value); setSelectedFeature(null); setSelectedProgrammeId(value === "all" ? null : value); if (value !== "all") setRegion("ADM"); }} />
            <FilterDropdown id="package" locale={locale} label={isAr ? "المشروع / الحزمة" : "Project / package"} value={packageFilter} options={packageFilterOptions} onChange={setPackageFilter} />
            <FilterDropdown id="status" locale={locale} label={isAr ? "الحالة" : "Status"} value={statusFilter} options={statusFilterOptions} onChange={setStatusFilter} />
            <FilterDropdown id="condition" locale={locale} label={isAr ? "حالة الأصل" : "Condition"} value={conditionFilter} options={conditionFilterOptions} onChange={setConditionFilter} />
            <FilterDropdown id="contractor" locale={locale} label={isAr ? "المقاول" : "Contractor"} value={contractorFilter} options={contractorFilterOptions} onChange={setContractorFilter} />
            <FilterDropdown id="material" locale={locale} label={isAr ? "المادة" : "Material"} value={materialFilter} options={materialFilterOptions} onChange={setMaterialFilter} />
            <FilterDropdown id="forecast" locale={locale} label={isAr ? "التوقع" : "Forecast / date"} value={forecastFilter} options={forecastFilterOptions} onChange={setForecastFilter} />
            <button className="executive-filter-reset" onClick={resetFilters} disabled={!hasFilters && !query}><RefreshCcw />{isAr ? "إعادة الضبط" : "Reset"}</button>
          </div>
        </section>

        <section className="executive-kpi-strip" aria-label={isAr ? "مؤشرات الأداء التنفيذية" : "Executive KPIs"}>
          <ExecutiveKpi icon={Waypoints} label={isAr ? "نطاق الشبكة" : "Network scope"} value={totals.planned} decimals={1} suffix={` ${distanceUnit(locale)}`} note={`${filteredRoutes.length} ${isAr ? "محاور برنامج" : "programme alignments"}`} />
          <ExecutiveKpi icon={CheckCircle2} label={isAr ? "المنجز" : "Delivered / completed"} value={totals.completed} decimals={1} suffix={` ${distanceUnit(locale)}`} note={`${fmt(totals.remaining)} ${distanceUnit(locale)} ${isAr ? "متبقي" : "remaining"}`} tone="blue" />
          <ExecutiveKpi icon={Gauge} label={isAr ? "التقدم الكلي" : "Overall progress"} value={totals.progress} decimals={1} suffix="%" note={isAr ? "أسفلت منجز مقابل المخطط" : "completed asphalt vs planned"} tone="green" />
          <ExecutiveKpi icon={CircleDollarSign} label={isAr ? "فجوة التمويل" : "Funding gap"} value={programme.neededBudgetBn - programme.approvedBudgetBn} decimals={1} prefix={isAr ? "" : "AED "} suffix={isAr ? " مليار درهم" : "bn"} note={`${fmt((programme.approvedBudgetBn / programme.neededBudgetBn) * 100)}% ${isAr ? "ممولة على مستوى البرنامج" : "programme-wide funded"}`} tone="gold" />
          <article className="executive-kpi executive-kpi-milestone"><span><Milestone /></span><div><small>{isAr ? "المعلم الرئيسي القادم" : "Next major milestone"}</small><strong>{nextMilestone ? formatForecast(nextMilestone.forecast, locale) : "—"}</strong><em>{nextMilestone ? routeLabel(nextMilestone, locale) : isAr ? "لا توجد مسارات مطابقة" : "No matching routes"}</em></div></article>
        </section>

        <section id="map-workspace" className="executive-map-section" aria-labelledby="map-title">
          <header className="executive-section-heading"><div><p>{isAr ? "تجربة نظم المعلومات الجغرافية الرئيسية" : "PRIMARY GIS EXPERIENCE"}</p><h2 id="map-title">{isAr ? "شبكة التنفيذ والمخزون المكاني" : "Programme routes & mapped inventory"}</h2><span>{isAr ? "اختر مساراً من الخريطة أو القائمة لفتح تفاصيل موثقة." : "Select a programme route or municipal track from the map or list to inspect source-backed detail."}</span></div><div className="executive-source-badge"><ShieldCheck /><span>{selectedFeature ? (isAr ? "تم إيقاف طبقة البرنامج أثناء فحص الأصل" : "Programme overlay paused for GIS inspection") : region === "AAM" || region === "DRM" ? (isAr ? "طبقة البرنامج متاحة لمنطقة أبوظبي" : "Programme overlay is available in Abu Dhabi") : (isAr ? "المسارات والمخزون منفصلان بالمصدر" : "Source domains kept distinct")}</span></div></header>
          <div className="executive-map-workspace">
            <div className="executive-map-card">
              {inventory ? <InventoryMap
                data={inventory}
                locale={locale}
                theme={theme}
                region={region}
                featureClass={featureClass}
                condition={conditionFilter}
                material={materialFilter}
                programmeRoutes={programmeRoutesForMap}
                mainRoutes={filteredRoutes}
                selectedProgrammeId={selectedProgrammeId}
                selectedId={selectedFeature?.properties.id ?? null}
                onClassChange={(value) => { setFeatureClass(value); setSelectedFeature(null); }}
                onSelect={selectInventory}
                onSelectProgramme={selectProgramme}
              /> : <div className="executive-map-loading"><span /><strong>{loadError ? (isAr ? "تعذر تحميل المخزون المكاني" : "Mapped inventory could not be loaded") : (isAr ? "جارٍ تحميل الخريطة" : "Preparing GIS workspace")}</strong></div>}
            </div>
            <aside className="executive-track-rail" aria-label={isAr ? "قائمة المسارات والتفاصيل" : "Track list and details"}>
              {selected ? <TrackDetails locale={locale} selected={selected} onClear={() => { setSelectedFeature(null); setSelectedProgrammeId(null); }} /> : <TrackExplorer
                inventory={filteredInventory}
                locale={locale}
                onSelectFeature={focusInventory}
                onSelectRoute={(route) => selectProgramme(route.id)}
                query={query}
                routes={filteredRoutes}
                setQuery={setQuery}
              />}
            </aside>
          </div>
        </section>

        <section className="executive-support-grid" aria-label={isAr ? "التحليلات الداعمة" : "Supporting analytics"}>
          <ProgrammeProgress routes={filteredRoutes} locale={locale} />
          <BudgetView contracts={filteredContracts} locale={locale} />
          <CharacteristicsView features={filteredInventory} locale={locale} region={region} />
        </section>

        <ExecutiveInsights routes={filteredRoutes} inventoryFeatures={filteredInventory} locale={locale} />

        <details className="executive-methodology executive-methodology-bottom">
          <summary><Info />{isAr ? "تفاصيل المصادر وحدود المقارنة" : "Source details & comparison boundaries"}<ChevronDown /></summary>
          <MethodologyContent summary={summary} locale={locale} />
        </details>
      </main>
    </section>
  );
}

function FilterDropdown({ id, label, locale, value, options, onChange }: { id: string; label: string; locale: "en" | "ar"; value: string; options: FilterOption[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = options.find((option) => option.value === value) ?? options[0];
  const menuId = `executive-filter-${id}-menu`;
  const unavailable = options.length <= 1;
  const displayValue = unavailable ? (locale === "ar" ? "غير متاح في المصدر" : "Not available in source") : selected?.label ?? value;

  useEffect(() => {
    const closeOther = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) setOpen(false);
    };
    window.addEventListener("adsc:open-filter", closeOther);
    return () => window.removeEventListener("adsc:open-filter", closeOther);
  }, [id]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) window.dispatchEvent(new CustomEvent("adsc:open-filter", { detail: id }));
  };

  const focusEnabledOption = (fromIndex: number, direction: 1 | -1) => {
    for (let offset = 1; offset <= options.length; offset += 1) {
      const index = (fromIndex + direction * offset + options.length) % options.length;
      if (!(options[index].disabled && options[index].value !== value)) {
        optionRefs.current[index]?.focus();
        return;
      }
    }
  };

  const openFromKeyboard = (direction: 1 | -1) => {
    setOpen(true);
    window.dispatchEvent(new CustomEvent("adsc:open-filter", { detail: id }));
    window.requestAnimationFrame(() => {
      const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
      const targetIndex = direction === 1 ? selectedIndex : selectedIndex || options.length;
      focusEnabledOption(targetIndex - direction, direction);
    });
  };

  return <div className={`executive-filter-dropdown ${open ? "is-open" : ""}`} ref={rootRef}>
    <button ref={triggerRef} type="button" className="executive-filter-trigger" aria-label={`${label}: ${displayValue}`} aria-haspopup="listbox" aria-controls={menuId} aria-expanded={open} disabled={unavailable} onClick={toggle} onKeyDown={(event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        openFromKeyboard(event.key === "ArrowDown" ? 1 : -1);
      }
    }}>
      <span><small>{label}</small><strong>{displayValue}</strong></span>
      <ChevronDown />
    </button>
    {open ? <div className="executive-filter-menu" id={menuId} role="listbox" aria-label={label}>
      {options.map((option, index) => <button ref={(node) => { optionRefs.current[index] = node; }} key={option.value} type="button" role="option" aria-selected={option.value === value} disabled={option.disabled && option.value !== value} onClick={() => { onChange(option.value); setOpen(false); triggerRef.current?.focus(); }} onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          focusEnabledOption(index, event.key === "ArrowDown" ? 1 : -1);
        } else if (event.key === "Home" || event.key === "End") {
          event.preventDefault();
          focusEnabledOption(event.key === "Home" ? options.length - 1 : 0, event.key === "Home" ? 1 : -1);
        }
      }}>
        <span><strong>{option.label}</strong>{option.disabled && option.value !== value ? <small>{locale === "ar" ? "لا توجد بيانات مطابقة" : "No matching data"}</small> : null}</span>
        {option.count != null ? <em>{new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-GB").format(option.count)}</em> : null}
        <i>{option.value === value ? <Check /> : null}</i>
      </button>)}
    </div> : null}
  </div>;
}

function ExecutiveKpi({ icon: Icon, label, value, decimals, prefix = "", suffix, note, tone = "teal" }: { icon: LucideIcon; label: string; value: number; decimals: number; prefix?: string; suffix: string; note: string; tone?: "teal" | "blue" | "green" | "gold" }) {
  return <article className={`executive-kpi is-${tone}`}><span><Icon /></span><div><small>{label}</small><strong><CountUp value={value} decimals={decimals} prefix={prefix} suffix={suffix} /></strong><em>{note}</em></div></article>;
}

function TrackExplorer({ inventory, locale, onSelectFeature, onSelectRoute, query, routes, setQuery }: {
  inventory: InventoryFeature[]; locale: "en" | "ar"; onSelectFeature: (feature: InventoryFeature) => void; onSelectRoute: (route: NetworkRoute) => void; query: string; routes: NetworkRoute[]; setQuery: (value: string) => void;
}) {
  const isAr = locale === "ar";
  const listRef = useRef<HTMLDivElement | null>(null);
  const normalized = query.trim().toLowerCase();
  const visibleRoutes = routes.filter((route) => !normalized || `${route.name} ${route.label} ${route.contractor} ${route.packageName} ${routeLabel(route, locale)} ${routePackageLabel(route, locale)} ${routeContractorLabel(route, locale)}`.toLowerCase().includes(normalized));
  const matchingInventory = inventory.filter((feature) => !normalized || `${feature.properties.name} ${feature.properties.nameAr ?? ""} ${feature.properties.city ?? ""} ${feature.properties.zone ?? ""} ${inventoryFeatureLabel(feature, locale)}`.toLowerCase().includes(normalized));
  const visibleInventory = matchingInventory.slice(0, 80);
  useEffect(() => { listRef.current?.scrollTo({ top: 0, behavior: "auto" }); }, [inventory, query, routes]);
  return <div className="executive-track-explorer">
    <header><div><p>{isAr ? "استكشاف المسارات" : "TRACK EXPLORER"}</p><h3>{isAr ? "بحث واختيار" : "Search & select"}</h3></div><span>{visibleRoutes.length} {isAr ? "برنامج" : "programme"} · {matchingInventory.length} {isAr ? "مسار بلدي" : "mapped"}</span></header>
    <div className="executive-track-search"><Search /><input aria-label={isAr ? "البحث في المسارات" : "Search tracks"} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isAr ? "ابحث بالاسم أو الحزمة أو المقاول" : "Search name, package, contractor or place"} />{query ? <button onClick={() => setQuery("")} aria-label={isAr ? "مسح البحث" : "Clear search"}><X /></button> : null}</div>
    <div className="executive-track-list" data-lenis-prevent ref={listRef}>
      {visibleRoutes.length ? <div className="executive-list-group"><span>{isAr ? "مسارات البرنامج" : "Programme routes"}</span>{visibleRoutes.map((route) => <button key={route.id} onClick={() => onSelectRoute(route)}><i style={{ background: route.color }} /><span><strong>{routeLabel(route, locale)}</strong><small>{routePackageLabel(route, locale)} · {statusText[locale][route.status]}</small></span><em>{Math.round(progressOf(route))}%</em></button>)}</div> : null}
      {visibleInventory.length ? <div className="executive-list-group"><span>{isAr ? "المخزون البلدي" : "Municipal inventory"}</span>{visibleInventory.map((feature) => <button key={feature.properties.id} onClick={() => onSelectFeature(feature)}><i style={{ background: regionColors[feature.properties.municipality] }} /><span><strong>{inventoryFeatureLabel(feature, locale)}</strong><small>{regionLabel(feature.properties.municipality, locale)} · {inventoryClassLabel(feature.properties.featureClass, locale)}</small></span><em>{fmt(feature.properties.lengthM / 1000, 2)} {distanceUnit(locale)}</em></button>)}{matchingInventory.length > visibleInventory.length ? <p className="executive-list-limit">{isAr ? "حسّن البحث لعرض المزيد" : `Refine search to inspect the remaining ${matchingInventory.length - visibleInventory.length} mapped tracks.`}</p> : null}</div> : null}
      {!visibleRoutes.length && !visibleInventory.length ? <div className="executive-list-empty"><Search /><strong>{isAr ? "لا توجد نتائج" : "No matching tracks"}</strong><span>{isAr ? "جرّب توسيع المرشحات أو تغيير البحث." : "Broaden the global filters or change the search."}</span></div> : null}
    </div>
  </div>;
}

function TrackDetails({ locale, selected, onClear }: { locale: "en" | "ar"; selected: SelectedTrack; onClear: () => void }) {
  const isAr = locale === "ar";
  if (!selected) return <div className="executive-track-empty"><MapPinned /><h3>{isAr ? "اختر مساراً" : "Select a track"}</h3><p>{isAr ? "استخدم الخريطة أو القائمة لعرض تفاصيل الأصل." : "Use the map or searchable list to open source-backed details."}</p></div>;
  const back = <button type="button" className="executive-detail-back" onClick={onClear}><ArrowLeft /><span>{isAr ? "العودة إلى قائمة المسارات" : "Back to track list"}</span></button>;
  if (selected.kind === "programme") {
    const route = selected.route;
    return <section className="executive-selected-detail">{back}<header><span style={{ background: route.color }} /><div><small>{isAr ? "مسار برنامج محدد" : "SELECTED PROGRAMME ROUTE"}</small><h3>{routeLabel(route, locale)}</h3></div></header><div className="executive-detail-progress"><span><b>{Math.round(progressOf(route))}%</b>{isAr ? "مكتمل" : "complete"}</span><div><i style={{ width: `${Math.min(100, progressOf(route))}%`, background: route.color }} /></div><small>{fmt(route.completedKm)} / {fmt(route.plannedKm)} {distanceUnit(locale)}</small></div><dl><Detail label={isAr ? "المنطقة" : "Region"} value={isAr ? "برنامج أبوظبي" : "Abu Dhabi programme"} /><Detail label={isAr ? "الحزمة" : "Package"} value={routePackageLabel(route, locale)} /><Detail label={isAr ? "التوقع" : "Forecast"} value={formatForecast(route.forecast, locale)} /><Detail label={isAr ? "المقاول" : "Contractor"} value={routeContractorLabel(route, locale)} wide /><Detail label={isAr ? "الحالة" : "Status"} value={statusText[locale][route.status]} /><Detail label={isAr ? "سرعة التصميم" : "Design speed"} value={routeDesignSpeedLabel(route, locale)} /><Detail label={isAr ? "حالة الأصل" : "Condition"} value={isAr ? "غير مسجل في مصدر البرنامج" : "Not recorded in programme source"} /><Detail label={isAr ? "العرض / المادة / الاتجاه" : "Width / material / direction"} value={isAr ? "غير مسجل في مصدر البرنامج" : "Not recorded in programme source"} wide /></dl>{route.structures ? <p className="executive-detail-note"><Layers3 />{routeStructuresLabel(route, locale)}</p> : null}</section>;
  }
  const p = selected.feature.properties;
  const missing = isAr ? "غير مسجل في المخزون البلدي" : "Not recorded in municipal inventory";
  return <section className="executive-selected-detail">{back}<header><span style={{ background: regionColors[p.municipality] }} /><div><small>{isAr ? "أصل مكاني بلدي" : "MUNICIPAL GIS TRACK"}</small><h3>{inventoryFeatureLabel(selected.feature, locale)}</h3></div></header><dl><Detail label={isAr ? "المنطقة" : "Region"} value={regionLabel(p.municipality, locale)} /><Detail label={isAr ? "الفئة" : "Class"} value={inventoryClassLabel(p.featureClass, locale)} /><Detail label={isAr ? "الطول" : "Length"} value={`${fmt(p.lengthM / 1000, 2)} ${distanceUnit(locale)}`} /><Detail label={isAr ? "العرض" : "Width"} value={p.widthM == null ? missing : `${fmt(p.widthM, 2)} ${metreUnit(locale)}`} /><Detail label={isAr ? "الحالة" : "Condition"} value={p.condition ? inventoryValueLabel(p.condition, locale) : missing} /><Detail label={isAr ? "المادة" : "Material"} value={p.material ? inventoryValueLabel(p.material, locale) : missing} /><Detail label={isAr ? "الاتجاه" : "Direction"} value={p.direction ? inventoryValueLabel(p.direction, locale) : missing} /><Detail label={isAr ? "الإنارة" : "Lighting"} value={p.lighting ? inventoryValueLabel(p.lighting, locale) : missing} /><Detail label={isAr ? "التظليل" : "Shading"} value={p.shading ? inventoryValueLabel(p.shading, locale) : missing} /><Detail label={isAr ? "مواقف الدراجات" : "Bike spaces"} value={p.bikeSpaces == null ? missing : String(p.bikeSpaces)} /><Detail label={isAr ? "التقدم / التوقع" : "Progress / forecast"} value={missing} wide /><Detail label={isAr ? "المقاول" : "Contractor"} value={missing} wide /></dl></section>;
}

function Detail({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={wide ? "is-wide" : ""}><dt>{label}</dt><dd>{value}</dd></div>;
}

function ProgrammeProgress({ routes, locale }: { routes: NetworkRoute[]; locale: "en" | "ar" }) {
  const isAr = locale === "ar";
  return <section className="executive-support-card executive-progress-card"><header><div><p>{isAr ? "تقدم البرنامج" : "PROGRAMME PROGRESS"}</p><h2>{isAr ? "التنفيذ حسب المسار والحزمة" : "Delivery by route / package"}</h2></div><Route /></header><div className="executive-progress-list">{routes.length ? routes.map((route) => <article key={route.id}><span><strong>{routeLabel(route, locale)}</strong><small>{routeContractorLabel(route, locale)} · {formatForecast(route.forecast, locale)}</small></span><div><i style={{ width: `${Math.min(100, progressOf(route))}%`, background: route.color }} /></div><b>{fmt(route.completedKm)} / {fmt(route.plannedKm)} {distanceUnit(locale)}</b><em>{Math.round(progressOf(route))}%</em></article>) : <EmptyState locale={locale} />}</div></section>;
}

function BudgetView({ contracts: visibleContracts, locale }: { contracts: typeof contracts[number][]; locale: "en" | "ar" }) {
  const isAr = locale === "ar";
  const max = Math.max(1, ...visibleContracts.map((item) => item.valueM ?? 0));
  return <section className="executive-support-card executive-budget-card"><header><div><p>{isAr ? "الميزانية" : "EXECUTIVE BUDGET"}</p><h2>{isAr ? "الاحتياج والتمويل" : "Requirement & funding"}</h2></div><Banknote /></header><div className="executive-budget-summary"><div><small>{isAr ? "المعتمد" : "Approved"}</small><strong>{budgetBillions(fmt(programme.approvedBudgetBn), locale)}</strong></div><div><small>{isAr ? "المطلوب" : "Required"}</small><strong>{budgetBillions(fmt(programme.neededBudgetBn), locale)}</strong></div><div className="is-gap"><small>{isAr ? "الفجوة" : "Funding gap"}</small><strong>{budgetBillions(fmt(programme.neededBudgetBn - programme.approvedBudgetBn), locale)}</strong></div></div><div className="executive-funding-bar"><i style={{ width: `${(programme.approvedBudgetBn / programme.neededBudgetBn) * 100}%` }} /><span>{fmt((programme.approvedBudgetBn / programme.neededBudgetBn) * 100)}% {isAr ? "ممولة" : "funded"}</span></div><div className="executive-contract-bars">{visibleContracts.length ? visibleContracts.map((contract) => <div key={contract.id}><span><strong>{isAr ? contract.nameAr : contract.name}</strong><small>{"note" in contract ? (isAr ? contract.noteAr : contract.note) : null}</small></span><div><i style={{ width: `${contract.valueM == null ? 4 : (contract.valueM / max) * 100}%` }} /></div><b>{isAr ? contract.displayAr : contract.display}</b></div>) : <EmptyState locale={locale} />}</div><p className="executive-card-footnote">{isAr ? "القيم كما وردت في المصدر؛ لا يتم جمع النطاقات الأساسية والاختيارية وغير المخصصة." : "Source-listed values only; base, optional, and unallocated scopes are not summed."}</p></section>;
}

function CharacteristicsView({ features, locale, region }: { features: InventoryFeature[]; locale: "en" | "ar"; region: RegionCode }) {
  const isAr = locale === "ar";
  const lengthKm = features.reduce((sum, feature) => sum + feature.properties.lengthM, 0) / 1000;
  const condition = distribution(features.map((feature) => feature.properties.condition), locale);
  const material = distribution(features.map((feature) => feature.properties.material), locale);
  return <section className="executive-support-card executive-characteristics-card"><header><div><p>{isAr ? "خصائص الشبكة" : "NETWORK CHARACTERISTICS"}</p><h2>{regionLabel(region, locale)}</h2></div><Bike /></header><div className="executive-characteristic-total"><strong>{fmt(lengthKm)} {distanceUnit(locale)}</strong><span>{isAr ? "طول مسجل ضمن مرشح الخريطة" : "source-recorded length in the current map filter"}</span></div><CompactDistribution title={isAr ? "الحالة" : "Condition"} values={condition} empty={isAr ? "غير مسجل" : "Not recorded"} /><CompactDistribution title={isAr ? "المادة" : "Material"} values={material} empty={isAr ? "غير مسجل" : "Not recorded"} /><p className="executive-card-footnote">{isAr ? "تظهر خصائص المسار هنا بدلاً من صفحة تحليل مستقلة." : "Track characteristics are integrated here instead of a separate analysis page."}</p></section>;
}

function distribution(values: Array<string | null>, locale: "en" | "ar") {
  const counts = new Map<string, number>();
  values.forEach((value) => { if (value) { const label = inventoryValueLabel(value, locale); counts.set(label, (counts.get(label) ?? 0) + 1); } });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
}

function CompactDistribution({ title, values, empty }: { title: string; values: Array<[string, number]>; empty: string }) {
  const total = values.reduce((sum, [, value]) => sum + value, 0);
  return <div className="executive-compact-distribution"><h3>{title}</h3>{values.length ? values.map(([label, value]) => <div key={label}><span>{label}</span><i><b style={{ width: `${(value / total) * 100}%` }} /></i><em>{Math.round((value / total) * 100)}%</em></div>) : <p>{empty}</p>}</div>;
}

function ExecutiveInsights({ routes, inventoryFeatures, locale }: { routes: NetworkRoute[]; inventoryFeatures: InventoryFeature[]; locale: "en" | "ar" }) {
  const isAr = locale === "ar";
  const leader = [...routes].sort((a, b) => progressOf(b) - progressOf(a))[0];
  const largestRemaining = [...routes].sort((a, b) => (b.plannedKm - b.completedKm) - (a.plannedKm - a.completedKm))[0];
  const mappedKm = inventoryFeatures.reduce((sum, feature) => sum + feature.properties.lengthM, 0) / 1000;
  return <section className="executive-insights"><header><div><p>{isAr ? "رؤية تنفيذية" : "EXECUTIVE INSIGHTS"}</p><h2>{isAr ? "ما تقوله البيانات الحالية" : "What the current data says"}</h2></div><Target /></header><div>{leader ? <article><CheckCircle2 /><span><strong>{isAr ? "أقوى إشارة تنفيذ" : "Delivery signal"}</strong><p>{routeLabel(leader, locale)} {isAr ? "هو الأكثر تقدماً ضمن المرشح بنسبة" : "is the most advanced filtered route at"} {fmt(progressOf(leader))}%.</p></span></article> : null}{largestRemaining ? <article><CalendarClock /><span><strong>{isAr ? "أكبر نطاق متبقٍ" : "Largest remaining scope"}</strong><p>{routeLabel(largestRemaining, locale)} {isAr ? "يتبقى له" : "has"} {fmt(largestRemaining.plannedKm - largestRemaining.completedKm)} {distanceUnit(locale)} {isAr ? "ومتوقع في" : "remaining, forecast"} {formatForecast(largestRemaining.forecast, locale)}.</p></span></article> : null}<article><CircleDollarSign /><span><strong>{isAr ? "قرار التمويل" : "Funding decision"}</strong><p>{isAr ? "الفجوة على مستوى البرنامج" : "The programme-wide funding gap is"} {budgetBillions(fmt(programme.neededBudgetBn - programme.approvedBudgetBn), locale)}{isAr ? "؛" : ";"} {fmt((programme.approvedBudgetBn / programme.neededBudgetBn) * 100)}% {isAr ? "من الاحتياج ممول." : "of the stated requirement is funded."}</p></span></article><article><MapPinned /><span><strong>{isAr ? "سياق الخريطة" : "Mapped context"}</strong><p>{fmt(mappedKm)} {distanceUnit(locale)} {isAr ? "من الطول المسجل بالمصدر يطابق مرشحات المنطقة والفئة والخصائص الحالية." : "of source-recorded geometry matches the active region, layer, and characteristic filters."}</p></span></article></div></section>;
}

function EmptyState({ locale }: { locale: "en" | "ar" }) {
  return <div className="executive-inline-empty"><Search /><span>{locale === "ar" ? "لا توجد بيانات مطابقة للمرشحات الحالية." : "No source records match the current filters."}</span></div>;
}

function MethodologyContent({ summary, locale }: { summary: InventorySummary | null; locale: "en" | "ar" }) {
  const isAr = locale === "ar";
  return <div className="executive-methodology-content"><div><strong>{isAr ? "مصدر البرنامج" : "Programme source"}</strong><p>{isAr ? "تقرير حالة تقدم مشروع مسارات الدراجات · ديسمبر 2025." : summary?.methodology.programmeScope ?? "Cycling project Progress Status report · December 2025."}</p></div><div><strong>{isAr ? "مصدر المخزون المكاني" : "GIS inventory source"}</strong><p>{isAr ? "هندسة بلدية مؤهلة ومحوّلة إلى النظام الجغرافي العالمي للعرض على الخريطة." : summary?.methodology.inventory ?? "Qualified municipal geometry transformed to WGS84 for web-map rendering."}</p></div><div><strong>{isAr ? "حد المقارنة" : "Comparison boundary"}</strong><p>{isAr ? "لا يتم افتراض تطابق حزم البرنامج مع سجلات المخزون البلدي." : summary?.methodology.comparability ?? "Programme packages are not assumed to match municipal inventory records."}</p></div><div><strong>{isAr ? "طريقة التفاعل" : "Interaction rule"}</strong><p>{isAr ? "مرشحات البرنامج تحدث مؤشرات التنفيذ والميزانية وطبقات المسارات؛ ومرشحات المخزون تحدث الهندسة والقائمة والخصائص." : "Programme filters update delivery KPIs, budget analytics, and route overlays; inventory filters update municipal geometry, list results, and characteristics."}</p></div></div>;
}
