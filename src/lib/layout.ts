import type { KNode, Tree } from "../types";

export interface Positioned {
  x: number;
  y: number;
  depth: number;
}

export const NODE_SLOT = 190; // horizontal room per leaf
export const LEVEL_GAP = 240; // vertical distance between depths

/** Tidy top-down layout: each subtree gets width proportional to its visible leaves. */
export function layoutTree(tree: Tree): Record<string, Positioned> {
  const out: Record<string, Positioned> = {};
  const widths: Record<string, number> = {};

  const visibleChildren = (n: KNode) =>
    n.collapsed ? [] : n.children.filter((c) => tree.nodes[c]);

  const measure = (id: string): number => {
    const n = tree.nodes[id];
    const kids = visibleChildren(n);
    const slot = n.kind === "question" ? NODE_SLOT * 1.15 : NODE_SLOT;
    const w = kids.length === 0 ? slot : Math.max(slot, kids.reduce((s, c) => s + measure(c), 0));
    widths[id] = w;
    return w;
  };

  const place = (id: string, left: number, depth: number) => {
    const n = tree.nodes[id];
    const w = widths[id];
    out[id] = { x: left + w / 2, y: depth * LEVEL_GAP, depth };
    let cursor = left;
    for (const c of visibleChildren(n)) {
      place(c, cursor, depth + 1);
      cursor += widths[c];
    }
  };

  if (!tree.nodes[tree.rootId]) return out;
  const total = measure(tree.rootId);
  place(tree.rootId, -total / 2, 0);
  return out;
}

export function depthOf(tree: Tree, id: string): number {
  let d = 0;
  let cur = tree.nodes[id];
  while (cur?.parentId) {
    d++;
    cur = tree.nodes[cur.parentId];
  }
  return d;
}

export function pathTo(tree: Tree, id: string): KNode[] {
  const path: KNode[] = [];
  let cur: KNode | undefined = tree.nodes[id];
  while (cur) {
    path.unshift(cur);
    cur = cur.parentId ? tree.nodes[cur.parentId] : undefined;
  }
  return path;
}

export function descendants(tree: Tree, id: string): string[] {
  const out: string[] = [];
  const walk = (nid: string) => {
    for (const c of tree.nodes[nid]?.children ?? []) {
      out.push(c);
      walk(c);
    }
  };
  walk(id);
  return out;
}

export function bounds(pos: Record<string, Positioned>) {
  const pts = Object.values(pos);
  if (!pts.length) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  return {
    minX: Math.min(...pts.map((p) => p.x)),
    maxX: Math.max(...pts.map((p) => p.x)),
    minY: Math.min(...pts.map((p) => p.y)),
    maxY: Math.max(...pts.map((p) => p.y)),
  };
}
