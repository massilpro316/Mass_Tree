import { animate, motion, useMotionValue, useMotionValueEvent } from "framer-motion";
import { Focus, Maximize2, Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { bounds, descendants, layoutTree } from "../lib/layout";
import { useStore, useTree } from "../store/useStore";
import { Burst } from "./Burst";
import { Edges } from "./Edges";
import { Minimap } from "./Minimap";
import { NodeView } from "./NodeView";
import { parallax } from "./Starfield";

const MIN_K = 0.2;
const MAX_K = 2.2;
const PANEL_W = 460;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export interface Camera {
  x: number;
  y: number;
  k: number;
}

export function TreeCanvas() {
  const tree = useTree()!;
  const selectedId = useStore((s) => s.selectedId);
  const generating = useStore((s) => s.generating);
  const bursts = useStore((s) => s.bursts);
  const focus = useStore((s) => s.focus);
  const select = useStore((s) => s.select);
  const openExplore = useStore((s) => s.openExplore);
  const clearBurst = useStore((s) => s.clearBurst);

  const viewport = useRef<HTMLDivElement>(null);
  const cx = useMotionValue(0);
  const cy = useMotionValue(0);
  const k = useMotionValue(1);
  const [cam, setCam] = useState<Camera>({ x: 0, y: 0, k: 1 });

  const pos = useMemo(() => layoutTree(tree), [tree]);

  // Remember where each node was last frame so new children can spring out of their parent.
  const prevPos = useRef(pos);
  useEffect(() => {
    prevPos.current = pos;
  }, [pos]);

  const highlight = useMemo(() => {
    const set = new Set<string>();
    let cur = selectedId ? tree.nodes[selectedId] : undefined;
    while (cur) {
      set.add(cur.id);
      cur = cur.parentId ? tree.nodes[cur.parentId] : undefined;
    }
    return set;
  }, [selectedId, tree]);

  // Keep a cheap React copy of the camera for the minimap + starfield parallax.
  const syncCam = useCallback(() => {
    parallax.x = cx.get();
    parallax.y = cy.get();
    setCam({ x: cx.get(), y: cy.get(), k: k.get() });
  }, [cx, cy, k]);
  const rafRef = useRef(0);
  const scheduleSync = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(syncCam);
  }, [syncCam]);
  useMotionValueEvent(cx, "change", scheduleSync);
  useMotionValueEvent(cy, "change", scheduleSync);
  useMotionValueEvent(k, "change", scheduleSync);

  const viewSize = () => {
    const el = viewport.current;
    return { w: el?.clientWidth ?? window.innerWidth, h: el?.clientHeight ?? window.innerHeight };
  };

  const flyTo = useCallback(
    (target: Camera, instant = false) => {
      const opts = instant ? { duration: 0 } : { type: "spring" as const, stiffness: 70, damping: 18, mass: 1 };
      animate(cx, target.x, opts);
      animate(cy, target.y, opts);
      animate(k, target.k, opts);
    },
    [cx, cy, k],
  );

  const panelOpen = !!selectedId;
  const centerOn = useCallback(
    (wx: number, wy: number, zoom = k.get(), instant = false) => {
      const { w, h } = viewSize();
      const usable = panelOpen && w > 900 ? w - PANEL_W : w;
      const sx = usable / 2;
      const sy = panelOpen && w <= 900 ? h * 0.3 : h / 2;
      flyTo({ x: sx - wx * zoom, y: sy - wy * zoom, k: zoom }, instant);
    },
    [flyTo, k, panelOpen],
  );

  const fit = useCallback(
    (instant = false) => {
      const b = bounds(pos);
      const { w, h } = viewSize();
      const usable = panelOpen && w > 900 ? w - PANEL_W : w;
      const bw = b.maxX - b.minX + 260;
      const bh = b.maxY - b.minY + 300;
      const zoom = clamp(Math.min(usable / bw, (h - 140) / bh), MIN_K, 1.1);
      centerOn((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2 + 20, zoom, instant);
    },
    [pos, centerOn, panelOpen],
  );

  // Fit the whole tree when it opens.
  const openedTree = useRef<string | null>(null);
  useEffect(() => {
    if (openedTree.current === tree.id) return;
    openedTree.current = tree.id;
    const { w, h } = viewSize();
    // Start zoomed far out, then swoop in.
    cx.set(w / 2);
    cy.set(h / 2);
    k.set(0.3);
    setTimeout(() => fit(), 60);
  }, [tree.id, fit, cx, cy, k]);

  // Camera focus requests from the store.
  useEffect(() => {
    if (!focus) return;
    const p = pos[focus.nodeId];
    if (!p) return;
    centerOn(p.x, p.y + 40, focus.zoom ?? Math.max(k.get(), 0.85));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce]);

  // ----- pan / pinch / wheel -----
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; k: number; mid: { x: number; y: number } } | null>(null);
  const moved = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest(".node-body, .node-plus, .canvas-controls, .minimap")) return;
    viewport.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    cx.stop();
    cy.stop();
    k.stop();
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), k: k.get(), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    if (pointers.current.size === 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const nk = clamp((gesture.current.k * dist) / gesture.current.dist, MIN_K, MAX_K);
      zoomAt(gesture.current.mid.x, gesture.current.mid.y, nk);
      moved.current = true;
      return;
    }
    const dx = cur.x - prev.x;
    const dy = cur.y - prev.y;
    if (Math.abs(dx) + Math.abs(dy) > 1) moved.current = true;
    cx.set(cx.get() + dx);
    cy.set(cy.get() + dy);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
  };

  const zoomAt = (sx: number, sy: number, nk: number) => {
    const rect = viewport.current!.getBoundingClientRect();
    const mx = sx - rect.left;
    const my = sy - rect.top;
    const ok = k.get();
    cx.set(mx - ((mx - cx.get()) * nk) / ok);
    cy.set(my - ((my - cy.get()) * nk) / ok);
    k.set(nk);
  };

  useEffect(() => {
    const el = viewport.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cx.stop();
      cy.stop();
      k.stop();
      if (e.ctrlKey || !e.deltaX || Math.abs(e.deltaY) > Math.abs(e.deltaX) * 2) {
        const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016));
        zoomAt(e.clientX, e.clientY, clamp(k.get() * factor, MIN_K, MAX_K));
      } else {
        cx.set(cx.get() - e.deltaX);
        cy.set(cy.get() - e.deltaY);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zoomBy = (f: number) => {
    const { w, h } = viewSize();
    const nk = clamp(k.get() * f, MIN_K, MAX_K);
    const wx = (w / 2 - cx.get()) / k.get();
    const wy = (h / 2 - cy.get()) / k.get();
    flyTo({ x: w / 2 - wx * nk, y: h / 2 - wy * nk, k: nk });
  };

  // Keyboard: F = fit, +/- zoom, arrows walk the tree.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      if (useStore.getState().exploreId || useStore.getState().masteryId || useStore.getState().modal) return;
      if (e.key === "f" || e.key === "F") fit();
      else if (e.key === "=" || e.key === "+") zoomBy(1.25);
      else if (e.key === "-") zoomBy(0.8);
      else if (e.key.startsWith("Arrow")) {
        const sel = selectedId ? tree.nodes[selectedId] : tree.nodes[tree.rootId];
        if (!sel) return;
        e.preventDefault();
        let next: string | undefined;
        if (!selectedId) next = tree.rootId;
        else if (e.key === "ArrowUp") next = sel.parentId ?? undefined;
        else if (e.key === "ArrowDown") next = sel.collapsed ? undefined : sel.children[Math.floor((sel.children.length - 1) / 2)];
        else if (sel.parentId) {
          const sib = tree.nodes[sel.parentId].children;
          const i = sib.indexOf(sel.id) + (e.key === "ArrowRight" ? 1 : -1);
          next = sib[i];
        }
        if (next) select(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const nodes = Object.keys(pos).map((id) => tree.nodes[id]);
  const siblingsIndex = (id: string) => {
    const n = tree.nodes[id];
    return n.parentId ? tree.nodes[n.parentId].children.indexOf(id) : 0;
  };

  return (
    <div
      ref={viewport}
      className="canvas"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={(e) => {
        if (!moved.current && !(e.target as HTMLElement).closest(".node, .canvas-controls, .minimap")) select(null);
      }}
    >
      <motion.div className="grid" style={{ backgroundPositionX: cx, backgroundPositionY: cy }} />
      <motion.div className="world" style={{ x: cx, y: cy, scale: k }}>
        <Edges tree={tree} pos={pos} highlight={highlight} />
        {nodes.map((n) => (
          <NodeView
            key={n.id}
            node={n}
            pos={pos[n.id]}
            origin={n.parentId ? prevPos.current[n.parentId] ?? pos[n.parentId] : undefined}
            index={siblingsIndex(n.id)}
            selected={n.id === selectedId}
            onPath={highlight.has(n.id)}
            generating={!!generating[n.id]}
            hiddenCount={n.collapsed ? descendants(tree, n.id).length : 0}
            onSelect={select}
            onPlus={openExplore}
          />
        ))}
        {bursts.map((b) =>
          pos[b.nodeId] ? <Burst key={b.id} x={pos[b.nodeId].x} y={pos[b.nodeId].y} color={b.color} onDone={() => clearBurst(b.id)} /> : null,
        )}
      </motion.div>

      <div className="canvas-controls glass">
        <button className="icon-btn" title="Zoom in (+)" onClick={() => zoomBy(1.25)}>
          <Plus size={16} />
        </button>
        <button className="icon-btn" title="Zoom out (-)" onClick={() => zoomBy(0.8)}>
          <Minus size={16} />
        </button>
        <button className="icon-btn" title="Fit tree (F)" onClick={() => fit()}>
          <Maximize2 size={15} />
        </button>
        <button className="icon-btn" title="Focus root" onClick={() => select(tree.rootId)}>
          <Focus size={15} />
        </button>
      </div>

      <Minimap tree={tree} pos={pos} cam={cam} viewport={viewport} onJump={(wx, wy) => centerOn(wx, wy)} />
    </div>
  );
}
