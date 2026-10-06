import { motion } from "framer-motion";
import { Crown, Microscope, Plus, Star } from "lucide-react";
import { memo } from "react";
import type { Positioned } from "../lib/layout";
import { sfx } from "../lib/sound";
import { stateColor } from "../store/useStore";
import type { KNode, NodeState } from "../types";

/** Distance from a node's centre to where incoming edges attach (its top). */
export function nodeTop(n: KNode) {
  if (n.kind === "root") return 64;
  if (n.kind === "question") return 34;
  return 42;
}

/** Distance from a node's centre to where outgoing edges leave (below its label). */
export function nodeBottom(n: KNode) {
  if (n.kind === "root") return 136;
  if (n.kind === "question") return 34;
  return 100;
}

export function nodeColor(n: KNode) {
  if (n.kind === "question") return n.angle === "custom" ? "#0d9488" : "#4f46e5";
  return stateColor(n.state);
}

const STARS: Partial<Record<NodeState, number>> = { learning: 1, understood: 2, mastered: 3 };

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
  onDive(id: string): void;
}

export const NodeView = memo(function NodeView({ node, pos, origin, index, selected, onPath, generating, hiddenCount, onSelect, onPlus, onDive }: Props) {
  const fresh = Date.now() - node.createdAt < 4000;
  const from = fresh && origin ? origin : pos;
  const color = nodeColor(node);
  const stars = STARS[node.state] ?? 0;
  const dives = node.dives?.length ?? 0;

  const cls = ["node", `node--${node.kind}`, `state--${node.state}`, selected && "is-selected", onPath && "on-path", generating && "is-generating"]
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
        scale: { type: "spring", stiffness: 320, damping: 14, delay: fresh ? 0.15 + index * 0.09 : 0 },
        opacity: { duration: 0.25, delay: fresh ? 0.15 + index * 0.09 : 0 },
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
          whileHover={{ y: -4, rotate: node.kind === "question" ? 0 : -2 }}
          whileTap={{ y: 3, scale: 0.97 }}
          aria-label={node.title}
        >
          {node.kind === "question" ? (
            <div className="q-card">
              <span className="q-badge">{node.angle === "custom" ? "?" : "Q"}</span>
              <span className="q-icon">{node.icon}</span>
              <span className="q-text">{node.title}</span>
            </div>
          ) : (
            <div className="tile">
              <span className="tile-cap" />
              <span className="tile-icon">{node.icon}</span>
              <span className="tile-shine" />
              {node.state === "mastered" && (
                <span className="tile-crown">
                  <Crown size={node.kind === "root" ? 22 : 16} strokeWidth={2.5} />
                </span>
              )}
              {dives > 0 && (
                <span className="tile-dive" title={`Deep Dive depth ${dives}`}>
                  {"▾".repeat(dives)}
                </span>
              )}
            </div>
          )}
          {generating && <span className="scan-ring" />}
        </motion.button>

        {node.kind !== "question" && (
          <div className="node-foot">
            <div className="stars">
              {[1, 2, 3].map((i) => (
                <Star key={i} size={node.kind === "root" ? 15 : 12} className={i <= stars ? "on" : ""} strokeWidth={2.5} />
              ))}
            </div>
            <div className="node-label">{node.title}</div>
          </div>
        )}

        <div className="node-actions">
          <motion.button
            className="act act-dive"
            title="Deep Dive: under the hood"
            onClick={(e) => {
              e.stopPropagation();
              onDive(node.id);
            }}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
          >
            <Microscope size={14} strokeWidth={2.6} />
          </motion.button>
          <motion.button
            className="act act-plus"
            title="Explore"
            onClick={(e) => {
              e.stopPropagation();
              onPlus(node.id);
            }}
            whileHover={{ scale: 1.15, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
          >
            <Plus size={15} strokeWidth={3.2} />
          </motion.button>
        </div>

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
