import { useEffect, useRef, useState } from "react";

const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

type CountUpProps = {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
};

/**
 * Animates a number from 0 to `value` the first time it scrolls into view.
 * Uses a lightweight rAF visibility poll (robust under StrictMode double-mount
 * and programmatic scrolling) and honours prefers-reduced-motion.
 */
export function CountUp({ value, decimals = 0, prefix = "", suffix = "", duration = 1400, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }

    let raf = 0;
    let animating = false;

    const animate = () => {
      animating = true;
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, Math.max(0, (now - start) / duration));
        setDisplay(value * easeOutExpo(progress));
        if (progress < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const waitForView = () => {
      if (animating) return;
      const rect = node.getBoundingClientRect();
      const inView = rect.top < window.innerHeight * 0.94 && rect.bottom > 0;
      if (inView) animate();
      else raf = requestAnimationFrame(waitForView);
    };

    waitForView();
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  const formatted = display.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
