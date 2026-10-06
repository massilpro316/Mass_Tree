# Knowledge Tree

A gamified personal learning platform where knowledge grows as an animated tree.

**You choose a question → AI breaks it into concepts → you explore them one by one → every concept can be expanded with `+` or with your own question → you build a permanent knowledge tree that's yours.**

AI generates the structure. You own the knowledge.

## The learning loop

1. **Ask a root question**, for example *"How does Laravel Queue work?"*. The engine plants a tree with four core concepts.
2. **Open a concept card.** Each node is a learning object with a summary, an explanation, a difficulty and its place in the tree.
3. **Press `+` to explore.** Pick an angle (*What is it? · How does it work? · Under the hood · How is it implemented? · What does it depend on?*) or **ask your own question**. Every answer becomes a new branch with its own sub-concepts.
4. **Make it yours.** Edit any node, add your own concepts, write notes, collapse or delete branches.
5. **Level up.** Move each concept from Unknown → Discovered → Exploring → Learning → Understood → **Mastered**. Mastery takes a challenge: an AI-generated quiz, or a "teach it back" explanation in demo mode.

## Game layer

- XP for discovering, exploring, asking your own questions, understanding and mastering
- Levels with ranks (Spark → Seeker → Pathfinder → … → Singularity) and a full-screen level-up animation
- 17 achievements across bronze, silver, gold and mythic tiers
- Node states with distinct visuals: dim, normal, glowing, animated, completed, and a gold crown for mastered
- Animated starfield with parallax, flowing connections with travelling particles, particle bursts when branches sprout, a 3D-tilting concept card, synthesized sound effects (with mute)
- Zoom, pan and pinch, smooth camera focus, minimap, and keyboard navigation (`↑ ↓ ← →` walk the tree, `F` fit, `+`/`-` zoom, `Esc` close)

## Running it

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build in dist/
```

### Demo mode vs. real AI

With no API key the app runs in **demo mode**. The *Laravel Queue* tree has hand-written content, and any other question gets structured placeholder branches you can fill in yourself.

For real explanations on any topic, open **Settings** and paste a [Claude API key](https://console.anthropic.com). Then pick a model (Claude Opus 5.5 by default, or Sonnet 5.5 / Haiku 4.5 for speed). The key is stored only in your browser and sent directly to the Anthropic API. This suits personal use; for a shared deployment, move the calls behind your own backend so the key isn't held client-side.

### Your data

Trees, XP and achievements are saved in your browser's local storage. Use **Settings → Export / Import** to back them up or move them between devices.

## Tech

React 19 · TypeScript · Vite · Framer Motion · Zustand · Anthropic TypeScript SDK (structured outputs) · Lucide icons

```
src/
  ai/          Claude engine, offline demo engine, prompts, demo content
  components/  Tree canvas, nodes, edges, concept card, explore/mastery modals, HUD
  lib/         Tree layout, XP & levels, achievements, sound, markdown
  store/       Game state (Zustand, persisted)
  styles/      Theme and game styling
```
