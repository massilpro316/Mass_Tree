import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  BookOpen,
  ChevronRight,
  Crown,
  Eye,
  EyeOff,
  GitBranchPlus,
  Lightbulb,
  Microscope,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { pathTo } from "../lib/layout";
import { Markdown } from "../lib/markdown";
import { sfx } from "../lib/sound";
import { diveKey, stateColor, useStore, useTree } from "../store/useStore";
import { nodeColor } from "./NodeView";
import { DIFFICULTIES, NODE_STATES, type Difficulty, type KNode, type NodeState } from "../types";

const STATE_LABEL: Record<NodeState, string> = {
  unknown: "Unknown",
  discovered: "Discovered",
  exploring: "Exploring",
  learning: "Learning",
  understood: "Understood",
  mastered: "Mastered",
};

const KIND_LABEL = (n: KNode) =>
  n.kind === "root" ? "Root topic" : n.kind === "question" ? (n.angle === "custom" ? "Your question" : "Exploration") : "Concept";

export function ConceptPanel() {
  const tree = useTree();
  const selectedId = useStore((s) => s.selectedId);
  const node = tree && selectedId ? tree.nodes[selectedId] : undefined;

  return (
    <AnimatePresence>
      {node && tree && (
        <motion.aside
          className="panel"
          initial={{ x: 80, opacity: 0, rotateY: -12 }}
          animate={{ x: 0, opacity: 1, rotateY: 0 }}
          exit={{ x: 80, opacity: 0, rotateY: -8 }}
          transition={{ type: "spring", stiffness: 220, damping: 26 }}
        >
          <AnimatePresence mode="wait">
            <PanelCard key={node.id} node={node} />
          </AnimatePresence>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function PanelCard({ node }: { node: KNode }) {
  const tree = useTree()!;
  const select = useStore((s) => s.select);
  const openExplore = useStore((s) => s.openExplore);
  const openMastery = useStore((s) => s.openMastery);
  const openDive = useStore((s) => s.openDive);
  const diving = useStore((s) => !!s.generating[diveKey(node.id)]);
  const setNodeState = useStore((s) => s.setNodeState);
  const updateNode = useStore((s) => s.updateNode);
  const setNotes = useStore((s) => s.setNotes);
  const addChild = useStore((s) => s.addChild);
  const deleteNode = useStore((s) => s.deleteNode);
  const toggleCollapse = useStore((s) => s.toggleCollapse);
  const generating = useStore((s) => !!s.generating[node.id]);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: node.title, summary: node.summary, details: node.details, icon: node.icon, difficulty: node.difficulty });
  const [newChild, setNewChild] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notes, setLocalNotes] = useState(node.notes);

  useEffect(() => setLocalNotes(node.notes), [node.notes]);

  // Save unsaved notes when the card unmounts (switching nodes or closing the panel).
  const notesRef = useRef(notes);
  notesRef.current = notes;
  useEffect(
    () => () => {
      const st = useStore.getState();
      const saved = st.treeId ? st.trees[st.treeId]?.nodes[node.id]?.notes : undefined;
      if (saved !== undefined && saved !== notesRef.current) st.setNotes(node.id, notesRef.current);
    },
    [node.id],
  );

  // Card tilt that follows the pointer.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [3, -3]), { stiffness: 150, damping: 20 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-4, 4]), { stiffness: 150, damping: 20 });

  const color = nodeColor(node);
  const diveDepth = (node.dives ?? []).reduce((m, d) => Math.max(m, d.level), 0);
  const path = pathTo(tree, node.id);
  const level = NODE_STATES.indexOf(node.state);

  const save = () => {
    updateNode(node.id, draft);
    setEditing(false);
    sfx.success();
  };

  return (
    <motion.div
      className="card"
      style={{ ["--c" as string]: color, rotateX: rx, rotateY: ry }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="card-glow" />
      <div className="card-scroll">
        <div className="card-top">
          <div className="crumbs">
            {path.slice(0, -1).map((p) => (
              <button key={p.id} onClick={() => select(p.id)} className="crumb">
                {p.title.length > 22 ? p.title.slice(0, 20) + "…" : p.title}
                <ChevronRight size={12} />
              </button>
            ))}
          </div>
          <button className="icon-btn" onClick={() => select(null)} title="Close (Esc)">
            <X size={16} />
          </button>
        </div>

        <div className="card-head">
          <motion.div className="card-orb" initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.05 }}>
            {editing ? (
              <input className="icon-input" value={draft.icon} maxLength={4} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} />
            ) : (
              <span>{node.icon}</span>
            )}
          </motion.div>
          <div className="card-titles">
            <div className="card-kind">
              <span className="chip" style={{ color, borderColor: `${color}55` }}>
                {KIND_LABEL(node)}
              </span>
              {node.userEdited && <span className="chip chip-own">✦ Yours</span>}
            </div>
            {editing ? (
              <input className="input title-input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            ) : (
              <h2 className="card-title">{node.title}</h2>
            )}
          </div>
        </div>

        {/* State track */}
        <div className="track">
          {NODE_STATES.map((s, i) => (
            <div key={s} className={`track-step ${i <= level ? "on" : ""} ${i === level ? "current" : ""}`} style={{ ["--sc" as string]: stateColor(s) }}>
              <span className="track-dot" />
              <span className="track-label">{STATE_LABEL[s]}</span>
            </div>
          ))}
          <motion.div className="track-fill" initial={false} animate={{ width: `${(level / (NODE_STATES.length - 1)) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
        </div>

        {editing ? (
          <div className="edit-grid">
            <label className="label">Summary</label>
            <textarea className="input" rows={3} value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
            <label className="label">Explanation (Markdown)</label>
            <textarea className="input mono" rows={9} value={draft.details} onChange={(e) => setDraft({ ...draft, details: e.target.value })} />
            <label className="label">Difficulty</label>
            <div className="seg">
              {DIFFICULTIES.map((d) => (
                <button key={d} className={draft.difficulty === d ? "on" : ""} onClick={() => setDraft({ ...draft, difficulty: d })}>
                  {d}
                </button>
              ))}
            </div>
            <div className="row-end">
              <button className="btn btn-ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={save}>
                <Save size={15} /> Save
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="card-summary">{node.summary}</p>
            <div className="meta-row">
              <DifficultyMeter value={node.difficulty} />
              {node.parentId && (
                <span className="chip">
                  <BookOpen size={12} /> {tree.nodes[node.parentId]?.title}
                </span>
              )}
            </div>
            {node.details && (
              <div className="md card-details">
                <Markdown source={node.details} />
              </div>
            )}
          </>
        )}

        {/* Primary actions */}
        {!editing && (
          <div className="actions">
            <motion.button className="btn btn-primary explore-btn" onClick={() => openExplore(node.id)} disabled={generating} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              {generating ? <span className="spinner" /> : <Plus size={16} strokeWidth={3} />}
              {generating ? "Exploring…" : "Explore"}
            </motion.button>
            <motion.button className="btn btn-dive dive-btn" onClick={() => openDive(node.id)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              {diving ? <span className="spinner" /> : <Microscope size={16} strokeWidth={2.6} />}
              Deep Dive
              <span className="dive-meter">
                {[1, 2, 3].map((i) => (
                  <i key={i} className={i <= diveDepth ? "on" : ""} />
                ))}
              </span>
            </motion.button>
            {level < NODE_STATES.indexOf("learning") && (
              <button className="btn btn-ghost" onClick={() => setNodeState(node.id, "learning")}>
                <Sparkles size={15} /> Start learning
              </button>
            )}
            {level >= NODE_STATES.indexOf("learning") && level < NODE_STATES.indexOf("understood") && (
              <button className="btn btn-ghost" onClick={() => setNodeState(node.id, "understood")}>
                <Lightbulb size={15} /> I understand it
              </button>
            )}
            {level >= NODE_STATES.indexOf("understood") && node.state !== "mastered" && (
              <button className="btn btn-gold" onClick={() => openMastery(node.id)}>
                <Crown size={15} /> Mastery challenge
              </button>
            )}
            {node.state === "mastered" && (
              <span className="mastered-pill">
                <Crown size={14} /> Mastered
              </span>
            )}
          </div>
        )}

        {/* Branches */}
        {node.children.length > 0 && (
          <div className="section">
            <div className="section-head">
              <span className="label">Branches · {node.children.length}</span>
              <button className="link" onClick={() => toggleCollapse(node.id)}>
                {node.collapsed ? <Eye size={13} /> : <EyeOff size={13} />} {node.collapsed ? "Expand" : "Collapse"}
              </button>
            </div>
            <div className="branches">
              {node.children.map((cid, i) => {
                const c = tree.nodes[cid];
                if (!c) return null;
                const cc = nodeColor(c);
                return (
                  <motion.button
                    key={cid}
                    className="branch"
                    style={{ ["--c" as string]: cc }}
                    onClick={() => select(cid)}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                    whileHover={{ x: 4 }}
                  >
                    <span className="branch-icon">{c.icon}</span>
                    <span className="branch-text">
                      <span className="branch-title">{c.title}</span>
                      <span className="branch-sum">{c.summary}</span>
                    </span>
                    <span className="branch-dot" />
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="section">
          <div className="section-head">
            <span className="label">Your notes</span>
            <span className="hint">Your words, your knowledge</span>
          </div>
          <textarea
            className="input notes"
            rows={4}
            placeholder="Explain it to yourself, add examples, links, gotchas…"
            value={notes}
            onChange={(e) => setLocalNotes(e.target.value)}
            onBlur={() => notes !== node.notes && setNotes(node.id, notes)}
          />
        </div>

        {/* Tools */}
        <div className="tools">
          {!editing && (
            <button
              className="btn btn-ghost"
              onClick={() => {
                setDraft({ title: node.title, summary: node.summary, details: node.details, icon: node.icon, difficulty: node.difficulty });
                setEditing(true);
              }}
            >
              <Pencil size={14} /> Edit
            </button>
          )}
          {newChild === null ? (
            <button className="btn btn-ghost" onClick={() => setNewChild("")}>
              <GitBranchPlus size={14} /> Add concept
            </button>
          ) : (
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (newChild.trim()) addChild(node.id, newChild);
                setNewChild(null);
              }}
            >
              <input className="input" autoFocus placeholder="Concept name" value={newChild} onChange={(e) => setNewChild(e.target.value)} />
              <button className="btn btn-primary" type="submit">
                Add
              </button>
            </form>
          )}
          {node.parentId &&
            (confirmDelete ? (
              <span className="confirm">
                Delete branch?
                <button className="btn btn-danger" onClick={() => deleteNode(node.id)}>
                  Yes, delete
                </button>
                <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>
                  No
                </button>
              </span>
            ) : (
              <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={14} />
              </button>
            ))}
        </div>
        <div className="kbd-hint">
          <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> navigate · <kbd>F</kbd> fit · <kbd>Esc</kbd> close
        </div>
      </div>
    </motion.div>
  );
}

function DifficultyMeter({ value }: { value: Difficulty }) {
  const n = DIFFICULTIES.indexOf(value) + 1;
  return (
    <span className="chip diff">
      <span className="diff-bars">
        {[1, 2, 3, 4].map((i) => (
          <i key={i} className={i <= n ? "on" : ""} />
        ))}
      </span>
      {value}
    </span>
  );
}
