export type NodeState =
  | "unknown"
  | "discovered"
  | "exploring"
  | "learning"
  | "understood"
  | "mastered";

export const NODE_STATES: NodeState[] = [
  "unknown",
  "discovered",
  "exploring",
  "learning",
  "understood",
  "mastered",
];

export type NodeKind = "root" | "concept" | "question";

export type Difficulty = "Beginner" | "Intermediate" | "Advanced" | "Expert";

export const DIFFICULTIES: Difficulty[] = ["Beginner", "Intermediate", "Advanced", "Expert"];

/** Preset exploration angles offered by the `+` menu. */
export type ExploreAngle = "what" | "how" | "under-the-hood" | "implementation" | "dependencies";

export interface KNode {
  id: string;
  parentId: string | null;
  kind: NodeKind;
  title: string;
  summary: string;
  details: string;
  icon: string;
  difficulty: Difficulty;
  state: NodeState;
  notes: string;
  children: string[];
  createdAt: number;
  /** For question nodes: the angle used, or "custom" for the user's own question. */
  angle?: ExploreAngle | "custom";
  collapsed?: boolean;
  /** True once the user has edited or created this node by hand. */
  userEdited?: boolean;
  /** Highest state index ever reached — XP is only granted for new peaks. */
  peak?: number;
  noted?: boolean;
}

export interface Tree {
  id: string;
  title: string;
  rootId: string;
  nodes: Record<string, KNode>;
  createdAt: number;
  updatedAt: number;
  demo?: boolean;
}

export interface ProfileStats {
  trees: number;
  explorations: number;
  customQuestions: number;
  understood: number;
  mastered: number;
  notes: number;
  edits: number;
  maxDepth: number;
  maxNodes: number;
}

export interface Profile {
  xp: number;
  achievements: Record<string, number>;
  stats: ProfileStats;
}

/** Content returned by the AI layer for one concept. */
export interface ConceptDraft {
  title: string;
  summary: string;
  details: string;
  icon: string;
  difficulty: Difficulty;
}

export interface RootDraft extends ConceptDraft {
  concepts: ConceptDraft[];
}

export interface ExploreDraft {
  question: string;
  summary: string;
  details: string;
  icon: string;
  concepts: ConceptDraft[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface ExploreContext {
  /** Titles from the root down to (and including) the node being explored. */
  path: string[];
  node: { title: string; summary: string; kind: NodeKind };
  /** Titles of existing children, so the AI avoids duplicating them. */
  existing: string[];
  question: string;
  angle: ExploreAngle | "custom";
}
