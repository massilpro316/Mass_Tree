import { motion } from "framer-motion";
import { Check, Crown, Plus } from "lucide-react";
import { memo } from "react";
import type { Positioned } from "../lib/layout";
import { sfx } from "../lib/sound";
import { stateColor } from "../store/useStore";
import type { KNode } from "../types";

export function nodeRadius(n: KNode) {
  if (n.kind === "root") return 58;
  if (n.kind === "question") return 30;
  return 32;
}

const MOVE = { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const };

interface Props {
  node: KNode;
  pos: Positioned;
  origin?: Positioned;
  index: number;
  selected: boolean;
  onPath: boolean;
  generating: boolean;
  hiddenCount: number;
  onSelect(id: string): void;
  onPlus(id: string): void;
}

export const NodeView = memo(function NodeView({ node, pos, origin, index, selected, onPath, generating, hiddenCount, onSelect, onPlus }: Props) {
  const fresh = Date.now() - node.createdAt < 4000;
  const from = fresh && origin ? origin : pos;
  const color = node.kind === "question" ? (node.angle === "custom" ? "#f472b6" : "#818cf8") : stateColor(node.state);

  const cls = [
    "node",
    `node--${node.kind}`,
    `state--${node.state}`,
    selected && "is-selected",
    onPath && "on-path",
    generating && "is-generating",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <motion.div
      className={cls}
      style={{ ["--c" as string]: color }}
      initial={{ x: from.x, y: from.y, scale: fresh ? 0 : 1, opacity: fresh ? 0 : 1 }}
      animate={{ x: pos.x, y: pos.y, scale: 1, opacity: 1 }}
      transition={{
        x: MOVE,
        y: MOVE,
        scale: { type: "spring", stiffness: 260, damping: 16, delay: fresh ? 0.15 + index * 0.09 : 0 },
        opacity: { duration: 0.3, delay: fresh ? 0.15 + index * 0.09 : 0 },
      }}
    >
      <div className="node-anchor">
        <motion.button
          className="node-body"
          onClick={(e) => {
            e.stopPropagation();
            sfx.click();
            onSelect(node.id);
          }}
          onPointerEnter={() => sfx.hover()}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          aria-label={node.title}
        >
          {node.kind === "question" ? (
            <div className="q-card">
              <span className="q-icon">{node.icon}</span>
              <span className="q-text">{node.title}</span>
            </div>
          ) : (
            <div className="orb">
              <span className="orb-halo" />
              <span className="orb-ring" />
              {node.kind === "root" && (
                <>
                  <span className="orbit orbit-1">
                    <i />
                  </span>
                  <span className="orbit orbit-2">
                    <i />
                  </span>
                </>
              )}
              <span className="orb-core">
                <span className="orb-icon">{node.icon}</span>
              </span>
              {node.state === "understood" && (
                <span className="orb-badge badge-understood">
                  <Check size={11} strokeWidth={3} />
                </span>
              )}
              {node.state === "mastered" && (
                <span className="orb-badge badge-mastered">
                  <Crown size={11} strokeWidth={2.5} />
                </span>
              )}
            </div>
          )}
          {generating && <span className="scan-ring" />}
        </motion.button>

        {node.kind !== "question" && <div className="node-label">{node.title}</div>}

        <motion.button
          className="node-plus"
          title="Explore"
          onClick={(e) => {
            e.stopPropagation();
            onPlus(node.id);
          }}
          whileHover={{ scale: 1.2, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
        >
          <Plus size={14} strokeWidth={3} />
        </motion.button>

        {hiddenCount > 0 && <span className="collapsed-count">+{hiddenCount}</span>}

        <div className="node-tip">
          <div className="tip-title">{node.title}</div>
          <div className="tip-sum">{node.summary}</div>
          <div className="tip-meta">
            <span>{node.difficulty}</span>
            <span style={{ color }}>{node.state}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
