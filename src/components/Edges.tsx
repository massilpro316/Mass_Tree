import { motion } from "framer-motion";
import { memo } from "react";
import type { Positioned } from "../lib/layout";
import type { KNode, Tree } from "../types";
import { NODE_STATES } from "../types";
import { nodeBottom, nodeColor, nodeTop } from "./NodeView";

const MOVE = { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const };

function edgePath(p: Positioned, c: Positioned, fromBottom: number, toTop: number) {
  const y1 = p.y + fromBottom;
  const y2 = c.y - toTop;
  const mid = (y1 + y2) / 2;
  return `M ${p.x} ${y1} C ${p.x} ${mid}, ${c.x} ${mid}, ${c.x} ${y2}`;
}

interface Props {
  tree: Tree;
  pos: Record<string, Positioned>;
  highlight: Set<string>;
}

/** Animated connections: a soft glow, a crisp core, flowing dashes and travelling particles. */
export const Edges = memo(function Edges({ tree, pos, highlight }: Props) {
  const edges: { id: string; d: string; child: KNode; fresh: boolean; hot: boolean }[] = [];
  for (const id of Object.keys(pos)) {
    const child = tree.nodes[id];
    if (!child?.parentId || !pos[child.parentId]) continue;
    const parent = tree.nodes[child.parentId];
    edges.push({
      id,
      d: edgePath(pos[child.parentId], pos[id], nodeBottom(parent), nodeTop(child)),
      child,
      fresh: Date.now() - child.createdAt < 4000,
      hot: highlight.has(id),
    });
  }

  return (
    <svg className="edges" width="1" height="1" overflow="visible">
      {edges.map(({ id, d, child, fresh, hot }) => {
        const color = nodeColor(child);
        const level = NODE_STATES.indexOf(child.state);
        const active = level >= 1 || child.kind === "question";
        return (
          <g key={id} className={hot ? "edge edge--hot" : "edge"}>
            <motion.path
              d={d}
              initial={fresh ? { pathLength: 0, opacity: 0 } : false}
              animate={{ d, pathLength: 1, opacity: 1 }}
              transition={{ d: MOVE, pathLength: { duration: 0.9, ease: "easeOut" }, opacity: { duration: 0.3 } }}
              stroke={hot ? color : "#1c1940"}
              strokeOpacity={hot ? 0.22 : 0.07}
              strokeWidth={hot ? 16 : 12}
              fill="none"
              strokeLinecap="round"
            />
            <motion.path
              id={`edge-${id}`}
              d={d}
              initial={fresh ? { pathLength: 0 } : false}
              animate={{ d, pathLength: 1 }}
              transition={{ d: MOVE, pathLength: { duration: 0.9, ease: "easeOut" } }}
              stroke={active ? color : "#b4b7d2"}
              strokeOpacity={hot ? 1 : active ? 0.75 : 0.9}
              strokeWidth={hot ? 3.5 : 2.5}
              strokeDasharray={active ? undefined : "2 7"}
              fill="none"
              strokeLinecap="round"
            />
            {active && (
              <motion.path
                className="edge-flow"
                d={d}
                animate={{ d }}
                transition={{ d: MOVE }}
                stroke="#ffffff"
                strokeWidth={hot ? 2 : 1.4}
                fill="none"
                strokeLinecap="round"
              />
            )}
            {(level >= 2 || hot || child.kind === "question") && (
              <circle r={hot ? 5 : 4} fill="#fff" stroke={color} strokeWidth={2.5} className="edge-particle">
                <animateMotion dur={`${2.4 + (id.charCodeAt(id.length - 1) % 5) * 0.4}s`} repeatCount="indefinite" rotate="auto">
                  <mpath href={`#edge-${id}`} />
                </animateMotion>
              </circle>
            )}
          </g>
        );
      })}
    </svg>
  );
});
