import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { DEMO_QUESTION } from "../ai/demoData";
import { bounds, layoutTree } from "../lib/layout";
import { sfx } from "../lib/sound";
import { stateColor, useStore } from "../store/useStore";
import type { Tree } from "../types";
import { NODE_STATES } from "../types";

const SUGGESTIONS = [
  DEMO_QUESTION,
  "How does HTTPS keep data secret?",
  "How do transformers in AI work?",
  "What happens when I type a URL?",
  "How does Git store history?",
  "How does the immune system fight viruses?",
];

export function Home() {
  const trees = useStore((s) => s.trees);
  const plantTree = useStore((s) => s.plantTree);
  const planting = useStore((s) => s.planting);
  const demo = useStore((s) => !s.settings.apiKey);
  const [q, setQ] = useState("");

  const list = Object.values(trees).sort((a, b) => b.updatedAt - a.updatedAt);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || planting) return;
    sfx.click();
    void plantTree(t);
  };

  return (
    <div className="home">
      <section className="hero">
        <HeroCore />
        <motion.div className="hero-copy" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
          <div className="kicker">
            <span className="pulse-dot" /> Personal learning game
          </div>
          <h1 className="hero-title">
            Grow a <span className="grad-text">universe</span>
            <br />
            of knowledge.
          </h1>
          <p className="hero-sub">Ask a question. Watch it branch into concepts. Explore each one, ask your own questions, and build a knowledge tree that's truly yours.</p>

          <form
            className="ask"
            onSubmit={(e) => {
              e.preventDefault();
              submit(q);
            }}
          >
            <div className="ask-border" />
            <Sparkles className="ask-icon" size={20} />
            <input className="ask-input" placeholder="What do you want to understand?" value={q} onChange={(e) => setQ(e.target.value)} disabled={!!planting} />
            <motion.button className="btn btn-primary ask-btn" type="submit" disabled={!q.trim() || !!planting} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              Grow tree <ArrowRight size={16} />
            </motion.button>
          </form>

          <div className="suggest">
            {SUGGESTIONS.map((s, i) => (
              <motion.button
                key={s}
                className={`chip suggest-chip ${s === DEMO_QUESTION && demo ? "featured" : ""}`}
                onClick={() => submit(s)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.06 }}
                whileHover={{ y: -2 }}
              >
                {s === DEMO_QUESTION && demo && <span className="feat-tag">DEMO</span>}
                {s}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </section>

      {list.length > 0 && (
        <section className="forest">
          <div className="forest-head">
            <h2>Your forest</h2>
            <span className="chip">{list.length} trees</span>
          </div>
          <div className="tree-grid">
            {list.map((t, i) => (
              <TreeCard key={t.id} tree={t} index={i} />
            ))}
          </div>
        </section>
      )}

      <AnimatePresence>{planting && <Planting question={planting} />}</AnimatePresence>
    </div>
  );
}

function HeroCore() {
  const sats = useMemo(
    () => [
      { r: 150, d: 22, s: 12, c: "#22d3ee", o: 0 },
      { r: 150, d: 22, s: 8, c: "#a78bfa", o: 0.5 },
      { r: 210, d: 34, s: 10, c: "#f472b6", o: 0.2 },
      { r: 210, d: 34, s: 7, c: "#34d399", o: 0.7 },
      { r: 270, d: 48, s: 9, c: "#fbbf24", o: 0.35 },
    ],
    [],
  );
  return (
    <div className="hero-core" aria-hidden>
      <div className="core-glow" />
      {[150, 210, 270].map((r, i) => (
        <span key={r} className={`core-ring ring-${i}`} style={{ width: r * 2, height: r * 2 }} />
      ))}
      {sats.map((s, i) => (
        <span key={i} className="sat-orbit" style={{ width: s.r * 2, height: s.r * 2, animationDuration: `${s.d}s`, animationDelay: `${-s.o * s.d}s` }}>
          <i style={{ width: s.s, height: s.s, background: s.c, boxShadow: `0 0 18px 4px ${s.c}` }} />
        </span>
      ))}
      <div className="core-orb">
        <span>🌌</span>
      </div>
    </div>
  );
}

function Planting({ question }: { question: string }) {
  return (
    <motion.div className="planting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.5 } }}>
      <div className="seed">
        <motion.span className="seed-core" animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
        {Array.from({ length: 4 }, (_, i) => (
          <motion.span
            key={i}
            className="seed-branch"
            style={{ rotate: -60 + i * 40 }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: [0, 1, 1, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.18, times: [0, 0.4, 0.8, 1] }}
          />
        ))}
        <span className="seed-ring" />
        <span className="seed-ring r2" />
      </div>
      <div className="planting-text">
        <span className="label">Planting</span>
        <h3>“{question}”</h3>
        <span className="grad-text">Mapping the first concepts…</span>
      </div>
    </motion.div>
  );
}

function TreeCard({ tree, index }: { tree: Tree; index: number }) {
  const openTree = useStore((s) => s.openTree);
  const deleteTree = useStore((s) => s.deleteTree);
  const [confirm, setConfirm] = useState(false);
  const nodes = Object.values(tree.nodes);
  const learned = nodes.filter((n) => NODE_STATES.indexOf(n.state) >= NODE_STATES.indexOf("understood")).length;
  const mastered = nodes.filter((n) => n.state === "mastered").length;
  const ratio = nodes.length ? learned / nodes.length : 0;
  const root = tree.nodes[tree.rootId];

  const preview = useMemo(() => {
    const pos = layoutTree({ ...tree, nodes: Object.fromEntries(Object.entries(tree.nodes).map(([k, v]) => [k, { ...v, collapsed: false }])) });
    const b = bounds(pos);
    const w = b.maxX - b.minX + 200;
    const h = b.maxY - b.minY + 160;
    const s = Math.min(260 / w, 110 / h);
    const ox = (260 - w * s) / 2 - (b.minX - 100) * s;
    const oy = (110 - h * s) / 2 - (b.minY - 80) * s;
    return { pos, s, ox, oy };
  }, [tree]);

  return (
    <motion.div
      className="tree-card glass"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -6 }}
      onClick={() => {
        sfx.open();
        openTree(tree.id);
      }}
    >
      <svg className="tree-preview" width="260" height="110">
        {Object.entries(preview.pos).map(([id, p]) => {
          const n = tree.nodes[id];
          if (!n.parentId || !preview.pos[n.parentId]) return null;
          const q = preview.pos[n.parentId];
          return <line key={`l${id}`} x1={q.x * preview.s + preview.ox} y1={q.y * preview.s + preview.oy} x2={p.x * preview.s + preview.ox} y2={p.y * preview.s + preview.oy} stroke="rgba(150,170,255,0.25)" />;
        })}
        {Object.entries(preview.pos).map(([id, p]) => {
          const n = tree.nodes[id];
          const c = n.kind === "question" ? "#818cf8" : stateColor(n.state);
          return <circle key={id} cx={p.x * preview.s + preview.ox} cy={p.y * preview.s + preview.oy} r={n.kind === "root" ? 5 : 3} fill={c} style={{ filter: `drop-shadow(0 0 4px ${c})` }} />;
        })}
      </svg>
      <div className="tree-card-body">
        <div className="tree-card-title">
          <span>{root?.icon}</span> {root?.title ?? tree.title}
        </div>
        <div className="tree-card-q">{tree.title}</div>
        <div className="tree-card-stats">
          <Ring ratio={ratio} />
          <span>◉ {nodes.length}</span>
          <span className="green">✓ {learned}</span>
          <span className="gold">♛ {mastered}</span>
          {tree.demo && <span className="chip tiny">demo</span>}
        </div>
      </div>
      <div className="tree-card-del" onClick={(e) => e.stopPropagation()}>
        {confirm ? (
          <>
            <button className="btn btn-danger tiny" onClick={() => deleteTree(tree.id)}>
              Delete
            </button>
            <button className="btn btn-ghost tiny" onClick={() => setConfirm(false)}>
              Keep
            </button>
          </>
        ) : (
          <button className="icon-btn" onClick={() => setConfirm(true)} title="Delete tree">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function Ring({ ratio }: { ratio: number }) {
  const r = 11;
  const c = 2 * Math.PI * r;
  return (
    <svg width="28" height="28" className="ring">
      <circle cx="14" cy="14" r={r} stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="none" />
      <motion.circle
        cx="14"
        cy="14"
        r={r}
        stroke="url(#ringGrad)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - ratio) }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        transform="rotate(-90 14 14)"
      />
      <defs>
        <linearGradient id="ringGrad">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#34d399" />
        </linearGradient>
      </defs>
      <text x="14" y="17.5" textAnchor="middle" fontSize="8" fill="#9aa4c7">
        {Math.round(ratio * 100)}
      </text>
    </svg>
  );
}
