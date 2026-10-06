import { motion } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";

/** Particle explosion + shockwave played where new branches sprout. */
export function Burst({ x, y, color, onDone }: { x: number; y: number; color: string; onDone(): void }) {
  const parts = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const a = (i / 22) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 60 + Math.random() * 110;
        return { dx: Math.cos(a) * dist, dy: Math.sin(a) * dist, s: 2 + Math.random() * 4, d: Math.random() * 0.15 };
      }),
    [],
  );

  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const t = setTimeout(() => done.current(), 1400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="burst" style={{ left: x, top: y, ["--c" as string]: color }}>
      <motion.span className="shock" initial={{ scale: 0.2, opacity: 0.9 }} animate={{ scale: 3.2, opacity: 0 }} transition={{ duration: 0.9, ease: "easeOut" }} />
      <motion.span className="shock shock-2" initial={{ scale: 0.2, opacity: 0.7 }} animate={{ scale: 2.2, opacity: 0 }} transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }} />
      {parts.map((p, i) => (
        <motion.i
          key={i}
          style={{ width: p.s, height: p.s }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.dx, y: p.dy, opacity: 0, scale: 0.2 }}
          transition={{ duration: 0.9 + Math.random() * 0.4, delay: p.d, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
    </div>
  );
}
