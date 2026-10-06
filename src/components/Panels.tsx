import { motion } from "framer-motion";
import { Download, KeyRound, Lock, Upload, X, Zap, CheckCircle2, AlertTriangle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ClaudeEngine, MODELS } from "../ai";
import { ACHIEVEMENTS } from "../lib/achievements";
import { levelFromXp, levelTitle } from "../lib/levels";
import { useStore } from "../store/useStore";
import { Modal } from "./Modal";
import { XPBar } from "./HUD";

export function SettingsModal() {
  const open = useStore((s) => s.modal === "settings");
  const setModal = useStore((s) => s.setModal);
  const settings = useStore((s) => s.settings);
  const save = useStore((s) => s.saveSettings);
  const exportData = useStore((s) => s.exportData);
  const importData = useStore((s) => s.importData);
  const resetProgress = useStore((s) => s.resetProgress);
  const pushToast = useStore((s) => s.pushToast);

  const [key, setKey] = useState(settings.apiKey);
  const [model, setModel] = useState(settings.model);
  const [test, setTest] = useState<{ state: "idle" | "testing" | "ok" | "fail"; msg?: string }>({ state: "idle" });
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setKey(settings.apiKey);
      setModel(settings.model);
      setTest({ state: "idle" });
      setConfirmReset(false);
    }
  }, [open, settings.apiKey, settings.model]);

  const close = () => setModal(null);

  const runTest = async () => {
    if (!key.trim()) return;
    setTest({ state: "testing" });
    try {
      await new ClaudeEngine(key.trim(), model).ping();
      setTest({ state: "ok", msg: "Connected. Claude is ready." });
    } catch (e) {
      setTest({ state: "fail", msg: e instanceof Error ? e.message : String(e) });
    }
  };

  const download = () => {
    const blob = new Blob([exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `knowledge-tree-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal open={open} onClose={close} className="settings-modal">
      <div className="modal-head">
        <div>
          <div className="label">Control room</div>
          <h3 className="modal-title">Settings</h3>
        </div>
        <button className="icon-btn" onClick={close}>
          <X size={16} />
        </button>
      </div>

      <section className="set-section">
        <div className="set-title">
          <Zap size={15} /> AI engine
        </div>
        <p className="hint">
          Without a key the app runs in <b>demo mode</b>: the Laravel Queue tree has real content, and other topics get placeholder branches you can fill in yourself.
          Add a Claude API key to generate real explanations for any question.
        </p>
        <label className="label">
          <KeyRound size={12} /> Claude API key
        </label>
        <input className="input mono" type="password" placeholder="sk-ant-…" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" spellCheck={false} />
        <p className="hint small">
          <Lock size={11} /> Stored only in this browser and sent directly to the Anthropic API. Get one at console.anthropic.com.
        </p>
        <label className="label">Model</label>
        <div className="models">
          {MODELS.map((m) => (
            <button key={m.id} className={`model ${model === m.id ? "on" : ""}`} onClick={() => setModel(m.id)}>
              <span className="model-name">{m.label}</span>
              <span className="model-note">{m.note}</span>
            </button>
          ))}
        </div>
        <div className="row-end">
          {test.state !== "idle" && (
            <span className={`test test-${test.state}`}>
              {test.state === "testing" ? <span className="spinner" /> : test.state === "ok" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              {test.state === "testing" ? "Testing…" : test.msg}
            </span>
          )}
          <button className="btn btn-ghost" onClick={runTest} disabled={!key.trim() || test.state === "testing"}>
            Test
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              save({ apiKey: key.trim(), model });
              pushToast({ kind: "info", title: key.trim() ? "Claude connected" : "Demo mode on", icon: key.trim() ? "⚡" : "🧪" });
              close();
            }}
          >
            Save
          </button>
        </div>
      </section>

      <section className="set-section">
        <div className="set-title">Your knowledge</div>
        <p className="hint">Your trees are saved in this browser. Export them to keep a backup or move them to another device.</p>
        <div className="row-start">
          <button className="btn btn-ghost" onClick={download}>
            <Download size={14} /> Export
          </button>
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            <Upload size={14} /> Import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              try {
                importData(await f.text());
                pushToast({ kind: "info", title: "Trees imported", icon: "📥" });
              } catch (err) {
                pushToast({ kind: "error", title: "Import failed", sub: err instanceof Error ? err.message : String(err), icon: "⚠️" });
              }
            }}
          />
          {confirmReset ? (
            <span className="confirm">
              Erase all trees and XP?
              <button
                className="btn btn-danger"
                onClick={() => {
                  resetProgress();
                  close();
                }}
              >
                Erase
              </button>
              <button className="btn btn-ghost" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
            </span>
          ) : (
            <button className="btn btn-danger" onClick={() => setConfirmReset(true)}>
              Reset progress
            </button>
          )}
        </div>
      </section>
    </Modal>
  );
}

export function AchievementsModal() {
  const open = useStore((s) => s.modal === "achievements");
  const setModal = useStore((s) => s.setModal);
  const profile = useStore((s) => s.profile);
  const level = levelFromXp(profile.xp);
  const st = profile.stats;

  const stats: [string, number | string][] = [
    ["Total XP", profile.xp],
    ["Rank", levelTitle(level)],
    ["Trees", st.trees],
    ["Explorations", st.explorations],
    ["Own questions", st.customQuestions],
    ["Understood", st.understood],
    ["Mastered", st.mastered],
    ["Deepest", st.maxDepth],
  ];

  return (
    <Modal open={open} onClose={() => setModal(null)} className="ach-modal">
      <div className="modal-head">
        <div>
          <div className="label">Hall of fame</div>
          <h3 className="modal-title">Achievements</h3>
        </div>
        <button className="icon-btn" onClick={() => setModal(null)}>
          <X size={16} />
        </button>
      </div>
      <div className="ach-profile">
        <XPBar />
        <div className="stat-grid">
          {stats.map(([k, v]) => (
            <div key={k} className="stat">
              <span className="stat-v">{v}</span>
              <span className="stat-k">{k}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="ach-grid">
        {ACHIEVEMENTS.map((a, i) => {
          const got = profile.achievements[a.id];
          return (
            <motion.div
              key={a.id}
              className={`ach tier-${a.tier} ${got ? "got" : "locked"}`}
              initial={{ opacity: 0, y: 14, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              whileHover={{ y: -4 }}
            >
              <span className="ach-icon">{got ? a.icon : "🔒"}</span>
              <span className="ach-title">{a.title}</span>
              <span className="ach-desc">{a.description}</span>
              {a.xp > 0 && <span className="ach-xp">+{a.xp} XP</span>}
            </motion.div>
          );
        })}
      </div>
    </Modal>
  );
}
