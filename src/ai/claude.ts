import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";
import type { DeepDiveDraft, DiveContext, ExploreContext, ExploreDraft, QuizQuestion, RootDraft } from "../types";
import { divePrompt, explorePrompt, quizPrompt, rootPrompt, SYSTEM_PROMPT } from "./prompts";

export const MODELS = [
  { id: "claude-opus-5-5", label: "Claude Opus 5.5", note: "Deepest explanations" },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", note: "Fast and sharp" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", note: "Fastest" },
] as const;

export const DEFAULT_MODEL = MODELS[0].id;

const Difficulty = z.enum(["Beginner", "Intermediate", "Advanced", "Expert"]);

const Concept = z.object({
  title: z.string(),
  summary: z.string(),
  details: z.string(),
  icon: z.string(),
  difficulty: Difficulty,
});

const RootSchema = z.object({
  title: z.string(),
  summary: z.string(),
  details: z.string(),
  icon: z.string(),
  difficulty: Difficulty,
  concepts: z.array(Concept),
});

const ExploreSchema = z.object({
  question: z.string(),
  summary: z.string(),
  details: z.string(),
  icon: z.string(),
  concepts: z.array(Concept),
});

const QuizSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      answer: z.number().int(),
      explanation: z.string(),
    }),
  ),
});

const DiveSchema = z.object({
  title: z.string(),
  summary: z.string(),
  steps: z.array(z.object({ label: z.string(), detail: z.string() })),
  sections: z.array(z.object({ heading: z.string(), body: z.string() })),
  code: z.object({ language: z.string(), snippet: z.string(), caption: z.string() }),
  pitfalls: z.array(z.string()),
  terms: z.array(z.object({ term: z.string(), meaning: z.string() })),
});

/** Server-side refusal fallbacks are only offered for these models. */
const FALLBACK_MODELS = new Set<string>(["claude-opus-5-5", "claude-sonnet-5-5"]);

export class AIError extends Error {}

export class ClaudeEngine {
  private client: Anthropic;

  constructor(
    apiKey: string,
    private model: string,
  ) {
    // The key stays in this browser and is sent straight to the Anthropic API.
    this.client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 });
  }

  private async run<S extends z.ZodType>(
    schema: S,
    prompt: string,
    maxTokens = 6000,
    effort: "low" | "medium" = "low",
  ): Promise<z.infer<S>> {
    const base = {
      model: this.model,
      max_tokens: maxTokens,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user" as const, content: prompt }],
      output_config: {
        format: betaZodOutputFormat(schema),
        // Effort isn't supported on Haiku 4.5; keep game interactions snappy elsewhere.
        ...(this.model.startsWith("claude-haiku") ? {} : { effort }),
      },
    };

    const call = (withFallbacks: boolean) =>
      this.client.beta.messages.parse(
        withFallbacks
          ? { ...base, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
          : base,
      );

    let response;
    try {
      try {
        response = await call(FALLBACK_MODELS.has(this.model));
      } catch (err) {
        // If this account or model rejects the fallback beta, retry once as a plain request.
        if (err instanceof Anthropic.BadRequestError && FALLBACK_MODELS.has(this.model)) response = await call(false);
        else throw err;
      }
    } catch (err) {
      throw new AIError(describeError(err));
    }

    if (response.stop_reason === "refusal") {
      throw new AIError("Claude declined this request. Try rephrasing your question.");
    }
    if (response.stop_reason === "max_tokens") {
      throw new AIError("The answer was cut off before it finished. Try a narrower question.");
    }
    if (!response.parsed_output) throw new AIError("Claude returned an unexpected format. Please try again.");
    return response.parsed_output as z.infer<S>;
  }

  async generateRoot(question: string): Promise<RootDraft> {
    const r = await this.run(RootSchema, rootPrompt(question));
    return { ...r, concepts: r.concepts.slice(0, 5) };
  }

  async explore(ctx: ExploreContext): Promise<ExploreDraft> {
    const r = await this.run(ExploreSchema, explorePrompt(ctx));
    return { ...r, concepts: r.concepts.slice(0, 5) };
  }

  async deepDive(ctx: DiveContext): Promise<DeepDiveDraft> {
    // Deep dives are the long-form explanations, so give them more room and thought.
    const r = await this.run(DiveSchema, divePrompt(ctx), 12000, "medium");
    return { ...r, steps: r.steps.slice(0, 8), sections: r.sections.slice(0, 4), pitfalls: r.pitfalls.slice(0, 5), terms: r.terms.slice(0, 6) };
  }

  async quiz(path: string[], title: string, summary: string, details: string): Promise<QuizQuestion[]> {
    const r = await this.run(QuizSchema, quizPrompt(path, title, summary, details), 4000);
    return r.questions
      .filter((q) => q.options.length >= 2 && q.answer >= 0 && q.answer < q.options.length)
      .slice(0, 3);
  }

  async ping(): Promise<void> {
    try {
      await this.client.models.retrieve(this.model);
    } catch (err) {
      throw new AIError(describeError(err));
    }
  }
}

function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "Your API key was rejected. Check it in Settings.";
  if (err instanceof Anthropic.PermissionDeniedError) return "This API key doesn't have access to the selected model.";
  if (err instanceof Anthropic.NotFoundError) return "The selected model wasn't found. Pick another in Settings.";
  if (err instanceof Anthropic.RateLimitError) return "Rate limited by the API. Wait a moment and try again.";
  if (err instanceof Anthropic.BadRequestError) return `The API rejected the request: ${err.message}`;
  if (err instanceof Anthropic.InternalServerError) return "The Claude API is having trouble right now. Try again shortly.";
  if (err instanceof Anthropic.APIConnectionError) return "Couldn't reach the Claude API. Check your connection.";
  if (err instanceof Anthropic.APIError) return err.message;
  return err instanceof Error ? err.message : "Something went wrong.";
}
