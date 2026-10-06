import { AnimatePresence, motion } from "framer-motion";
import { useEffect, type ReactNode } from "react";

export function Modal({ open, onClose, children, className = "", locked = false }: { open: boolean; onClose(): void; children: ReactNode; className?: string; locked?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !locked) {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose, locked]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onPointerDown={(e) => e.target === e.currentTarget && !locked && onClose()}>
          <motion.div
            className={`modal glass ${className}`}
            initial={{ opacity: 0, scale: 0.9, y: 30, rotateX: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          >
            <div className="modal-sheen" />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
