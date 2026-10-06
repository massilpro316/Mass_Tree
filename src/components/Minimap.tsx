import type { RefObject } from "react";
import { bounds, type Positioned } from "../lib/layout";
import { stateColor } from "../store/useStore";
import type { Tree } from "../types";
import type { Camera } from "./TreeCanvas";

const W = 180;
const H = 116;

export function Minimap({
  tree,
  pos,
  cam,
  viewport,
  onJump,
}: {
  tree: Tree;
  pos: Record<string, Positioned>;
  cam: Camera;
  viewport: RefObject<HTMLDivElement | null>;
  onJump(wx: number, wy: number): void;
}) {
  const b = bounds(pos);
  const pad = 140;
  const bw = b.maxX - b.minX + pad * 2;
  const bh = b.maxY - b.minY + pad * 2;
  const s = Math.min(W / bw, H / bh);
  const ox = (W - bw * s) / 2 - (b.minX - pad) * s;
  const oy = (H - bh * s) / 2 - (b.minY - pad) * s;
  const vw = viewport.current?.clientWidth ?? 0;
  const vh = viewport.current?.clientHeight ?? 0;

  const view = {
    x: ((-cam.x) / cam.k) * s + ox,
    y: ((-cam.y) / cam.k) * s + oy,
    w: (vw / cam.k) * s,
    h: (vh / cam.k) * s,
  };

  return (
    <div
      className="minimap glass"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onJump((e.clientX - r.left - ox) / s, (e.clientY - r.top - oy) / s);
      }}
    >
      <svg width={W} height={H}>
        {Object.entries(pos).map(([id, p]) => {
          const n = tree.nodes[id];
          if (!n.parentId || !pos[n.parentId]) return null;
          const q = pos[n.parentId];
          return <line key={`l-${id}`} x1={q.x * s + ox} y1={q.y * s + oy} x2={p.x * s + ox} y2={p.y * s + oy} stroke="rgba(15,23,42,0.16)" strokeWidth={1} />;
        })}
        {Object.entries(pos).map(([id, p]) => {
          const n = tree.nodes[id];
          return (
            <circle
              key={id}
              cx={p.x * s + ox}
              cy={p.y * s + oy}
              r={n.kind === "root" ? 4 : 2.4}
              fill={n.kind === "question" ? "#4f46e5" : stateColor(n.state)}
            />
          );
        })}
        <rect x={view.x} y={view.y} width={Math.max(0, view.w)} height={Math.max(0, view.h)} rx={4} className="minimap-view" />
      </svg>
    </div>
  );
}
