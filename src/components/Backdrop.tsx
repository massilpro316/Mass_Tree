/**
 * Light "grid gradient" world: slow-drifting soft gradients under a fine grid.
 * The tree view draws its own panning grid, so it passes grid={false}.
 */
export function Backdrop({ grid = true }: { grid?: boolean }) {
  return (
    <div className="backdrop" aria-hidden>
      <div className="blob b1" />
      <div className="blob b2" />
      <div className="blob b3" />
      <div className="blob b4" />
      <div className="blob b5" />
      {grid && <div className="bg-grid" />}
    </div>
  );
}
