import { AnimatePresence, motion } from "framer-motion";
import { Brain, Cog, Link2, MessageCircleQuestion, Search, Code2, Sparkles, X, Check } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { ANGLES } from "../ai/prompts";
import { sfx } from "../lib/sound";
import { useStore, useTree } from "../store/useStore";
import type { ExploreAngle } from "../types";
import { Modal } from "./Modal";

const ANGLE_ICON: Record<ExploreAngle, ReactNode> = {
  what: <Search size={18} />,
  how: <Cog size={18} />,
  "under-the-hood": <Brain size={18} />,
  implementation: <Code2 size={18} />,
  dependencies: <Link2 size={18} />,
};

export function ExploreModal() {
  const tree = useTree();
  const exploreId = useStore((s) => s.exploreId);
  const openExplore = useStore((s) => s.openExplore);
  const explore = useStore((s) => s.explore);
  const node = tree && exploreId ? tree.nodes[exploreId] : undefined;
  const busy = useStore((s) => (exploreId ? !!s.generating[exploreId] : false));
  const [custom, setCustom] = useState("");

  useEffect(() => {
    if (exploreId) {
      setCustom("");
    }
  }, [exploreId]);

  // Which angles already have a branch under this node.
  const used = new Set(node?.children.map((c) => tree?.nodes[c]?.angle).filter(Boolean));

  const run = async (question: string, angle: ExploreAngle | "custom") => {
    if (!node || busy) return;
    sfx.click();
    const ok = await explore(node.id, question, angle);
    if (ok) openExplore(null);
  };

  const close = () => !busy && openExplore(null);

  return (
    <Modal open={!!node} onClose={close} className="explore-modal" locked={busy}>
      {node && (
        <>
          <div className="modal-head">
            <div>
              <div className="label">Explore</div>
              <h3 className="modal-title">
                <span className="mt-icon">{node.icon}</span> {node.title}
              </h3>
            </div>
            <button className="icon-btn" onClick={close} disabled={busy}>
              <X size={16} />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {busy ? (
              <motion.div key="scan" className="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="scanner">
                  <span className="sc-ring r1" />
                  <span className="sc-ring r2" />
                  <span className="sc-ring r3" />
                  <span className="sc-core">{node.icon}</span>
                </div>
                <div className="scan-text">
                  <span className="grad-text">Synthesizing knowledge</span>
                  <span className="dots">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
                <div className="scan-sub">Mapping new branches from “{node.title}”</div>
              </motion.div>
            ) : (
              <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="angles">
                  {(Object.keys(ANGLES) as ExploreAngle[]).map((a, i) => (
                    <motion.button
                      key={a}
                      className="angle"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.04 * i }}
                      whileHover={{ x: 4 }}
                      onPointerEnter={() => sfx.hover()}
                      onClick={() => run(ANGLES[a].question(node.title), a)}
                    >
                      <span className="angle-icon">{ANGLE_ICON[a]}</span>
                      <span className="angle-text">
                        <span className="angle-label">{ANGLES[a].label}</span>
                        <span className="angle-hint">{ANGLES[a].hint}</span>
                      </span>
                      {used.has(a) && (
                        <span className="angle-done" title="Already explored">
                          <Check size={13} />
                        </span>
                      )}
                      <span className="angle-xp">+20 XP</span>
                    </motion.button>
                  ))}
                </div>

                <div className="or">
                  <span>or</span>
                </div>

                <form
                  className="custom-q"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (custom.trim()) run(custom.trim(), "custom");
                  }}
                >
                  <label className="label">
                    <MessageCircleQuestion size={13} /> Ask your own question
                  </label>
                  <textarea
                    className="input"
                    rows={3}
                    autoFocus
                    placeholder={`e.g. What happens when ${node.title} fails?`}
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (custom.trim()) run(custom.trim(), "custom");
                      }
                    }}
                  />
                  <div className="row-end">
                    <span className="hint">+35 XP for your own question</span>
                    <button className="btn btn-primary" type="submit" disabled={!custom.trim()}>
                      <Sparkles size={15} /> Explore
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </Modal>
  );
}
