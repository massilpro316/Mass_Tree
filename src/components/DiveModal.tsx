import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowDown, Check, Lock, Plus, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { DIVE_LEVELS } from "../ai/prompts";
import { Markdown } from "../lib/markdown";
import { diveKey, useStore, useTree } from "../store/useStore";
import type { DeepDive } from "../types";
import { Modal } from "./Modal";

/** Background tint per depth: the water gets deeper as you dive. */
const DEPTH_TINT = ["#f0fdfa", "#e0f2fe", "#dbeafe", "#d6e2ff"];

export function DiveModal() {
  const tree = useTree();
  const diveId = useStore((s) => s.diveId);
  const openDive = useStore((s) => s.openDive);
  const deepDive = useStore((s) => s.deepDive);
  const node = tree && diveId ? tree.nodes[diveId] : undefined;
  const busy = useStore((s) => (diveId ? !!s.generating[diveKey(diveId)] : false));

  const dives = node?.dives ?? [];
  const reached = dives.reduce((m, d) => Math.max(m, d.level), 0);
  const [level, setLevel] = useState(1);
  const [focus, setFocus] = useState("");

  // Open on the deepest layer already explored (or the first one).
  useEffect(() => {
    if (diveId) {
      setLevel(Math.max(1, reached));
      setFocus("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diveId]);

  const current = dives.find((d) => d.level === level);
  const meta = DIVE_LEVELS[level - 1];

  const dive = async (lvl: number, f?: string) => {
    setLevel(lvl);
    await deepDive(node!.id, lvl, f);
  };

  const close = () => openDive(null);

  return (
    <Modal open={!!node} onClose={close} className="dive-modal">
      {node && (
        <div className="dive" style={{ ["--tint" as string]: DEPTH_TINT[busy ? level : current ? level : level - 1] }}>
          <div className="dive-head">
            <div className="dive-head-text">
              <div className="label">🔬 Deep Dive · under the hood</div>
              <h3 className="modal-title">
                <span className="mt-icon">{node.icon}</span> {node.title}
              </h3>
            </div>
            <button className="icon-btn" onClick={close}>
              <X size={16} />
            </button>
          </div>

          <div className="dive-body">
            {/* Depth gauge */}
            <aside className="gauge">
              <div className="gauge-track">
                <motion.div className="gauge-fill" initial={false} animate={{ height: `${(Math.max(reached, busy ? level : 0) / 3) * 100}%` }} transition={{ type: "spring", stiffness: 80, damping: 16 }} />
                <motion.span className="gauge-sub" initial={false} animate={{ top: `${(level / 3) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 14 }}>
                  🤿
                </motion.span>
              </div>
              <div className="gauge-stops">
                <span className="gauge-stop surface">0m</span>
                {DIVE_LEVELS.map((l) => {
                  const done = dives.some((d) => d.level === l.level);
                  const unlocked = l.level <= reached + 1;
                  return (
                    <button
                      key={l.level}
                      className={`gauge-stop ${level === l.level ? "on" : ""} ${done ? "done" : ""}`}
                      disabled={!unlocked || busy}
                      onClick={() => setLevel(l.level)}
                      title={unlocked ? l.name : "Finish the level above to unlock"}
                    >
                      <span className="gs-depth">{l.depth}</span>
                      <span className="gs-name">
                        {done ? <Check size={11} strokeWidth={3} /> : !unlocked ? <Lock size={10} /> : null} {l.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <div className="dive-content">
              <AnimatePresence mode="wait">
                {busy ? (
                  <motion.div key="busy" className="diving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="bubbles">
                      {Array.from({ length: 10 }, (_, i) => (
                        <span key={i} style={{ left: `${10 + i * 8}%`, animationDelay: `${i * 0.25}s`, width: 8 + (i % 4) * 4, height: 8 + (i % 4) * 4 }} />
                      ))}
                    </div>
                    <motion.div className="diver" animate={{ y: [0, 14, 0], rotate: [0, 6, -4, 0] }} transition={{ duration: 2.2, repeat: Infinity }}>
                      🤿
                    </motion.div>
                    <div className="scan-text">
                      Diving to {meta.depth}
                      <span className="dots">
                        <i />
                        <i />
                        <i />
                      </span>
                    </div>
                    <div className="hint">Exploring the {meta.name.toLowerCase()} of “{node.title}”</div>
                  </motion.div>
                ) : current ? (
                  <DiveLayer key={`l${level}-${current.createdAt}`} dive={current} nodeId={node.id} />
                ) : (
                  <motion.div key={`start${level}`} className="dive-start" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <div className="dive-start-icon">{meta.icon}</div>
                    <div className="dive-level-tag">
                      Level {level} · {meta.depth}
                    </div>
                    <h4>{meta.name}</h4>
                    <p className="hint">Explains {meta.goal}.</p>
                    <input className="input" placeholder="Optional: focus the dive on… (e.g. what happens on failure)" value={focus} onChange={(e) => setFocus(e.target.value)} />
                    <button className="btn btn-dive big" onClick={() => dive(level, focus)}>
                      <ArrowDown size={17} strokeWidth={3} /> Dive to {meta.depth}
                      <span className="btn-xp">+{20 * level} XP</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {!busy && current && (
            <div className="dive-foot">
              <input className="input" placeholder="Re-dive with a focus… (optional)" value={focus} onChange={(e) => setFocus(e.target.value)} />
              <button className="btn btn-ghost" onClick={() => dive(level, focus)} title="Regenerate this level">
                <RotateCcw size={15} /> Re-dive
              </button>
              {level < 3 && (
                <button
                  className="btn btn-dive"
                  onClick={() => {
                    const next = level + 1;
                    if (dives.some((d) => d.level === next)) setLevel(next);
                    else void dive(next);
                  }}
                >
                  <ArrowDown size={16} strokeWidth={3} /> Go deeper · {DIVE_LEVELS[level].depth}
                  {!dives.some((d) => d.level === level + 1) && <span className="btn-xp">+{20 * (level + 1)} XP</span>}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function DiveLayer({ dive, nodeId }: { dive: DeepDive; nodeId: string }) {
  const addChild = useStore((s) => s.addChild);
  const tree = useTree();
  const existing = new Set((tree?.nodes[nodeId]?.children ?? []).map((c) => tree?.nodes[c]?.title.toLowerCase()));
  const [added, setAdded] = useState<Set<string>>(new Set());

  return (
    <motion.div className="layer" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      <div className="dive-level-tag">
        Level {dive.level} · {DIVE_LEVELS[dive.level - 1].depth} · {DIVE_LEVELS[dive.level - 1].name}
        {dive.focus && <span className="focus-tag">focus: {dive.focus}</span>}
      </div>
      <h4 className="layer-title">{dive.title}</h4>
      <div className="insight">
        <span className="insight-icon">💡</span>
        <p>{dive.summary}</p>
      </div>

      {dive.steps.length > 0 && (
        <div className="block">
          <div className="label">What happens, step by step</div>
          <ol className="steps">
            {dive.steps.map((s, i) => (
              <motion.li key={i} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 * i + 0.1 }}>
                <span className="step-n">{i + 1}</span>
                <div>
                  <div className="step-label">{s.label}</div>
                  <div className="step-detail md">
                    <Markdown source={s.detail} />
                  </div>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      )}

      {dive.sections.map((sec, i) => (
        <div key={i} className="block">
          <div className="sec-head">{sec.heading}</div>
          <div className="md">
            <Markdown source={sec.body} />
          </div>
        </div>
      ))}

      {dive.code.snippet.trim() && (
        <div className="block">
          <div className="code-card">
            <div className="code-bar">
              <i />
              <i />
              <i />
              <span>{dive.code.language || "code"}</span>
            </div>
            <pre>
              <code>{dive.code.snippet}</code>
            </pre>
          </div>
          {dive.code.caption && <p className="hint code-cap">{dive.code.caption}</p>}
        </div>
      )}

      {dive.pitfalls.length > 0 && (
        <div className="block">
          <div className="label">Watch out</div>
          <div className="pitfalls">
            {dive.pitfalls.map((p, i) => (
              <div key={i} className="pitfall">
                <AlertTriangle size={15} />
                <span>{p}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {dive.terms.length > 0 && (
        <div className="block">
          <div className="label">Key terms · add them to your tree</div>
          <div className="terms">
            {dive.terms.map((t) => {
              const done = added.has(t.term) || existing.has(t.term.toLowerCase());
              return (
                <div key={t.term} className="term">
                  <div>
                    <div className="term-name">{t.term}</div>
                    <div className="term-meaning">{t.meaning}</div>
                  </div>
                  <button
                    className={`btn ${done ? "btn-ghost" : "btn-primary"} tiny`}
                    disabled={done}
                    onClick={() => {
                      addChild(nodeId, t.term, t.meaning, false);
                      setAdded(new Set(added).add(t.term));
                    }}
                  >
                    {done ? <Check size={13} /> : <Plus size={13} strokeWidth={3} />} {done ? "In tree" : "Add"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
