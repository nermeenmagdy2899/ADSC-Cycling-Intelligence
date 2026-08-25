import { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts";
import { networkRoutes } from "../data/network";
import { formatForecast, routeLabel } from "../i18n";
import { useNetworkStore } from "../store/useNetworkStore";
import type { RegionSummary } from "../data/inventory";

function axisColors(theme: "dark" | "light") {
  return theme === "light"
    ? { label: "#3d506a", axis: "#aebfd6", split: "rgba(10,22,38,0.08)", strong: "#0a1626" }
    : { label: "#b6c5d8", axis: "#223040", split: "rgba(255,255,255,0.08)", strong: "#eef4fc" };
}

function useChart(options: echarts.EChartsOption) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const optionsRef = useRef(options);

  // Init once; option changes (theme/locale) update in place — disposing and
  // re-initializing on every change blanked the charts and replayed animations.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const initialize = () => {
      if (chartRef.current || node.clientWidth === 0 || node.clientHeight === 0) return;
      chartRef.current = echarts.init(node, undefined, { renderer: "canvas" });
      chartRef.current.setOption(optionsRef.current);
    };
    const observer = new ResizeObserver(() => {
      initialize();
      chartRef.current?.resize();
    });

    observer.observe(node);
    initialize();
    return () => {
      observer.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    optionsRef.current = options;
    chartRef.current?.setOption(options);
  }, [options]);

  return ref;
}

export function ProgressChart({ height = 320 }: { height?: number } = {}) {
  const { theme, locale } = useNetworkStore();
  const options = useMemo<echarts.EChartsOption>(() => {
    const col = axisColors(theme);
    const names = networkRoutes.map((route) => routeLabel(route, locale));
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", confine: true },
      grid: { left: 42, right: 12, top: 24, bottom: 36 },
      xAxis: { type: "category", data: names, axisLabel: { color: col.label }, axisLine: { lineStyle: { color: col.axis } } },
      yAxis: {
        type: "value",
        max: 110,
        axisLabel: { color: col.label, formatter: "{value}%" },
        splitLine: { lineStyle: { color: col.split } }
      },
      series: [
        {
          type: "bar",
          data: networkRoutes.map((route) => Number(((route.completedKm / route.plannedKm) * 100).toFixed(1))),
          itemStyle: {
            borderRadius: [8, 8, 0, 0],
            color: (params: { dataIndex: number }) => networkRoutes[params.dataIndex].color
          },
          label: { show: true, position: "top", formatter: "{c}%", color: col.strong }
        }
      ]
    };
  }, [locale, theme]);
  const ref = useChart(options);
  return <div ref={ref} className="w-full" style={{ height }} />;
}

export function DeliveryCurve({ height = 288 }: { height?: number } = {}) {
  const { theme, locale } = useNetworkStore();
  const options = useMemo<echarts.EChartsOption>(() => {
    const col = axisColors(theme);
    const order = ["Dec 2025", "Feb 2026", "Apr 2026", "Mar 2027", "Mar 2028", "Apr 2029"];
    const planned = networkRoutes.reduce((sum, route) => sum + route.plannedKm, 0);
    let cumulative = networkRoutes.reduce((sum, route) => sum + route.completedKm, 0);
    const series = order.map((date, index) => {
      if (index > 0) {
        networkRoutes
          .filter((route) => route.forecast === date)
          .forEach((route) => {
            cumulative += route.plannedKm - route.completedKm;
          });
      }
      return Number(cumulative.toFixed(1));
    });
    const labels = order.map((date) => formatForecast(date, locale));
    const todayLabel = locale === "ar" ? "اليوم" : "Today";
    const targetLabel = locale === "ar" ? "الشبكة الكاملة" : "Full network";

    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", confine: true, valueFormatter: (value) => `${value} km` },
      grid: { left: 46, right: 18, top: 28, bottom: 32 },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: labels,
        axisLabel: { color: col.label, fontSize: 11 },
        axisLine: { lineStyle: { color: col.axis } }
      },
      yAxis: {
        type: "value",
        max: Math.ceil(planned / 50) * 50,
        axisLabel: { color: col.label, formatter: "{value}" },
        splitLine: { lineStyle: { color: col.split } }
      },
      series: [
        {
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 7,
          data: series,
          lineStyle: { width: 3, color: "#e7c688" },
          itemStyle: { color: "#e7c688", borderColor: col.strong, borderWidth: 1 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(231,198,136,0.42)" },
              { offset: 1, color: "rgba(231,198,136,0.02)" }
            ])
          },
          markPoint: {
            symbol: "pin",
            symbolSize: 46,
            data: [{ name: todayLabel, coord: [0, series[0]], value: todayLabel }],
            itemStyle: { color: "#56d6bd" },
            label: { color: "#03060d", fontSize: 10, fontWeight: "bold" }
          },
          markLine: {
            silent: true,
            symbol: "none",
            data: [{ yAxis: planned }],
            lineStyle: { color: "#89c7ff", type: "dashed", width: 1.4 },
            label: { formatter: `${targetLabel} · ${planned.toFixed(0)} km`, color: "#89c7ff", fontSize: 10, position: "insideEndTop" }
          }
        }
      ]
    };
  }, [theme, locale]);
  const ref = useChart(options);
  return <div ref={ref} className="w-full" style={{ height }} />;
}

export function LengthChart({ height = 320 }: { height?: number } = {}) {
  const theme = useNetworkStore((state) => state.theme);
  const options = useMemo<echarts.EChartsOption>(() => {
    const col = axisColors(theme);
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "item", confine: true },
      legend: { bottom: 0, textStyle: { color: col.label } },
      series: [
        {
          type: "pie",
          radius: ["48%", "74%"],
          center: ["50%", "42%"],
          avoidLabelOverlap: true,
          label: { color: col.strong, formatter: "{b}\n{c} km" },
          data: networkRoutes.map((route) => ({
            value: route.plannedKm,
            name: route.label,
            itemStyle: { color: route.color }
          }))
        }
      ]
    };
  }, [theme]);
  const ref = useChart(options);
  return <div ref={ref} className="w-full" style={{ height }} />;
}

export function DistributionChart({
  data,
  height = 250,
  color = "#56d6bd"
}: {
  data: Record<string, number>;
  height?: number;
  color?: string;
}) {
  const theme = useNetworkStore((state) => state.theme);
  const options = useMemo<echarts.EChartsOption>(() => {
    const col = axisColors(theme);
    const rows = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 7);
    return {
      backgroundColor: "transparent",
      animationDuration: 700,
      animationEasing: "cubicOut",
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, confine: true },
      grid: { left: 8, right: 20, top: 8, bottom: 8, containLabel: true },
      xAxis: { type: "value", axisLabel: { color: col.label }, splitLine: { lineStyle: { color: col.split } } },
      yAxis: {
        type: "category",
        inverse: true,
        data: rows.map(([label]) => label),
        axisLabel: { color: col.strong, width: 105, overflow: "truncate" },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      series: [{
        type: "bar",
        data: rows.map(([, value]) => value),
        barWidth: 13,
        itemStyle: { color, borderRadius: 3 },
        label: { show: true, position: "right", color: col.strong, fontWeight: 700 }
      }]
    };
  }, [color, data, theme]);
  const ref = useChart(options);
  return <div ref={ref} className="w-full" style={{ height }} role="img" aria-label="Track characteristic distribution" />;
}

export function RegionalComparisonChart({ regions, locale, height = 280 }: { regions: RegionSummary[]; locale: "en" | "ar"; height?: number }) {
  const theme = useNetworkStore((state) => state.theme);
  const options = useMemo<echarts.EChartsOption>(() => {
    const col = axisColors(theme);
    const comparable = regions.filter((region) => region.code !== "AAM");
    return {
      backgroundColor: "transparent",
      animationDuration: 850,
      tooltip: { trigger: "axis", confine: true },
      legend: { top: 0, textStyle: { color: col.label } },
      grid: { left: 46, right: 16, top: 42, bottom: 34 },
      xAxis: { type: "category", data: comparable.map((region) => locale === "ar" ? region.nameAr : region.name), axisLabel: { color: col.strong }, axisLine: { lineStyle: { color: col.axis } } },
      yAxis: [
        { type: "value", name: "km", axisLabel: { color: col.label }, splitLine: { lineStyle: { color: col.split } } },
        { type: "value", name: "m", min: 0, max: 4, axisLabel: { color: col.label }, splitLine: { show: false } }
      ],
      series: [
        { name: locale === "ar" ? "طول مسارات الدراجات الموثق" : "Verified cycle length", type: "bar", data: comparable.map((region) => region.explicitCycleLengthKm), itemStyle: { color: "#56d6bd", borderRadius: [4, 4, 0, 0] }, barMaxWidth: 54 },
        { name: locale === "ar" ? "متوسط العرض" : "Average width", type: "line", yAxisIndex: 1, data: comparable.map((region) => region.averageWidthM), symbolSize: 10, lineStyle: { width: 3, color: "#e4bc72" }, itemStyle: { color: "#e4bc72" } }
      ]
    };
  }, [locale, regions, theme]);
  const ref = useChart(options);
  return <div ref={ref} className="w-full" style={{ height }} role="img" aria-label={locale === "ar" ? "مقارنة مخزون مسارات الدراجات البلدية" : "Comparable municipal cycling inventory"} />;
}
