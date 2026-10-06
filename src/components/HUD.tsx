import { motion } from "framer-motion";
import { ArrowLeft, Settings, Trophy, Volume2, VolumeX } from "lucide-react";
import { useState } from "react";
import { ACHIEVEMENTS } from "../lib/achievements";
import { levelProgress, levelTitle } from "../lib/levels";
import { isMuted, setMuted } from "../lib/sound";
import { useStore, useTree } from "../store/useStore";
import { NODE_STATES } from "../types";

export function LevelBadge({ level, size = 44 }: { level: number; size?: number }) {
  return (
    <div className="level-badge" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <defs>
          <linearGradient id="lb" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#22d3ee" />
            <stop offset="0.5" stopColor="#818cf8" />
            <stop offset="1" stopColor="#f472b6" />
          </linearGradient>
        </defs>
        <polygon points="50,3 93,27 93,73 50,97 7,73 7,27" fill="rgba(8,10,30,0.9)" stroke="url(#lb)" strokeWidth="5" />
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
          <motion.div className="hud-tree glass" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
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
        <div className="glass hud-xp">
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
