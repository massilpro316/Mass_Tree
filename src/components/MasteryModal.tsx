import { AnimatePresence, motion } from "framer-motion";
import { Crown, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getEngine } from "../ai";
import { pathTo } from "../lib/layout";
import { sfx } from "../lib/sound";
import { useStore, useTree } from "../store/useStore";
import type { QuizQuestion } from "../types";
import { Modal } from "./Modal";

type Phase = "loading" | "quiz" | "teach" | "won" | "lost" | "error";

const TEACH_MIN = 80;

export function MasteryModal() {
  const tree = useTree();
  const masteryId = useStore((s) => s.masteryId);
  const openMastery = useStore((s) => s.openMastery);
  const setNodeState = useStore((s) => s.setNodeState);
  const setNotes = useStore((s) => s.setNotes);
  const settings = useStore((s) => s.settings);
  const node = tree && masteryId ? tree.nodes[masteryId] : undefined;

  const [phase, setPhase] = useState<Phase>("loading");
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [teach, setTeach] = useState("");
  const [error, setError] = useState("");

  const start = async () => {
    if (!node || !tree) return;
    setQi(0);
    setPicked(null);
    setScore(0);
    setTeach("");
    const engine = getEngine(settings.apiKey, settings.model);
    if (!engine.quiz) {
      setPhase("teach");
      return;
    }
    setPhase("loading");
    try {
      const qs = await engine.quiz(
        pathTo(tree, node.id).map((n) => n.title),
        node.title,
        node.summary,
        node.details,
      );
      if (qs.length === 0) throw new Error("No questions came back.");
      setQuiz(qs);
      setPhase("quiz");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  };

  useEffect(() => {
    if (masteryId) void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masteryId]);

  const close = () => openMastery(null);

  const win = () => {
    setPhase("won");
    sfx.success();
    setTimeout(() => node && setNodeState(node.id, "mastered"), 500);
  };

  const answer = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const correct = i === quiz[qi].answer;
    if (correct) {
      setScore((s) => s + 1);
      sfx.success();
    } else sfx.error();
  };

  const next = () => {
    const finalScore = score;
    if (qi + 1 < quiz.length) {
      setQi(qi + 1);
      setPicked(null);
      return;
    }
    const needed = Math.ceil(quiz.length * 0.66);
    if (finalScore >= needed) win();
    else {
      setPhase("lost");
      sfx.error();
    }
  };

  return (
    <Modal open={!!node} onClose={close} className="mastery-modal" locked={phase === "loading"}>
      {node && (
        <>
          <div className="modal-head">
            <div>
              <div className="label gold">
                <Crown size={12} /> Mastery challenge
              </div>
              <h3 className="modal-title">
                <span className="mt-icon">{node.icon}</span> {node.title}
              </h3>
            </div>
            <button className="icon-btn" onClick={close}>
              <X size={16} />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {phase === "loading" && (
              <motion.div key="l" className="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="scanner gold">
                  <span className="sc-ring r1" />
                  <span className="sc-ring r2" />
                  <span className="sc-ring r3" />
                  <span className="sc-core">👑</span>
                </div>
                <div className="scan-text">
                  <span className="gold-text">Forging your challenge</span>
                  <span className="dots">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
              </motion.div>
            )}

            {phase === "quiz" && quiz[qi] && (
              <motion.div key={`q${qi}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
                <div className="quiz-progress">
                  {quiz.map((_, i) => (
                    <span key={i} className={i < qi ? "done" : i === qi ? "now" : ""} />
                  ))}
                </div>
                <p className="quiz-q">{quiz[qi].question}</p>
                <div className="quiz-opts">
                  {quiz[qi].options.map((o, i) => {
                    const state = picked === null ? "" : i === quiz[qi].answer ? "right" : i === picked ? "wrong" : "dim";
                    return (
                      <motion.button
                        key={i}
                        className={`quiz-opt ${state}`}
                        onClick={() => answer(i)}
                        whileHover={picked === null ? { x: 4 } : undefined}
                        animate={state === "wrong" ? { x: [0, -8, 8, -5, 5, 0] } : state === "right" ? { scale: [1, 1.04, 1] } : {}}
                        transition={{ duration: 0.4 }}
                      >
                        <span className="opt-key">{String.fromCharCode(65 + i)}</span>
                        {o}
                      </motion.button>
                    );
                  })}
                </div>
                {picked !== null && (
                  <motion.div className="quiz-expl" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <p>{quiz[qi].explanation}</p>
                    <button className="btn btn-primary" onClick={next}>
                      {qi + 1 < quiz.length ? "Next question" : "Finish"}
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {phase === "teach" && (
              <motion.div key="t" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="quiz-q">Teach it back. Explain “{node.title}” in your own words, as if to a friend.</p>
                <p className="hint">
                  The best test of mastery is explaining without looking. Your explanation is saved to your notes. (Add an API key in Settings to get AI-generated quizzes instead.)
                </p>
                <textarea className="input" rows={6} autoFocus value={teach} onChange={(e) => setTeach(e.target.value)} placeholder="In my own words…" />
                <div className="teach-meter">
                  <motion.span animate={{ width: `${Math.min(100, (teach.trim().length / TEACH_MIN) * 100)}%` }} />
                </div>
                <div className="row-end">
                  <span className="hint">
                    {teach.trim().length}/{TEACH_MIN} characters
                  </span>
                  <button
                    className="btn btn-gold"
                    disabled={teach.trim().length < TEACH_MIN}
                    onClick={() => {
                      const stamp = `🎓 My explanation:\n${teach.trim()}`;
                      setNotes(node.id, node.notes ? `${node.notes}\n\n${stamp}` : stamp);
                      win();
                    }}
                  >
                    <Crown size={15} /> Claim mastery
                  </button>
                </div>
              </motion.div>
            )}

            {phase === "won" && (
              <motion.div key="w" className="result" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 14 }}>
                <motion.div className="result-crown" animate={{ rotate: [0, -8, 8, 0], y: [0, -6, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>
                  👑
                </motion.div>
                <h3 className="gold-text">Concept mastered</h3>
                <p className="hint">{quiz.length ? `${score} / ${quiz.length} correct.` : "Explanation saved to your notes."} +60 XP</p>
                <button className="btn btn-gold" onClick={close}>
                  Continue
                </button>
              </motion.div>
            )}

            {phase === "lost" && (
              <motion.div key="x" className="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="result-crown">🧩</div>
                <h3>Almost there</h3>
                <p className="hint">
                  {score} / {quiz.length} correct. Review the card and try again. Every attempt makes a new challenge.
                </p>
                <div className="row-center">
                  <button className="btn btn-ghost" onClick={close}>
                    Review
                  </button>
                  <button className="btn btn-gold" onClick={() => void start()}>
                    <RotateCcw size={15} /> Retry
                  </button>
                </div>
              </motion.div>
            )}

            {phase === "error" && (
              <motion.div key="e" className="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="result-crown">⚠️</div>
                <p className="hint">{error}</p>
                <div className="row-center">
                  <button className="btn btn-ghost" onClick={() => setPhase("teach")}>
                    Teach it back instead
                  </button>
                  <button className="btn btn-primary" onClick={() => void start()}>
                    Retry
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </Modal>
  );
}
