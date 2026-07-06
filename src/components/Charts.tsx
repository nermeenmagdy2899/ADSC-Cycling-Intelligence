import { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts";
import { networkRoutes } from "../data/network";

function useChart(options: echarts.EChartsOption) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, undefined, { renderer: "canvas" });
    chart.setOption(options);
    const resize = () => chart.resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      chart.dispose();
    };
  }, [options]);

  return ref;
}

export function ProgressChart() {
  const options = useMemo<echarts.EChartsOption>(() => {
    const names = networkRoutes.map((route) => route.label);
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis" },
      grid: { left: 42, right: 12, top: 24, bottom: 36 },
      xAxis: { type: "category", data: names, axisLabel: { color: "#aeb8b2" }, axisLine: { lineStyle: { color: "#3a4a47" } } },
      yAxis: {
        type: "value",
        max: 110,
        axisLabel: { color: "#aeb8b2", formatter: "{value}%" },
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } }
      },
      series: [
        {
          type: "bar",
          data: networkRoutes.map((route) => Number(((route.completedKm / route.plannedKm) * 100).toFixed(1))),
          itemStyle: {
            borderRadius: [8, 8, 0, 0],
            color: (params: { dataIndex: number }) => networkRoutes[params.dataIndex].color
          },
          label: { show: true, position: "top", formatter: "{c}%", color: "#eef4ee" }
        }
      ]
    };
  }, []);
  const ref = useChart(options);
  return <div ref={ref} className="h-80 w-full" />;
}

export function LengthChart() {
  const options = useMemo<echarts.EChartsOption>(() => ({
    backgroundColor: "transparent",
    tooltip: { trigger: "item" },
    legend: { bottom: 0, textStyle: { color: "#aeb8b2" } },
    series: [
      {
        type: "pie",
        radius: ["48%", "74%"],
        center: ["50%", "42%"],
        avoidLabelOverlap: true,
        label: { color: "#eef4ee", formatter: "{b}\n{c} km" },
        data: networkRoutes.map((route) => ({
          value: route.plannedKm,
          name: route.label,
          itemStyle: { color: route.color }
        }))
      }
    ]
  }), []);
  const ref = useChart(options);
  return <div ref={ref} className="h-80 w-full" />;
}
