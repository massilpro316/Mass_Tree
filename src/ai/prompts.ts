import type { ExploreAngle, ExploreContext } from "../types";

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
