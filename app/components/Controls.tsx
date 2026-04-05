"use client";

import type { GenerationParams } from "@/app/lib/types";
import { RESOLUTIONS, ASPECT_RATIO_OPTIONS, ASPECT_RATIOS } from "@/app/lib/types";

interface Props {
  params: Omit<GenerationParams, "prompt" | "input_images">;
  onChange: (p: Omit<GenerationParams, "prompt" | "input_images">) => void;
}

export default function Controls({ params, onChange }: Props) {
  function set<K extends keyof Omit<GenerationParams, "prompt" | "input_images">>(key: K, value: GenerationParams[K]) {
    const next = { ...params, [key]: value };
    if (key === "aspect_ratio") {
      const dims = ASPECT_RATIOS[value as string];
      next.width = dims.width;
      next.height = dims.height;
    }
    onChange(next);
  }

  return (
    <div className="card">
      <div className="label">Generation Controls</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
        <div>
          <label className="label">Model</label>
          <input type="text" value="nano-banana-2" readOnly style={{ color: "var(--text-muted)" }} />
        </div>

        <div>
          <label className="label">Resolution</label>
          <select value={params.resolution} onChange={(e) => set("resolution", e.target.value as any)}>
            {RESOLUTIONS.map((r) => (
              <option key={r} value={r}>{r.toUpperCase()}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Aspect Ratio</label>
          <select value={params.aspect_ratio} onChange={(e) => set("aspect_ratio", e.target.value)}>
            {ASPECT_RATIO_OPTIONS.map((ar) => (
              <option key={ar} value={ar}>{ar}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <label className="label">Batch Size</label>
        <select
          value={params.batch_size}
          onChange={(e) => set("batch_size", parseInt(e.target.value))}
          style={{ width: 100 }}
        >
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
        Output: {params.width} × {params.height}px
      </div>
    </div>
  );
}
