import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AIError, DEFAULT_MODEL, getEngine } from "../ai";
import { ANGLES } from "../ai/prompts";
import { ACHIEVEMENTS } from "../lib/achievements";
import { uid } from "../lib/id";
import { depthOf, descendants, pathTo } from "../lib/layout";
import { levelFromXp, XP } from "../lib/levels";
import { sfx } from "../lib/sound";
import type { ConceptDraft, DeepDive, ExploreAngle, KNode, NodeState, Profile, Tree } from "../types";
import { NODE_STATES } from "../types";

export interface Toast {
  id: string;
  kind: "xp" | "achievement" | "error" | "info";
  title: string;
  sub?: string;
  icon?: string;
  xp?: number;
}

export interface Settings {
  apiKey: string;
  model: string;
}

type Modal = "settings" | "achievements" | null;

interface UI {
  screen: "home" | "tree";
  treeId: string | null;
  selectedId: string | null;
  exploreId: string | null;
  masteryId: string | null;
  diveId: string | null;
  modal: Modal;
  planting: string | null;
  generating: Record<string, boolean>;
  toasts: Toast[];
  levelUp: number | null;
  bursts: { id: string; nodeId: string; color: string }[];
  focus: { nodeId: string; nonce: number; zoom?: number } | null;
}

interface State extends UI {
  trees: Record<string, Tree>;
  profile: Profile;
  settings: Settings;

  // navigation
  goHome(): void;
  openTree(id: string): void;
  select(nodeId: string | null): void;
  openExplore(nodeId: string | null): void;
  openMastery(nodeId: string | null): void;
  openDive(nodeId: string | null): void;
  setModal(m: Modal): void;
  focusNode(nodeId: string, zoom?: number): void;

  // game actions
  plantTree(question: string): Promise<void>;
  explore(nodeId: string, question: string, angle: ExploreAngle | "custom"): Promise<boolean>;
  deepDive(nodeId: string, level: number, focus?: string): Promise<boolean>;
  setNodeState(nodeId: string, state: NodeState): void;
  updateNode(nodeId: string, patch: Partial<Pick<KNode, "title" | "summary" | "details" | "icon" | "difficulty">>): void;
  setNotes(nodeId: string, notes: string): void;
  addChild(nodeId: string, title: string, summary?: string, select?: boolean): void;
  deleteNode(nodeId: string): void;
  toggleCollapse(nodeId: string): void;
  deleteTree(id: string): void;

  // data
  saveSettings(s: Partial<Settings>): void;
  importData(json: string): void;
  exportData(): string;
  resetProgress(): void;

  // feedback
  pushToast(t: Omit<Toast, "id">): void;
  dismissToast(id: string): void;
  clearLevelUp(): void;
  clearBurst(id: string): void;
}

const emptyProfile = (): Profile => ({
  xp: 0,
  achievements: {},
  stats: { trees: 0, explorations: 0, customQuestions: 0, understood: 0, mastered: 0, notes: 0, edits: 0, maxDepth: 0, maxNodes: 0, dives: 0, maxDive: 0 },
  streak: 0,
  lastActiveDay: "",
});

/** Fill fields added in newer versions into a saved profile. */
const withDefaults = (p?: Partial<Profile>): Profile => {
  const base = emptyProfile();
  return { ...base, ...p, stats: { ...base.stats, ...(p?.stats ?? {}) } };
};

const dayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/** Key used in `generating` while a deep dive is being written. */
export const diveKey = (nodeId: string) => `${nodeId}:dive`;

const STATE_COLOR: Record<NodeState, string> = {
  unknown: "#94a3b8",
  discovered: "#3b82f6",
  exploring: "#0ea5e9",
  learning: "#6366f1",
  understood: "#059669",
  mastered: "#d97706",
};
export const stateColor = (s: NodeState) => STATE_COLOR[s];

function makeNode(draft: ConceptDraft, parentId: string | null, kind: KNode["kind"], state: NodeState = "unknown"): KNode {
  return {
    id: uid(kind === "question" ? "q" : "c"),
    parentId,
    kind,
    title: draft.title,
    summary: draft.summary,
    details: draft.details,
    icon: draft.icon || "✨",
    difficulty: draft.difficulty,
    state,
    notes: "",
    children: [],
    createdAt: Date.now(),
    peak: NODE_STATES.indexOf(state),
  };
}

const STATE_XP: Partial<Record<NodeState, number>> = {
  discovered: XP.discover,
  learning: XP.learning,
  understood: XP.understood,
  mastered: XP.mastered,
};

export const useStore = create<State>()(
  persist(
    (set, get) => {
      /** Grant XP with a toast, then check for level-ups and new achievements. */
      const award = (xp: number, title: string, icon = "⚡", quiet = false) => {
        if (xp <= 0) return;
        touchStreak();
        const before = levelFromXp(get().profile.xp);
        set((s) => ({ profile: { ...s.profile, xp: s.profile.xp + xp } }));
        if (!quiet) {
          get().pushToast({ kind: "xp", title, xp, icon });
          sfx.xp();
        }
        const after = levelFromXp(get().profile.xp);
        if (after > before) {
          set({ levelUp: after });
          sfx.levelUp();
        }
        checkAchievements();
      };

      /** Daily streak: consecutive calendar days with at least one rewarded action. */
      const touchStreak = () => {
        const today = dayKey();
        const { profile } = get();
        if (profile.lastActiveDay === today) return;
        const y = new Date();
        y.setDate(y.getDate() - 1);
        const streak = profile.lastActiveDay === dayKey(y) ? profile.streak + 1 : 1;
        set((s) => ({ profile: { ...s.profile, streak, lastActiveDay: today } }));
        if (streak > 1) setTimeout(() => get().pushToast({ kind: "info", title: `${streak}-day streak!`, sub: "Keep learning every day", icon: "🔥" }), 700);
      };

      const checkAchievements = () => {
        const { profile } = get();
        for (const a of ACHIEVEMENTS) {
          if (profile.achievements[a.id] || !a.check(get().profile)) continue;
          set((s) => ({ profile: { ...s.profile, achievements: { ...s.profile.achievements, [a.id]: Date.now() } } }));
          setTimeout(() => {
            get().pushToast({ kind: "achievement", title: a.title, sub: a.description, icon: a.icon, xp: a.xp });
            sfx.achievement();
          }, 450);
          // The achievement toast already shows the bonus, so grant it quietly.
          if (a.xp) award(a.xp, a.title, a.icon, true);
        }
      };

      const bump = (patch: Partial<Profile["stats"]> | ((st: Profile["stats"]) => Partial<Profile["stats"]>)) =>
        set((s) => {
          const p = typeof patch === "function" ? patch(s.profile.stats) : patch;
          return { profile: { ...s.profile, stats: { ...s.profile.stats, ...p } } };
        });

      const recordTreeStats = (tree: Tree) => {
        const ids = Object.keys(tree.nodes);
        const depth = Math.max(0, ...ids.map((id) => depthOf(tree, id)));
        bump((st) => ({ maxDepth: Math.max(st.maxDepth, depth), maxNodes: Math.max(st.maxNodes, ids.length) }));
      };

      const currentTree = () => {
        const { treeId, trees } = get();
        return treeId ? trees[treeId] : undefined;
      };

      const writeTree = (tree: Tree) =>
        set((s) => ({ trees: { ...s.trees, [tree.id]: { ...tree, updatedAt: Date.now() } } }));

      const patchNode = (nodeId: string, fn: (n: KNode) => KNode) => {
        const tree = currentTree();
        const node = tree?.nodes[nodeId];
        if (!tree || !node) return;
        writeTree({ ...tree, nodes: { ...tree.nodes, [nodeId]: fn(node) } });
      };

      /** Move a node forward to `state` (never backwards) and reward a new peak. */
      const promote = (nodeId: string, state: NodeState) => {
        const node = currentTree()?.nodes[nodeId];
        if (!node) return;
        const target = NODE_STATES.indexOf(state);
        if (NODE_STATES.indexOf(node.state) >= target) return;
        get().setNodeState(nodeId, state);
      };

      return {
        trees: {},
        profile: emptyProfile(),
        settings: { apiKey: "", model: DEFAULT_MODEL },

        screen: "home",
        treeId: null,
        selectedId: null,
        exploreId: null,
        masteryId: null,
        diveId: null,
        modal: null,
        planting: null,
        generating: {},
        toasts: [],
        levelUp: null,
        bursts: [],
        focus: null,

        goHome: () => set({ screen: "home", treeId: null, selectedId: null, exploreId: null, masteryId: null, diveId: null }),
        openTree: (id) => {
          const tree = get().trees[id];
          if (!tree) return;
          set({ screen: "tree", treeId: id, selectedId: null, exploreId: null, masteryId: null, diveId: null, focus: null });
        },
        select: (nodeId) => {
          set({ selectedId: nodeId });
          if (nodeId) {
            promote(nodeId, "discovered");
            get().focusNode(nodeId);
          }
        },
        openExplore: (nodeId) => {
          set({ exploreId: nodeId });
          if (nodeId) sfx.open();
        },
        openMastery: (nodeId) => set({ masteryId: nodeId }),
        openDive: (nodeId) => {
          set({ diveId: nodeId });
          if (nodeId) {
            sfx.open();
            promote(nodeId, "discovered");
          }
        },
        setModal: (modal) => set({ modal }),
        focusNode: (nodeId, zoom) => set({ focus: { nodeId, nonce: Math.random(), zoom } }),

        plantTree: async (question) => {
          const { settings } = get();
          set({ planting: question });
          sfx.scan();
          try {
            const draft = await getEngine(settings.apiKey, settings.model).generateRoot(question);
            const root = makeNode(draft, null, "root", "exploring");
            const kids = draft.concepts.map((c) => makeNode(c, root.id, "concept"));
            root.children = kids.map((k) => k.id);
            const tree: Tree = {
              id: uid("t"),
              title: question,
              rootId: root.id,
              nodes: Object.fromEntries([root, ...kids].map((n) => [n.id, n])),
              createdAt: Date.now(),
              updatedAt: Date.now(),
              demo: !settings.apiKey,
            };
            set((s) => ({ trees: { ...s.trees, [tree.id]: tree }, planting: null }));
            get().openTree(tree.id);
            set((s) => ({ bursts: [...s.bursts, { id: uid("b"), nodeId: root.id, color: "#2563eb" }] }));
            sfx.grow();
            bump((st) => ({ trees: st.trees + 1 }));
            recordTreeStats(tree);
            award(XP.plantTree, "Planted a new tree", "🌱");
          } catch (err) {
            set({ planting: null });
            sfx.error();
            get().pushToast({ kind: "error", title: "Couldn't grow the tree", sub: err instanceof AIError || err instanceof Error ? err.message : String(err), icon: "⚠️" });
          }
        },

        explore: async (nodeId, question, angle) => {
          const tree = currentTree();
          const node = tree?.nodes[nodeId];
          if (!tree || !node || get().generating[nodeId]) return false;
          const { settings } = get();
          set((s) => ({ generating: { ...s.generating, [nodeId]: true } }));
          sfx.scan();
          try {
            const draft = await getEngine(settings.apiKey, settings.model).explore({
              path: pathTo(tree, nodeId).map((n) => n.title),
              node: { title: node.title, summary: node.summary, kind: node.kind },
              existing: node.children.map((c) => tree.nodes[c]?.title).filter(Boolean),
              question,
              angle,
            });
            // Re-read: the user may have edited the tree while we waited.
            const latest = get().trees[tree.id];
            const parent = latest?.nodes[nodeId];
            if (!latest || !parent) return false;
            const q = makeNode(
              { title: draft.question || question, summary: draft.summary, details: draft.details, icon: draft.icon || "💬", difficulty: parent.difficulty },
              nodeId,
              "question",
              "discovered",
            );
            q.angle = angle;
            const kids = draft.concepts.map((c) => makeNode(c, q.id, "concept"));
            q.children = kids.map((k) => k.id);
            const next: Tree = {
              ...latest,
              nodes: {
                ...latest.nodes,
                [nodeId]: { ...parent, collapsed: false, children: [...parent.children, q.id] },
                [q.id]: q,
                ...Object.fromEntries(kids.map((k) => [k.id, k])),
              },
            };
            writeTree(next);
            set((s) => ({
              bursts: [...s.bursts, { id: uid("b"), nodeId, color: angle === "custom" ? "#0d9488" : "#2563eb" }],
              selectedId: q.id,
            }));
            sfx.grow();
            setTimeout(() => get().focusNode(q.id), 120);
            promote(nodeId, "exploring");
            bump((st) => ({
              explorations: st.explorations + 1,
              customQuestions: st.customQuestions + (angle === "custom" ? 1 : 0),
            }));
            recordTreeStats(get().trees[tree.id]);
            award(XP.explore, `Explored ${parent.title}`, "🧭");
            if (angle === "custom") award(XP.customQuestion, "Asked your own question", "💬");
            return true;
          } catch (err) {
            sfx.error();
            get().pushToast({ kind: "error", title: "Exploration failed", sub: err instanceof Error ? err.message : String(err), icon: "⚠️" });
            return false;
          } finally {
            set((s) => {
              const g = { ...s.generating };
              delete g[nodeId];
              return { generating: g };
            });
          }
        },

        deepDive: async (nodeId, level, focus) => {
          const tree = currentTree();
          const node = tree?.nodes[nodeId];
          const key = diveKey(nodeId);
          if (!tree || !node || get().generating[key]) return false;
          const { settings } = get();
          set((s) => ({ generating: { ...s.generating, [key]: true } }));
          sfx.scan();
          try {
            const previous = (node.dives ?? []).filter((d) => d.level < level).map((d) => ({ level: d.level, title: d.title, summary: d.summary }));
            const draft = await getEngine(settings.apiKey, settings.model).deepDive({
              path: pathTo(tree, nodeId).map((n) => n.title),
              node: { title: node.title, summary: node.summary, details: node.details },
              level,
              previous,
              focus: focus?.trim() || undefined,
            });
            const dive: DeepDive = { ...draft, level, focus: focus?.trim() || undefined, createdAt: Date.now() };
            const firstAtLevel = !(node.dives ?? []).some((d) => d.level === level);
            patchNode(nodeId, (n) => ({
              ...n,
              dives: [...(n.dives ?? []).filter((d) => d.level !== level), dive].sort((a, b) => a.level - b.level),
            }));
            sfx.grow();
            promote(nodeId, "learning");
            if (firstAtLevel) {
              bump((st) => ({ dives: st.dives + 1, maxDive: Math.max(st.maxDive, level) }));
              award(XP.dive * level, `Dove to depth ${level}: ${node.title}`, "🔬");
            }
            return true;
          } catch (err) {
            sfx.error();
            get().pushToast({ kind: "error", title: "Deep dive failed", sub: err instanceof Error ? err.message : String(err), icon: "⚠️" });
            return false;
          } finally {
            set((s) => {
              const g = { ...s.generating };
              delete g[key];
              return { generating: g };
            });
          }
        },

        setNodeState: (nodeId, state) => {
          const node = currentTree()?.nodes[nodeId];
          if (!node || node.state === state) return;
          const idx = NODE_STATES.indexOf(state);
          const peak = node.peak ?? NODE_STATES.indexOf(node.state);
          patchNode(nodeId, (n) => ({ ...n, state, peak: Math.max(peak, idx) }));
          if (idx > peak) {
            // Reward every newly reached tier, so skipping ahead still counts.
            let total = 0;
            for (let i = peak + 1; i <= idx; i++) total += STATE_XP[NODE_STATES[i]] ?? 0;
            if (idx >= NODE_STATES.indexOf("understood") && peak < NODE_STATES.indexOf("understood")) bump((st) => ({ understood: st.understood + 1 }));
            if (state === "mastered") {
              bump((st) => ({ mastered: st.mastered + 1 }));
              set((s) => ({ bursts: [...s.bursts, { id: uid("b"), nodeId, color: "#d97706" }] }));
            }
            const verb: Partial<Record<NodeState, string>> = { discovered: "Discovered", learning: "Started learning", understood: "Understood", mastered: "Mastered", exploring: "Exploring" };
            award(total, `${verb[state] ?? "Progress"}: ${node.title}`, state === "mastered" ? "👑" : state === "understood" ? "💡" : "✨");
          }
        },

        updateNode: (nodeId, patch) => {
          const node = currentTree()?.nodes[nodeId];
          if (!node) return;
          patchNode(nodeId, (n) => ({ ...n, ...patch, userEdited: true }));
          if (!node.userEdited) {
            bump((st) => ({ edits: st.edits + 1 }));
            award(XP.edit, `Made ${patch.title ?? node.title} your own`, "🛠️");
          }
        },

        setNotes: (nodeId, notes) => {
          const node = currentTree()?.nodes[nodeId];
          if (!node) return;
          const firstNote = !node.noted && notes.trim().length >= 12;
          patchNode(nodeId, (n) => ({ ...n, notes, noted: n.noted || firstNote }));
          if (firstNote) {
            bump((st) => ({ notes: st.notes + 1 }));
            award(XP.note, `Wrote notes on ${node.title}`, "✍️");
          }
        },

        addChild: (nodeId, title, summary, select = true) => {
          const tree = currentTree();
          const parent = tree?.nodes[nodeId];
          if (!tree || !parent || !title.trim()) return;
          const child = makeNode(
            { title: title.trim(), summary: summary?.trim() || "Your own concept. Describe it in your words.", details: "", icon: "🌟", difficulty: parent.difficulty },
            nodeId,
            "concept",
            "discovered",
          );
          child.userEdited = true;
          writeTree({
            ...tree,
            nodes: { ...tree.nodes, [nodeId]: { ...parent, collapsed: false, children: [...parent.children, child.id] }, [child.id]: child },
          });
          set((s) => ({ ...(select ? { selectedId: child.id } : {}), bursts: [...s.bursts, { id: uid("b"), nodeId, color: "#0d9488" }] }));
          if (select) setTimeout(() => get().focusNode(child.id), 120);
          sfx.grow();
          bump((st) => ({ edits: st.edits + 1 }));
          recordTreeStats(get().trees[tree.id]);
          award(XP.addNode, `Hand-crafted ${child.title}`, "🌟");
        },

        deleteNode: (nodeId) => {
          const tree = currentTree();
          const node = tree?.nodes[nodeId];
          if (!tree || !node || !node.parentId) return;
          const doomed = new Set([nodeId, ...descendants(tree, nodeId)]);
          const nodes = Object.fromEntries(Object.entries(tree.nodes).filter(([id]) => !doomed.has(id)));
          const parent = nodes[node.parentId];
          nodes[node.parentId] = { ...parent, children: parent.children.filter((c) => c !== nodeId) };
          writeTree({ ...tree, nodes });
          set({ selectedId: node.parentId });
          sfx.close();
        },

        toggleCollapse: (nodeId) => patchNode(nodeId, (n) => ({ ...n, collapsed: !n.collapsed })),

        deleteTree: (id) =>
          set((s) => {
            const trees = { ...s.trees };
            delete trees[id];
            return { trees };
          }),

        saveSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

        exportData: () => JSON.stringify({ version: 1, trees: get().trees, profile: get().profile }, null, 2),

        importData: (json) => {
          const data = JSON.parse(json) as { trees?: Record<string, Tree>; profile?: Profile };
          if (!data || typeof data !== "object" || !data.trees) throw new Error("This file isn't a Knowledge Tree export.");
          set((s) => ({
            trees: { ...s.trees, ...data.trees },
            profile: data.profile ? withDefaults(data.profile) : s.profile,
          }));
        },

        resetProgress: () => set({ trees: {}, profile: emptyProfile(), screen: "home", treeId: null, selectedId: null }),

        pushToast: (t) => {
          const toast = { ...t, id: uid("toast") };
          set((s) => ({ toasts: [...s.toasts.slice(-4), toast] }));
          setTimeout(() => get().dismissToast(toast.id), t.kind === "error" ? 7000 : t.kind === "achievement" ? 5200 : 2600);
        },
        dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
        clearLevelUp: () => set({ levelUp: null }),
        clearBurst: (id) => set((s) => ({ bursts: s.bursts.filter((b) => b.id !== id) })),
      };
    },
    {
      name: "knowledge-tree-v1",
      version: 1,
      partialize: (s) => ({ trees: s.trees, profile: s.profile, settings: s.settings }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return { ...current, ...p, profile: withDefaults(p.profile), settings: { ...current.settings, ...(p.settings ?? {}) } };
      },
    },
  ),
);

export const useTree = () => useStore((s) => (s.treeId ? s.trees[s.treeId] : undefined));

export { ANGLES };
