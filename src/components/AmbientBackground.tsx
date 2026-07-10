import { useEffect, useRef } from "react";
import { useNetworkStore } from "../store/useNetworkStore";

const PARTICLES = 72;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
};

export function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.35 });
  const theme = useNetworkStore((state) => state.theme);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const particles: Particle[] = Array.from({ length: reducedMotion ? 14 : PARTICLES }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00018,
      vy: (Math.random() - 0.5) * 0.00016,
      r: 0.8 + Math.random() * 2.4,
      alpha: 0.12 + Math.random() * 0.26
    }));

    let frame = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onPointerMove = (event: PointerEvent) => {
      pointerRef.current = {
        x: event.clientX / Math.max(window.innerWidth, 1),
        y: event.clientY / Math.max(window.innerHeight, 1)
      };
    };

    const draw = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const light = theme === "light";
      context.clearRect(0, 0, width, height);

      const pointer = pointerRef.current;
      const glow = context.createRadialGradient(pointer.x * width, pointer.y * height, 0, pointer.x * width, pointer.y * height, Math.max(width, height) * 0.7);
      glow.addColorStop(0, light ? "rgba(154, 107, 31, 0.22)" : "rgba(231, 198, 136, 0.22)");
      glow.addColorStop(0.38, light ? "rgba(137, 199, 255, 0.1)" : "rgba(137, 199, 255, 0.12)");
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      const time = reducedMotion ? 0 : performance.now();
      context.save();
      context.setLineDash([22, 22]);
      context.lineDashOffset = -time * 0.038;
      context.lineWidth = light ? 1.8 : 1.55;
      context.strokeStyle = light ? "rgba(10, 22, 38, 0.15)" : "rgba(231, 198, 136, 0.22)";
      for (let i = -2; i < 4; i += 1) {
        context.beginPath();
        context.moveTo(-width * 0.12, height * (0.22 + i * 0.26));
        context.bezierCurveTo(width * 0.24, height * (0.08 + i * 0.26), width * 0.62, height * (0.52 + i * 0.22), width * 1.12, height * (0.28 + i * 0.24));
        context.stroke();
      }
      context.restore();

      particles.forEach((particle) => {
        if (!reducedMotion) {
          particle.x += particle.vx + (pointer.x - 0.5) * 0.000018;
          particle.y += particle.vy + (pointer.y - 0.5) * 0.000014;
          if (particle.x < -0.02) particle.x = 1.02;
          if (particle.x > 1.02) particle.x = -0.02;
          if (particle.y < -0.02) particle.y = 1.02;
          if (particle.y > 1.02) particle.y = -0.02;
        }

        context.beginPath();
        context.arc(particle.x * width, particle.y * height, particle.r, 0, Math.PI * 2);
        context.fillStyle = light ? `rgba(154, 107, 31, ${particle.alpha + 0.04})` : `rgba(231, 198, 136, ${particle.alpha + 0.06})`;
        context.fill();
      });

      // Reduced motion: paint one static frame and stop — no perpetual
      // full-viewport repaint loop.
      if (!reducedMotion) frame = requestAnimationFrame(draw);
    };

    const onResize = () => {
      resize();
      if (reducedMotion) draw(); // repaint the single static frame at the new size
    };
    resize();
    draw();
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [theme]);

  return <canvas ref={canvasRef} className="ambient-canvas" aria-hidden="true" />;
}
