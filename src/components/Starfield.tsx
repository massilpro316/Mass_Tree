import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  z: number;
  r: number;
  tw: number;
  hue: number;
}

/** Camera offset written by the tree canvas; read every frame without re-rendering. */
export const parallax = { x: 0, y: 0 };

/**
 * Layered, twinkling starfield with parallax. The tree view drifts the stars through
 * `parallax` as the camera pans, which sells the "flying through space" feeling.
 */
export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let stars: Star[] = [];
    let shooting: { x: number; y: number; vx: number; vy: number; life: number } | null = null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      const count = Math.round((window.innerWidth * window.innerHeight) / 4200);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        z: Math.random() * 0.9 + 0.1,
        r: Math.random() * 1.3 + 0.2,
        tw: Math.random() * Math.PI * 2,
        hue: [190, 230, 260, 300, 45][Math.floor(Math.random() * 5)],
      }));
    };
    resize();
    window.addEventListener("resize", resize);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const draw = (t: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const { x: ox, y: oy } = parallax;
      for (const s of stars) {
        const drift = reduced ? 0 : t * 0.004 * s.z;
        let x = (s.x + ox * s.z * 0.08 - drift) % w;
        let y = (s.y + oy * s.z * 0.08) % h;
        if (x < 0) x += w;
        if (y < 0) y += h;
        const twinkle = 0.55 + 0.45 * Math.sin(t * 0.002 * (0.5 + s.z) + s.tw);
        ctx.globalAlpha = twinkle * (0.35 + s.z * 0.65);
        ctx.fillStyle = `hsl(${s.hue}, 90%, ${78 + s.z * 15}%)`;
        ctx.beginPath();
        ctx.arc(x, y, s.r * (0.6 + s.z), 0, Math.PI * 2);
        ctx.fill();
        if (s.r > 1.25 && s.z > 0.7) {
          ctx.globalAlpha = twinkle * 0.15;
          ctx.beginPath();
          ctx.arc(x, y, s.r * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (!reduced) {
        if (!shooting && Math.random() < 0.003) {
          shooting = { x: Math.random() * w, y: Math.random() * h * 0.5, vx: -6 - Math.random() * 4, vy: 2 + Math.random() * 2, life: 1 };
        }
        if (shooting) {
          const s = shooting;
          const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 12, s.y - s.vy * 12);
          grad.addColorStop(0, `rgba(200, 240, 255, ${s.life})`);
          grad.addColorStop(1, "rgba(200, 240, 255, 0)");
          ctx.globalAlpha = 1;
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x - s.vx * 12, s.y - s.vy * 12);
          ctx.stroke();
          s.x += s.vx;
          s.y += s.vy;
          s.life -= 0.012;
          if (s.life <= 0) shooting = null;
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <div className="nebula" />
      <canvas ref={ref} className="starfield" />
      <div className="vignette" />
    </>
  );
}
