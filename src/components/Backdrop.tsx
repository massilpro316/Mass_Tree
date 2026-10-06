import { useMemo } from "react";

const SHAPES = ["✦", "+", "●", "▲", "◆", "✚"];
const COLORS = ["#7c5cff", "#06b6d4", "#ff4d94", "#ffb020", "#10b981", "#3b82f6"];

/**
 * Light "grid gradient" world: drifting pastel gradient blobs, a soft grid and a few
 * floating game sparkles. The tree view draws its own panning grid, so it passes grid={false}.
 */
export function Backdrop({ grid = true }: { grid?: boolean }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        s: SHAPES[i % SHAPES.length],
        c: COLORS[i % COLORS.length],
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 10 + Math.random() * 12,
        dur: 9 + Math.random() * 10,
        delay: -Math.random() * 12,
      })),
    [],
  );
  return (
    <div className="backdrop" aria-hidden>
      <div className="blob b1" />
      <div className="blob b2" />
      <div className="blob b3" />
      <div className="blob b4" />
      <div className="blob b5" />
      {grid && <div className="bg-grid" />}
      {bits.map((b, i) => (
        <span
          key={i}
          className="sparkle"
          style={{ left: `${b.x}%`, top: `${b.y}%`, color: b.c, fontSize: b.size, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s` }}
        >
          {b.s}
        </span>
      ))}
    </div>
  );
}
