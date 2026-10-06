import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { ConceptPanel } from "./components/ConceptPanel";
import { ExploreModal } from "./components/ExploreModal";
import { LevelUp, Toasts } from "./components/Feedback";
import { Home } from "./components/Home";
import { HUD } from "./components/HUD";
import { MasteryModal } from "./components/MasteryModal";
import { AchievementsModal, SettingsModal } from "./components/Panels";
import { Starfield } from "./components/Starfield";
import { TreeCanvas } from "./components/TreeCanvas";
import { useStore } from "./store/useStore";

export default function App() {
  const screen = useStore((s) => s.screen);
  const treeId = useStore((s) => s.treeId);
  const treeExists = useStore((s) => (s.treeId ? !!s.trees[s.treeId] : false));

  // Esc closes the concept card when no modal is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const s = useStore.getState();
      if (s.exploreId || s.masteryId || s.modal) return;
      if (s.selectedId) s.select(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app">
      <Starfield />
      <HUD />
      <AnimatePresence mode="wait">
        {screen === "tree" && treeExists ? (
          <motion.main key={`tree-${treeId}`} className="screen" initial={{ opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
            <TreeCanvas />
            <ConceptPanel />
          </motion.main>
        ) : (
          <motion.main key="home" className="screen screen-scroll" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.06 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
            <Home />
          </motion.main>
        )}
      </AnimatePresence>
      <ExploreModal />
      <MasteryModal />
      <SettingsModal />
      <AchievementsModal />
      <Toasts />
      <LevelUp />
    </div>
  );
}
