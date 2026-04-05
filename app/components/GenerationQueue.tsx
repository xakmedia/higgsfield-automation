"use client";

import type { QueueItem, GenerationParams, JobStatus } from "@/app/lib/types";
import { uuid } from "@/app/lib/higgsfield";

interface Props {
  queue: QueueItem[];
  currentIndex: number;
  onChange: (q: QueueItem[]) => void;
  onRun: () => void;
  isRunning: boolean;
}

export default function GenerationQueue({ queue, currentIndex, onChange, onRun, isRunning }: Props) {
  function remove(id: string) {
    const updated = queue.filter((q) => q.id !== id);
    onChange(updated.map((q, i) => ({ ...q, index: i + 1 })));
  }

  function clearFinished() {
    const updated = queue.filter((q) => q.status === "pending");
    onChange(updated.map((q, i) => ({ ...q, index: i + 1 })));
  }

  function moveUp(i: number) {
    if (i <= 0) return;
    const updated = [...queue];
    [updated[i - 1], updated[i]] = [updated[i], updated[i - 1]];
    onChange(updated.map((q, j) => ({ ...q, index: j + 1 })));
  }

  function moveDown(i: number) {
    if (i >= queue.length - 1) return;
    const updated = [...queue];
    [updated[i], updated[i + 1]] = [updated[i + 1], updated[i]];
    onChange(updated.map((q, j) => ({ ...q, index: j + 1 })));
  }

  function getStatusBadge(status: JobStatus) {
    switch (status) {
      case "pending": return <span className="badge badge-info">Pending</span>;
      case "running": return <span className="badge badge-warning">Running</span>;
      case "completed": return <span className="badge badge-success">Done</span>;
      case "failed": return <span className="badge badge-error">Failed</span>;
      case "nsfw": return <span className="badge badge-warning">NSFW</span>;
      default: return null;
    }
  }

  function getStatusDot(status: JobStatus) {
    const map: Record<JobStatus, string> = {
      pending: "idle",
      running: "running",
      completed: "done",
      failed: "failed",
      nsfw: "nsfw",
    };
    return <div className={`status-dot ${map[status]}`} />;
  }

  const pendingCount = queue.filter(q => q.status === "pending").length;

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div className="label" style={{ margin: 0 }}>
          Queue <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({pendingCount} pending)</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            className="btn-secondary"
            style={{ padding: "3px 10px", fontSize: 11 }}
            onClick={clearFinished}
          >
            Clear done
          </button>
          <button
            className="btn-success"
            style={{ padding: "3px 10px", fontSize: 11 }}
            onClick={onRun}
            disabled={isRunning || pendingCount === 0}
          >
            {isRunning ? "Running..." : `Run Queue (${pendingCount})`}
          </button>
        </div>
      </div>

      {queue.length === 0 ? (
        <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
          No items in queue. Add prompts from below.
        </div>
      ) : (
        <div style={{ maxHeight: 320, overflowY: "auto" }}>
          {queue.map((item, i) => (
            <div key={item.id} className="queue-item" style={{ opacity: item.status === "running" ? 1 : item.status !== "pending" ? 0.6 : 1 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 20 }}>
                <button
                  onClick={() => moveUp(i)}
                  disabled={i === 0 || isRunning}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "1px 4px", fontSize: 10, lineHeight: 1 }}
                >
                  ▲
                </button>
                <button
                  onClick={() => moveDown(i)}
                  disabled={i === queue.length - 1 || isRunning}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "1px 4px", fontSize: 10, lineHeight: 1 }}
                >
                  ▼
                </button>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>#{item.index}</span>
                  {getStatusDot(item.status)}
                  {getStatusBadge(item.status)}
                </div>
                <div style={{ fontSize: 12, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.prompt || "(empty prompt)"}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  {item.params.aspect_ratio} · {item.params.resolution} · {item.params.batch_size}img{item.input_images.length > 0 && ` · ${item.input_images.length} refs`}
                </div>
                {item.error && (
                  <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>{item.error}</div>
                )}
              </div>

              {!isRunning && item.status === "pending" && (
                <button
                  onClick={() => remove(item.id)}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px 6px", flexShrink: 0 }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
