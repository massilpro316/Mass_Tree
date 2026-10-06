import type { ConceptDraft, DeepDiveDraft, Difficulty, DiveContext, ExploreAngle, ExploreContext, ExploreDraft, RootDraft } from "../types";
import { DEMO_BRANCHES, DEMO_CONCEPTS, DEMO_DIVES, DEMO_ROOT } from "./demoData";
import { ANGLES, DIVE_LEVELS } from "./prompts";

/**
 * Offline engine used when no API key is configured. It has real content for the
 * Laravel Queue demo and produces structured placeholder branches for anything else,
 * so the whole game loop is playable without AI.
 */
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const key = (s: string) => s.trim().toLowerCase();

function subjectOf(question: string): string {
  const s = question
    .trim()
    .replace(/[?!.]+$/, "")
    .replace(/^(how|what|why|when|where|who)\s+(does|do|is|are|can|should|did|was|were)\s+/i, "")
    .replace(/^(explain|teach me|tell me about|learn)\s+/i, "")
    .replace(/\s+(work|works|function|mean|happen)$/i, "")
    .trim();
  const subject = s || question.trim();
  return subject.charAt(0).toUpperCase() + subject.slice(1);
}

function concept(title: string, icon: string, difficulty: Difficulty, summary: string, details: string): ConceptDraft {
  return { title, icon, difficulty, summary, details };
}

function demoConcept(title: string): ConceptDraft | null {
  const e = DEMO_CONCEPTS[key(title)];
  return e ? { title, ...e } : null;
}

const PLACEHOLDER = (topic: string, focus: string) => `*Demo mode: this is placeholder content.* Add a Claude API key in **Settings** to get real explanations.

This node is where you'd learn about **${focus}** within *${topic}*. You own it, so you can edit this text, write your own notes, and keep exploring with \`+\`.`;

const ANGLE_CONCEPTS: Record<ExploreAngle | "custom", [string, string, Difficulty][]> = {
  what: [["Definition", "📖", "Beginner"], ["Purpose", "🎯", "Beginner"], ["Key Properties", "🔑", "Intermediate"]],
  how: [["Inputs", "📥", "Intermediate"], ["Mechanism", "⚙️", "Intermediate"], ["Outputs", "📤", "Intermediate"]],
  "under-the-hood": [["Internals", "🔬", "Advanced"], ["Data Flow", "🌊", "Advanced"], ["Edge Cases", "⚠️", "Expert"]],
  implementation: [["Interfaces", "🧩", "Intermediate"], ["Code Walkthrough", "💻", "Advanced"], ["Configuration", "🎛️", "Intermediate"]],
  dependencies: [["Prerequisites", "🧱", "Beginner"], ["Collaborators", "🤝", "Intermediate"], ["Environment", "🌐", "Intermediate"]],
  custom: [["Context", "🗺️", "Beginner"], ["Key Mechanism", "⚙️", "Intermediate"], ["Consequences", "💥", "Advanced"]],
};

export class MockEngine {
  async generateRoot(question: string): Promise<RootDraft> {
    await wait(1100 + Math.random() * 500);
    if (/laravel/i.test(question) && /queue/i.test(question)) {
      return {
        ...DEMO_ROOT,
        concepts: DEMO_ROOT.concepts.map((t) => demoConcept(t)!),
      };
    }
    const subject = subjectOf(question);
    return {
      title: subject.length > 42 ? subject.slice(0, 40) + "…" : subject,
      icon: "🌌",
      difficulty: "Intermediate",
      summary: `Your starting point for understanding ${subject}. Explore the four branches below to build the full picture.`,
      details: PLACEHOLDER(subject, subject),
      concepts: [
        concept("Fundamentals", "🧱", "Beginner", `The core ideas and vocabulary behind ${subject}.`, PLACEHOLDER(subject, "the fundamentals")),
        concept("Building Blocks", "🧩", "Intermediate", `The main components that make up ${subject}.`, PLACEHOLDER(subject, "its building blocks")),
        concept("Mechanics", "⚙️", "Advanced", `How the parts of ${subject} interact and work together.`, PLACEHOLDER(subject, "its mechanics")),
        concept("In Practice", "🛠️", "Intermediate", `How ${subject} is applied in real situations.`, PLACEHOLDER(subject, "real-world use")),
      ],
    };
  }

  async explore(ctx: ExploreContext): Promise<ExploreDraft> {
    await wait(1000 + Math.random() * 600);
    const topic = ctx.path[0] ?? ctx.node.title;
    const branch = ctx.angle !== "custom" ? DEMO_BRANCHES[`${key(ctx.node.title)}|${ctx.angle}`] : undefined;
    if (branch) {
      return {
        question: branch.question,
        icon: branch.icon,
        summary: branch.summary,
        details: branch.details,
        concepts: branch.concepts.map(
          (t) => demoConcept(t) ?? concept(t, "✨", "Intermediate", `${t} in the context of ${ctx.node.title}.`, PLACEHOLDER(topic, t)),
        ),
      };
    }
    const existing = new Set(ctx.existing.map(key));
    const concepts = ANGLE_CONCEPTS[ctx.angle]
      .map(([t, icon, d]) => {
        const title = existing.has(key(t)) ? `${t} of ${ctx.node.title}` : t;
        return concept(title, icon, d, `${t} of ${ctx.node.title}.`, PLACEHOLDER(topic, `${t.toLowerCase()} of ${ctx.node.title}`));
      });
    const label = ctx.angle === "custom" ? "Your question" : ANGLES[ctx.angle].hint;
    return {
      question: ctx.question,
      icon: ctx.angle === "custom" ? "💬" : "🔎",
      summary: `${label} — answered in three parts below.`,
      details: PLACEHOLDER(topic, `"${ctx.question}"`),
      concepts,
    };
  }

  async deepDive(ctx: DiveContext): Promise<DeepDiveDraft> {
    await wait(1300 + Math.random() * 700);
    const demo = DEMO_DIVES[`${key(ctx.node.title)}|${ctx.level}`];
    if (demo && !ctx.focus) return demo;
    const lvl = DIVE_LEVELS[ctx.level - 1];
    const t = ctx.node.title;
    const topic = ctx.path[0] ?? t;
    const note = "*Demo mode: placeholder dive.* Add a Claude API key in **Settings** for a real under-the-hood explanation.";
    return {
      title: `${t}: ${lvl.name.toLowerCase()} layer`,
      summary: `At ${lvl.depth}, this layer would show ${lvl.goal.split(":")[0]} for ${t}.`,
      steps: [
        { label: "Trigger", detail: `Something in ${topic} calls on ${t}.` },
        { label: "Inputs gathered", detail: `${t} collects the data and state it needs.` },
        { label: "Core work", detail: `The central mechanism of ${t} runs.` },
        { label: "Side effects", detail: "Results are stored, emitted or returned." },
        { label: "Cleanup", detail: "Resources are released and the system is ready again." },
      ],
      sections: [
        { heading: `What happens at ${lvl.depth}`, body: `${note}\n\nThis section would explain ${lvl.goal} for **${t}**${ctx.focus ? `, focused on *${ctx.focus}*` : ""}.` },
        { heading: "Make it yours", body: "Write what you discover into your notes, and add the key terms below to your tree as new concepts to explore." },
      ],
      code: { language: "", snippet: "", caption: "" },
      pitfalls: ["Placeholder pitfall: assumptions that hold at the surface may break at this depth."],
      terms: [
        { term: `${t} Internals`, meaning: `The hidden machinery behind ${t}.` },
        { term: `${t} Lifecycle`, meaning: `The stages ${t} goes through from start to finish.` },
      ],
    };
  }
}
