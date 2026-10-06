import type { DiveContext, ExploreAngle, ExploreContext } from "../types";

export const ANGLES: Record<ExploreAngle, { label: string; question: (t: string) => string; hint: string }> = {
  what: { label: "What is it?", question: (t) => `What is ${t}?`, hint: "Definition, purpose and key properties" },
  how: { label: "How does it work?", question: (t) => `How does ${t} work?`, hint: "The mechanism, step by step" },
  "under-the-hood": { label: "Under the hood", question: (t) => `What happens under the hood of ${t}?`, hint: "Internals, data flow and edge cases" },
  implementation: { label: "How is it implemented?", question: (t) => `How is ${t} implemented?`, hint: "Code, interfaces and configuration" },
  dependencies: { label: "What does it depend on?", question: (t) => `What does ${t} depend on?`, hint: "Prerequisites and collaborators" },
};

export const SYSTEM_PROMPT = `You are the knowledge engine of "Knowledge Tree", a learning game where a learner grows a personal tree of concepts.

Your job is to break knowledge into small, explorable concept nodes. Every concept you return becomes a node the learner can open, study and expand further, so:
- Concept titles are short (1-4 words), concrete and distinct from each other and from existing siblings.
- "summary" is one or two crisp sentences (max ~35 words) that explain the concept on its own.
- "details" is a compact Markdown explanation (80-180 words): short paragraphs, bullet lists, and \`inline code\` or a small fenced code block when it genuinely helps. No headings.
- "icon" is a single emoji that fits the concept.
- "difficulty" is one of Beginner, Intermediate, Advanced, Expert, relative to the topic.
- Stay technically accurate. If something depends on versions or is uncertain, say so briefly rather than inventing specifics.
- Write in the same language as the learner's question.`;

export function rootPrompt(question: string) {
  return `The learner wants to understand: "${question}"

Return the root node of their tree:
- "title": a short name for the topic (max 6 words).
- "summary", "details", "icon", "difficulty" for the topic as a whole. The details should directly answer the question at a high level.
- "concepts": exactly 4 core concepts that together explain the topic, ordered so a learner could explore them left to right.`;
}

export function explorePrompt(ctx: ExploreContext) {
  const path = ctx.path.join(" → ");
  const existing = ctx.existing.length ? `Existing branches under this node (do not repeat them): ${ctx.existing.join("; ")}.` : "";
  const angle = ctx.angle === "custom" ? "This is the learner's own question — answer exactly what they asked." : `Exploration angle: ${ANGLES[ctx.angle].hint}.`;
  return `Learning path so far: ${path}
Current node: "${ctx.node.title}" — ${ctx.node.summary}
${existing}

The learner asks: "${ctx.question}"
${angle}

Return a new branch:
- "question": the question as a concise branch title (max ~10 words, phrased as a question).
- "summary": a direct one-to-two sentence answer.
- "details": the full answer in Markdown (100-220 words).
- "icon": one emoji.
- "concepts": 3 or 4 sub-concepts that the answer relies on, each a node the learner can explore next.`;
}

export function quizPrompt(path: string[], title: string, summary: string, details: string) {
  return `Learning path: ${path.join(" → ")}
Concept: "${title}" — ${summary}
Notes on the concept:
${details}

Write a 3-question multiple-choice mastery challenge that checks real understanding of this concept (not trivia or wording). Each question has exactly 4 options, one correct answer ("answer" is its 0-based index), and a one-sentence "explanation". Vary the position of the correct answer.`;
}

export const DIVE_LEVELS = [
  {
    level: 1,
    name: "Mechanics",
    depth: "100m",
    icon: "⚙️",
    goal: "how it works internally, step by step: the sequence of things that actually happen, which components are involved and how data moves between them",
  },
  {
    level: 2,
    name: "Internals",
    depth: "500m",
    icon: "🧬",
    goal: "the implementation: the data structures, algorithms, classes or functions involved, and what the framework, library or runtime actually does at source level",
  },
  {
    level: 3,
    name: "Bedrock",
    depth: "1000m",
    icon: "💎",
    goal: "the lowest layer: interactions with the language runtime, operating system, network protocols or hardware; concurrency, performance characteristics, failure modes and tricky edge cases",
  },
] as const;

export function divePrompt(ctx: DiveContext) {
  const lvl = DIVE_LEVELS[ctx.level - 1];
  const prev = ctx.previous.length
    ? `The learner already went through these shallower layers — go deeper, do not repeat them:\n${ctx.previous.map((p) => `- Level ${p.level} "${p.title}": ${p.summary}`).join("\n")}`
    : "";
  const focus = ctx.focus ? `The learner wants this dive to focus on: "${ctx.focus}".` : "";
  return `Learning path: ${ctx.path.join(" → ")}
Concept: "${ctx.node.title}" — ${ctx.node.summary}
What the learner has read so far:
${ctx.node.details}

${prev}
${focus}

Write DEEP DIVE level ${lvl.level} of 3 ("${lvl.name}", ${lvl.depth} below the surface). Explain ${lvl.goal}.
Be concrete and technically precise: name real functions, structures, system calls, protocol messages or algorithms where they exist. If details vary by version or implementation, say so.

Return:
- "title": a short title for this layer (max 8 words).
- "summary": 1-2 sentences capturing the key insight of this layer.
- "steps": 4-7 ordered steps showing what happens under the hood. Each has a short "label" (max 6 words) and a "detail" (1-3 sentences).
- "sections": 2-3 sections, each with a "heading" and a Markdown "body" (60-160 words). No headings inside bodies.
- "code": an illustrative snippet ("language", "snippet" up to ~25 lines, one-sentence "caption"). Use empty strings for all three if code genuinely doesn't help.
- "pitfalls": 2-4 gotchas, misconceptions or failure modes (one sentence each).
- "terms": 3-5 key terms introduced at this depth, each with a one-sentence "meaning". These may become new concepts in the learner's tree.`;
}
