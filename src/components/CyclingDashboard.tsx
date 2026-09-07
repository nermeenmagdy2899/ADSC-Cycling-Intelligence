import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
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
  Moon,
  RefreshCcw,
  Route,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Target,
  Waypoints,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CountUp } from "./CountUp";
import { InventoryMap } from "./InventoryMap";
import { loadAsBuilt, type AsBuiltCollection, type AsBuiltSummary } from "../data/asbuilt";
import { isDecisionFacingInventoryFeature, loadInventory, regionColors, regionLabel, type InventoryCollection, type InventoryFeature, type RegionCode } from "../data/inventory";
import { currentProgrammeStatus, networkRoutes, programme, type NetworkRoute, type RouteStatus } from "../data/network";
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
type InventoryFilterKey = "region" | "conditionFilter" | "widthFilter";
type WidthBand = "all" | "under-2.5" | "2.5-3.49" | "3.5-4.49" | "4.5-plus";
type DashboardFilters = {
  region: RegionCode;
  routeFilter: FilterValue;
  packageFilter: FilterValue;
  statusFilter: FilterValue;
  contractorFilter: FilterValue;
  conditionFilter: FilterValue;
  widthFilter: WidthBand;
  forecastFilter: FilterValue;
};

const defaultFilters: DashboardFilters = {
  region: "all",
  routeFilter: "all",
  packageFilter: "all",
  statusFilter: "all",
  contractorFilter: "all",
  conditionFilter: "all",
  widthFilter: "all",
  forecastFilter: "all"
};

const statusOptions: RouteStatus[] = ["construction", "design-build", "design", "not-started"];

const contracts = [
  { id: "c-p12", routeIds: ["track-1-p12"], name: "Track 1 · Packages 1 & 2", nameAr: "المسار 1 · الحزمتان 1 و2", valueM: 168, display: "AED 168m", displayAr: "168 مليون درهم" },
  { id: "c-p34", routeIds: ["track-1-p34"], name: "Track 1 · Packages 3 & 4", nameAr: "المسار 1 · الحزمتان 3 و4", valueM: 185, display: "AED 185m", displayAr: "185 مليون درهم" },
  { id: "c-2a", routeIds: ["track-2-a"], name: "Track 2 · Section A", nameAr: "المسار 2 · القسم أ", valueM: 445, display: "AED 445m", displayAr: "445 مليون درهم" },
  { id: "c-2b", routeIds: ["track-2-b"], name: "Track 2 · Section B", nameAr: "المسار 2 · القسم ب", valueM: 130, display: "AED 130m base", displayAr: "130 مليون درهم — النطاق الأساسي", note: "AED 889m overall scope listed separately", noteAr: "نطاق إجمالي بقيمة 889 مليون درهم مدرج بشكل منفصل" },
  { id: "c-34", routeIds: ["track-3", "track-4"], name: "Tracks 3 & 4", nameAr: "المساران 3 و4", valueM: 328, display: "AED 328m", displayAr: "328 مليون درهم" }
] as const;

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b));
}

function progressOf(route: NetworkRoute) {
  return route.progressPct;
}

function monthValue(value: string) {
  const parsed = Date.parse(`1 ${value}`);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function fmt(value: number, decimals = 1) {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(value);
}

function matchesProgramme(route: NetworkRoute, filters: Record<ProgrammeFilterKey, string>) {
  const routeMatches = filters.routeFilter === "all"
    || route.id === filters.routeFilter
    || (filters.routeFilter === "track-1" && (route.id === "track-1-p12" || route.id === "track-1-p34"))
    || (filters.routeFilter === "tracks-3-4" && (route.id === "track-3" || route.id === "track-4"));
  const currentDimensionActive = filters.packageFilter !== "all"
    || filters.statusFilter !== "all"
    || filters.contractorFilter !== "all"
    || filters.forecastFilter !== "all";
  return routeMatches
    && (!route.currentSourceGap || !currentDimensionActive)
    && (filters.packageFilter === "all" || route.packageName === filters.packageFilter)
    && (filters.statusFilter === "all" || route.status === filters.statusFilter)
    && (filters.contractorFilter === "all" || route.contractor === filters.contractorFilter)
    && (filters.forecastFilter === "all" || route.forecast === filters.forecastFilter);
}

function matchesInventory(feature: InventoryFeature, filters: Record<InventoryFilterKey, string>) {
  const widthMatches = filters.widthFilter === "all"
    || (feature.properties.widthM != null && (
      (filters.widthFilter === "under-2.5" && feature.properties.widthM < 2.5)
      || (filters.widthFilter === "2.5-3.49" && feature.properties.widthM >= 2.5 && feature.properties.widthM < 3.5)
      || (filters.widthFilter === "3.5-4.49" && feature.properties.widthM >= 3.5 && feature.properties.widthM < 4.5)
      || (filters.widthFilter === "4.5-plus" && feature.properties.widthM >= 4.5)
    ));
  return (filters.region === "all" || feature.properties.municipality === filters.region)
    && (filters.conditionFilter === "all" || feature.properties.condition === filters.conditionFilter)
    && widthMatches;
}

export function CyclingDashboard() {
  const { locale, theme, setLocale, setTheme } = useNetworkStore();
  const isAr = locale === "ar";
  const [inventory, setInventory] = useState<InventoryCollection | null>(null);
  const [asBuilt, setAsBuilt] = useState<AsBuiltCollection | null>(null);
  const [asBuiltSummary, setAsBuiltSummary] = useState<AsBuiltSummary | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);
  const {
    region, routeFilter, packageFilter, statusFilter, contractorFilter,
    conditionFilter, widthFilter, forecastFilter
  } = filters;
  const updateFilter = useCallback(<K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  }, []);
  const setRegion = useCallback((value: RegionCode) => updateFilter("region", value), [updateFilter]);
  const setRouteFilter = useCallback((value: FilterValue) => updateFilter("routeFilter", value), [updateFilter]);
  const setPackageFilter = useCallback((value: FilterValue) => updateFilter("packageFilter", value), [updateFilter]);
  const setStatusFilter = useCallback((value: FilterValue) => updateFilter("statusFilter", value), [updateFilter]);
  const setContractorFilter = useCallback((value: FilterValue) => updateFilter("contractorFilter", value), [updateFilter]);
  const setConditionFilter = useCallback((value: FilterValue) => updateFilter("conditionFilter", value), [updateFilter]);
  const setWidthFilter = useCallback((value: WidthBand) => updateFilter("widthFilter", value), [updateFilter]);
  const setForecastFilter = useCallback((value: FilterValue) => updateFilter("forecastFilter", value), [updateFilter]);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedFeature, setSelectedFeature] = useState<InventoryFeature | null>(null);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.allSettled([loadInventory(), loadAsBuilt()]).then(([inventoryResult, asBuiltResult]) => {
      if (!active) return;
      if (inventoryResult.status === "fulfilled") {
        setInventory(inventoryResult.value[0]);
      } else setLoadError(true);
      if (asBuiltResult.status === "fulfilled") {
        setAsBuilt(asBuiltResult.value[0]);
        setAsBuiltSummary(asBuiltResult.value[1]);
      }
    });
    return () => { active = false; };
  }, []);

  const decisionInventory = useMemo(() => inventory?.features.filter(isDecisionFacingInventoryFeature) ?? [], [inventory]);
  const inventoryOptions = useMemo(() => ({
    conditions: unique(decisionInventory.map((feature) => feature.properties.condition))
  }), [decisionInventory]);

  const routeOptions = useMemo(() => ({
    packages: unique(networkRoutes.filter((route) => !route.currentSourceGap).map((route) => route.packageName)),
    contractors: unique(networkRoutes.filter((route) => !route.currentSourceGap).map((route) => route.contractor)),
    forecasts: unique(networkRoutes.filter((route) => !route.currentSourceGap).map((route) => route.forecast)).sort((a, b) => monthValue(a) - monthValue(b))
  }), []);

  const programmeFilterState = useMemo<Record<ProgrammeFilterKey, string>>(() => ({
    routeFilter, packageFilter, statusFilter, contractorFilter, forecastFilter
  }), [contractorFilter, forecastFilter, packageFilter, routeFilter, statusFilter]);
  const inventoryFilterState = useMemo<Record<InventoryFilterKey, string>>(() => ({
    region, conditionFilter, widthFilter
  }), [conditionFilter, region, widthFilter]);

  const programmeCount = useCallback((field: ProgrammeFilterKey, value: string) => networkRoutes.filter((route) => (
    matchesProgramme(route, { ...programmeFilterState, [field]: value })
  )).length, [programmeFilterState]);
  const inventoryCount = useCallback((field: InventoryFilterKey, value: string) => decisionInventory.filter((feature) => (
    matchesInventory(feature, { ...inventoryFilterState, [field]: value })
  )).length, [decisionInventory, inventoryFilterState]);

  const filteredRoutes = useMemo(() => (
    region === "all" || region === "ADM"
      ? networkRoutes.filter((route) => matchesProgramme(route, programmeFilterState))
      : []
  ), [programmeFilterState, region]);

  const filteredInventory = useMemo(() => decisionInventory.filter((feature) => matchesInventory(feature, inventoryFilterState)), [decisionInventory, inventoryFilterState]);
  const mapInventory = useMemo<InventoryCollection | null>(() => inventory ? ({
    ...inventory,
    features: decisionInventory.filter((feature) => matchesInventory(feature, {
      ...inventoryFilterState,
      region: "all",
      conditionFilter: "all"
    }))
  }) : null, [decisionInventory, inventory, inventoryFilterState]);
  const programmeRoutesForMap = useMemo(() => (
    selectedFeature || region === "AAM" || region === "DRM" ? [] : filteredRoutes.filter((route) => route.currentProgramme || route.currentSourceGap)
  ), [filteredRoutes, region, selectedFeature]);
  const asBuiltForMap = useMemo(() => (
    !selectedFeature && (region === "all" || region === "ADM")
      ? (filteredRoutes.some((route) => route.id === "track-1-p12" || route.id === "track-1-p34") ? asBuilt : null)
      : null
  ), [asBuilt, filteredRoutes, region, selectedFeature]);

  useEffect(() => {
    if (selectedProgrammeId && !filteredRoutes.some((route) => route.id === selectedProgrammeId)) setSelectedProgrammeId(null);
  }, [filteredRoutes, selectedProgrammeId]);

  useEffect(() => {
    if (selectedFeature && !filteredInventory.some((feature) => feature.properties.id === selectedFeature.properties.id)) setSelectedFeature(null);
  }, [filteredInventory, selectedFeature]);

  const totals = useMemo(() => {
    const isHeadlineView = (region === "all" || region === "ADM")
      && [routeFilter, packageFilter, statusFilter, contractorFilter, forecastFilter].every((value) => value === "all");
    if (isHeadlineView) return {
      planned: currentProgrammeStatus.scopeKm,
      completed: currentProgrammeStatus.completedKm,
      remaining: currentProgrammeStatus.remainingKm,
      progress: currentProgrammeStatus.deliveryPct,
      available: true,
      sourceNote: isAr ? "الإجمالي الرئيسي · أغسطس 2026" : "Programme headline · Aug 2026"
    };
    const currentRoutes = filteredRoutes.filter((route) => route.currentProgramme);
    const planned = currentRoutes.reduce((sum, route) => sum + route.plannedKm, 0);
    const completed = currentRoutes.reduce((sum, route) => sum + route.completedKm, 0);
    const remaining = currentRoutes.reduce((sum, route) => sum + route.remainingKm, 0);
    const progress = currentRoutes.length === 1 ? currentRoutes[0].progressPct : planned > 0 ? (completed / planned) * 100 : 0;
    const currentSourceGap = filteredRoutes.some((route) => route.currentSourceGap);
    return { planned, completed, remaining, progress, available: currentRoutes.length > 0, sourceNote: currentRoutes.length ? (isAr ? "صفوف المسارات · أغسطس 2026" : "Route-table grain · Aug 2026") : currentSourceGap ? (isAr ? "HSCT · غير مدرج في مصدر أغسطس 2026" : "HSCT · not reported in the August 2026 source") : (isAr ? "لا توجد علاقة مدعومة بالمصدر" : "No source-supported relationship") };
  }, [contractorFilter, filteredRoutes, forecastFilter, isAr, packageFilter, region, routeFilter, statusFilter]);
  const selected: SelectedTrack = selectedProgrammeId
    ? { kind: "programme", route: networkRoutes.find((route) => route.id === selectedProgrammeId) ?? networkRoutes[0] }
    : selectedFeature ? { kind: "inventory", feature: selectedFeature } : null;

  const budgetRoutes = useMemo(() => (
    region === "all" || region === "ADM"
      ? networkRoutes.filter((route) => matchesProgramme(route, {
        routeFilter,
        packageFilter,
        statusFilter: "all",
        contractorFilter: "all",
        forecastFilter: "all"
      }))
      : []
  ), [packageFilter, region, routeFilter]);
  const filteredContracts = useMemo(() => {
    const ids = new Set(budgetRoutes.map((route) => route.id));
    return contracts.filter((contract) => contract.routeIds.some((id) => ids.has(id)));
  }, [budgetRoutes]);
  const budgetMode = routeFilter === "hsct"
    ? "current-source-gap"
    : region === "AAM" || region === "DRM"
      ? "unsupported-region"
    : routeFilter !== "all" || packageFilter !== "all" ? "mapped-subset" : "programme-wide";

  const hasFilters = Object.values(filters).some((value) => value !== "all");
  const resetFilters = () => {
    setFilters(defaultFilters); setQuery("");
    setSelectedFeature(null); setSelectedProgrammeId(null);
  };

  const selectProgramme = useCallback((id: string | null) => {
    setSelectedFeature(null);
    setSelectedProgrammeId(id);
    if (id) {
      setFilters((current) => ({ ...current, region: "ADM", routeFilter: id }));
    }
  }, []);

  const selectInventory = useCallback((feature: InventoryFeature | null) => {
    setSelectedProgrammeId(null);
    setSelectedFeature(feature);
    if (feature) {
      setFilters((current) => ({
        ...current,
        region: feature.properties.municipality,
        routeFilter: "all",
        packageFilter: "all",
        statusFilter: "all",
        contractorFilter: "all",
        forecastFilter: "all"
      }));
    }
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
    selectInventory(feature);
  }, [selectInventory]);

  const selectContractRoutes = useCallback((routeIds: readonly string[]) => {
    setSelectedFeature(null);
    if (routeIds.length === 1) {
      selectProgramme(routeIds[0]);
      return;
    }
    setSelectedProgrammeId(null);
    setFilters((current) => ({ ...current, region: "ADM", routeFilter: "tracks-3-4" }));
  }, [selectProgramme]);

  const selectInventoryCharacteristic = useCallback((field: "conditionFilter", value: string) => {
    setSelectedProgrammeId(null);
    setSelectedFeature(null);
    setFilters((current) => ({ ...current, routeFilter: "all", [field]: value }));
  }, []);

  const regionFilterOptions: FilterOption[] = (["all", "ADM", "AAM", "DRM"] as RegionCode[]).map((value) => {
    const count = inventoryCount("region", value);
    return { value, label: regionLabel(value, locale), count };
  });
  const routeFilterOptions: FilterOption[] = [
    { value: "all", label: isAr ? "جميع مسارات البرنامج" : "All programme routes", count: programmeCount("routeFilter", "all") },
    { value: "track-1", label: isAr ? "المسار 1 · جميع الحزم" : "Track 1 · all packages", count: programmeCount("routeFilter", "track-1"), disabled: programmeCount("routeFilter", "track-1") === 0 },
    { value: "tracks-3-4", label: isAr ? "المساران 3 و4 · العقد المشترك" : "Tracks 3 & 4 · shared contract", count: programmeCount("routeFilter", "tracks-3-4"), disabled: programmeCount("routeFilter", "tracks-3-4") === 0 },
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
  const widthFilterOptions: FilterOption[] = ([
    ["all", isAr ? "جميع العروض المسجلة" : "All recorded widths"],
    ["under-2.5", isAr ? "أقل من 2.5 م" : "Under 2.5 m"],
    ["2.5-3.49", isAr ? "2.5–3.49 م" : "2.5–3.49 m"],
    ["3.5-4.49", isAr ? "3.5–4.49 م" : "3.5–4.49 m"],
    ["4.5-plus", isAr ? "4.5 م فأكثر" : "4.5 m and wider"]
  ] as const).map(([value, label]) => { const count = inventoryCount("widthFilter", value); return { value, label, disabled: Boolean(inventory) && value !== "all" && count === 0 }; });
  const activeChips = [
    region !== "all" ? { key: "region", label: `${isAr ? "المنطقة" : "Region"}: ${regionLabel(region, locale)}`, clear: () => changeRegion("all") } : null,
    routeFilter !== "all" ? { key: "route", label: `${isAr ? "المسار" : "Route"}: ${routeFilterOptions.find((option) => option.value === routeFilter)?.label}`, clear: () => { setRouteFilter("all"); setSelectedProgrammeId(null); } } : null,
    packageFilter !== "all" ? { key: "package", label: `${isAr ? "الحزمة" : "Package"}: ${packageFilterOptions.find((option) => option.value === packageFilter)?.label}`, clear: () => setPackageFilter("all") } : null,
    statusFilter !== "all" ? { key: "status", label: `${isAr ? "الحالة" : "Status"}: ${statusFilterOptions.find((option) => option.value === statusFilter)?.label}`, clear: () => setStatusFilter("all") } : null,
    contractorFilter !== "all" ? { key: "contractor", label: `${isAr ? "المقاول" : "Contractor"}: ${contractorFilterOptions.find((option) => option.value === contractorFilter)?.label}`, clear: () => setContractorFilter("all") } : null,
    conditionFilter !== "all" ? { key: "condition", label: `${isAr ? "حالة الأصل" : "Condition"}: ${conditionFilterOptions.find((option) => option.value === conditionFilter)?.label}`, clear: () => setConditionFilter("all") } : null,
    widthFilter !== "all" ? { key: "width", label: `${isAr ? "العرض" : "Width"}: ${widthFilterOptions.find((option) => option.value === widthFilter)?.label}`, clear: () => setWidthFilter("all") } : null,
    forecastFilter !== "all" ? { key: "forecast", label: `${isAr ? "التوقع" : "Forecast"}: ${forecastFilterOptions.find((option) => option.value === forecastFilter)?.label}`, clear: () => setForecastFilter("all") } : null,
    selectedFeature ? { key: "selection", label: `${isAr ? "المحدد" : "Selected"}: ${inventoryFeatureLabel(selectedFeature, locale)}`, clear: () => setSelectedFeature(null) } : null
  ].filter((chip): chip is { key: string; label: string; clear: () => void } => Boolean(chip));
  const routeScopeName = routeFilter === "all"
    ? null
    : routeFilterOptions.find((option) => option.value === routeFilter)?.label ?? routeFilter;
  const programmeScopeParts = [
    region === "AAM" || region === "DRM" ? regionLabel(region, locale) : (isAr ? "برنامج أبوظبي" : "Abu Dhabi programme"),
    routeScopeName,
    packageFilter !== "all" ? packageFilterOptions.find((option) => option.value === packageFilter)?.label : null,
    statusFilter !== "all" ? statusFilterOptions.find((option) => option.value === statusFilter)?.label : null,
    contractorFilter !== "all" ? contractorFilterOptions.find((option) => option.value === contractorFilter)?.label : null,
    forecastFilter !== "all" ? forecastFilterOptions.find((option) => option.value === forecastFilter)?.label : null
  ].filter(Boolean).join(" · ");
  const inventoryScopeParts = [
    selectedFeature ? `${isAr ? "المحدد" : "Selected"}: ${inventoryFeatureLabel(selectedFeature, locale)}` : null,
    regionLabel(region, locale),
    conditionFilter !== "all" ? inventoryValueLabel(conditionFilter, locale) : null,
    widthFilter !== "all" ? widthFilterOptions.find((option) => option.value === widthFilter)?.label : null
  ].filter(Boolean).join(" · ");
  const budgetScopeParts = [
    region === "AAM" || region === "DRM" ? regionLabel(region, locale) : (isAr ? "برنامج أبوظبي" : "Abu Dhabi programme"),
    routeScopeName,
    packageFilter !== "all" ? packageFilterOptions.find((option) => option.value === packageFilter)?.label : null
  ].filter(Boolean).join(" · ");
  const filteredViewLabel = activeChips.length
    ? activeChips.map((chip) => chip.label).join(" · ")
    : (isAr ? "جميع المناطق وجميع النطاقات المدعومة" : "All regions and all source-supported scopes");
  const inventoryProgrammeLinkMissing = routeFilter !== "all" || packageFilter !== "all" || statusFilter !== "all" || contractorFilter !== "all" || forecastFilter !== "all";
  const programmeInventoryLinkMissing = conditionFilter !== "all" || widthFilter !== "all";
  const budgetFiltersUnlinked = statusFilter !== "all" || contractorFilter !== "all" || forecastFilter !== "all" || programmeInventoryLinkMissing;
  const characteristicFeatures = selectedFeature ? [selectedFeature] : filteredInventory;
  const mappedContractValueM = filteredContracts.reduce((sum, contract) => sum + (contract.valueM ?? 0), 0);
  const mappedContractHasValue = filteredContracts.some((contract) => contract.valueM != null);
  const fundingKpiLabel = budgetMode === "mapped-subset"
    ? (isAr ? "مرجع العقد المرتبط" : "Mapped contract reference")
    : budgetMode === "current-source-gap"
      ? (isAr ? "ميزانية المسار الحالية" : "Current route budget")
      : (isAr ? "وضع التمويل" : "Funding position");
  const fundingKpiValue = budgetMode === "programme-wide"
    ? budgetBillions(fmt(programme.approvedBudgetBn), locale)
    : budgetMode === "mapped-subset" && mappedContractHasValue
      ? `${isAr ? "د.إ" : "AED"} ${mappedContractValueM >= 1000 ? `${fmt(mappedContractValueM / 1000)}${isAr ? " مليار" : "bn"}` : `${fmt(mappedContractValueM, 0)}${isAr ? " مليون" : "m"}`}`
      : "—";
  const fundingKpiNote = budgetMode === "programme-wide"
    ? (isAr ? "على مستوى البرنامج · المطلوب 4.0 · الفجوة 2.3 · ديسمبر 2025" : "Programme-wide · Required 4.0 · Gap 2.3 · Dec 2025")
    : budgetMode === "mapped-subset"
      ? (isAr ? "قيمة عقد مرتبطة بالمصدر؛ وليست مخصص تمويل للمسار" : "Source-mapped contract value; not a route funding allocation")
      : budgetMode === "current-source-gap"
        ? (isAr ? "غير مدرجة لمسار HSCT في مصدر أغسطس 2026" : "Not reported for HSCT in the August 2026 source")
        : (isAr ? "لا توجد علاقة ميزانية موثوقة لهذه المنطقة" : "No reliable budget relationship for this region");

  return (
    <section id="dashboard" className="cycling-dashboard-section executive-cycling-dashboard">
      <a className="executive-skip-link" href="#executive-dashboard-main">{isAr ? "تخطي إلى محتوى اللوحة" : "Skip to dashboard content"}</a>
      <nav className="cycling-app-bar executive-app-bar" aria-label={isAr ? "التنقل الرئيسي" : "Primary navigation"}>
        <a className="cycling-brand" href="#dashboard" aria-label={isAr ? "لوحة ذكاء شبكة الدراجات" : "Cycling Intelligence dashboard"}>
          <img src="/images/adsc-logo.svg" alt="" />
          <span><strong>{isAr ? "ذكاء شبكة الدراجات" : "Cycling Intelligence"}</strong><small>{isAr ? "لوحة نظم المعلومات الجغرافية التنفيذية" : "Executive GIS dashboard"}</small></span>
        </a>
        <div className="cycling-app-status"><i /><span>{isAr ? "بيانات موثقة من المصدر" : "Source-qualified data"}</span><small>{isAr ? "حالة البرنامج · أغسطس 2026" : "Programme status · Aug 2026"}</small></div>
        <div className="cycling-app-actions">
          <a href="#map-workspace"><MapPinned /><span>{isAr ? "الخريطة" : "Map"}</span></a>
          <button onClick={() => setLocale(isAr ? "en" : "ar")} aria-label={isAr ? "English" : "العربية"}><Languages /><span>{isAr ? "EN" : "AR"}</span></button>
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? (isAr ? "الوضع الفاتح" : "Light mode") : (isAr ? "الوضع الداكن" : "Dark mode")}>{theme === "dark" ? <Sun /> : <Moon />}</button>
        </div>
      </nav>

      <main id="executive-dashboard-main" className="executive-dashboard-shell" tabIndex={-1}>
        <header className="executive-dashboard-intro">
          <div><p>{isAr ? "شبكة الدراجات · غرفة القرار" : "CYCLING NETWORK · DECISION ROOM"}</p><h1>{isAr ? "لوحة تنفيذ شبكة أبوظبي" : "Abu Dhabi Cycling Executive Dashboard"}</h1><span>{isAr ? "نظرة موحدة على تنفيذ برنامج الدراجات وتمويله وشبكته المكانية." : "One coordinated view of cycling-programme delivery, funding, and mapped network."}</span></div>
        </header>

        <section className="executive-filter-band" aria-labelledby="global-filter-title">
          <div className="executive-section-label"><ListFilter /><span><strong id="global-filter-title">{isAr ? "مرشحات موحدة" : "Global filters"}</strong><small>{isAr ? "تعمل على جميع المكونات المدعومة بالمصدر" : "Updates every source-supported view"}</small></span></div>
          <div className="executive-filter-grid">
            <FilterDropdown id="region" locale={locale} label={isAr ? "المنطقة" : "Region"} value={region} options={regionFilterOptions} onChange={(value) => changeRegion(value as RegionCode)} />
            <FilterDropdown id="route" locale={locale} label={isAr ? "المسار" : "Track / route"} value={routeFilter} options={routeFilterOptions} onChange={(value) => { setRouteFilter(value); setSelectedFeature(null); setSelectedProgrammeId(value === "all" || value === "track-1" || value === "tracks-3-4" ? null : value); if (value !== "all") setRegion("ADM"); }} />
            <FilterDropdown id="package" locale={locale} label={isAr ? "المشروع / الحزمة" : "Project / package"} value={packageFilter} options={packageFilterOptions} onChange={setPackageFilter} />
            <FilterDropdown id="status" locale={locale} label={isAr ? "الحالة" : "Status"} value={statusFilter} options={statusFilterOptions} onChange={setStatusFilter} />
            <button type="button" className={`executive-more-filter ${moreFiltersOpen ? "is-open" : ""}`} onClick={() => setMoreFiltersOpen((value) => !value)} aria-expanded={moreFiltersOpen} aria-controls="executive-secondary-filters"><SlidersHorizontal /><span>{isAr ? "مزيد من المرشحات" : "More filters"}</span>{activeChips.filter((chip) => !["region", "route", "package", "status"].includes(chip.key)).length ? <i>{activeChips.filter((chip) => !["region", "route", "package", "status"].includes(chip.key)).length}</i> : null}<ChevronDown /></button>
            <button className="executive-filter-reset" onClick={resetFilters} disabled={!hasFilters && !query && !selectedFeature && !selectedProgrammeId}><RefreshCcw />{isAr ? "إعادة الضبط" : "Reset"}</button>
            {moreFiltersOpen ? <div className="executive-secondary-filters" id="executive-secondary-filters">
              <FilterDropdown id="condition" locale={locale} label={isAr ? "حالة الأصل" : "Condition"} value={conditionFilter} options={conditionFilterOptions} onChange={setConditionFilter} />
              <FilterDropdown id="contractor" locale={locale} label={isAr ? "المقاول" : "Contractor"} value={contractorFilter} options={contractorFilterOptions} onChange={setContractorFilter} />
              <FilterDropdown id="width" locale={locale} label={isAr ? "العرض" : "Width"} value={widthFilter} options={widthFilterOptions} onChange={(value) => setWidthFilter(value as WidthBand)} />
              <FilterDropdown id="forecast" locale={locale} label={isAr ? "التوقع" : "Forecast / date"} value={forecastFilter} options={forecastFilterOptions} onChange={setForecastFilter} />
            </div> : null}
            {activeChips.length ? <div className="executive-filter-chips" aria-label={isAr ? "المرشحات النشطة" : "Active filters"}>{activeChips.map((chip) => <button type="button" key={chip.key} onClick={chip.clear}><span>{chip.label}</span><X /></button>)}<button type="button" className="is-clear-all" onClick={resetFilters}>{isAr ? "مسح الكل" : "Clear all"}</button></div> : null}
          </div>
        </section>

        <div className="executive-filter-context" role="status" data-active-scope={filteredViewLabel}>
          <span>{activeChips.length ? (isAr ? "العرض المفلتر" : "FILTERED VIEW") : (isAr ? "العرض الشامل" : "OVERALL VIEW")}</span>
          <strong>{filteredViewLabel}</strong>
          <small>{isAr ? "كل قسم يستجيب فقط للروابط المدعومة بين المصادر." : "Each section responds only where a source-supported relationship exists."}</small>
        </div>

        <section className="executive-kpi-strip" aria-label={isAr ? "مؤشرات الأداء التنفيذية" : "Executive KPIs"}>
          <ExecutiveKpi icon={Waypoints} label={isAr ? "نطاق البرنامج" : "Programme scope"} value={totals.planned} available={totals.available} decimals={1} suffix={` ${distanceUnit(locale)}`} note={totals.sourceNote} />
          <ExecutiveKpi icon={CheckCircle2} label={isAr ? "المنجز" : "Delivered"} value={totals.completed} available={totals.available} decimals={1} suffix={` ${distanceUnit(locale)}`} note={totals.sourceNote} tone="blue" />
          <ExecutiveKpi icon={Route} label={isAr ? "المتبقي" : "Remaining"} value={totals.remaining} available={totals.available} decimals={1} suffix={` ${distanceUnit(locale)}`} note={totals.sourceNote} tone="gold" />
          <ExecutiveKpi icon={Gauge} label={isAr ? "نسبة التنفيذ" : "Overall delivery"} value={totals.progress} available={totals.available} decimals={1} suffix="%" note={totals.sourceNote} tone="green" />
          <article className="executive-kpi is-gold"><span><CircleDollarSign /></span><div><small>{fundingKpiLabel}</small><strong>{fundingKpiValue}</strong><em>{fundingKpiNote}</em></div></article>
        </section>

        <section id="map-workspace" className="executive-map-section" aria-labelledby="map-title">
          <header className="executive-section-heading"><div><p>{isAr ? "تجربة نظم المعلومات الجغرافية الرئيسية" : "PRIMARY GIS EXPERIENCE"}</p><h2 id="map-title">{isAr ? "مسارات برنامج الدراجات والشبكة" : "Cycling programme routes & network"}</h2><span>{isAr ? "اختر مسار برنامج أو مسار دراجات من الخريطة أو القائمة." : "Select a programme route or mapped cycling track from the map or list."}</span></div><div className="executive-source-badge"><ShieldCheck /><span>{selectedProgrammeId === "hsct" ? (isAr ? "HSCT · محاذاة مرجعية من أساس التصميم 2022" : "HSCT · 2022 BOD reference alignment") : selectedFeature ? (isAr ? "مسار دراجات محدد" : "Cycling track selected") : region === "AAM" || region === "DRM" ? (isAr ? "مسارات الدراجات في المنطقة المحددة" : "Cycling tracks in the selected region") : (isAr ? "خريطة برنامج الدراجات" : "Cycling programme map")}</span></div></header>
          <div className="executive-map-workspace">
            <div className="executive-map-card">
              {mapInventory ? <InventoryMap
                data={mapInventory}
                locale={locale}
                theme={theme}
                region={region}
                condition={conditionFilter}
                programmeRoutes={programmeRoutesForMap}
                mainRoutes={filteredRoutes}
                asBuilt={asBuiltForMap}
                selectedProgrammeId={selectedProgrammeId}
                selectedId={selectedFeature?.properties.id ?? null}
                onSelect={selectInventory}
                onSelectProgramme={selectProgramme}
              /> : <div className="executive-map-loading"><span /><strong>{loadError ? (isAr ? "تعذر تحميل هندسة مسارات الدراجات" : "Cycling-track geometry could not be loaded") : (isAr ? "جارٍ تحميل الخريطة" : "Preparing GIS workspace")}</strong></div>}
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
          <ProgrammeProgress routes={filteredRoutes} locale={locale} scopeLabel={programmeScopeParts} disconnected={programmeInventoryLinkMissing} onSelectRoute={(route) => selectProgramme(route.id)} />
          <BudgetView contracts={filteredContracts} locale={locale} mode={budgetMode} scopeLabel={budgetScopeParts} ignoredFilters={budgetFiltersUnlinked} onSelectContract={selectContractRoutes} />
          <CharacteristicsView features={characteristicFeatures} locale={locale} scopeLabel={inventoryScopeParts} programmeFiltersUnlinked={inventoryProgrammeLinkMissing} activeCondition={conditionFilter} onConditionSelect={(value) => selectInventoryCharacteristic("conditionFilter", value)} />
        </section>

        <ExecutiveAttention routes={filteredRoutes} locale={locale} asBuiltSummary={asBuiltSummary} scopeLabel={programmeScopeParts} showReconciliation={(region === "all" || region === "ADM") && [routeFilter, packageFilter, statusFilter, contractorFilter, forecastFilter].every((value) => value === "all")} onSelectRoute={(route) => selectProgramme(route.id)} />

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
        <i>{option.value === value ? <Check /> : null}</i>
      </button>)}
    </div> : null}
  </div>;
}

function ExecutiveKpi({ icon: Icon, label, value, available = true, decimals, prefix = "", suffix, note, tone = "teal" }: { icon: LucideIcon; label: string; value: number; available?: boolean; decimals: number; prefix?: string; suffix: string; note: string; tone?: "teal" | "blue" | "green" | "gold" }) {
  return <article className={`executive-kpi is-${tone}`} data-available={available}><span><Icon /></span><div><small>{label}</small><strong>{available ? <CountUp value={value} decimals={decimals} prefix={prefix} suffix={suffix} /> : "—"}</strong><em>{note}</em></div></article>;
}

function TrackExplorer({ inventory, locale, onSelectFeature, onSelectRoute, query, routes, setQuery }: {
  inventory: InventoryFeature[]; locale: "en" | "ar"; onSelectFeature: (feature: InventoryFeature) => void; onSelectRoute: (route: NetworkRoute) => void; query: string; routes: NetworkRoute[]; setQuery: (value: string) => void;
}) {
  const isAr = locale === "ar";
  const listRef = useRef<HTMLDivElement | null>(null);
  const deferredQuery = useDeferredValue(query);
  const normalized = deferredQuery.trim().toLowerCase();
  const visibleRoutes = routes.filter((route) => !normalized || `${route.name} ${route.label} ${route.contractor} ${route.packageName} ${routeLabel(route, locale)} ${routePackageLabel(route, locale)} ${routeContractorLabel(route, locale)}`.toLowerCase().includes(normalized));
  const matchingInventory = inventory.filter((feature) => !normalized || `${feature.properties.name} ${feature.properties.nameAr ?? ""} ${feature.properties.city ?? ""} ${feature.properties.zone ?? ""} ${inventoryFeatureLabel(feature, locale)}`.toLowerCase().includes(normalized));
  const visibleInventory = matchingInventory.slice(0, 80);
  useEffect(() => { listRef.current?.scrollTo({ top: 0, behavior: "auto" }); }, [inventory, query, routes]);
  return <div className="executive-track-explorer">
    <header><div><p>{isAr ? "استكشاف المسارات" : "TRACK EXPLORER"}</p><h3>{isAr ? "بحث واختيار" : "Search & select"}</h3></div><span>{isAr ? "البرنامج الحالي · مسارات الدراجات" : "Current programme · cycling tracks"}</span></header>
    <div className="executive-track-search"><Search /><input aria-label={isAr ? "البحث في المسارات" : "Search tracks"} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isAr ? "ابحث بالاسم أو الحزمة أو المقاول" : "Search name, package, contractor or place"} />{query ? <button onClick={() => setQuery("")} aria-label={isAr ? "مسح البحث" : "Clear search"}><X /></button> : null}</div>
    <div className="executive-track-list" data-lenis-prevent ref={listRef} aria-busy={query !== deferredQuery}>
      {visibleRoutes.length ? <div className="executive-list-group"><span>{isAr ? "هيكل مسارات البرنامج" : "Programme route structure"}</span>{visibleRoutes.map((route) => <button key={route.id} onClick={() => onSelectRoute(route)}><i style={{ background: route.color }} /><span><strong>{routeLabel(route, locale)}</strong><small>{route.currentSourceGap ? `${isAr ? "مسار الدراجات عالي السرعة" : route.name} · ${isAr ? "فجوة في المصدر الحالي" : "Current-source gap"}` : `${routePackageLabel(route, locale)} · ${statusText[locale][route.status]}`}</small></span><em>{route.currentSourceGap ? (isAr ? "يلزم تحديث" : "Update required") : `${Math.round(progressOf(route))}%`}</em></button>)}</div> : null}
      {visibleInventory.length ? <div className="executive-list-group"><span>{isAr ? "مسارات الدراجات المرسومة" : "MAPPED CYCLING TRACKS"}</span>{visibleInventory.map((feature) => <button key={feature.properties.id} onClick={() => onSelectFeature(feature)}><i style={{ background: regionColors[feature.properties.municipality] }} /><span><strong>{inventoryFeatureLabel(feature, locale)}</strong><small>{regionLabel(feature.properties.municipality, locale)} · {inventoryClassLabel(feature.properties.featureClass, locale)}</small></span><em>{fmt(feature.properties.lengthM / 1000, 2)} {distanceUnit(locale)}</em></button>)}{matchingInventory.length > visibleInventory.length ? <p className="executive-list-limit">{isAr ? "حسّن البحث لعرض المزيد من مسارات الدراجات" : "Refine the search to inspect more cycling tracks."}</p> : null}</div> : null}
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
    const unavailable = isAr ? "غير مدرج في مصدر أغسطس 2026" : "Not listed in the August 2026 source";
    if (route.currentSourceGap) {
      const notReported = isAr ? "غير مدرج في أحدث مصدر" : "Not reported in latest source";
      return <section className="executive-selected-detail executive-hsct-detail" data-current-source-gap="true">{back}<header><span style={{ background: route.color }} /><div><small>{isAr ? "مسار برنامج · فجوة في المصدر الحالي" : "PROGRAMME ROUTE · CURRENT-SOURCE GAP"}</small><h3><span>HSCT</span><small>{isAr ? "مسار الدراجات عالي السرعة" : "High-Speed Cycle Track"}</small></h3></div></header><div className="executive-current-source-gap" role="status"><ShieldCheck /><span><strong>{isAr ? "يتطلب تحديث المصدر الحالي" : "Requires current source update"}</strong><small>{isAr ? "لم يرد مسار HSCT في مصدر 26 أغسطس 2026. هذا لا يعني إلغاءه أو حذفه من البرنامج." : "HSCT is not reported in the 26 August 2026 source. This does not mean the route is cancelled or removed."}</small></span></div><dl><Detail label={isAr ? "الوضع في البرنامج" : "Programme standing"} value={isAr ? "مسار برنامج صالح ومحفوظ" : "Valid programme route — retained"} wide /><Detail label={isAr ? "الحالة الحالية" : "Current status"} value={unavailable} wide /><Detail label={isAr ? "التقدم الحالي" : "Current progress"} value={notReported} /><Detail label={isAr ? "التوقع الحالي" : "Current forecast"} value={notReported} /><Detail label={isAr ? "الهندسة الحالية" : "Current geometry"} value={isAr ? "غير متاحة في ملف التنفيذ الفعلي للحزم 1–4" : "Not available in the Packages 1–4 As-Built KMZ"} wide /><Detail label={isAr ? "الهندسة المرجعية" : "Reference geometry"} value={isAr ? "محاذاة مفاهيمية من أساس التصميم 2022 · ليست هندسة تنفيذ فعلي حالية" : "2022 Basis of Design concept alignment · not current As-Built geometry"} wide /><Detail label={isAr ? "سرعة التصميم المرجعية" : "Reference design speed"} value={routeDesignSpeedLabel(route, locale)} /><Detail label={isAr ? "الميزانية الحالية" : "Current budget"} value={notReported} /></dl><div className="executive-historical-references"><CalendarClock /><span><strong>{isAr ? "المراجع التاريخية المتاحة" : "Available historical references"}</strong><ul>{route.historicalScopes?.map((item) => <li key={item.sourceDate}><b>{fmt(item.valueKm, 0)} {distanceUnit(locale)}</b><span>{item.sourceDate.startsWith("2022") ? (isAr ? "أساس التصميم · 2022" : "2022 Basis of Design") : (isAr ? "حالة التقدم · ديسمبر 2025" : "Dec 2025 Progress Status")}</span></li>)}</ul></span></div></section>;
    }
    return <section className="executive-selected-detail">{back}<header><span style={{ background: route.color }} /><div><small>{isAr ? "مسار برنامج محدد" : "SELECTED PROGRAMME ROUTE"}</small><h3>{routeLabel(route, locale)}</h3></div></header>{route.currentProgramme ? <div className="executive-detail-progress"><span><b>{Math.round(progressOf(route))}%</b>{isAr ? "مكتمل" : "complete"}</span><div role="progressbar" aria-label={isAr ? "نسبة إنجاز المسار" : "Route completion"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progressOf(route))}><i style={{ width: `${Math.min(100, progressOf(route))}%`, background: route.color }} /></div><small>{fmt(route.completedKm)} / {fmt(route.plannedKm)} {distanceUnit(locale)}</small></div> : <p className="executive-detail-unavailable">{unavailable}</p>}<dl><Detail label={isAr ? "المنطقة" : "Region"} value={isAr ? "برنامج أبوظبي" : "Abu Dhabi programme"} /><Detail label={isAr ? "الحزمة" : "Package"} value={routePackageLabel(route, locale)} /><Detail label={isAr ? "نطاق أغسطس 2026" : "Aug 2026 scope"} value={route.currentProgramme ? `${fmt(route.plannedKm)} ${distanceUnit(locale)}` : unavailable} /><Detail label={isAr ? "المتبقي" : "Remaining"} value={route.currentProgramme ? `${fmt(route.remainingKm)} ${distanceUnit(locale)}` : unavailable} /><Detail label={isAr ? "قيد التنفيذ" : "Work in progress"} value={route.currentProgramme ? `${fmt(route.workInProgressKm)} ${distanceUnit(locale)}` : unavailable} /><Detail label={isAr ? "حالة الهندسة" : "Geometry match"} value={isAr ? ({ Matched: "متطابقة", "Partially matched": "مطابقة جزئياً", Unmatched: "غير متطابقة", "Requires validation": "تتطلب التحقق" }[route.geometryMatchStatus]) : route.geometryMatchStatus} /><Detail label={isAr ? "التوقع · مرجع ديسمبر 2025" : "Forecast · Dec 2025 reference"} value={formatForecast(route.forecast, locale)} /><Detail label={isAr ? "المقاول · مرجع ديسمبر 2025" : "Contractor · Dec 2025 reference"} value={routeContractorLabel(route, locale)} wide /><Detail label={isAr ? "حالة التنفيذ · أغسطس 2026" : "Delivery status · Aug 2026"} value={route.currentProgramme ? statusText[locale][route.status] : unavailable} /><Detail label={isAr ? "سرعة التصميم" : "Design speed"} value={routeDesignSpeedLabel(route, locale)} /><Detail label={isAr ? "مصدر الهندسة" : "Geometry source"} value={geometrySourceLabel(route, locale)} wide /></dl>{route.structures ? <p className="executive-detail-note"><Layers3 />{routeStructuresLabel(route, locale)}</p> : null}{route.validationNote ? <p className="executive-detail-note is-warning"><Info />{validationNoteLabel(route, locale)}</p> : null}{route.historicalScopes?.length ? <p className="executive-detail-note"><CalendarClock />{isAr ? "قيم تاريخية:" : "Historical scope references:"} {route.historicalScopes.map((item) => `${fmt(item.valueKm)} ${distanceUnit(locale)} (${item.sourceDate})`).join(" · ")}</p> : null}</section>;
  }
  const p = selected.feature.properties;
  const missing = isAr ? "غير مسجل لمسار الدراجات هذا" : "Not recorded for this cycling track";
  return <section className="executive-selected-detail">{back}<header><span style={{ background: regionColors[p.municipality] }} /><div><small>{isAr ? "مسار دراجات" : "CYCLING TRACK"}</small><h3>{inventoryFeatureLabel(selected.feature, locale)}</h3></div></header><dl><Detail label={isAr ? "المنطقة" : "Region"} value={regionLabel(p.municipality, locale)} /><Detail label={isAr ? "الفئة" : "Class"} value={inventoryClassLabel(p.featureClass, locale)} /><Detail label={isAr ? "الطول" : "Length"} value={`${fmt(p.lengthM / 1000, 2)} ${distanceUnit(locale)}`} /><Detail label={isAr ? "العرض" : "Width"} value={p.widthM == null ? missing : `${fmt(p.widthM, 2)} ${metreUnit(locale)}`} /><Detail label={isAr ? "الحالة" : "Condition"} value={p.condition ? inventoryValueLabel(p.condition, locale) : missing} /><Detail label={isAr ? "المادة" : "Material"} value={p.material ? inventoryValueLabel(p.material, locale) : missing} /><Detail label={isAr ? "الاتجاه" : "Direction"} value={p.direction ? inventoryValueLabel(p.direction, locale) : missing} /><Detail label={isAr ? "الإنارة" : "Lighting"} value={p.lighting ? inventoryValueLabel(p.lighting, locale) : missing} /><Detail label={isAr ? "التظليل" : "Shading"} value={p.shading ? inventoryValueLabel(p.shading, locale) : missing} /><Detail label={isAr ? "مواقف الدراجات" : "Bike spaces"} value={p.bikeSpaces == null ? missing : String(p.bikeSpaces)} /><Detail label={isAr ? "التقدم / التوقع" : "Progress / forecast"} value={missing} wide /><Detail label={isAr ? "المقاول" : "Contractor"} value={missing} wide /></dl></section>;
}

function geometrySourceLabel(route: NetworkRoute, locale: "en" | "ar") {
  if (locale === "en") return route.geometrySource;
  if (route.geometrySource.includes("As-Built KMZ")) return "ملف التنفيذ الفعلي للحزم 1–4 بصيغة كيه إم زد — مطابقة مجمعة";
  if (route.geometrySource.includes("Progress Layout")) return "مخطط التقدم — أغسطس 2026 — محاذاة عامة";
  return "محاذاة تصورية من وثيقة أساس التصميم لعام 2022";
}

function validationNoteLabel(route: NetworkRoute, locale: "en" | "ar") {
  if (locale === "en") return route.validationNote ?? "";
  if (route.id === "track-1-p12") return "يستخدم ملف التنفيذ الفعلي أسماء عناصر عامة ولا يحدد فصل الحزمتين 1 و2.";
  if (route.id === "track-1-p34") return "يستخدم ملف التنفيذ الفعلي أسماء عناصر عامة ولا يحدد فصل الحزمتين 3 و4.";
  if (route.id === "track-2-b") return "يعرض المصدر 26.1 كم نطاقاً و1 كم منجزاً وصفر قيد التنفيذ ونسبة 0٪؛ وهذه القيم لا تتطابق حسابياً.";
  if (route.id === "hsct") return "المسار غير مدرج في مخطط أغسطس 2026؛ وتختلف المراجع التاريخية بين 47 كم في 2022 و52 كم في ديسمبر 2025.";
  return route.validationNote ?? "";
}

function Detail({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={wide ? "is-wide" : ""}><dt>{label}</dt><dd>{value}</dd></div>;
}

function ProgrammeProgress({ routes, locale, scopeLabel, disconnected, onSelectRoute }: { routes: NetworkRoute[]; locale: "en" | "ar"; scopeLabel: string; disconnected: boolean; onSelectRoute: (route: NetworkRoute) => void }) {
  const isAr = locale === "ar";
  const currentRoutes = routes.filter((route) => route.currentProgramme);
  const sourceGapRoute = routes.find((route) => route.currentSourceGap);
  return <section className="executive-support-card executive-progress-card" data-programme-route-count={currentRoutes.length} data-current-source-gap={sourceGapRoute ? "true" : "false"}><header><div><p>{isAr ? "تقدم البرنامج · أغسطس 2026" : "PROGRAMME PROGRESS · AUG 2026"}</p><h2>{isAr ? "المنجز والمتبقي حسب المسار" : "Delivered & remaining by route"}</h2><small className="executive-section-scope">{scopeLabel}</small></div><Route /></header>{disconnected ? <RelationshipNote locale={locale} domain="programme" /> : null}<div className="executive-progress-list">{currentRoutes.length ? currentRoutes.map((route) => <button type="button" key={route.id} onClick={() => onSelectRoute(route)}><span><strong>{routeLabel(route, locale)}</strong><small>{routePackageLabel(route, locale)}</small></span><div role="progressbar" aria-label={`${routeLabel(route, locale)} · ${Math.round(route.progressPct)}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(route.progressPct)}><i style={{ width: `${Math.min(100, route.progressPct)}%`, background: route.color }} /></div><b>{fmt(route.completedKm)} {distanceUnit(locale)} · {fmt(route.remainingKm)} {isAr ? "متبقي" : "remaining"}</b><em>{Math.round(route.progressPct)}%</em></button>) : sourceGapRoute ? <div className="executive-progress-source-gap"><Info /><span><strong>{isAr ? "HSCT محفوظ ضمن هيكل البرنامج" : "HSCT remains in the programme structure"}</strong><small>{isAr ? "لم يرد التقدم الحالي في مصدر 26 أغسطس 2026. يلزم تحديث المصدر." : "Current progress is not reported in the 26 August 2026 source. A source update is required."}</small></span></div> : <EmptyState locale={locale} />}</div><p className="executive-card-footnote">{sourceGapRoute && !currentRoutes.length ? (isAr ? "غياب البيانات الحالية لا يعني إلغاء المسار أو حذفه." : "Absence of current data does not mean the route is cancelled or removed.") : (isAr ? "تُعرض قيم صفوف المسارات كما وردت؛ ولا تُستخدم لإعادة حساب الإجمالي الرئيسي." : "Route-table values are shown as reported and are not used to overwrite the programme headline.")}</p></section>;
}

function BudgetView({ contracts: visibleContracts, locale, mode, scopeLabel, ignoredFilters, onSelectContract }: { contracts: typeof contracts[number][]; locale: "en" | "ar"; mode: "programme-wide" | "mapped-subset" | "unsupported-region" | "current-source-gap"; scopeLabel: string; ignoredFilters: boolean; onSelectContract: (routeIds: readonly string[]) => void }) {
  const isAr = locale === "ar";
  const max = Math.max(1, ...visibleContracts.map((item) => item.valueM ?? 0));
  const relationshipText = mode === "current-source-gap"
    ? (isAr ? "لا توجد قيمة ميزانية حالية لمسار HSCT في مصدر 26 أغسطس 2026، ولا يتم استنتاج قيمة من إجماليات البرنامج." : "No current HSCT budget value is reported in the 26 August 2026 source, and no value is inferred from programme totals.")
    : mode === "mapped-subset"
    ? (isAr ? `تُعرض قيم العقود المرتبطة بالمحدد فقط. إجماليات التمويل مرجع على مستوى البرنامج ولا تُوزع على المسارات.${ignoredFilters ? " المرشحات الأخرى النشطة لا تغيّر الميزانية التاريخية." : ""}` : `Showing only source-mapped contracts for this selection. Funding totals remain programme-wide and are not allocated to routes.${ignoredFilters ? " Other active filters do not alter historical budget values." : ""}`)
    : mode === "unsupported-region"
      ? (isAr ? "لا توجد علاقة ميزانية موثوقة لهذه المنطقة؛ تبقى إجماليات البرنامج مرجعاً غير مفلتر." : "No reliable budget relationship exists for this region; programme totals remain an unfiltered reference.")
      : ignoredFilters
        ? (isAr ? "تبقى الميزانية على مستوى البرنامج؛ لا توجد علاقة موثوقة بين مرشحات التنفيذ أو خصائص المخزون النشطة وقيم الميزانية التاريخية." : "Budget remains programme-wide; active delivery or inventory filters have no reliable relationship to the historical budget values.")
        : (isAr ? "إجماليات على مستوى برنامج أبوظبي." : "Abu Dhabi programme-wide totals.");
  if (mode === "current-source-gap") return <section className="executive-support-card executive-budget-card" data-budget-mode={mode} data-budget-contract-count="0"><header><div><p>{isAr ? "توفر الميزانية الحالية" : "CURRENT BUDGET AVAILABILITY"}</p><h2>{isAr ? "HSCT · تحديث المصدر مطلوب" : "HSCT · source update required"}</h2><small className="executive-section-scope">{scopeLabel}</small></div><Banknote /></header><p className="executive-relationship-note is-current-source-gap">{relationshipText}</p><div className="executive-budget-gap-state"><Info /><span><strong>{isAr ? "غير مدرج في أحدث مصدر" : "Not reported in latest source"}</strong><small>{isAr ? "لم يتم عرض أي تقدم أو توقع أو ميزانية حالية لمسار HSCT." : "No current HSCT progress, forecast, or budget is displayed."}</small></span></div></section>;
  return <section className="executive-support-card executive-budget-card" data-budget-mode={mode} data-budget-contract-count={visibleContracts.length}><header><div><p>{isAr ? "الميزانية · مرجع ديسمبر 2025" : "EXECUTIVE BUDGET · DEC 2025 REFERENCE"}</p><h2>{isAr ? "الاحتياج والتمويل" : "Requirement & funding"}</h2><small className="executive-section-scope">{scopeLabel}</small></div><Banknote /></header><p className={`executive-relationship-note is-${mode}`}>{relationshipText}</p><div className="executive-budget-summary"><div><small>{isAr ? "المعتمد · البرنامج" : "Approved · programme"}</small><strong>{budgetBillions(fmt(programme.approvedBudgetBn), locale)}</strong></div><div><small>{isAr ? "المطلوب · البرنامج" : "Required · programme"}</small><strong>{budgetBillions(fmt(programme.neededBudgetBn), locale)}</strong></div><div className="is-gap"><small>{isAr ? "الفجوة · البرنامج" : "Funding gap · programme"}</small><strong>{budgetBillions(fmt(programme.neededBudgetBn - programme.approvedBudgetBn), locale)}</strong></div></div><div className="executive-funding-bar" role="progressbar" aria-label={isAr ? "نسبة التمويل المعتمد" : "Approved funding percentage"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((programme.approvedBudgetBn / programme.neededBudgetBn) * 100)}><i style={{ width: `${(programme.approvedBudgetBn / programme.neededBudgetBn) * 100}%` }} /><span>{fmt((programme.approvedBudgetBn / programme.neededBudgetBn) * 100)}% {isAr ? "ممولة" : "funded"}</span></div><div className="executive-contract-bars">{mode !== "unsupported-region" && visibleContracts.length ? visibleContracts.map((contract) => <button type="button" key={contract.id} onClick={() => onSelectContract(contract.routeIds)} aria-label={`${isAr ? "اعرض على الخريطة" : "Show on map"}: ${isAr ? contract.nameAr : contract.name}`}><span><strong>{isAr ? contract.nameAr : contract.name}</strong><small>{"note" in contract ? (isAr ? contract.noteAr : contract.note) : contract.id === "c-34" && mode === "mapped-subset" ? (isAr ? "عقد مشترك للمسارين 3 و4؛ لم يتم افتراض توزيع داخلي." : "Shared Track 3 & 4 contract; no internal allocation assumed.") : null}</small></span><div><i style={{ width: `${contract.valueM == null ? 4 : (contract.valueM / max) * 100}%` }} /></div><b>{isAr ? contract.displayAr : contract.display}</b><MapPinned aria-hidden="true" /></button>) : mode === "programme-wide" ? <EmptyState locale={locale} /> : null}</div><p className="executive-card-footnote">{isAr ? "اختر عقداً لتصفية المسارات والخريطة. تبقى قيم الميزانية مرجعاً تاريخياً منفصلاً." : "Select a contract to filter the routes and map. Budget values remain a separate historical reference."}</p></section>;
}

function CharacteristicsView({ features, locale, scopeLabel, programmeFiltersUnlinked, activeCondition, onConditionSelect }: { features: InventoryFeature[]; locale: "en" | "ar"; scopeLabel: string; programmeFiltersUnlinked: boolean; activeCondition: string; onConditionSelect: (value: string) => void }) {
  const isAr = locale === "ar";
  const lengthKm = features.reduce((sum, feature) => sum + feature.properties.lengthM, 0) / 1000;
  const widths = features.map((feature) => feature.properties.widthM).filter((value): value is number => value != null);
  const averageWidth = widths.length ? widths.reduce((sum, value) => sum + value, 0) / widths.length : null;
  const condition = distribution(features.map((feature) => feature.properties.condition), locale);
  return <section className="executive-support-card executive-characteristics-card" data-inventory-feature-count={features.length}><header><div><p>{isAr ? "خصائص مسارات الدراجات" : "CYCLING TRACK CHARACTERISTICS"}</p><h2>{scopeLabel}</h2><small className="executive-section-scope">{isAr ? "مسارات الدراجات المفلترة" : "Filtered cycling tracks"}</small></div><Bike /></header>{programmeFiltersUnlinked ? <RelationshipNote locale={locale} domain="inventory" /> : null}<div className="executive-characteristic-metrics"><div><strong>{fmt(lengthKm)} {distanceUnit(locale)}</strong><span>{isAr ? "طول مسارات الدراجات المسجل" : "Recorded cycling-track length"}</span></div><div><strong>{averageWidth == null ? "—" : `${fmt(averageWidth, 2)} ${metreUnit(locale)}`}</strong><span>{isAr ? "متوسط العرض المسجل" : "Average recorded width"}</span></div></div><CompactDistribution title={isAr ? "الحالة" : "Condition"} values={condition} empty={isAr ? "غير مسجل" : "Not recorded"} activeValue={activeCondition} onSelect={onConditionSelect} locale={locale} /><p className="executive-card-footnote">{isAr ? "اختر شريط الحالة لتصفية مسارات الدراجات. تبقى خصائص المادة والإنارة متاحة في تفاصيل المسار عند تسجيلها." : "Select a condition bar to filter cycling tracks. Material and lighting remain available in track details when recorded."}</p></section>;
}

function distribution(values: Array<string | null>, locale: "en" | "ar") {
  const counts = new Map<string, number>();
  values.forEach((value) => { if (value) counts.set(value, (counts.get(value) ?? 0) + 1); });
  return [...counts.entries()].map(([raw, count]) => [raw, inventoryValueLabel(raw, locale), count] as const).sort((a, b) => b[2] - a[2]).slice(0, 4);
}

function CompactDistribution({ title, values, empty, activeValue, onSelect, locale }: { title: string; values: Array<readonly [string, string, number]>; empty: string; activeValue: string; onSelect: (value: string) => void; locale: "en" | "ar" }) {
  const total = values.reduce((sum, [, , value]) => sum + value, 0);
  return <div className="executive-compact-distribution"><h3>{title}</h3>{values.length ? values.map(([raw, label, value]) => <button type="button" key={raw} className={activeValue === raw ? "is-selected" : ""} aria-pressed={activeValue === raw} aria-label={`${locale === "ar" ? "تصفية حسب" : "Filter by"} ${title}: ${label}`} onClick={() => onSelect(activeValue === raw ? "all" : raw)}><span>{label}</span><i><b style={{ width: `${(value / total) * 100}%` }} /></i><em>{Math.round((value / total) * 100)}%</em></button>) : <p>{empty}</p>}</div>;
}

function RelationshipNote({ locale, domain }: { locale: "en" | "ar"; domain: "programme" | "inventory" }) {
  const isAr = locale === "ar";
  const text = domain === "programme"
    ? (isAr ? "مرشحات خصائص مسارات الدراجات لا تغيّر قيم البرنامج لعدم وجود رابط موثوق على مستوى الأصل." : "Cycling-track characteristic filters do not change programme values because no reliable feature-level link exists.")
    : (isAr ? "مرشحات المسار والحزمة والحالة لا تغيّر خصائص مسارات الدراجات المرسومة لعدم وجود رابط موثوق." : "Route, package, and delivery filters do not change mapped cycling-track characteristics because no reliable link exists.");
  return <p className="executive-relationship-note is-unlinked"><Info />{text}</p>;
}

function ExecutiveAttention({ routes, locale, asBuiltSummary, scopeLabel, showReconciliation, onSelectRoute }: { routes: NetworkRoute[]; locale: "en" | "ar"; asBuiltSummary: AsBuiltSummary | null; scopeLabel: string; showReconciliation: boolean; onSelectRoute: (route: NetworkRoute) => void }) {
  const isAr = locale === "ar";
  const visibleCurrent = routes.filter((route) => route.currentProgramme);
  const largestRemaining = [...visibleCurrent].sort((a, b) => b.remainingKm - a.remainingKm)[0];
  const needsValidation = visibleCurrent.find((route) => route.geometryMatchStatus === "Requires validation");
  const hsctVisible = routes.some((route) => route.id === "hsct");
  const packages14Visible = routes.some((route) => route.id === "track-1-p12" || route.id === "track-1-p34");
  return <section className="executive-insights" data-attention-route-count={visibleCurrent.length}><header><div><p>{isAr ? "نقاط الاهتمام التنفيذي" : "EXECUTIVE ATTENTION"}</p><h2>{isAr ? "قرارات وحدود مدعومة بالمصدر" : "Source-backed decisions & constraints"}</h2><small className="executive-section-scope">{scopeLabel}</small></div><Target /></header><div>{largestRemaining ? <button type="button" className="executive-insight-action" onClick={() => onSelectRoute(largestRemaining)}><Route /><span><strong>{isAr ? "أكبر نطاق متبقٍ" : "Largest remaining scope"}</strong><p>{routeLabel(largestRemaining, locale)} {isAr ? "يتبقى له" : "has"} {fmt(largestRemaining.remainingKm)} {distanceUnit(locale)} {isAr ? "وفق صف المسار في أغسطس 2026." : "in the August 2026 route table."}</p></span><MapPinned aria-hidden="true" /></button> : <article><Info /><span><strong>{isAr ? "لا يوجد نطاق برنامج مرتبط" : "No linked programme scope"}</strong><p>{isAr ? "لا يحتوي المصدر الحالي على علاقة برنامج لهذه المجموعة من المرشحات." : "The current source contains no programme relationship for this filter combination."}</p></span></article>}{showReconciliation ? <article><Info /><span><strong>{isAr ? "حد المطابقة الحسابية" : "Reconciliation boundary"}</strong><p>{isAr ? "إجماليات صفوف المسارات تزيد عن العنوان الرئيسي بمقدار 20.6 كم للنطاق و17.6 كم للمنجز؛ لذلك يبقى المستويان منفصلين." : "Route rows exceed the programme headline by 20.6 km of scope and 17.6 km completed; both grains remain separate."}</p></span></article> : null}{needsValidation ? <button type="button" className="executive-insight-action" onClick={() => onSelectRoute(needsValidation)}><ShieldCheck /><span><strong>{isAr ? "يتطلب التحقق" : "Requires validation"}</strong><p>{isAr ? "المسار 2ب يعرض 26.1 كم نطاقاً و1 كم منجزاً وصفر قيد التنفيذ ونسبة 0٪ في المصدر." : "Track 2B reports 26.1 km scope, 1 km completed, zero WIP, and 0% in the source."}</p></span><MapPinned aria-hidden="true" /></button> : null}{packages14Visible ? <article><MapPinned /><span><strong>{isAr ? "حد مطابقة الهندسة" : "Geometry matching boundary"}</strong><p>{asBuiltSummary ? (isAr ? "ملف التنفيذ الفعلي يستخدم أسماء عناصر عامة؛ يمكن إسناده للحزم 1–4 مجتمعة فقط، وليس لكل حزمة." : "The as-built KMZ uses generic object names; it is matched to Packages 1–4 only in aggregate, not to individual packages.") : (isAr ? "جارٍ تحميل تحقق هندسة التنفيذ الفعلي." : "As-built geometry validation is loading.")}</p></span></article> : null}{hsctVisible ? <button type="button" className="executive-insight-action" onClick={() => onSelectRoute(routes.find((route) => route.id === "hsct")!)}><CalendarClock /><span><strong>{isAr ? "مسار عالي السرعة" : "High-speed cycle track"}</strong><p>{isAr ? "غير مدرج في مصدر أغسطس 2026؛ المرجعان التاريخيان يعرضان 47 كم في 2022 و52 كم في ديسمبر 2025." : "Not listed in August 2026; historical references state 47 km in 2022 and 52 km in December 2025."}</p></span><MapPinned aria-hidden="true" /></button> : null}</div></section>;
}

function EmptyState({ locale }: { locale: "en" | "ar" }) {
  return <div className="executive-inline-empty"><Search /><span>{locale === "ar" ? "لا توجد بيانات مطابقة للمرشحات الحالية." : "No source records match the current filters."}</span></div>;
}
