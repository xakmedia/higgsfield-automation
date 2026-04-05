"use client";

import { useState, useEffect } from "react";
import type { PromptTemplate, InputImage } from "@/app/lib/types";

const STORAGE_KEY = "hf_templates";

const BUILT_IN_TEMPLATES: PromptTemplate[] = [
  {
    id: "t1",
    name: "Cinematic Portrait",
    prompt: "cinematic portrait, dramatic lighting, sharp focus, 8k, [[1]]",
  },
  {
    id: "t2",
    name: "Fashion Editorial",
    prompt: "high fashion editorial, professional photography, studio lighting, [[1]]",
  },
  {
    id: "t3",
    name: "Action Shot",
    prompt: "dynamic action photography, motion blur, cinematic composition, [[1]]",
  },
];

interface Props {
  prompt: string;
  images: InputImage[];
  onChange: (p: string) => void;
}

export default function PromptBuilder({ prompt, images, onChange }: Props) {
  const [templates, setTemplates] = useState<PromptTemplate[]>(BUILT_IN_TEMPLATES);
  const [newName, setNewName] = useState("");
  const [showSave, setShowSave] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as PromptTemplate[];
        if (parsed.length > 0) setTemplates([...BUILT_IN_TEMPLATES, ...parsed.filter(t => !BUILT_IN_TEMPLATES.find(b => b.id === t.id))]);
      } catch {}
    }
  }, []);

  function insertToken(token: string) {
    onChange(prompt + token);
  }

  function loadTemplate(t: PromptTemplate) {
    onChange(t.prompt);
  }

  function saveAsTemplate() {
    if (!newName.trim() || !prompt.trim()) return;
    const tpl: PromptTemplate = {
      id: `custom-${Date.now()}`,
      name: newName.trim(),
      prompt: prompt,
    };
    const updated = [...templates.filter(t => !t.id.startsWith("custom-")), tpl];
    setTemplates(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.filter(t => !BUILT_IN_TEMPLATES.find(b => b.id === t.id))));
    setNewName("");
    setShowSave(false);
  }

  function deleteTemplate(id: string) {
    if (id.startsWith("custom-")) {
      const updated = templates.filter(t => t.id !== id);
      setTemplates(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.filter(t => !BUILT_IN_TEMPLATES.find(b => b.id === t.id))));
    }
  }

  function resolvePrompt(p: string): string {
    let resolved = p;
    images.forEach((img) => {
      resolved = resolved.replace(new RegExp(`\\[\\[${img.position}\\]\\]`, "g"), `[ref:${img.id}]`);
    });
    return resolved;
  }

  return (
    <div className="card">
      <div className="label">Prompt</div>

      {/* Reference token buttons */}
      {images.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          {images.map((img) => (
            <button
              key={img.id}
              className="btn-secondary"
              style={{ padding: "3px 10px", fontSize: 11 }}
              onClick={() => insertToken(`[[${img.position}]]`)}
            >
              Insert #{img.position}
            </button>
          ))}
        </div>
      )}

      <textarea
        value={prompt}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter your generation prompt. Use [[1]], [[2]] to reference uploaded images..."
        rows={5}
        style={{ fontSize: 13 }}
      />

      {images.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-muted)" }}>
          Resolved: <span style={{ color: "var(--accent)" }}>{resolvePrompt(prompt) || "(empty)"}</span>
        </div>
      )}

      <hr className="divider" />

      {/* Template library */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Templates</div>
        <button className="btn-secondary" style={{ padding: "3px 10px", fontSize: 11 }} onClick={() => setShowSave(!showSave)}>
          {showSave ? "Cancel" : "Save Current"}
        </button>
      </div>

      {showSave && (
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Template name..."
            style={{ flex: 1, fontSize: 12 }}
            onKeyDown={(e) => e.key === "Enter" && saveAsTemplate()}
          />
          <button className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={saveAsTemplate}>
            Save
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {templates.map((t) => (
          <div
            key={t.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              background: "var(--surface-2)",
              borderRadius: 6,
              border: "1px solid var(--border)",
            }}
          >
            <button
              className="btn-secondary"
              style={{ flex: 1, textAlign: "left", justifyContent: "flex-start", fontSize: 12, padding: "4px 8px" }}
              onClick={() => loadTemplate(t)}
            >
              {t.name}
            </button>
            {t.id.startsWith("custom-") && (
              <button
                onClick={() => deleteTemplate(t.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: 14,
                  padding: "2px 4px",
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
