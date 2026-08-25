import { useEffect, useRef, useState } from "react";

type CountUpProps = {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
};

const easeOut = (value: number) => 1 - Math.pow(1 - value, 4);

export function CountUp({ value, decimals = 0, prefix = "", suffix = "", duration = 1000, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const started = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - started) / duration);
        setDisplay(value * easeOut(progress));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      setDisplay(0);
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.25 });
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [duration, value]);

  return (
    <span ref={ref} className={className}>
      {prefix}{display.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
    </span>
  );
}
