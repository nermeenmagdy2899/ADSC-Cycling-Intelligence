import { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts";
import { networkRoutes } from "../data/network";
import { formatForecast } from "../i18n";
import { useNetworkStore } from "../store/useNetworkStore";

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

export function ProgressChart() {
  const theme = useNetworkStore((state) => state.theme);
  const options = useMemo<echarts.EChartsOption>(() => {
    const col = axisColors(theme);
    const names = networkRoutes.map((route) => route.label);
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
  }, [theme]);
  const ref = useChart(options);
  return <div ref={ref} className="h-80 w-full" />;
}

export function DeliveryCurve() {
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
  return <div ref={ref} className="h-72 w-full" />;
}

export function LengthChart() {
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
  return <div ref={ref} className="h-80 w-full" />;
}
