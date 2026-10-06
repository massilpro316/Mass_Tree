import { motion } from "framer-motion";
import { ArrowLeft, Settings, Trophy, Volume2, VolumeX } from "lucide-react";
import { useId, useState } from "react";
import { ACHIEVEMENTS } from "../lib/achievements";
import { levelProgress, levelTitle } from "../lib/levels";
import { isMuted, setMuted } from "../lib/sound";
import { useStore, useTree } from "../store/useStore";
import { NODE_STATES } from "../types";

export function LevelBadge({ level, size = 44 }: { level: number; size?: number }) {
  // Unique per instance: a gradient defined inside a hidden badge would break the others.
  const grad = useId();
  return (
    <div className="level-badge" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <defs>
          <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#9b7bff" />
            <stop offset="1" stopColor="#6a3df5" />
          </linearGradient>
        </defs>
        <polygon points="50,10 92,32 92,74 50,96 8,74 8,32" fill="#1c1940" />
        <polygon points="50,4 92,26 92,68 50,90 8,68 8,26" fill={`url(#${grad})`} stroke="#1c1940" strokeWidth="5" strokeLinejoin="round" />
        <polygon points="50,14 82,31 50,40 18,31" fill="rgba(255,255,255,0.28)" />
      </svg>
      <span style={{ fontSize: size * 0.36 }}>{level}</span>
    </div>
  );
}

export function XPBar({ compact = false }: { compact?: boolean }) {
  const xp = useStore((s) => s.profile.xp);
  const { level, current, needed, ratio } = levelProgress(xp);
  return (
    <div className={`xp ${compact ? "xp-compact" : ""}`}>
      <LevelBadge level={level} size={compact ? 38 : 46} />
      <div className="xp-info">
        <div className="xp-top">
          <span className="xp-title">{levelTitle(level)}</span>
          <span className="xp-num">
            {current}/{needed} XP
          </span>
        </div>
        <div className="xp-track">
          <motion.div className="xp-fill" initial={false} animate={{ width: `${Math.max(3, ratio * 100)}%` }} transition={{ type: "spring", stiffness: 90, damping: 18 }}>
            <span className="xp-shine" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function HUD() {
  const tree = useTree();
  const screen = useStore((s) => s.screen);
  const goHome = useStore((s) => s.goHome);
  const setModal = useStore((s) => s.setModal);
  const unlocked = useStore((s) => Object.keys(s.profile.achievements).length);
  const streak = useStore((s) => s.profile.streak);
  const demo = useStore((s) => !s.settings.apiKey);
  const [muted, setM] = useState(isMuted());

  const nodes = tree ? Object.values(tree.nodes) : [];
  const mastered = nodes.filter((n) => n.state === "mastered").length;
  const understood = nodes.filter((n) => NODE_STATES.indexOf(n.state) >= NODE_STATES.indexOf("understood")).length;

  return (
    <header className="hud">
      <div className="hud-left">
        {screen === "tree" ? (
          <motion.button className="icon-btn" onClick={goHome} title="All trees" whileHover={{ x: -2 }}>
            <ArrowLeft size={17} />
          </motion.button>
        ) : null}
        <button className={`brand ${screen === "tree" ? "brand-tree" : ""}`} onClick={goHome}>
          <span className="brand-mark">
            <i />
          </span>
          <span className="brand-name">KNOWLEDGE TREE</span>
        </button>
        {screen === "tree" && tree && (
          <motion.div className="hud-tree pill" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <span className="hud-tree-title">{tree.title}</span>
            <span className="hud-stat" title="Nodes">
              ◉ {nodes.length}
            </span>
            <span className="hud-stat green" title="Understood">
              ✓ {understood}
            </span>
            <span className="hud-stat gold" title="Mastered">
              ♛ {mastered}
            </span>
          </motion.div>
        )}
      </div>
      <div className="hud-right">
        {demo && (
          <button className="demo-pill" onClick={() => setModal("settings")} title="Add your Claude API key for real AI">
            <span className="pulse-dot" /> Demo mode
          </button>
        )}
        <div className="pill streak" title="Daily streak">
          <span className="streak-fire">🔥</span> {streak}
        </div>
        <div className="pill hud-xp">
          <XPBar compact />
        </div>
        <button className="icon-btn trophy" onClick={() => setModal("achievements")} title="Achievements">
          <Trophy size={17} />
          <span className="badge-count">
            {unlocked}/{ACHIEVEMENTS.length}
          </span>
        </button>
        <button
          className="icon-btn"
          onClick={() => {
            setMuted(!muted);
            setM(!muted);
          }}
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>
        <button className="icon-btn" onClick={() => setModal("settings")} title="Settings">
          <Settings size={17} />
        </button>
      </div>
    </header>
  );
}
