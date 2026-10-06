import type { Profile } from "../types";
import { levelFromXp } from "./levels";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  tier: "bronze" | "silver" | "gold" | "mythic";
  check: (p: Profile) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-seed", title: "First Seed", description: "Plant your first knowledge tree.", icon: "🌱", xp: 25, tier: "bronze", check: (p) => p.stats.trees >= 1 },
  { id: "curious", title: "Curious Mind", description: "Ask your own question on a concept.", icon: "❓", xp: 30, tier: "bronze", check: (p) => p.stats.customQuestions >= 1 },
  { id: "explorer", title: "Explorer", description: "Explore 10 branches.", icon: "🧭", xp: 50, tier: "silver", check: (p) => p.stats.explorations >= 10 },
  { id: "voyager", title: "Voyager", description: "Explore 50 branches.", icon: "🚀", xp: 150, tier: "gold", check: (p) => p.stats.explorations >= 50 },
  { id: "deep-diver", title: "Deep Diver", description: "Reach depth 5 in a tree.", icon: "🌊", xp: 60, tier: "silver", check: (p) => p.stats.maxDepth >= 5 },
  { id: "abyss", title: "Into the Abyss", description: "Reach depth 9 in a tree.", icon: "🕳️", xp: 150, tier: "gold", check: (p) => p.stats.maxDepth >= 9 },
  { id: "branching", title: "Branching Out", description: "Grow a tree to 25 nodes.", icon: "🌿", xp: 60, tier: "silver", check: (p) => p.stats.maxNodes >= 25 },
  { id: "world-tree", title: "World Tree", description: "Grow a tree to 100 nodes.", icon: "🌳", xp: 200, tier: "mythic", check: (p) => p.stats.maxNodes >= 100 },
  { id: "click", title: "It Clicked", description: "Mark your first concept as understood.", icon: "💡", xp: 25, tier: "bronze", check: (p) => p.stats.understood >= 1 },
  { id: "scholar", title: "Scholar", description: "Understand 15 concepts.", icon: "📚", xp: 100, tier: "silver", check: (p) => p.stats.understood >= 15 },
  { id: "mastery", title: "Mastery", description: "Master your first concept.", icon: "👑", xp: 50, tier: "silver", check: (p) => p.stats.mastered >= 1 },
  { id: "grandmaster", title: "Grandmaster", description: "Master 10 concepts.", icon: "🏆", xp: 250, tier: "mythic", check: (p) => p.stats.mastered >= 10 },
  { id: "note-taker", title: "Note Taker", description: "Write notes on 5 concepts.", icon: "✍️", xp: 40, tier: "bronze", check: (p) => p.stats.notes >= 5 },
  { id: "architect", title: "Architect", description: "Edit or hand-craft 10 nodes.", icon: "🛠️", xp: 60, tier: "silver", check: (p) => p.stats.edits >= 10 },
  { id: "forest", title: "Forest Keeper", description: "Grow 3 different trees.", icon: "🌲", xp: 80, tier: "silver", check: (p) => p.stats.trees >= 3 },
  { id: "rising-star", title: "Rising Star", description: "Reach level 5.", icon: "⭐", xp: 0, tier: "gold", check: (p) => levelFromXp(p.xp) >= 5 },
  { id: "luminary", title: "Luminary", description: "Reach level 12.", icon: "🌟", xp: 0, tier: "mythic", check: (p) => levelFromXp(p.xp) >= 12 },
];
