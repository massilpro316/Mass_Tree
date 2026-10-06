import type { DeepDiveDraft, DiveContext, ExploreContext, ExploreDraft, QuizQuestion, RootDraft } from "../types";
import { ClaudeEngine } from "./claude";
import { MockEngine } from "./mock";

export interface Engine {
  generateRoot(question: string): Promise<RootDraft>;
  explore(ctx: ExploreContext): Promise<ExploreDraft>;
  deepDive(ctx: DiveContext): Promise<DeepDiveDraft>;
  /** Only available with a real model; the demo uses a teach-back challenge instead. */
  quiz?(path: string[], title: string, summary: string, details: string): Promise<QuizQuestion[]>;
}

let cached: { key: string; model: string; engine: Engine } | null = null;
const mock = new MockEngine();

export function getEngine(apiKey: string, model: string): Engine {
  if (!apiKey.trim()) return mock;
  if (cached && cached.key === apiKey && cached.model === model) return cached.engine;
  const engine = new ClaudeEngine(apiKey.trim(), model);
  cached = { key: apiKey, model, engine };
  return engine;
}

export { AIError, DEFAULT_MODEL, MODELS, ClaudeEngine } from "./claude";
