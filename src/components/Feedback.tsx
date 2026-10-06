import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo } from "react";
import { levelTitle } from "../lib/levels";
import { useStore } from "../store/useStore";
import { LevelBadge } from "./HUD";

/** XP popups, achievement unlocks and errors, stacked bottom-centre. */
export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  return (
    <div className="toasts">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            className={`toast toast-${t.kind}`}
            initial={{ opacity: 0, y: 30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            onClick={() => dismiss(t.id)}
          >
            {t.kind === "achievement" && <span className="toast-shine" />}
            <span className="toast-icon">{t.icon}</span>
            <span className="toast-body">
              {t.kind === "achievement" && <span className="toast-kicker">Achievement unlocked</span>}
              <span className="toast-title">{t.title}</span>
              {t.sub && <span className="toast-sub">{t.sub}</span>}
            </span>
            {t.xp ? <span className="toast-xp">+{t.xp} XP</span> : null}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function LevelUp() {
  const level = useStore((s) => s.levelUp);
  const clear = useStore((s) => s.clearLevelUp);

  useEffect(() => {
    if (!level) return;
    const t = setTimeout(clear, 3200);
    return () => clearTimeout(t);
  }, [level, clear]);

  const rays = useMemo(() => Array.from({ length: 16 }, (_, i) => i), []);
  const confetti = useMemo(
    () =>
      Array.from({ length: 60 }, () => ({
        x: (Math.random() - 0.5) * 900,
        y: (Math.random() - 0.7) * 700,
        r: Math.random() * 720 - 360,
        c: ["#7c5cff", "#06b6d4", "#ff4d94", "#ffc23d", "#10b981"][Math.floor(Math.random() * 5)],
        d: Math.random() * 0.3,
      })),
    // regenerate per level-up
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level],
  );

  return (
    <AnimatePresence>
      {level && (
        <motion.div className="levelup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={clear}>
          <motion.div className="levelup-rays" initial={{ scale: 0, rotate: 0 }} animate={{ scale: 1, rotate: 90 }} transition={{ duration: 3, ease: "easeOut" }}>
            {rays.map((i) => (
              <i key={i} style={{ transform: `rotate(${i * 22.5}deg)` }} />
            ))}
          </motion.div>
          {confetti.map((c, i) => (
            <motion.span
              key={i}
              className="confetti"
              style={{ background: c.c }}
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
              animate={{ x: c.x, y: [0, c.y, c.y + 400], opacity: [1, 1, 0], rotate: c.r }}
              transition={{ duration: 2.6, delay: c.d, ease: "easeOut" }}
            />
          ))}
          <motion.div className="levelup-core" initial={{ scale: 0.2, y: 40 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 12 }}>
            <div className="levelup-kicker">LEVEL UP</div>
            <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 1.2, ease: "easeOut" }}>
              <LevelBadge level={level} size={120} />
            </motion.div>
            <div className="levelup-title grad-text">{levelTitle(level)}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
