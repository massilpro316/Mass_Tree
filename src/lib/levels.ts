/** Total XP needed to reach a given level (level 1 starts at 0). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(120 * Math.pow(level - 1, 1.55));
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return level;
}

export function levelProgress(xp: number) {
  const level = levelFromXp(xp);
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  return { level, current: xp - floor, needed: ceil - floor, ratio: (xp - floor) / (ceil - floor) };
}

const TITLES: [number, string][] = [
  [1, "Spark"],
  [3, "Seeker"],
  [5, "Pathfinder"],
  [8, "Navigator"],
  [12, "Cartographer"],
  [16, "Architect"],
  [21, "Sage"],
  [28, "Oracle"],
  [36, "Singularity"],
];

export function levelTitle(level: number): string {
  let title = TITLES[0][1];
  for (const [min, name] of TITLES) if (level >= min) title = name;
  return title;
}

/** XP rewards for each action. */
export const XP = {
  plantTree: 50,
  discover: 5,
  explore: 20,
  customQuestion: 15,
  learning: 10,
  understood: 25,
  mastered: 60,
  note: 5,
  edit: 5,
  addNode: 8,
} as const;
