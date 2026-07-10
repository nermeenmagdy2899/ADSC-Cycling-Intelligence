import { useEffect, useRef, useState } from "react";
import { useNetworkStore } from "../store/useNetworkStore";

const PATH =
  "M20 150 C 120 70, 190 210, 300 140 S 470 40, 560 110 S 700 210, 800 120";

export function Preloader({ onDone }: { onDone: () => void }) {
  const locale = useNetworkStore((state) => state.locale);
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setLeaving(true);
    window.setTimeout(onDone, 720);
  };

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setProgress(100);
      const t = window.setTimeout(finish, 260);
      return () => window.clearTimeout(t);
    }
    const total = 1650;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(100, Math.max(0, ((now - start) / total) * 100));
      setProgress(p);
      if (p < 100) raf = requestAnimationFrame(tick);
      else finish();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className={`preloader ${leaving ? "is-leaving" : ""}`}
      role="progressbar"
      aria-label={locale === "ar" ? "جارٍ تحميل العرض" : "Loading the experience"}
      aria-valuenow={Math.round(progress)}
      onClick={finish}
    >
      <div className="preloader-inner">
        <img className="preloader-mark" src="/images/adsc-logo-white-official.svg" alt="Abu Dhabi Sports Council" />
        <svg className="preloader-line" viewBox="0 0 820 220" fill="none" aria-hidden="true">
          <path d={PATH} stroke="rgba(231,198,136,0.16)" strokeWidth="3" strokeLinecap="round" />
          <path
            d={PATH}
            stroke="url(#preload-grad)"
            strokeWidth="4"
            strokeLinecap="round"
            pathLength={100}
            style={{ strokeDasharray: 100, strokeDashoffset: 100 - progress }}
          />
          <defs>
            <linearGradient id="preload-grad" x1="0" y1="0" x2="820" y2="0" gradientUnits="userSpaceOnUse">
              <stop stopColor="#89c7ff" />
              <stop offset="0.5" stopColor="#e7c688" />
              <stop offset="1" stopColor="#f7e2b0" />
            </linearGradient>
          </defs>
        </svg>
        <div className="preloader-meta">
          <span>{locale === "ar" ? "شبكة أبوظبي للدراجات" : "Abu Dhabi Cycling Network"}</span>
          <b>{Math.round(progress)}%</b>
        </div>
        <button className="preloader-skip" type="button" onClick={finish}>
          {locale === "ar" ? "تخطٍ" : "Skip intro"}
        </button>
      </div>
    </div>
  );
}
